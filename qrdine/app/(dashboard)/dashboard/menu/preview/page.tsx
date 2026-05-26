import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { MenuPreviewClient } from "@/components/admin/MenuPreviewClient";

export default async function MenuPreviewPage() {
  const session = await auth();
  if (!session?.user?.restaurantId) redirect("/login");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId },
    select: { id: true, slug: true, name: true, logo_url: true },
  });

  return (
    <MenuPreviewClient
      restaurantId={restaurant?.id ?? ""}
      restaurantSlug={restaurant?.slug ?? ""}
      restaurantName={restaurant?.name ?? ""}
      restaurantLogo={restaurant?.logo_url ?? null}
    />
  );
}
