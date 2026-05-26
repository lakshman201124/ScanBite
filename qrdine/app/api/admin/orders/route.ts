import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-response";

import { OrderStatus, Prisma } from "@prisma/client";

/**
 * GET /api/admin/orders
 *
 * Query params:
 *   table_id  – filter by table (optional)
 *   status    – "active" → excludes served/cancelled (optional)
 *   page      – pagination (default 1)
 *   limit     – items per page (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);
    const restaurantId = session.user.restaurantId;

    const { searchParams } = new URL(request.url);
    const tableId  = searchParams.get("table_id");
    const status   = searchParams.get("status");
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const skip     = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { restaurant_id: restaurantId };
    if (tableId) where.table_id = tableId;
    if (status === "active") {
      where.status = { notIn: ["served", "cancelled"] as OrderStatus[] };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            select: {
              item_name: true,
              item_price: true,
              quantity: true,
            },
          },
          table: {
            select: { table_number: true },
          },
          bill: true,
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Shape into a format that the floor view and bill panel both consume
    const data = orders.map((o) => ({
      id:           o.id,
      orderId:      o.id,
      tableId:      o.table_id,
      tableName:    o.table?.table_number ?? "",
      order_number: o.order_number,
      status:       o.status,
      payment_status: o.payment_status,
      items: o.items.map((i) => ({
        name:       i.item_name,
        item_name:  i.item_name,
        quantity:   i.quantity,
        price:      Number(i.item_price),
        item_price: Number(i.item_price),
      })),
      bill:      o.bill,
      createdAt: o.created_at.toISOString(),
      updatedAt: o.updated_at.toISOString(),
    }));

    return success(data);
  } catch (err) {
    console.error("[GET /api/admin/orders]", err);
    return error("Failed to fetch orders", 500);
  }
}
