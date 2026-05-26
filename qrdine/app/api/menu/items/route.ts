import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tenantScope } from "@/lib/tenant";
import { invalidateMenuCache } from "@/lib/redis";
import { createItemSchema } from "@/lib/validations/menu";
import { success, error, validationError, unauthorized } from "@/lib/api-response";

async function getSlug(restaurantId: string): Promise<string> {
  const r = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } });
  return r?.slug ?? "";
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    const items = await prisma.menuItem.findMany({
      where: {
        ...tenantScope(restaurantId),
        ...(categoryId ? { category_id: categoryId } : {}),
      },
      orderBy: { sort_order: "asc" },
      include: { customizations: true, category: { select: { id: true, name: true } } },
    });

    return success(items);
  } catch (err) {
    console.error("[GET /api/menu/items]", err);
    return error("Failed to fetch items", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;

    const body: unknown = await request.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const category = await prisma.menuCategory.findFirst({
      where: { id: parsed.data.category_id, restaurant_id: restaurantId },
    });
    if (!category) return error("Category not found", 404);

    const maxOrder = await prisma.menuItem.aggregate({
      where: { ...tenantScope(restaurantId), category_id: parsed.data.category_id },
      _max: { sort_order: true },
    });
    const sort_order = parsed.data.sort_order ?? (maxOrder._max.sort_order ?? 0) + 1;

    const item = await prisma.menuItem.create({
      data: {
        ...tenantScope(restaurantId),
        category_id: parsed.data.category_id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: parsed.data.price,
        image_url: parsed.data.image_url || null,
        food_type: parsed.data.food_type,
        is_available: parsed.data.is_available ?? true,
        is_featured: parsed.data.is_featured ?? false,
        prep_time_minutes: parsed.data.prep_time_minutes ?? null,
        sort_order,
      },
    });

    await invalidateMenuCache(restaurantId, await getSlug(restaurantId));
    return success(item, 201);
  } catch (err) {
    console.error("[POST /api/menu/items]", err);
    return error("Failed to create item", 500);
  }
}
