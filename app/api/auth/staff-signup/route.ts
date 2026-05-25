import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffSignupSchema } from "@/lib/validations/restaurant";
import { error, validationError } from "@/lib/api-response";
import { hashPin } from "@/lib/pin";
import { verifyOtp } from "@/lib/otp";
import { SignJWT } from "jose";
import { UserRole } from "@prisma/client";

const CHEF_JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-secret"
);

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = staffSignupSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { name, phone, role, restaurantSlug, code, pin } = parsed.data;

    // Verify OTP first — phone ownership confirmed once on signup
    const otpResult = await verifyOtp(phone, code);
    if (!otpResult.success) return error(otpResult.error ?? "Invalid OTP", 401);

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug.toLowerCase().trim() },
      select: { id: true, name: true },
    });
    if (!restaurant) {
      return error("Restaurant not found. Check the code and try again.", 404);
    }

    const existing = await prisma.user.findFirst({ where: { phone } });
    if (existing) {
      return error("An account with this phone number already exists. Please log in instead.", 409);
    }

    const pinHash = await hashPin(pin);

    const staff = await prisma.user.create({
      data: {
        restaurant_id: restaurant.id,
        name: name.trim(),
        phone,
        email: `${phone.replace(/\D/g, "")}@staff.scanbite.app`,
        role: role as UserRole,
        pin_hash: pinHash,
        is_active: true,
      },
    });

    const token = await new SignJWT({
      sub: staff.id,
      restaurantId: staff.restaurant_id,
      role: staff.role,
      name: staff.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(CHEF_JWT_SECRET);

    const response = NextResponse.json(
      {
        success: true,
        data: {
          restaurantId: staff.restaurant_id,
          restaurantName: restaurant.name,
          role: staff.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set("chef_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[staff-signup]", err);
    return error("Signup failed. Please try again.", 500);
  }
}
