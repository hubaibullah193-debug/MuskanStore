/**
 * Payment Gateway Signature Utilities
 * HMAC signing for JazzCash and Easypaisa
 */

import crypto from 'crypto';

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

    return expectedSignature === (webhookData.pp_SecureHash || '').toUpperCase();
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

    return expectedSignature === (webhookData.signature || '').toUpperCase();
  } catch (error) {
    console.error('Easypaisa signature verification error:', error);
    return false;
  }
}
