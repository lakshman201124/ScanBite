import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { emitSocketEvent } from "@/lib/socket-emitter";
import { invalidateAdminOrdersCache } from "@/lib/redis";

const schema = z.object({
  orderIds: z.array(z.string().uuid()).min(2, "At least 2 orders required to merge"),
  restaurantId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);
    if (session.user.role === "chef") return error("Forbidden", 403);

    const restaurantId = session.user.restaurantId;

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { orderIds, restaurantId: reqRestaurantId } = parsed.data;

    // Ensure the request restaurantId matches the session restaurantId
    if (reqRestaurantId !== restaurantId) return error("Forbidden", 403);

    // Fetch all orders, verify ownership and that they are active (not served/cancelled)
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        restaurant_id: restaurantId,
        status: { notIn: ["served", "cancelled"] },
      },
      include: {
        items: true,
        table: { select: { table_number: true } },
      },
      orderBy: { created_at: "asc" },
    });

    if (orders.length !== orderIds.length) {
      return error("One or more orders not found, already completed, or do not belong to this restaurant", 400);
    }

    // All orders must be for the same table
    const tableIds = [...new Set(orders.map(o => o.table_id))];
    if (tableIds.length > 1) {
      return error("All orders must belong to the same table to merge", 400);
    }

    // The earliest order (first by created_at) is the target
    const [targetOrder, ...ordersToCancel] = orders;

    if (!targetOrder) return error("No target order found", 400);

    // Collect all items from the orders to cancel, to move into the target
    const itemsToMove = ordersToCancel.flatMap(o =>
      o.items.map(item => ({
        restaurant_id: restaurantId,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        item_price: item.item_price,
        quantity: item.quantity,
      }))
    );

    const cancelledOrderNumbers = ordersToCancel.map(o => o.order_number).join(", ");
    const mergeReason = `Merged orders ${cancelledOrderNumbers} into ${targetOrder.order_number}`;

    // Run the merge in a single transaction
    const updatedTarget = await prisma.$transaction(async (tx) => {
      // For each item from cancelled orders, either increment quantity on an existing item
      // or create a new item row in the target order
      for (const newItem of itemsToMove) {
        const existing = await tx.orderItem.findFirst({
          where: {
            order_id: targetOrder.id,
            menu_item_id: newItem.menu_item_id,
          },
        });

        if (existing) {
          await tx.orderItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + newItem.quantity },
          });
        } else {
          await tx.orderItem.create({
            data: {
              order_id: targetOrder.id,
              restaurant_id: newItem.restaurant_id,
              menu_item_id: newItem.menu_item_id,
              item_name: newItem.item_name,
              item_price: newItem.item_price,
              quantity: newItem.quantity,
            },
          });
        }
      }

      // Cancel the source orders
      for (const o of ordersToCancel) {
        await tx.order.update({
          where: { id: o.id },
          data: {
            status: "cancelled",
            notes: o.notes
              ? `${o.notes}\nCancellation: ${mergeReason}`
              : `Cancellation: ${mergeReason}`,
          },
        });
      }

      // Return the updated target with its items
      return tx.order.findFirst({
        where: { id: targetOrder.id },
        include: {
          items: true,
          table: { select: { table_number: true } },
        },
      });
    });

    if (!updatedTarget) return error("Merge failed: could not retrieve updated order", 500);

    // Emit cancelled events for all merged-away orders
    await Promise.all(
      ordersToCancel.map(o =>
        emitSocketEvent({
          type: "order:updated",
          data: {
            orderId: o.id,
            orderNumber: o.order_number,
            restaurantId,
            tableId: o.table_id,
            tableName: `Table ${o.table?.table_number ?? "?"}`,
            status: "cancelled",
            updatedBy: session.user.name ?? "admin",
            updatedAt: new Date().toISOString(),
            cancellationReason: mergeReason,
          },
        })
      )
    );

    // Emit updated event for target order
    await emitSocketEvent({
      type: "order:updated",
      data: {
        orderId: updatedTarget.id,
        orderNumber: updatedTarget.order_number,
        restaurantId,
        tableId: updatedTarget.table_id,
        tableName: `Table ${updatedTarget.table?.table_number ?? "?"}`,
        status: updatedTarget.status,
        updatedBy: session.user.name ?? "admin",
        updatedAt: updatedTarget.updated_at.toISOString(),
      },
    });

    await invalidateAdminOrdersCache(restaurantId);

    return success({
      mergedIntoOrderId: updatedTarget.id,
      mergedIntoOrderNumber: updatedTarget.order_number,
      cancelledOrderIds: ordersToCancel.map(o => o.id),
    });
  } catch (err) {
    console.error("[POST /api/admin/orders/merge]", err);
    return error("Failed to merge orders", 500);
  }
}
