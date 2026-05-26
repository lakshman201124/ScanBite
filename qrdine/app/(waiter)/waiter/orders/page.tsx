import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { OrdersPageClient } from "@/components/orders/OrdersPageClient";
import type { LiveOrder } from "@/hooks/useOrderUpdates";

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

async function getWaiterContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get("chef_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "waiter" && payload.role !== "chef") return null;
    return { restaurantId: payload.restaurantId as string, userId: payload.sub as string };
  } catch {
    return null;
  }
}

async function getActiveOrders(restaurantId: string): Promise<LiveOrder[]> {
  const orders = await prisma.order.findMany({
    where: { restaurant_id: restaurantId, status: { notIn: ["served", "cancelled"] } },
    include: {
      items: { select: { item_name: true, item_price: true, quantity: true } },
      table: { select: { table_number: true } },
    },
    orderBy: { created_at: "asc" },
    take: 100,
  });

  return orders.map(o => ({
    orderId: o.id,
    orderNumber: o.order_number,
    restaurantId: o.restaurant_id,
    tableId: o.table_id,
    tableName: `Table ${o.table?.table_number ?? "?"}`,
    items: o.items.map(i => ({ name: i.item_name, quantity: i.quantity, price: Number(i.item_price) })),
    notes: o.notes,
    status: o.status,
    createdAt: o.created_at.toISOString(),
    updatedAt: o.updated_at.toISOString(),
  }));
}

export default async function WaiterOrdersPage() {
  const ctx = await getWaiterContext();
  if (!ctx) redirect("/chef-login");

  const [initialOrders, tables, menuItems] = await Promise.all([
    getActiveOrders(ctx.restaurantId),
    prisma.restaurantTable.findMany({
      where: { restaurant_id: ctx.restaurantId },
      select: { id: true, table_number: true, status: true },
      orderBy: { table_number: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { restaurant_id: ctx.restaurantId, is_available: true },
      select: {
        id: true, name: true, price: true, description: true,
        image_url: true, food_type: true,
        category: { select: { name: true } },
      },
      orderBy: [{ category: { sort_order: "asc" } }, { sort_order: "asc" }],
    }),
  ]);

  const categories = [...new Set(menuItems.map(i => i.category.name))];

  return (
    <div style={{ maxWidth: 1400 }}>
      <OrdersPageClient
        restaurantId={ctx.restaurantId}
        token={ctx.userId}
        initialOrders={initialOrders}
        tables={tables.map(t => ({ id: t.id, table_number: String(t.table_number), status: t.status }))}
        menuItems={menuItems.map(i => ({
          id: i.id, name: i.name, price: Number(i.price),
          description: i.description, image_url: i.image_url,
          is_vegetarian: i.food_type === "veg",
          category: i.category,
        }))}
        categories={categories}
      />
    </div>
  );
}
