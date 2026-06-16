import Razorpay from "razorpay";
import crypto from "crypto";

/**
 * v1 ships with counter payment only — the online Razorpay flow is dormant.
 * Routes use this to stay cleanly inert (503) until live keys are configured,
 * rather than throwing 500s from a half-initialised client.
 */
export function isOnlinePaymentsEnabled(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

// Lazy singleton — avoids module-load crash when keys are not yet configured
let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay keys not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
    }
    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpay;
}

// Backward-compat export — throws only when first used, not at import time
export const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop) {
    return (getRazorpay() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export function verifyPaymentSignature(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(razorpay_signature, "hex"));
  } catch {
    return false;
  }
}
