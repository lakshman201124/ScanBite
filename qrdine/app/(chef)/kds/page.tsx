import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { KDSGrid } from "@/components/kds/KDSGrid";
import type { LiveOrder } from "@/hooks/useOrderUpdates";

const CHEF_JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-secret"
);

async function getChefContext(): Promise<{ restaurantId: string; restaurantName: string } | null> {
  const cookieStore = await cookies();
  const chefToken = cookieStore.get("chef_token")?.value;
  if (!chefToken) return null;

  try {
    const { payload } = await jwtVerify(chefToken, CHEF_JWT_SECRET);
    const restaurantId = payload.restaurantId as string | undefined;
    if (!restaurantId) return null;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    });

    return { restaurantId, restaurantName: restaurant?.name ?? "Restaurant" };
  } catch {
    return null;
  }
}

async function getKitchenOrders(restaurantId: string): Promise<LiveOrder[]> {
  const orders = await prisma.order.findMany({
    where: {
      restaurant_id: restaurantId,
      status: { in: ["pending", "confirmed", "preparing"] },
    },
    include: {
      items: { select: { item_name: true, item_price: true, quantity: true } },
      table: { select: { table_number: true } },
    },
    orderBy: { created_at: "asc" },
    take: 50,
  });

  return orders.map(o => ({
    orderId: o.id,
    orderNumber: o.order_number,
    restaurantId: o.restaurant_id,
    tableId: o.table_id,
    tableName: `Table ${o.table?.table_number ?? "?"}`,
    items: o.items.map(i => ({
      name: i.item_name,
      quantity: i.quantity,
      price: Number(i.item_price),
    })),
    notes: o.notes,
    status: o.status,
    createdAt: o.created_at.toISOString(),
    updatedAt: o.updated_at.toISOString(),
  }));
}

export default async function KDSPage() {
  const ctx = await getChefContext();
  if (!ctx) redirect("/chef-login");

  const initialOrders = await getKitchenOrders(ctx.restaurantId);

  return (
    <KDSGrid
      restaurantId={ctx.restaurantId}
      restaurantName={ctx.restaurantName}
      initialOrders={initialOrders}
    />
  );
}
