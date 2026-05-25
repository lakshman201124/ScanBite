import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);
    const restaurantId = session.user.restaurantId;

    const items = await prisma.menuItem.findMany({
      where: { restaurant_id: restaurantId },
      include: { category: true },
      orderBy: { name: 'asc' }
    });

    return success(items);
  } catch (err) {
    console.error("[GET /api/admin/inventory]", err);
    return error("Failed to fetch inventory", 500);
  }
}

const updateSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    stock_quantity: z.number().nullable(),
    low_stock_threshold: z.number(),
    price: z.number().optional()
  }))
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);
    const restaurantId = session.user.restaurantId;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return error("Invalid data", 400);

    for (const item of parsed.data.items) {
      await prisma.menuItem.updateMany({
        where: { id: item.id, restaurant_id: restaurantId },
        data: {
          stock_quantity: item.stock_quantity,
          low_stock_threshold: item.low_stock_threshold,
          ...(item.price !== undefined ? { price: item.price } : {})
        }
      });
    }

    return success({ message: "Inventory updated successfully" });
  } catch (err) {
    console.error("[PATCH /api/admin/inventory]", err);
    return error("Failed to update inventory", 500);
  }
}
