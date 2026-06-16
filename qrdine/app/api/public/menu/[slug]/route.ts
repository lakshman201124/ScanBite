export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { redis, CACHE_TTL } from "@/lib/redis";
import { success, error } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const cacheKey = `menu:${slug}`;
    const cached = await redis.get(cacheKey);
    if (cached) return success(cached);

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug, is_active: true },
      select: { id: true, name: true, slug: true, logo_url: true, brand_color: true, cgst_rate: true, sgst_rate: true },
    });

    if (!restaurant) return error("Restaurant not found", 404);

    const categories = await prisma.menuCategory.findMany({
      where: { restaurant_id: restaurant.id, is_active: true },
      orderBy: { sort_order: "asc" },
      include: {
        items: {
          where: { is_available: true },
          orderBy: { sort_order: "asc" },
          include: { customizations: true },
        },
      },
    });

    const menu = { restaurant, categories };
    // Cache under both keys so either invalidation path hits
    await redis.setex(`menu:${restaurant.id}`, CACHE_TTL.MENU, JSON.stringify(menu));
    await redis.setex(`menu:${slug}`, CACHE_TTL.MENU, JSON.stringify(menu));

    return success(menu);
  } catch (err) {
    console.error("[GET /api/public/menu/:slug]", err);
    return error("Failed to fetch menu", 500);
  }
}
