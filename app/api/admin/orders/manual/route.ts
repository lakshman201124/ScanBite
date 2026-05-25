import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { emitSocketEvent } from "@/lib/socket-emitter";
import { resolveStaffAuth } from "@/lib/waiter-auth";
import { v4 as uuidv4 } from "uuid";

const schema = z.object({
  table_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    menu_item_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().max(200).optional(),
  })).min(1),
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

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveStaffAuth(req);
    if (!ctx) return error("Unauthorized", 401);
    if (ctx.role === "chef") return error("Forbidden", 403);

    const restaurantId = ctx.restaurantId;
    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { table_id, notes, items } = parsed.data;

    // Validate table belongs to this restaurant
    const table = await prisma.restaurantTable.findFirst({
      where: { id: table_id, restaurant_id: restaurantId },
      select: { id: true, table_number: true },
    });
    if (!table) {
      const restaurantExists = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
      console.error(`[manual order] Table not found: table_id=${table_id}, restaurantId=${restaurantId}, restaurantExistsInPrisma=${!!restaurantExists}`);
      if (!restaurantExists) {
        return error("Restaurant setup incomplete — please complete onboarding first", 404);
      }
      // List actual tables to diagnose mismatch
      const actualTables = await prisma.restaurantTable.findMany({
        where: { restaurant_id: restaurantId },
        select: { id: true, table_number: true },
        take: 5,
      });
      console.error(`[manual order] Tables for restaurant: ${JSON.stringify(actualTables)}`);
      return error("Table not found", 404);
    }

    // Validate + snapshot all menu items
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: items.map((i) => i.menu_item_id) },
        restaurant_id: restaurantId,
        is_available: true,
      },
      select: { id: true, name: true, price: true },
    });

    if (menuItems.length !== items.length) {
      return error("One or more items are unavailable or not found", 400);
    }

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Generate order number
    const orderNumber = await getNextOrderNumber(restaurantId);

    // Create a real CustomerSession for admin manual orders (required by FK constraint)
    const adminSession = await prisma.customerSession.create({
      data: {
        restaurant_id: restaurantId,
        table_id,
        session_token: uuidv4(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h for admin orders
      },
    });

    // Mark table occupied
    await prisma.restaurantTable.update({
      where: { id: table_id },
      data: { status: "occupied" },
    });

    // Create order + items atomically
    const order = await prisma.order.create({
      data: {
        restaurant_id: restaurantId,
        table_id,
        order_number: orderNumber,
        status: "pending",
        session_id: adminSession.id,
        notes: notes ?? null,
        payment_status: "unpaid",
        items: {
          create: items.map((item) => {
            const menuItem = itemMap.get(item.menu_item_id)!;
            return {
              restaurant_id: restaurantId,
              menu_item_id: item.menu_item_id,
              item_name: menuItem.name,
              item_price: menuItem.price,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: {
        items: { select: { item_name: true, item_price: true, quantity: true } },
        table: { select: { table_number: true } },
      },
    });

    // Emit to KDS + orders page
    await emitSocketEvent({
      type: "order:created",
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId,
        tableId: table_id,
        tableName: `Table ${table.table_number}`,
        items: order.items.map((i) => ({
          name: i.item_name,
          quantity: i.quantity,
          price: Number(i.item_price),
        })),
        notes: order.notes,
        createdAt: order.created_at.toISOString(),
      },
    });

    return success({ orderId: order.id, orderNumber: order.order_number }, 201);
  } catch (err) {
    console.error("[POST /api/admin/orders/manual]", err);
    return error("Failed to create order", 500);
  }
}
