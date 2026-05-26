import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { validateCustomerSession } from "@/lib/session";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { emitSocketEvent } from "@/lib/socket-emitter";
import { invalidateMenuCache } from "@/lib/redis";

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

async function getNextOrderNumber(restaurantId: string): Promise<string> {
  const prefix = "ORD-";

  const last = await prisma.order.findFirst({
    where: { restaurant_id: restaurantId, order_number: { startsWith: prefix } },
    orderBy: { order_number: "desc" },
    select: { order_number: true },
  });

  let nextNum = 1;
  if (last) {
    const parts = last.order_number.split("-");
    const numPart = parts[1];
    if (numPart) {
      const num = parseInt(numPart, 10);
      if (!isNaN(num)) {
        nextNum = num + 1;
      }
    }
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

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
    const itemMap = new Map(menuItems.map((i) => [i.id, i as any]));
    for (const cartItem of parsed.data.items) {
      const dbItem = itemMap.get(cartItem.menu_item_id);
      if (dbItem?.stock_quantity !== null && dbItem.stock_quantity < cartItem.quantity) {
        return error(`Not enough stock for ${dbItem.name}. Only ${dbItem.stock_quantity} left.`, 422);
      }
    }

    const dbSession = await prisma.customerSession.findUnique({
      where: { session_token: sessionToken },
      select: { id: true },
    });
    if (!dbSession) return error("Session not found", 401);

    const orderNumber = await getNextOrderNumber(restaurantId);

    const order = await prisma.$transaction(async (tx) => {
      // Mark table occupied
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: { status: "occupied" },
      });

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

      await tx.orderItem.createMany({
        data: parsed.data.items.map((cartItem) => {
          const menuItem = itemMap.get(cartItem.menu_item_id)!;
          return {
            order_id: newOrder.id,
            menu_item_id: cartItem.menu_item_id,
            restaurant_id: restaurantId,
            item_name: menuItem.name,
            item_price: menuItem.price,
            quantity: cartItem.quantity,
            customizations: cartItem.customizations ? (cartItem.customizations as import("@prisma/client").Prisma.InputJsonValue) : undefined,
          };
        }),
      });

      // Deduct stock for each item
      for (const cartItem of parsed.data.items) {
        const dbItem = itemMap.get(cartItem.menu_item_id)!;
        if (dbItem.stock_quantity !== null) {
          const newStock = dbItem.stock_quantity - cartItem.quantity;
          await tx.menuItem.update({
            where: { id: cartItem.menu_item_id },
            data: {
              stock_quantity: newStock,
              is_available: newStock > 0
            }
          });
        }
      }

      return newOrder;
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
