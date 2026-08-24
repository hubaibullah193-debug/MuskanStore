/**
 * Payment URL Generators
 * Generate payment gateway URLs for JazzCash and Easypaisa
 */

import { signReturnUrl } from './signature';

/**
 * Generate JazzCash payment URL
 */
export function generateJazzCashUrl(
  orderId: string,
  amount: number,
  email?: string
): string {
  const merchantId = process.env.JAZZ_CASH_MERCHANT_ID || "";
  const password = process.env.JAZZ_CASH_PP_PASSWORD || "";
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://www.jazzcash.com.pk/ApplicationAPI/API/Purchase/DoMwk"
      : "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Purchase/DoMwk";

  // Sign the return URL so the callback handler can confirm the redirect
  // originated from us. Fail-closed: if the secret is missing the URL is left
  // unsigned and the callback will reject it (see callbacks/jazz-cash/route.ts).
  const returnUrlSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  let sig = "";
  let ts = "";
  if (returnUrlSecret) {
    const signed = signReturnUrl(orderId, "jazz_cash", returnUrlSecret);
    sig = signed.sig;
    ts = signed.ts;
  } else {
    console.error(
      "PAYMENT_WEBHOOK_SECRET is not configured; JazzCash return URL cannot be signed"
    );
  }

  const callbackUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  }/api/payment/callbacks/jazz-cash?orderId=${orderId}&method=jazz_cash&sig=${sig}&ts=${ts}`;

  // Build request (simplified; actual implementation would use proper HMAC signing)
  const params: Record<string, string> = {
    pp_MerchantID: merchantId,
    pp_Version: "1.1",
    pp_TxnRefNo: orderId,
    pp_Amount: (amount * 100).toString(), // In cents
    pp_TxnCurrency: "PKR",
    pp_TxnExpiryDateTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    pp_BillingPhoneNumber: "92",
    pp_BillingCity: "Karachi",
    pp_BillingCountry: "PK",
    pp_ReturnURL: callbackUrl,
    pp_Language: "EN",
  };

  if (email) {
    params.pp_BillingEmail = email;
  }

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
  const merchantId = process.env.EASYPAISA_MERCHANT_ID || "";
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://www.easypaisa.com.pk/payment"
      : "https://sandbox.easypaisa.com.pk/payment";

  const returnUrlSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  let sig = "";
  let ts = "";
  if (returnUrlSecret) {
    const signed = signReturnUrl(orderId, "easypaisa", returnUrlSecret);
    sig = signed.sig;
    ts = signed.ts;
  } else {
    console.error(
      "PAYMENT_WEBHOOK_SECRET is not configured; Easypaisa return URL cannot be signed"
    );
  }

  const callbackUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  }/api/payment/callbacks/easypaisa?orderId=${orderId}&method=easypaisa&sig=${sig}&ts=${ts}`;

  // Build request (simplified)
  const params: Record<string, string> = {
    merchantID: merchantId,
    transactionID: orderId,
    amount: amount.toString(),
    currency: "PKR",
    returnURL: callbackUrl,
    cancelURL: callbackUrl,
  };

  if (email) {
    params.email = email;
  }

  const urlParams = new URLSearchParams(params);
  return `${baseUrl}?${urlParams.toString()}`;
}
