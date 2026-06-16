export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveStaffAuth } from "@/lib/waiter-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId, restaurant_id: ctx.restaurantId },
      select: { id: true, status: true, bill_requested: true },
    });

    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    if (order.bill_requested) {
      return NextResponse.json({ success: true, data: { alreadyRequested: true } });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { bill_requested: true },
    });

    return NextResponse.json({ success: true, data: { billRequested: true } });
  } catch (err) {
    console.error("[POST /api/waiter/bills/[orderId]/request]", err);
    return NextResponse.json({ success: false, error: "Failed to request bill" }, { status: 500 });
  }
}
