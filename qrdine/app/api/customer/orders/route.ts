import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { validateCustomerSession } from "@/lib/session";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { emitSocketEvent } from "@/lib/socket-emitter";
import { invalidateMenuCache } from "@/lib/redis";
import { generateOrderNumber } from "@/lib/order-number";

// Thrown inside the order transaction when an atomic stock decrement fails,
// so the whole order rolls back and we can return a clean 422.
class OversellError extends Error {
  constructor(public itemName: string) {
    super(`Not enough stock for ${itemName}`);
    this.name = "OversellError";
  }
}

const placeOrderSchema = z.object({
  items: z.array(
    z.object({
      menu_item_id: z.string().min(1),
      quantity: z.number().int().min(1).max(20),
      customizations: z.record(z.string(), z.string()).optional(),
      note: z.string().max(200).optional(),
    })
  ).min(1).max(30),
  notes: z.string().max(500).optional(),
});


export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (!sessionToken) return error("Session required", 401);

    const session = await validateCustomerSession(sessionToken);
    if (!session) return error("Session expired — please re-scan the QR code", 401);

    // customer_id is optional — set after OTP identity verification
    const customerId = cookieStore.get("customer_id")?.value ?? null;

    const body: unknown = await request.json();
    const parsed = placeOrderSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { restaurantId, tableId } = session;

    const menuItemIds = parsed.data.items.map((i) => i.menu_item_id);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurant_id: restaurantId,
        is_available: true,
      },
      select: { id: true, name: true, price: true, is_available: true, stock_quantity: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      const foundIds = new Set(menuItems.map((i) => i.id));
      const missing = menuItemIds.filter((id) => !foundIds.has(id));
      return error(`Some items are no longer available: ${missing.join(", ")}`, 422);
    }

    // Check stock for all items
    const itemMap = new Map(menuItems.map((i) => [i.id, i]));
    for (const cartItem of parsed.data.items) {
      const dbItem = itemMap.get(cartItem.menu_item_id);
      if (dbItem && dbItem.stock_quantity !== null && dbItem.stock_quantity < cartItem.quantity) {
        return error(`Not enough stock for ${dbItem.name}. Only ${dbItem.stock_quantity} left.`, 422);
      }
    }

    const dbSession = await prisma.customerSession.findUnique({
      where: { session_token: sessionToken },
      select: { id: true },
    });
    if (!dbSession) return error("Session not found", 401);

    // Reuse active order on this table if one exists (same table, unpaid, not served/cancelled)
    const existingOrder = await prisma.order.findFirst({
      where: {
        table_id: tableId,
        restaurant_id: restaurantId,
        status: { notIn: ["served", "cancelled"] },
        payment_status: "unpaid",
      },
      select: { id: true, order_number: true, created_at: true },
    });

    const isNewOrder = !existingOrder;
    const orderNumber = isNewOrder ? await generateOrderNumber(restaurantId) : existingOrder.order_number;

    const order = await prisma.$transaction(async (tx) => {
      // Mark table occupied
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: { status: "occupied" },
      });

      let targetOrderId: string;
      let orderCreatedAt: Date = new Date();

      if (isNewOrder) {
        const newOrder = await tx.order.create({
          data: {
            restaurant_id: restaurantId,
            table_id: tableId,
            session_id: dbSession.id,
            order_number: orderNumber,
            status: "pending",
            payment_status: "unpaid",
            notes: parsed.data.notes || null,
            ...(customerId ? { customer_id: customerId } : {}),
          },
        });
        targetOrderId = newOrder.id;
        orderCreatedAt = newOrder.created_at;
      } else {
        targetOrderId = existingOrder.id;
        orderCreatedAt = existingOrder.created_at;
        // Append notes if provided
        if (parsed.data.notes) {
          await tx.order.update({
            where: { id: targetOrderId },
            data: { notes: parsed.data.notes },
          });
        }
      }

      if (isNewOrder) {
        // New order: batch create all items in one query (no duplicates possible)
        const orderItemsData = parsed.data.items.map((cartItem) => {
          const menuItem = itemMap.get(cartItem.menu_item_id)!;
          return {
            order_id: targetOrderId,
            menu_item_id: cartItem.menu_item_id,
            restaurant_id: restaurantId,
            item_name: menuItem.name,
            item_price: menuItem.price,
            quantity: cartItem.quantity,
            customizations: cartItem.customizations
              ? (cartItem.customizations as import("@prisma/client").Prisma.InputJsonValue)
              : undefined,
          };
        });
        await tx.orderItem.createMany({ data: orderItemsData });
      } else {
        // Appending to existing order: must check for duplicates to merge quantities.
        // N+1 is unavoidable here — we need per-item findFirst to decide update vs create.
        for (const cartItem of parsed.data.items) {
          const menuItem = itemMap.get(cartItem.menu_item_id)!;
          const existing = await tx.orderItem.findFirst({
            where: { order_id: targetOrderId, menu_item_id: cartItem.menu_item_id },
            select: { id: true, quantity: true },
          });
          if (existing) {
            await tx.orderItem.update({
              where: { id: existing.id },
              data: { quantity: existing.quantity + cartItem.quantity },
            });
          } else {
            await tx.orderItem.create({
              data: {
                order_id: targetOrderId,
                menu_item_id: cartItem.menu_item_id,
                restaurant_id: restaurantId,
                item_name: menuItem.name,
                item_price: menuItem.price,
                quantity: cartItem.quantity,
                customizations: cartItem.customizations
                  ? (cartItem.customizations as import("@prisma/client").Prisma.InputJsonValue)
                  : undefined,
              },
            });
          }
        }
      }

      // Atomic conditional stock decrement — the only correct guard against
      // oversell under concurrency. updateMany with a `gte` guard decrements only
      // if enough stock is still present at WRITE time; count===0 means another
      // concurrent order took it first, so we abort and roll the whole order back.
      const stockItems = parsed.data.items.filter(
        (cartItem) => itemMap.get(cartItem.menu_item_id)!.stock_quantity !== null
      );
      for (const cartItem of stockItems) {
        const dbItem = itemMap.get(cartItem.menu_item_id)!;
        const res = await tx.menuItem.updateMany({
          where: {
            id: cartItem.menu_item_id,
            restaurant_id: restaurantId,
            stock_quantity: { gte: cartItem.quantity },
          },
          data: { stock_quantity: { decrement: cartItem.quantity } },
        });
        if (res.count === 0) {
          throw new OversellError(dbItem.name);
        }
      }
      // Flip availability off for anything that just hit zero.
      if (stockItems.length > 0) {
        await tx.menuItem.updateMany({
          where: {
            id: { in: stockItems.map((ci) => ci.menu_item_id) },
            stock_quantity: { lte: 0 },
          },
          data: { is_available: false },
        });
      }

      return { id: targetOrderId, order_number: orderNumber, created_at: orderCreatedAt };
    });

    // Invalidate menu cache — stock levels changed, is_available may have toggled
    const restaurantSlug = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { slug: true },
    });
    await invalidateMenuCache(restaurantId, restaurantSlug?.slug ?? "");

    // Fetch table name for socket payload
    const table = await prisma.restaurantTable.findUnique({
      where: { id: tableId },
      select: { table_number: true },
    });

    // Emit socket event — non-fatal if Redis is down
    await emitSocketEvent({
      type: "order:created",
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId,
        tableId,
        tableName: `Table ${table?.table_number ?? "?"}`,
        items: parsed.data.items.map((cartItem) => {
          const menuItem = itemMap.get(cartItem.menu_item_id)!;
          return {
            name: menuItem.name,
            quantity: cartItem.quantity,
            price: Number(menuItem.price),
          };
        }),
        notes: parsed.data.notes ?? null,
        createdAt: order.created_at.toISOString(),
      },
    });

    return success(
      {
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId,
        tableId,
      },
      201
    );
  } catch (err) {
    if (err instanceof OversellError) {
      return error(`Sorry — "${err.itemName}" just ran out or doesn't have enough left. Please adjust your order.`, 422);
    }
    console.error("[POST /api/customer/orders]", err);
    return error("Failed to place order", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (!sessionToken) return error("Session required", 401);

    const session = await validateCustomerSession(sessionToken);
    if (!session) return error("Session expired", 401);

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");

    if (orderId) {
      const order = await prisma.order.findFirst({
        where: { id: orderId, restaurant_id: session.restaurantId },
        include: { items: true },
      });
      if (!order) return error("Order not found", 404);
      return success(order);
    }

    const dbSession = await prisma.customerSession.findUnique({
      where: { session_token: sessionToken },
      select: { id: true },
    });

    const orders = await prisma.order.findMany({
      where: { session_id: dbSession?.id, restaurant_id: session.restaurantId },
      include: { items: true },
      orderBy: { created_at: "desc" },
    });

    return success(orders);
  } catch (err) {
    console.error("[GET /api/customer/orders]", err);
    return error("Failed to fetch orders", 500);
  }
}
