import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPinLoginSchema } from "@/lib/validations/restaurant";
import { error, validationError } from "@/lib/api-response";
import { verifyPin } from "@/lib/pin";
import { SignJWT } from "jose";

const CHEF_JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-secret"
);

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = staffPinLoginSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { phone, pin } = parsed.data;

    const staff = await prisma.user.findFirst({
      where: { phone, role: { in: ["chef", "waiter"] }, is_active: true },
      include: { restaurant: true },
    });

    if (!staff) return error("No active staff account found for this number", 404);
    if (!staff.pin_hash) return error("PIN not set. Please sign up first.", 400);

    const valid = await verifyPin(pin, staff.pin_hash);
    if (!valid) return error("Incorrect PIN. Try again.", 401);

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
      { success: true, data: { restaurantId: staff.restaurant_id, role: staff.role } },
      { status: 200 }
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
    console.error("[chef-login]", err);
    return error("Login failed", 500);
  }
}
