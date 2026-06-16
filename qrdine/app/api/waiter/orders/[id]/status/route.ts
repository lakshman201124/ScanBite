export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveStaffAuth } from "@/lib/waiter-auth";
import { z } from "zod";

const schema = z.object({ status: z.literal("served") });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Waiters can only mark orders as served." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id, restaurant_id: ctx.restaurantId },
      select: { id: true, status: true },
    });

    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    if (order.status !== "ready") {
      return NextResponse.json(
        { success: false, error: "Only orders with status 'ready' can be marked as served." },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "served" },
      select: { id: true, status: true, order_number: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/waiter/orders/[id]/status]", err);
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}
