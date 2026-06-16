import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin, verifyPin } from "@/lib/pin";
import { validatePinStrength } from "@/lib/pin-validation";
import { findUserBySetupCode } from "@/lib/setup-code";
import { rateLimiters, checkRateLimit } from "@/lib/rate-limit";
import { getAuthSecretKey } from "@/lib/secret";
import { SignJWT } from "jose";
import { z } from "zod";

const JWT_SECRET = getAuthSecretKey();

const schema = z.object({
  restaurantId: z.string().uuid(),
  code: z.string().min(4).max(20),
  pin: z.string().min(6).max(8).regex(/^\d+$/, "PIN must be digits only"),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
    }
    const { restaurantId, pin } = parsed.data;
    const code = parsed.data.code.trim().toUpperCase();

    // Rate limit redemption per restaurant (5 / 15 min) — brute force is infeasible.
    const rl = await checkRateLimit(rateLimiters.setupRedeem, restaurantId);
    if (!rl.success) {
      const waitMin = Math.ceil((rl.reset - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, error: `Too many attempts. Try again in ${waitMin} minute${waitMin === 1 ? "" : "s"}.` },
        { status: 429 }
      );
    }

    // Enforce PIN strength before doing anything else.
    const pinCheck = validatePinStrength(pin);
    if (!pinCheck.valid) {
      return NextResponse.json({ success: false, error: pinCheck.error ?? "Weak PIN." }, { status: 400 });
    }

    // Confirm the restaurant is real and active (scopes the whole operation).
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId, is_active: true },
      select: { id: true, name: true },
    });
    if (!restaurant) {
      return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
    }

    const pending = await findUserBySetupCode(restaurantId, code);
    if (!pending) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired setup code. Ask your admin for a new one." },
        { status: 401 }
      );
    }

    // PIN must be unique among active staff in this restaurant (defense in depth).
    const others = await prisma.user.findMany({
      where: {
        restaurant_id: restaurantId,
        role: { in: ["chef", "waiter"] },
        is_active: true,
        pin_hash: { not: null },
        id: { not: pending.id },
      },
      select: { pin_hash: true },
    });
    for (const o of others) {
      if (o.pin_hash && (await verifyPin(pin, o.pin_hash))) {
        return NextResponse.json(
          { success: false, error: "That PIN is already in use here. Please choose a different one." },
          { status: 409 }
        );
      }
    }

    const pinHash = await hashPin(pin);
    const staff = await prisma.user.update({
      where: { id: pending.id },
      data: {
        pin_hash: pinHash,
        is_active: true,
        setup_code_hash: null,
        setup_code_expires_at: null,
        login_attempts: 0,
        locked_until: null,
      },
      select: { id: true, name: true, role: true, restaurant_id: true },
    });

    // Mint the staff token — 8h chef / 12h waiter.
    const expiry = staff.role === "chef" ? "8h" : "12h";
    const token = await new SignJWT({
      sub: staff.id,
      restaurantId: staff.restaurant_id,
      role: staff.role,
      name: staff.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiry)
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      data: { role: staff.role, name: staff.name, restaurantId: staff.restaurant_id, restaurantName: restaurant.name },
    });
    response.cookies.set("chef_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: staff.role === "chef" ? 8 * 3600 : 12 * 3600,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("[auth/staff/setup]", err);
    return NextResponse.json({ success: false, error: "Setup failed. Please try again." }, { status: 500 });
  }
}
