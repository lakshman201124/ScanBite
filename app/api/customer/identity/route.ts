import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { customerIdentitySchema } from "@/lib/validations/restaurant";
import { error, validationError } from "@/lib/api-response";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = customerIdentitySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { phone, code, name } = parsed.data;

    const otpResult = await verifyOtp(phone, code);
    if (!otpResult.success) return error(otpResult.error ?? "Invalid OTP", 401);

    const normalized = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;

    const existing = await prisma.customer.findUnique({ where: { phone: normalized } });

    const customer = existing
      ? await prisma.customer.update({ where: { phone: normalized }, data: { name, updated_at: new Date() } })
      : await prisma.customer.create({ data: { id: uuidv4(), phone: normalized, name } });

    const response = NextResponse.json(
      { success: true, data: { customerId: customer.id, name: customer.name, phone: customer.phone, isReturning: !!existing } },
      { status: 200 }
    );

    const cookieOpts = { secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 30 * 24 * 60 * 60, path: "/" };

    response.cookies.set("customer_id", customer.id, { ...cookieOpts, httpOnly: true });
    response.cookies.set("customer_name", customer.name, { ...cookieOpts, httpOnly: false });
    response.cookies.set("customer_phone", customer.phone, { ...cookieOpts, httpOnly: false });

    return response;
  } catch (err) {
    console.error("[POST /api/customer/identity]", err);
    return error("Failed to verify identity", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const customerId = request.cookies.get("customer_id")?.value;
    if (!customerId) return NextResponse.json({ success: false, data: null }, { status: 200 });

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, phone: true },
    });

    return NextResponse.json({ success: true, data: customer ?? null }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/customer/identity]", err);
    return NextResponse.json({ success: false, data: null }, { status: 200 });
  }
}
