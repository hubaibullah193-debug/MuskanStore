/**
 * Payment Gateway Signature Utilities
 * HMAC signing for JazzCash and Easypaisa
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

/**
 * Generate JazzCash HMAC signature
 * JazzCash uses SHA256 HMAC with the password as the key
 */
export function generateJazzCashSignature(
  merchantId: string,
  password: string,
  orderId: string,
  amount: number,
  version: string = "1.1"
): string {
  // JazzCash signature format: pp_MerchantID|pp_Password|pp_Version|pp_TxnRefNo|pp_Amount|pp_TxnCurrency|pp_TxnDateTime
  const amountInCents = Math.round(amount * 100);
  const timestamp = new Date().toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '');

  const signatureString = `${merchantId}|${password}|${version}|${orderId}|${amountInCents}|PKR|${timestamp}`;

  const signature = crypto
    .createHmac('sha256', password)
    .update(signatureString)
    .digest('hex')
    .toUpperCase();

  return signature;
}

/**
 * Generate Easypaisa HMAC signature
 * Easypaisa uses SHA256 HMAC with merchant secret
 */
export function generateEasypaisaSignature(
  merchantId: string,
  secret: string,
  orderId: string,
  amount: number
): string {
  // Easypaisa signature format: merchantID|transactionID|amount|secret
  const signatureString = `${merchantId}|${orderId}|${amount.toFixed(2)}|${secret}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureString)
    .digest('hex')
    .toUpperCase();

  return signature;
}

/**
 * Verify JazzCash webhook signature
 */
export function verifyJazzCashWebhookSignature(
  password: string,
  webhookData: Record<string, any>
): boolean {
  try {
    const signatureString = `${webhookData.pp_MerchantID}|${password}|${webhookData.pp_Version}|${webhookData.pp_TxnRefNo}|${webhookData.pp_Amount}|${webhookData.pp_TxnCurrency}|${webhookData.pp_TxnDateTime}`;

    const expectedSignature = crypto
      .createHmac('sha256', password)
      .update(signatureString)
      .digest('hex')
      .toUpperCase();

    return timingSafeEqualHex(
      expectedSignature,
      webhookData.pp_SecureHash || ''
    );
  } catch (error) {
    console.error('JazzCash signature verification error:', error);
    return false;
  }
}

/**
 * Verify Easypaisa webhook signature
 */
export function verifyEasypaisaWebhookSignature(
  secret: string,
  webhookData: Record<string, any>
): boolean {
  try {
    const signatureString = `${webhookData.merchantID}|${webhookData.transactionID}|${webhookData.amount}|${secret}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureString)
      .digest('hex')
      .toUpperCase();

    return timingSafeEqualHex(expectedSignature, webhookData.signature || '');
  } catch (error) {
    console.error('Easypaisa signature verification error:', error);
    return false;
  }
}

/**
 * Verify a generic webhook HMAC-SHA256 signature over the raw request body.
 * Used to authenticate POST /api/payment/verify so that only a party holding
 * PAYMENT_WEBHOOK_SECRET can mark an order as paid.
 * Uses a constant-time comparison to avoid timing attacks.
 */
export function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  signature: string
): boolean {
  try {
    if (!secret || !signature) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')
      .toLowerCase();

    const provided = signature.toLowerCase().replace(/^sha256=/, '');

    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);

    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

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
