import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ restaurantId: z.string().uuid() });

/**
 * Public name-picker for staff login: given a verified restaurant, list the
 * active staff who have set a PIN. Names are not secret (§2.1a) — the PIN is the
 * credential. Scoped strictly to the one restaurant.
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
    }
    const { restaurantId } = parsed.data;

    const staff = await prisma.user.findMany({
      where: {
        restaurant_id: restaurantId,
        role: { in: ["chef", "waiter"] },
        is_active: true,
        pin_hash: { not: null },
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: { staff } });
  } catch (err) {
    console.error("[auth/staff/list]", err);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
