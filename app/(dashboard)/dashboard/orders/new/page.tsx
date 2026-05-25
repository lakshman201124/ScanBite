import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ManualOrderBuilder } from "@/components/admin/ManualOrderBuilder";

export default async function NewOrderPage() {
  const session = await auth();
  if (!session?.user?.restaurantId) redirect("/login");
  const restaurantId = session.user.restaurantId;

  const [tables, menuItems] = await Promise.all([
    prisma.restaurantTable.findMany({
      where:   { restaurant_id: restaurantId },
      select:  { id: true, table_number: true, status: true },
      orderBy: { table_number: "asc" },
    }),

    prisma.menuItem.findMany({
      where:   { restaurant_id: restaurantId, is_available: true },
      select: {
        id: true, name: true, price: true,
        description: true, image_url: true, food_type: true,
        category: { select: { name: true } },
      },
      orderBy: [{ category: { sort_order: "asc" } }, { sort_order: "asc" }],
    }),
  ]);

  const categories = [...new Set(menuItems.map((i) => i.category.name))];

  return (
    <main className="adm-main" style={{ height: "100vh", overflow: "hidden" }}>
      <ManualOrderBuilder
        restaurantId={restaurantId}
        tables={tables}
        items={menuItems.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(i.price),
          description: i.description,
          image_url: i.image_url,
          is_vegetarian: i.food_type === "veg",
          category: i.category,
        }))}
        categories={categories}
      />
    </main>
  );
}
