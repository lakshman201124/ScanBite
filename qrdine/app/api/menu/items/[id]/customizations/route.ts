export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateMenuCache } from "@/lib/redis";
import { z } from "zod";
import { success, error, unauthorized } from "@/lib/api-response";

const customizationSchema = z.object({
  name: z.string().min(1).max(100),
  group_type: z.enum(["single", "multi", "required"]).default("single"),
  is_required: z.boolean().default(false),
  options: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(100),
    price_delta: z.number().min(0),
  })).min(1),
});

const saveCustomizationsSchema = z.object({
  customizations: z.array(customizationSchema),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const { id } = await params;

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurant_id: session.user.restaurantId },
      select: { id: true },
    });
    if (!item) return error("Item not found", 404);

    const customizations = await prisma.itemCustomization.findMany({
      where: { menu_item_id: id, restaurant_id: session.user.restaurantId },
    });
    return success(customizations);
  } catch (err) {
    console.error("[GET customizations]", err);
    return error("Failed to fetch customizations", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const { id: menuItemId } = await params;

    const item = await prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurant_id: restaurantId },
      select: { id: true },
    });
    if (!item) return error("Item not found", 404);

    const body: unknown = await req.json();
    const parsed = saveCustomizationsSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid", 400);

    // Replace all customizations atomically
    await prisma.$transaction([
      prisma.itemCustomization.deleteMany({
        where: { menu_item_id: menuItemId, restaurant_id: restaurantId },
      }),
      ...parsed.data.customizations.map(c =>
        prisma.itemCustomization.create({
          data: {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            name: c.name,
            options: c.options as import("@prisma/client").Prisma.InputJsonValue,
            is_required: c.is_required,
          },
        })
      ),
    ]);

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } });
    if (restaurant?.slug) await invalidateMenuCache(restaurantId, restaurant.slug);

    return success({ saved: parsed.data.customizations.length });
  } catch (err) {
    console.error("[POST customizations]", err);
    return error("Failed to save customizations", 500);
  }
}
