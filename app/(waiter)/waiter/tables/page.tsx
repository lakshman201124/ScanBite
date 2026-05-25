import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { TablesManager } from "@/components/admin/TablesManager";

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

async function getWaiterContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get("chef_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "waiter" && payload.role !== "chef") return null;
    return { restaurantId: payload.restaurantId as string };
  } catch {
    return null;
  }
}

export default async function WaiterTablesPage() {
  const ctx = await getWaiterContext();
  if (!ctx) redirect("/chef-login");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: ctx.restaurantId },
    select: { slug: true },
  });

  return (
    <TablesManager
      restaurantId={ctx.restaurantId}
      restaurantSlug={restaurant?.slug ?? ""}
    />
  );
}
