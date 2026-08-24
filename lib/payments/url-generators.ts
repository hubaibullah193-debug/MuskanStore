/**
 * Payment URL Generators
 * Generate payment gateway redirect URLs for JazzCash and Easypaisa.
 *
 * Both generators sign the outbound request:
 *  - JazzCash: pp_SecureHash (HMAC-SHA256 over Integrity-Salt-prefixed sorted
 *    parameter values). Requires JAZZ_CASH_INTEGRITY_SALT.
 *  - Easypaisa: merchantHashedReq (HMAC-SHA256). Requires EASYPAISA_SECRET.
 * They also HMAC-sign the return URL so the callback can prove the redirect
 * originated from us (PAYMENT_WEBHOOK_SECRET).
 */

import { signReturnUrl, generateJazzCashSecureHash, generateEasypaisaSignature } from './signature';

/**
 * Format a Date as JazzCash's YYYYMMDDHHMMSS transaction timestamp.
 */
function formatJazzCashDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}` +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Generate JazzCash payment URL (Page Redirection v1.1)
 */
export function generateJazzCashUrl(
  orderId: string,
  amount: number,
  email?: string
): string {
  const merchantId = process.env.JAZZ_CASH_MERCHANT_ID || '';
  const password = process.env.JAZZ_CASH_PP_PASSWORD || '';
  const integritySalt = process.env.JAZZ_CASH_INTEGRITY_SALT || '';
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://www.jazzcash.com.pk/ApplicationAPI/API/Purchase/DoMwk'
      : 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Purchase/DoMwk';

  if (!integritySalt) {
    console.error(
      'JAZZ_CASH_INTEGRITY_SALT is not configured; JazzCash SecureHash cannot be computed'
    );
  }

  // Sign the return URL so the callback handler can confirm the redirect
  // originated from us. Fail-closed: if the secret is missing the URL is left
  // unsigned and the callback will reject it (see callbacks/jazz-cash/route.ts).
  const returnUrlSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  let sig = '';
  let ts = '';
  if (returnUrlSecret) {
    const signed = signReturnUrl(orderId, 'jazz_cash', returnUrlSecret);
    sig = signed.sig;
    ts = signed.ts;
  } else {
    console.error(
      'PAYMENT_WEBHOOK_SECRET is not configured; JazzCash return URL cannot be signed'
    );
  }

  const callbackUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  }/api/payment/callbacks/jazz-cash?orderId=${orderId}&method=jazz_cash&sig=${sig}&ts=${ts}`;

  const txnDateTime = formatJazzCashDateTime(new Date());
  const txnExpiryDateTime = formatJazzCashDateTime(
    new Date(Date.now() + 10 * 60 * 1000)
  );

  // Standard JazzCash Page Redirection v1.1 request parameter set.
  // NOTE: pp_TxnType ("MPAY") should be confirmed against the merchant's
  // enabled transaction types; it may be "MWALLET"/"MPAY" depending on the
  // onboarded product. Flagged as a go-live verification item.
  const params: Record<string, string> = {
    pp_Version: '1.1',
    pp_TxnType: 'MPAY',
    pp_Language: 'EN',
    pp_MerchantID: merchantId,
    pp_Password: password,
    pp_TxnRefNo: orderId,
    pp_Amount: Math.round(amount * 100).toString(), // JazzCash expects paisa (integer)
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_TxnExpiryDateTime: txnExpiryDateTime,
    pp_BillReference: orderId,
    pp_Description: `Order ${orderId}`,
    pp_ReturnURL: callbackUrl,
  };

  if (email) {
    params.pp_BillingEmail = email;
  }

  // Compute the SecureHash over all parameters (sorted A-Z, salt-prefixed).
  // pp_SecureHash is excluded from its own input automatically.
  params.pp_SecureHash = generateJazzCashSecureHash(params, integritySalt);

  const urlParams = new URLSearchParams(params);
  return `${baseUrl}?${urlParams.toString()}`;
}

/**
 * Generate Easypaisa payment URL
 */
export function generateEasypaisaUrl(
  orderId: string,
  amount: number,
  email?: string
): string {
  const merchantId = process.env.EASYPAISA_MERCHANT_ID || '';
  const secret = process.env.EASYPAISA_SECRET || '';
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://easypay.easypaisa.com.pk/easypay/Index.jsf'
      : 'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf';

  const returnUrlSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  let sig = '';
  let ts = '';
  if (returnUrlSecret) {
    const signed = signReturnUrl(orderId, 'easypaisa', returnUrlSecret);
    sig = signed.sig;
    ts = signed.ts;
  } else {
    console.error(
      'PAYMENT_WEBHOOK_SECRET is not configured; Easypaisa return URL cannot be signed'
    );
  }

  const callbackUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  }/api/payment/callbacks/easypaisa?orderId=${orderId}&method=easypaisa&sig=${sig}&ts=${ts}`;

  // Build request (simplified; Easypaisa's exact production field set/order
  // must be confirmed against the merchant-provided PDF).
  const params: Record<string, string> = {
    merchantID: merchantId,
    transactionID: orderId,
    amount: amount.toString(),
    currency: 'PKR',
    returnURL: callbackUrl,
    cancelURL: callbackUrl,
  };

  if (email) {
    params.email = email;
  }

  // Sign the request so the gateway can authenticate it. The production
  // signature parameter name / encoding must be confirmed against the merchant
  // PDF; "merchantHashedReq" is used here to match this project's verifier.
  if (secret) {
    params.merchantHashedReq = generateEasypaisaSignature(
      merchantId,
      secret,
      orderId,
      amount
    );
  } else {
    console.error(
      'EASYPAISA_SECRET is not configured; Easypaisa request cannot be signed'
    );
  }

  const urlParams = new URLSearchParams(params);
  return `${baseUrl}?${urlParams.toString()}`;
}
