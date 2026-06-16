import Twilio from "twilio";
import { redis } from "@/lib/redis";

const OTP_TTL = 10 * 60; // 10 minutes
const RATE_LIMIT_TTL = 60 * 60; // 1 hour window
const MAX_SENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 3;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
}

async function sendViaTwilio(to: string, code: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!sid || !token || !from) {
    console.warn(`[OTP] Twilio not configured — code for ${to}: ${code}`);
    return;
  }

  const client = Twilio(sid, token);
  const body   = `Your ScanBite staff verification code is: *${code}*\nValid for 10 minutes. Do not share this code.`;

  // WhatsApp delivery
  if (from.startsWith("whatsapp:")) {
    await client.messages.create({ from, to: `whatsapp:${to}`, body });
  } else {
    await client.messages.create({ from, to, body });
  }
}

export async function sendOtp(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizePhone(phone);

  // Skip rate limiting and Twilio delivery in test/dev bypass mode
  if (process.env.TEST_OTP_BYPASS === "true" && process.env.NODE_ENV !== "production") {
    await redis.set(`otp:${normalized}`, { code: "000000", attempts: 0 }, { ex: OTP_TTL });
    console.log(`[OTP] Bypass active — code for ${normalized}: 000000`);
    return { success: true };
  }

  const rateKey = `otp:rate:${normalized}`;

  const sends = await redis.incr(rateKey);
  if (sends === 1) await redis.expire(rateKey, RATE_LIMIT_TTL);

  if (sends > MAX_SENDS_PER_HOUR) {
    return { success: false, error: "Too many OTP requests. Try again in an hour." };
  }

  const code = generateCode();
  await redis.set(`otp:${normalized}`, { code, attempts: 0 }, { ex: OTP_TTL });

  try {
    await sendViaTwilio(normalized, code);
  } catch (err) {
    console.error("[OTP] Twilio delivery failed:", err);
    return { success: false, error: "Failed to send OTP. Check phone number and try again." };
  }

  return { success: true };
}

export async function verifyOtp(
  phone: string,
  inputCode: string
): Promise<{ success: boolean; error?: string }> {
  // Test bypass: accept '000000' in non-production test environments
  if (
    process.env.TEST_OTP_BYPASS === "true" &&
    process.env.NODE_ENV !== "production" &&
    inputCode === "000000"
  ) {
    return { success: true };
  }

  const normalized = normalizePhone(phone);
  const otpKey = `otp:${normalized}`;

  const data = await redis.get<{ code: string; attempts: number }>(otpKey);

  if (!data) {
    return { success: false, error: "OTP expired. Please request a new one." };
  }

  if (data.attempts >= MAX_VERIFY_ATTEMPTS) {
    await redis.del(otpKey);
    return { success: false, error: "Too many attempts. Request a new OTP." };
  }

  if (data.code !== inputCode) {
    await redis.set(
      otpKey,
      { code: data.code, attempts: data.attempts + 1 },
      { ex: OTP_TTL }
    );
    const remaining = MAX_VERIFY_ATTEMPTS - data.attempts - 1;
    return {
      success: false,
      error: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // Correct — delete so it cannot be reused
  await redis.del(otpKey);
  return { success: true };
}
