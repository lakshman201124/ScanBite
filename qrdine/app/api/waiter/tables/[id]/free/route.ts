export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveStaffAuth } from "@/lib/waiter-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const table = await prisma.restaurantTable.findUnique({
      where: { id, restaurant_id: ctx.restaurantId },
      select: { id: true, status: true },
    });
    if (!table) return NextResponse.json({ success: false, error: "Table not found" }, { status: 404 });

    const updated = await prisma.restaurantTable.update({
      where: { id },
      data: { status: "available" },
      select: { id: true, table_number: true, status: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[POST /api/waiter/tables/[id]/free]", err);
    return NextResponse.json({ success: false, error: "Failed to free table" }, { status: 500 });
  }
}
