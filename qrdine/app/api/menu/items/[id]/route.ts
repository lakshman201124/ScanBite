import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateMenuCache } from "@/lib/redis";
import { updateItemSchema } from "@/lib/validations/menu";
import { success, error, validationError, unauthorized } from "@/lib/api-response";

async function getSlug(restaurantId: string): Promise<string> {
  const r = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } });
  return r?.slug ?? "";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const { id } = await params;

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurant_id: restaurantId },
      include: { customizations: true, category: { select: { id: true, name: true } } },
    });
    if (!item) return error("Item not found", 404);

    return success(item);
  } catch (err) {
    console.error("[GET /api/menu/items/:id]", err);
    return error("Failed to fetch item", 500);
  }
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
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return error("Item not found", 404);
    const exists = await prisma.menuItem.findFirst({ where: { id, restaurant_id: restaurantId } });
    if (!exists) return error("Item not found", 404);

    const item = await prisma.menuItem.update({
      where: { id, restaurant_id: restaurantId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
        ...(parsed.data.price !== undefined && { price: parsed.data.price }),
        ...(parsed.data.image_url !== undefined && { image_url: parsed.data.image_url || null }),
        ...(parsed.data.food_type !== undefined && { food_type: parsed.data.food_type }),
        ...(parsed.data.is_available !== undefined && { is_available: parsed.data.is_available }),
        ...(parsed.data.is_featured !== undefined && { is_featured: parsed.data.is_featured }),
        ...(parsed.data.prep_time_minutes !== undefined && { prep_time_minutes: parsed.data.prep_time_minutes }),
        ...(parsed.data.sort_order !== undefined && { sort_order: parsed.data.sort_order }),
        ...(parsed.data.category_id !== undefined && { category_id: parsed.data.category_id }),
      },
    });

    await invalidateMenuCache(restaurantId, await getSlug(restaurantId));
    return success(item);
  } catch (err) {
    console.error("[PATCH /api/menu/items/:id]", err);
    return error("Failed to update item", 500);
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
    if (!uuidRegex.test(id)) return error("Item not found", 404);
    const exists = await prisma.menuItem.findFirst({ where: { id, restaurant_id: restaurantId } });
    if (!exists) return error("Item not found", 404);

    await prisma.menuItem.delete({ where: { id, restaurant_id: restaurantId } });
    await invalidateMenuCache(restaurantId, await getSlug(restaurantId));
    return success({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/menu/items/:id]", err);
    return error("Failed to delete item", 500);
  }
}
