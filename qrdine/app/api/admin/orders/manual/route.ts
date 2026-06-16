export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { emitSocketEvent } from "@/lib/socket-emitter";
import { resolveStaffAuth } from "@/lib/waiter-auth";
import { v4 as uuidv4 } from "uuid";
import { generateOrderNumber } from "@/lib/order-number";

const schema = z.object({
  table_id: z.string().min(1),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    menu_item_id: z.string().min(1),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().max(200).optional(),
  })).min(1),
});

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

    // Check for an existing active order on this table before generating a number.
    // generateOrderNumber uses Redis INCR (atomic) so it cannot run inside a Prisma transaction.
    const existingOrder = await prisma.order.findFirst({
      where: {
        table_id,
        restaurant_id: restaurantId,
        status: { notIn: ["served", "cancelled"] },
        payment_status: "unpaid",
      },
      select: { id: true, order_number: true, created_at: true },
    });

    const isNewOrder = !existingOrder;
    const orderNumber = isNewOrder
      ? await generateOrderNumber(restaurantId)
      : existingOrder.order_number;

    const { orderId, orderCreatedAt } = await prisma.$transaction(async (tx) => {

      await tx.restaurantTable.update({
        where: { id: table_id },
        data: { status: "occupied" },
      });

      let orderId: string;
      let orderCreatedAt: Date;

      if (isNewOrder) {
        const adminSession = await tx.customerSession.create({
          data: {
            restaurant_id: restaurantId,
            table_id,
            session_token: uuidv4(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        const newOrder = await tx.order.create({
          data: {
            restaurant_id: restaurantId,
            table_id,
            order_number: orderNumber,
            status: "pending",
            session_id: adminSession.id,
            notes: notes ?? null,
            payment_status: "unpaid",
          },
        });
        orderId = newOrder.id;
        orderCreatedAt = newOrder.created_at;
      } else {
        orderId = existingOrder.id;
        orderCreatedAt = existingOrder.created_at;
        if (notes) {
          await tx.order.update({
            where: { id: orderId },
            data: { notes },
          });
        }
      }

      if (isNewOrder) {
        // New order: batch create all items in one query (no duplicates possible)
        const orderItemsData = items.map((item) => {
          const menuItem = itemMap.get(item.menu_item_id)!;
          return {
            order_id: orderId,
            restaurant_id: restaurantId,
            menu_item_id: item.menu_item_id,
            item_name: menuItem.name,
            item_price: menuItem.price,
            quantity: item.quantity,
          };
        });
        await tx.orderItem.createMany({ data: orderItemsData });
      } else {
        // Appending to existing order: must check for duplicates to merge quantities.
        // N+1 is unavoidable here — we need per-item findFirst to decide update vs create.
        for (const item of items) {
          const menuItem = itemMap.get(item.menu_item_id)!;
          const existing = await tx.orderItem.findFirst({
            where: { order_id: orderId, menu_item_id: item.menu_item_id },
            select: { id: true, quantity: true },
          });
          if (existing) {
            await tx.orderItem.update({
              where: { id: existing.id },
              data: { quantity: existing.quantity + item.quantity },
            });
          } else {
            await tx.orderItem.create({
              data: {
                order_id: orderId,
                restaurant_id: restaurantId,
                menu_item_id: item.menu_item_id,
                item_name: menuItem.name,
                item_price: menuItem.price,
                quantity: item.quantity,
              },
            });
          }
        }
      }

      return { orderId, orderCreatedAt };
    });

    emitSocketEvent({
      type: "order:created",
      data: {
        orderId,
        orderNumber,
        restaurantId,
        tableId: table_id,
        tableName: `Table ${table.table_number}`,
        items: items.map((item) => {
          const menuItem = itemMap.get(item.menu_item_id)!;
          return { name: menuItem.name, quantity: item.quantity, price: Number(menuItem.price) };
        }),
        notes: notes ?? null,
        createdAt: orderCreatedAt.toISOString(),
      },
    });

    return success({ orderId, orderNumber }, 201);
  } catch (err) {
    console.error("[POST /api/admin/orders/manual]", err);
    return error("Failed to create order", 500);
  }
}
