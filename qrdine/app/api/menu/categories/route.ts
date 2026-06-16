export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tenantScope } from "@/lib/tenant";
import { invalidateMenuCache } from "@/lib/redis";
import { createCategorySchema, reorderCategoriesSchema } from "@/lib/validations/menu";
import { success, error, validationError, unauthorized } from "@/lib/api-response";

async function getSlug(restaurantId: string): Promise<string> {
  const r = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } });
  return r?.slug ?? "";
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;

    const categories = await prisma.menuCategory.findMany({
      where: { ...tenantScope(restaurantId) },
      orderBy: { sort_order: "asc" },
      include: { _count: { select: { items: true } } },
    });

    return success(categories);
  } catch (err) {
    console.error("[GET /api/menu/categories]", err);
    return error("Failed to fetch categories", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;

    const body: unknown = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const maxOrder = await prisma.menuCategory.aggregate({
      where: { ...tenantScope(restaurantId) },
      _max: { sort_order: true },
    });
    const sort_order = parsed.data.sort_order ?? (maxOrder._max.sort_order ?? 0) + 1;

    const category = await prisma.menuCategory.create({
      data: {
        ...tenantScope(restaurantId),
        name: parsed.data.name,
        description: parsed.data.description || null,
        image_url: parsed.data.image_url || null,
        sort_order,
        is_active: parsed.data.is_active ?? true,
      },
    });

    await invalidateMenuCache(restaurantId, await getSlug(restaurantId));
    return success(category, 201);
  } catch (err) {
    console.error("[POST /api/menu/categories]", err);
    return error("Failed to create category", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;

    const body: unknown = await request.json();
    const parsed = reorderCategoriesSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    await prisma.$transaction(
      parsed.data.items.map((item) =>
        prisma.menuCategory.update({
          where: { id: item.id, restaurant_id: restaurantId },
          data: { sort_order: item.sort_order },
        })
      )
    );

    await invalidateMenuCache(restaurantId, await getSlug(restaurantId));
    return success({ reordered: parsed.data.items.length });
  } catch (err) {
    console.error("[PATCH /api/menu/categories]", err);
    return error("Failed to reorder categories", 500);
  }
}
