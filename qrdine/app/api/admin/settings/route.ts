import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { invalidateMenuCache, redis } from "@/lib/redis";

const settingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional().nullable().or(z.literal("")),
  gstin: z.string().optional().nullable().or(z.literal("")),
  logo_url: z.string().url().optional().nullable().or(z.literal("")),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  cgst_rate: z.number().min(0).max(50).optional(),
  sgst_rate: z.number().min(0).max(50).optional(),
  plan: z.enum(["starter", "growth", "pro"]).optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: {
        name: true, logo_url: true, brand_color: true,
        cgst_rate: true, sgst_rate: true, address: true,
        phone: true, gstin: true, plan: true, slug: true,
        staff_login_code: true,
      },
    });

    if (!restaurant) return error("Restaurant not found", 404);
    return success(restaurant);
  } catch (err) {
    console.error("[GET /api/admin/settings]", err);
    return error("Failed to fetch settings", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);

    const body: unknown = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid data", 400);

    const restaurant = await prisma.restaurant.update({
      where: { id: session.user.restaurantId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.address !== undefined && { address: parsed.data.address }),
        ...(parsed.data.phone !== undefined && { phone: parsed.data.phone || null }),
        ...(parsed.data.gstin !== undefined && { gstin: parsed.data.gstin || null }),
        ...(parsed.data.logo_url !== undefined && { logo_url: parsed.data.logo_url || null }),
        ...(parsed.data.brand_color !== undefined && { brand_color: parsed.data.brand_color }),
        ...(parsed.data.cgst_rate !== undefined && { cgst_rate: parsed.data.cgst_rate }),
        ...(parsed.data.sgst_rate !== undefined && { sgst_rate: parsed.data.sgst_rate }),
        ...(parsed.data.plan !== undefined && { plan: parsed.data.plan }),
      },
      select: { slug: true },
    });

    // Invalidate restaurant profile cache and menu cache (brand_color is included in menu payload)
    await Promise.all([
      invalidateMenuCache(session.user.restaurantId, restaurant.slug),
      redis.del(`restaurant:${restaurant.slug}`),
    ]);

    return success({ message: "Settings updated" });
  } catch (err) {
    console.error("[PATCH /api/admin/settings]", err);
    return error("Failed to update settings", 500);
  }
}
