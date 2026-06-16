import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateMenuCache } from "@/lib/redis";
import { updateCategorySchema } from "@/lib/validations/menu";
import { success, error, validationError, unauthorized } from "@/lib/api-response";

async function getSlug(restaurantId: string): Promise<string> {
  const r = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } });
  return r?.slug ?? "";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const { id } = await params;

    const body: unknown = await request.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return error("Category not found", 404);
    const exists = await prisma.menuCategory.findFirst({ where: { id, restaurant_id: restaurantId } });
    if (!exists) return error("Category not found", 404);

    const category = await prisma.menuCategory.update({
      where: { id, restaurant_id: restaurantId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
        ...(parsed.data.image_url !== undefined && { image_url: parsed.data.image_url || null }),
        ...(parsed.data.sort_order !== undefined && { sort_order: parsed.data.sort_order }),
        ...(parsed.data.is_active !== undefined && { is_active: parsed.data.is_active }),
      },
    });

    await invalidateMenuCache(restaurantId, await getSlug(restaurantId));
    return success(category);
  } catch (err) {
    console.error("[PATCH /api/menu/categories/:id]", err);
    return error("Failed to update category", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const { id } = await params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return error("Category not found", 404);
    const exists = await prisma.menuCategory.findFirst({ where: { id, restaurant_id: restaurantId } });
    if (!exists) return error("Category not found", 404);

    const itemCount = await prisma.menuItem.count({
      where: { category_id: id, restaurant_id: restaurantId },
    });

    if (itemCount > 0) {
      await prisma.menuCategory.update({
        where: { id, restaurant_id: restaurantId },
        data: { is_active: false },
      });
      await invalidateMenuCache(restaurantId, await getSlug(restaurantId));
      return success({ soft_deleted: true, item_count: itemCount });
    }

    await prisma.menuCategory.delete({
      where: { id, restaurant_id: restaurantId },
    });

    await invalidateMenuCache(restaurantId, await getSlug(restaurantId));
    return success({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/menu/categories/:id]", err);
    return error("Failed to delete category", 500);
  }
}
