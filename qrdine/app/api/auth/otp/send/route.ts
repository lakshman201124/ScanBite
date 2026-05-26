import { NextRequest } from "next/server";
import { z } from "zod";
import { success, error, validationError } from "@/lib/api-response";
import { sendOtp } from "@/lib/otp";
import { sendOtpSms } from "@/lib/notifications/sms";

const schema = z.object({
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number"),
  type: z.enum(["admin_signup", "chef", "customer", "staff_signup"]),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { phone } = parsed.data;

    const otpResult = await sendOtp(phone);
    if (!otpResult.success) return error(otpResult.error ?? "Failed to send OTP", 429);

    const smsResult = await sendOtpSms(phone, otpResult.code!);
    if (!smsResult.success) return error("Failed to deliver OTP. Try again.", 500);

    return success({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("[POST /api/auth/otp/send]", err);
    return error("Failed to send OTP", 500);
  }
}
