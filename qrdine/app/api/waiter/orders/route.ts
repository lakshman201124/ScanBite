import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveStaffAuth } from "@/lib/waiter-auth";
import { generateOrderNumber } from "@/lib/order-number";
import { z } from "zod";

const createSchema = z.object({
  tableId: z.string().uuid(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().min(1),
    notes: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.order.findMany({
      where: {
        restaurant_id: ctx.restaurantId,
        status: { notIn: ["served", "cancelled"] },
      },
      include: {
        items: { select: { item_name: true, item_price: true, quantity: true } },
        table: { select: { table_number: true } },
      },
      orderBy: { created_at: "asc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: orders.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        tableId: o.table_id,
        tableName: `T${o.table?.table_number ?? "?"}`,
        status: o.status,
        items: o.items.map(i => ({
          name: i.item_name,
          quantity: i.quantity,
          price: Number(i.item_price),
        })),
        notes: o.notes,
        createdAt: o.created_at.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[GET /api/waiter/orders]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body: unknown = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { tableId, items, notes } = parsed.data;

    // Verify table belongs to this restaurant
    const table = await prisma.restaurantTable.findUnique({
      where: { id: tableId, restaurant_id: ctx.restaurantId },
      select: { id: true, status: true },
    });
    if (!table) return NextResponse.json({ success: false, error: "Table not found" }, { status: 404 });

    // Fetch menu items (scoped to restaurant)
    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurant_id: ctx.restaurantId,
        is_available: true,
      },
      select: { id: true, name: true, price: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json({ success: false, error: "One or more items unavailable" }, { status: 400 });
    }

    const menuMap = new Map(menuItems.map(m => [m.id, m]));
    const orderNumber = await generateOrderNumber(ctx.restaurantId);

    const order = await prisma.order.create({
      data: {
        restaurant_id: ctx.restaurantId,
        table_id: tableId,
        order_number: orderNumber,
        notes: notes ?? null,
        waiter_id: ctx.role === "waiter" ? ctx.userId : null,
        items: {
          create: items.map(i => {
            const mi = menuMap.get(i.menuItemId)!;
            return {
              menu_item_id: i.menuItemId,
              restaurant_id: ctx.restaurantId,
              item_name: mi.name,
              item_price: mi.price,
              quantity: i.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });

    // Mark table occupied
    if (table.status === "available") {
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: "occupied" },
      });
    }

    return NextResponse.json({ success: true, data: { orderId: order.id, orderNumber: order.order_number } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/waiter/orders]", err);
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}
