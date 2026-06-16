import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ code: z.string().min(1).max(20).toUpperCase() });

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid restaurant code." }, { status: 400 });
    }

    const { code } = parsed.data;

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [
          { staff_login_code: code },
          { slug: code.toLowerCase() },
        ],
        is_active: true,
      },
      select: { id: true, name: true, logo_url: true, staff_login_code: true },
    });

    // Intentionally vague — don't reveal whether code exists
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurant not found. Check your code and try again." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurantId:   restaurant.id,
        restaurantName: restaurant.name,
        logoUrl:        restaurant.logo_url ?? null,
      },
    });
  } catch (err) {
    console.error("[verify-restaurant]", err);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
