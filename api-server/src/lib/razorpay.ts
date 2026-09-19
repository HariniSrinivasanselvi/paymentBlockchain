import Razorpay from "razorpay";
import { createHmac } from "node:crypto";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

/** True when live Razorpay credentials are present. When false, payments and
 * transfers are simulated locally so the app is fully demoable without keys. */
export const razorpayConfigured = Boolean(keyId && keySecret);

export const razorpayClient = razorpayConfigured
  ? new Razorpay({ key_id: keyId!, key_secret: keySecret! })
  : null;

export function getRazorpayKeyId(): string | null {
  return keyId ?? null;
}

/** Verifies the HMAC-SHA256 signature Razorpay attaches to a captured
 * payment: signature = HMAC(orderId + "|" + paymentId, keySecret). */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean {
  if (!keySecret) return false;
  const expected = createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return expected === razorpaySignature;
}

/** Verifies the HMAC-SHA256 signature Razorpay attaches to webhook payloads. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return expected === signature;
}
