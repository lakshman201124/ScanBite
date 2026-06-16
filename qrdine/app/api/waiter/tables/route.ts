export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveStaffAuth } from "@/lib/waiter-auth";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const tables = await prisma.restaurantTable.findMany({
      where: { restaurant_id: ctx.restaurantId },
      select: {
        id: true,
        table_number: true,
        capacity: true,
        status: true,
        orders: {
          where: { status: { notIn: ["served", "cancelled"] } },
          select: { id: true, status: true, created_at: true, order_number: true },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
      orderBy: { table_number: "asc" },
    });

    return NextResponse.json({ success: true, data: tables });
  } catch (err) {
    console.error("[GET /api/waiter/tables]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch tables" }, { status: 500 });
  }
}
