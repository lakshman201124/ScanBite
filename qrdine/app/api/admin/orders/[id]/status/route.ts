import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { resolveStaffAuth } from "@/lib/waiter-auth";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { emitSocketEvent } from "@/lib/socket-emitter";
import { invalidateAdminOrdersCache } from "@/lib/redis";
import { auditLog } from "@/lib/audit";
import { captureException } from "@/lib/sentry";
import type { OrderStatus } from "@/types";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ["confirmed", "cancelled", "served"],
  confirmed: ["preparing", "cancelled", "served"],
  preparing: ["ready", "cancelled", "served"],
  ready:     ["served"],
  served:    [],
  cancelled: [],
};

const patchSchema = z.object({
  status: z.enum(["confirmed", "preparing", "ready", "served", "cancelled"]),
  cancellation_reason: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return error("Unauthorized", 401);

    const { id: orderId } = await params;
    const restaurantId = ctx.restaurantId;

    const body: unknown = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { status: newStatus, cancellation_reason } = parsed.data;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurant_id: restaurantId },
      include: { table: { select: { table_number: true } }, items: { select: { item_name: true, item_price: true, quantity: true } } },
    });
    if (!order) return error("Order not found", 404);

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return error(`Cannot transition from ${order.status} to ${newStatus}`, 400);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus as OrderStatus,
        ...(cancellation_reason ? { notes: order.notes ? `${order.notes}\nCancellation: ${cancellation_reason}` : `Cancellation: ${cancellation_reason}` } : {}),
      },
    });

    // Auto-free table when order is served or cancelled
    if (newStatus === "served" || newStatus === "cancelled") {
      const activeCount = await prisma.order.count({
        where: {
          table_id: order.table_id,
          restaurant_id: order.restaurant_id,
          status: { notIn: ["served", "cancelled"] },
        },
      });
      if (activeCount === 0) {
        await prisma.restaurantTable.update({
          where: { id: order.table_id },
          data: { status: "available" },
        });
      }
    }

    emitSocketEvent({
      type: "order:updated",
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId: order.restaurant_id,
        tableId: order.table_id,
        tableName: `Table ${order.table?.table_number ?? "?"}`,
        status: newStatus,
        updatedBy: ctx.role,
        updatedAt: updated.updated_at.toISOString(),
        cancellationReason: cancellation_reason,
      },
    });

    await invalidateAdminOrdersCache(restaurantId);

    await auditLog({
      restaurantId,
      userId: ctx.userId,
      action: "order.status_changed",
      entityType: "order",
      entityId: orderId,
      oldValue: { status: order.status },
      newValue: {
        status: newStatus,
        ...(cancellation_reason ? { cancellation_reason } : {}),
      },
    });

    return success({ orderId, status: newStatus });
  } catch (err) {
    console.error("[PATCH /api/admin/orders/[id]/status]", err);
    captureException(err);
    return error("Failed to update order status", 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return error("Unauthorized", 401);

    const { id: orderId } = await params;
    const restaurantId = ctx.restaurantId;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurant_id: restaurantId },
      include: {
        items: true,
        table: { select: { table_number: true } },
        restaurant: { select: { name: true } },
      },
    });
    if (!order) return error("Order not found", 404);

    return success({
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      tableName: `Table ${order.table?.table_number ?? "?"}`,
      restaurantName: order.restaurant?.name ?? "",
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      items: order.items,
    });
  } catch (err) {
    console.error("[GET /api/admin/orders/[id]/status]", err);
    return error("Failed to fetch order", 500);
  }
}
