import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { WaiterDashboard } from "@/components/waiter/WaiterDashboard";
import type { WaiterTable } from "@/components/waiter/WaiterTableGrid";
import type { WaiterOrder } from "@/components/waiter/WaiterOrderCard";
import { getAuthSecretKey } from "@/lib/secret";

const JWT_SECRET = getAuthSecretKey();

async function getWaiterCtx() {
  const cookieStore = await cookies();
  const token = cookieStore.get("chef_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "waiter" && payload.role !== "admin" && payload.role !== "super_admin") return null;
    return {
      restaurantId: payload.restaurantId as string,
      userId:       payload.sub as string,
      name:         (payload.name as string | undefined) ?? "Waiter",
    };
  } catch { return null; }
}

export default async function WaiterPage() {
  const ctx = await getWaiterCtx();
  if (!ctx) redirect("/staff-login");

  const [tablesRaw, ordersRaw, menuItemsRaw, restaurant] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { restaurant_id: ctx.restaurantId },
      select: {
        id: true, table_number: true, capacity: true, status: true,
        orders: {
          where: { status: { notIn: ["served", "cancelled"] } },
          select: { id: true, status: true, created_at: true, order_number: true },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
      orderBy: { table_number: "asc" },
    }),
    prisma.order.findMany({
      where: { restaurant_id: ctx.restaurantId, status: { notIn: ["served", "cancelled"] } },
      include: {
        items: { select: { item_name: true, item_price: true, quantity: true } },
        table: { select: { table_number: true } },
      },
      orderBy: { created_at: "asc" },
      take: 100,
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
    prisma.restaurant.findUnique({
      where: { id: ctx.restaurantId },
      select: { name: true },
    }),
  ]);

  const tables: WaiterTable[] = tablesRaw.map(t => ({
    id: t.id,
    table_number: String(t.table_number),
    capacity: t.capacity,
    status: t.status as "available" | "occupied" | "reserved",
    orders: t.orders.map(o => ({
      id: o.id,
      status: o.status,
      order_number: o.order_number,
      created_at: o.created_at.toISOString(),
    })),
  }));

  const orders: WaiterOrder[] = ordersRaw.map(o => ({
    id: o.id,
    orderNumber: o.order_number,
    tableId: o.table_id,
    tableName: `T${o.table?.table_number ?? "?"}`,
    status: o.status,
    items: o.items.map(i => ({ name: i.item_name, quantity: i.quantity, price: Number(i.item_price) })),
    notes: o.notes,
    createdAt: o.created_at.toISOString(),
  }));

  const menuItems = menuItemsRaw.map(i => ({
    id: i.id,
    name: i.name,
    price: Number(i.price),
    description: i.description,
    image_url: i.image_url,
    is_vegetarian: i.food_type === "veg",
    category: i.category,
  }));

  return (
    <WaiterDashboard
      restaurantId={ctx.restaurantId}
      restaurantName={restaurant?.name ?? "Restaurant"}
      userName={ctx.name}
      initialTables={tables}
      initialOrders={orders}
      menuItems={menuItems}
    />
  );
}
