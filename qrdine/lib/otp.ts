import { redis } from "@/lib/redis";

const OTP_TTL = 5 * 60; // 5 minutes
const RATE_LIMIT_TTL = 60 * 60; // 1 hour window
const MAX_SENDS_PER_HOUR = 3;
const MAX_VERIFY_ATTEMPTS = 3;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
}

export async function sendOtp(
  phone: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  const normalized = normalizePhone(phone);
  const rateKey = `otp:rate:${normalized}`;

  // Atomic increment — returns new value after increment
  const sends = await redis.incr(rateKey);
  if (sends === 1) {
    // First send in this window — set expiry
    await redis.expire(rateKey, RATE_LIMIT_TTL);
  }

  if (sends > MAX_SENDS_PER_HOUR) {
    return { success: false, error: "Too many OTP requests. Try again in an hour." };
  }

  const code = generateCode();
  await redis.set(`otp:${normalized}`, { code, attempts: 0 }, { ex: OTP_TTL });

  return { success: true, code };
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
