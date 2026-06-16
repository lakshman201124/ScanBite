export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPin } from "@/lib/pin";
import { rateLimiters, checkRateLimit } from "@/lib/rate-limit";
import { getAuthSecretKey } from "@/lib/secret";
import { SignJWT } from "jose";
import { z } from "zod";

const JWT_SECRET = getAuthSecretKey();

const schema = z.object({
  restaurantId: z.string().uuid(),
  userId: z.string().uuid(),
  pin: z.string().min(6).max(8).regex(/^\d+$/, "PIN must be digits only"),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
    }

    const { restaurantId, userId, pin } = parsed.data;

    // Rate limit per restaurant (5 attempts / 15 min)
    const rl = await checkRateLimit(rateLimiters.staffLogin, restaurantId);
    if (!rl.success) {
      const waitMin = Math.ceil((rl.reset - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, error: `Too many attempts. Try again in ${waitMin} minute${waitMin === 1 ? "" : "s"}.` },
        { status: 429 }
      );
    }

    // Look up the chosen staff member, scoped strictly to THIS restaurant.
    const staff = await prisma.user.findFirst({
      where: {
        id: userId,
        restaurant_id: restaurantId,
        role: { in: ["chef", "waiter"] },
        is_active: true,
      },
      select: {
        id: true, name: true, role: true, pin_hash: true,
        locked_until: true, login_attempts: true, restaurant_id: true,
      },
    });

    if (!staff || !staff.pin_hash) {
      // Don't reveal whether the user exists / has set up
      return NextResponse.json({ success: false, error: "Invalid PIN." }, { status: 401 });
    }

    // Check lockout
    if (staff.locked_until && staff.locked_until > new Date()) {
      const waitMin = Math.ceil((staff.locked_until.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, error: `Account locked. Try again in ${waitMin} minute${waitMin === 1 ? "" : "s"}.` },
        { status: 423 }
      );
    }

    const valid = await verifyPin(pin, staff.pin_hash);

    if (!valid) {
      const newAttempts = (staff.login_attempts ?? 0) + 1;
      const lockData = newAttempts >= 5
        ? { login_attempts: newAttempts, locked_until: new Date(Date.now() + 15 * 60 * 1000) }
        : { login_attempts: newAttempts };

      await prisma.user.update({ where: { id: staff.id }, data: lockData });

      const remaining = Math.max(0, 5 - newAttempts);
      const msg = newAttempts >= 5
        ? "Too many failed attempts. Account locked for 15 minutes."
        : `Invalid PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;

      return NextResponse.json({ success: false, error: msg }, { status: 401 });
    }

    // Success — reset attempts, record login
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
    await prisma.user.update({
      where: { id: staff.id },
      data: { login_attempts: 0, locked_until: null, last_login_at: new Date(), last_login_ip: ip },
    });

    // Mint JWT — 8h chef, 12h waiter
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
      data: { role: staff.role, name: staff.name, restaurantId: staff.restaurant_id },
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
    console.error("[staff/login]", err);
    return NextResponse.json({ success: false, error: "Login failed." }, { status: 500 });
  }
}
