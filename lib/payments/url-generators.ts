/**
 * Payment URL Generators
 * Generate payment gateway URLs for JazzCash and Easypaisa
 */

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

  const callbackUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  }/api/payment/verify?orderId=${orderId}&method=jazz_cash`;

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

  const callbackUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  }/api/payment/verify?orderId=${orderId}&method=easypaisa`;

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
