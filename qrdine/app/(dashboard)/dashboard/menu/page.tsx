import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MenuManager } from "@/components/admin/MenuManager";

export default async function MenuPage() {
  const session = await auth();
  if (!session?.user?.restaurantId) redirect("/login");

  return <MenuManager restaurantId={session.user.restaurantId} />;
}
