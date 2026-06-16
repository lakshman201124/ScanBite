import twilio from "twilio";

function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
}

/**
 * Sends an OTP via WhatsApp using the Twilio WhatsApp sandbox/number.
 * Falls back to console.log in development when credentials are missing.
 */
export async function sendOtpSms(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromRaw = process.env.TWILIO_WHATSAPP_NUMBER ?? "+14155238886";
  const from = `whatsapp:${fromRaw.replace("whatsapp:", "")}`;

  // Dev fallback — log OTP to console when Twilio is not configured
  if (!accountSid || !authToken) {
    console.log(`\n[OTP DEV] ──────────────────────`);
    console.log(`  Phone : ${phone}`);
    console.log(`  Code  : ${code}`);
    console.log(`────────────────────────────────\n`);
    return { success: true };
  }

  const client = twilio(accountSid, authToken);
  const to = `whatsapp:${normalizePhone(phone)}`;

  try {
    await client.messages.create({
      from,
      to,
      body: `Your ScanBite verification code is: *${code}*\n\nValid for 5 minutes. Do not share this with anyone.`,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[otp:whatsapp] send failed:", message);
    // Dev fallback — requires explicit OTP_DEV_FALLBACK=true opt-in so this never
    // silently swallows failures in production even if NODE_ENV is misconfigured.
    if (process.env.OTP_DEV_FALLBACK === "true" && process.env.NODE_ENV !== "production") {
      console.log(`\n[OTP DEV FALLBACK] Twilio delivery failed — use this code:`);
      console.log(`  Phone : ${phone}`);
      console.log(`  Code  : ${code}`);
      console.log(`  Error : ${message}\n`);
      return { success: true };
    }
    return { success: false, error: message };
  }
}
