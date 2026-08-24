/**
 * Payment Gateway Signature Utilities
 * HMAC signing/verification for JazzCash and Easypaisa.
 *
 * JazzCash SecureHash (verified against the published "Page Redirection v1.1"
 * algorithm): all request/response parameters are sorted A-Z (excluding
 * pp_SecureHash and any empty values), their values are joined with "&", the
 * Integrity Salt is prepended (salt&v1&v2...), and an HMAC-SHA256 is computed
 * with the Integrity Salt as the key. The SAME algorithm is used for request
 * signing and for verifying both the browser return and the async IPN.
 *
 * Easypaisa: the merchant integration PDF is NOT publicly published. The
 * algorithm below mirrors this project's existing generator/verifier so our
 * own initiation and verification are symmetric. The exact production field
 * order, signature parameter name, and encoding MUST be confirmed against the
 * merchant-provided PDF before go-live (see audit report / remaining blockers).
 */

import crypto from 'crypto';

/**
 * Constant-time comparison of two hex-encoded HMAC signatures.
 * Avoids timing attacks that a plain string `===` comparison is vulnerable to.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a.toLowerCase());
  const bb = Buffer.from(b.toLowerCase());
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// ===================================================================
// JAZZCASH
// ===================================================================

/**
 * Build the canonical string JazzCash uses for its SecureHash:
 *   [IntegritySalt, <sorted non-empty param values>].join('&')
 * Only pp_*-prefixed gateway fields are included (so our own return-URL params
 * such as sig/ts/method are never part of the hash), and pp_SecureHash itself
 * is always excluded.
 */
function buildJazzCashCanonical(
  params: Record<string, any>,
  integritySalt: string
): string {
  const sortedKeys = Object.keys(params)
    .filter(
      (k) =>
        k.startsWith('pp_') &&
        k !== 'pp_SecureHash' &&
        params[k] !== undefined &&
        params[k] !== null &&
        params[k] !== ''
    )
    .sort();

  const values = sortedKeys.map((k) => String(params[k]));
  return [integritySalt, ...values].join('&');
}

/**
 * Generate the JazzCash pp_SecureHash for an outbound redirect request.
 * @param params all request parameters (excluding pp_SecureHash)
 * @param integritySalt the merchant Integrity Salt (NOT the PP password)
 */
export function generateJazzCashSecureHash(
  params: Record<string, any>,
  integritySalt: string
): string {
  const message = buildJazzCashCanonical(params, integritySalt);
  return crypto
    .createHmac('sha256', integritySalt)
    .update(message)
    .digest('hex')
    .toUpperCase();
}

/**
 * Verify a JazzCash SecureHash (request return or async IPN) using the
 * Integrity Salt. Fail-closed: returns false when the salt or the received
 * hash is missing, or when the computed hash does not match.
 */
export function verifyJazzCashWebhookSignature(
  integritySalt: string,
  data: Record<string, any>
): boolean {
  try {
    if (!integritySalt) return false;
    const received = data?.pp_SecureHash;
    if (!received) return false;

    const expected = generateJazzCashSecureHash(data, integritySalt);
    return timingSafeEqualHex(expected, received);
  } catch (error) {
    console.error('JazzCash signature verification error:', error);
    return false;
  }
}

// ===================================================================
// EASYPAISA
// ===================================================================

/**
 * Generate Easypaisa request signature (merchantHashedReq).
 * Mirrors verifyEasypaisaWebhookSignature so initiation and verification are
 * symmetric. The production Easypaisa spec (field order, signature parameter
 * name, base64 vs hex encoding) must be confirmed against the merchant PDF.
 */
export function generateEasypaisaSignature(
  merchantId: string,
  secret: string,
  orderId: string,
  amount: number
): string {
  const signatureString = `${merchantId}|${orderId}|${String(amount)}|${secret}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signatureString)
    .digest('hex')
    .toUpperCase();
}

/**
 * Verify Easypaisa webhook/return signature. Fail-closed.
 */
export function verifyEasypaisaWebhookSignature(
  secret: string,
  webhookData: Record<string, any>
): boolean {
  try {
    if (!secret) return false;
    const received = webhookData?.signature || webhookData?.merchantHashedReq;
    if (!received) return false;

    const signatureString = `${webhookData.merchantID}|${webhookData.transactionID}|${String(webhookData.amount)}|${secret}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signatureString)
      .digest('hex')
      .toUpperCase();

    return timingSafeEqualHex(expected, received);
  } catch (error) {
    console.error('Easypaisa signature verification error:', error);
    return false;
  }
}

// ===================================================================
// RETURN-URL SIGNING (defense in depth)
// ===================================================================

/**
 * Sign an outbound payment-gateway return URL so the callback handler can
 * confirm the redirect actually originated from us (defense-in-depth against a
 * forged "payment succeeded" redirect). Uses the same app secret as the inbound
 * webhook (PAYMENT_WEBHOOK_SECRET). The signature covers orderId + method + ts
 * and is only valid for RETURN_URL_SIG_TTL_MS, which also limits replay.
 */
const RETURN_URL_SIG_TTL_MS = 15 * 60 * 1000;

export function signReturnUrl(
  orderId: string,
  method: string,
  secret: string
): { sig: string; ts: string } {
  const ts = Date.now().toString();
  const signatureString = `${orderId}|${method}|${ts}`;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(signatureString)
    .digest('hex')
    .toLowerCase();
  return { sig, ts };
}

/**
 * Verify a return-URL signature previously produced by signReturnUrl.
 * Fail-closed: returns false when the secret, sig, or ts is missing, when the
 * signature is invalid, or when the timestamp is outside the freshness window.
 */
export function verifyReturnUrl(
  orderId: string,
  method: string,
  sig: string | null,
  ts: string | null,
  secret: string
): boolean {
  try {
    if (!secret || !sig || !ts) return false;

    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) return false;
    if (Date.now() - tsNum > RETURN_URL_SIG_TTL_MS) return false;

    const signatureString = `${orderId}|${method}|${ts}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signatureString)
      .digest('hex')
      .toLowerCase();

    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(sig);
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch (error) {
    console.error('Return URL signature verification error:', error);
    return false;
  }
}
