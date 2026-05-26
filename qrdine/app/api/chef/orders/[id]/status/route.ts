import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { emitSocketEvent } from "@/lib/socket-emitter";
import type { OrderStatus } from "@/types";

const CHEF_JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

async function getChefRestaurantId(): Promise<string | null> {
  const cookieStore = await cookies();
  const chefToken = cookieStore.get("chef_token")?.value;
  if (!chefToken) return null;
  try {
    const { payload } = await jwtVerify(chefToken, CHEF_JWT_SECRET);
    return (payload.restaurantId as string | undefined) ?? null;
  } catch { return null; }
}

const CHEF_VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ["confirmed", "preparing"],
  confirmed: ["preparing"],
  preparing: ["ready"],
  ready:     ["served"],
};

const patchSchema = z.object({
  status: z.enum(["confirmed", "preparing", "ready", "served"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getChefRestaurantId();
    if (!restaurantId) return error("Unauthorized", 401);

    const { id: orderId } = await params;

    const body: unknown = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { status: newStatus } = parsed.data;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurant_id: restaurantId },
      include: { table: { select: { table_number: true } }, items: { select: { item_name: true, item_price: true, quantity: true } } },
    });
    if (!order) return error("Order not found", 404);

    const allowed = CHEF_VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return error(`Cannot transition from ${order.status} to ${newStatus}`, 400);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus as OrderStatus },
    });

    await emitSocketEvent({
      type: "order:updated",
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId: order.restaurant_id,
        tableId: order.table_id,
        tableName: `Table ${order.table?.table_number ?? "?"}`,
        status: newStatus,
        updatedBy: "chef",
        updatedAt: updated.updated_at.toISOString(),
      },
    });

    return success({ orderId, status: newStatus });
  } catch (err) {
    console.error("[PATCH /api/chef/orders/[id]/status]", err);
    return error("Failed to update order status", 500);
  }
}
