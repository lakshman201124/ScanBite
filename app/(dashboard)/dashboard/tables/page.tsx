import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TablesManager } from "@/components/admin/TablesManager";

export default async function TablesPage() {
  const session = await auth();
  if (!session?.user?.restaurantId) redirect("/login");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId },
    select: { slug: true },
  });

  return (
    <TablesManager
      restaurantId={session.user.restaurantId}
      restaurantSlug={restaurant?.slug ?? ""}
    />
  );
}
