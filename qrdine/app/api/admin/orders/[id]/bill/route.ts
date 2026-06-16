import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { resolveStaffAuth } from "@/lib/waiter-auth";
import { success, error } from "@/lib/api-response";
import { calculateBill } from "@/lib/billing";

/**
 * Authoritative billing state for one order, for the counter-checkout panel.
 * Returns the real payment status, the stored bill (if generated), and a
 * server-recomputed preview from DB prices + restaurant tax — so the UI never
 * computes money itself.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return error("Unauthorized", 401);
    const restaurantId = ctx.restaurantId;
    const { id: orderId } = await params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurant_id: restaurantId },
      include: {
        items: { select: { item_name: true, item_price: true, quantity: true } },
        bill: true,
        table: { select: { table_number: true } },
        restaurant: { select: { cgst_rate: true, sgst_rate: true } },
      },
    });
    if (!order) return error("Order not found", 404);

    const preview = calculateBill({
      items: order.items.map((i) => ({
        item_name: i.item_name,
        item_price: Number(i.item_price),
        quantity: i.quantity,
      })),
      cgst_rate: Number(order.restaurant.cgst_rate ?? 2.5),
      sgst_rate: Number(order.restaurant.sgst_rate ?? 2.5),
    });

    const bill = order.bill
      ? {
          id: order.bill.id,
          bill_number: order.bill.bill_number,
          subtotal: Number(order.bill.subtotal),
          cgst_rate: Number(order.bill.cgst_rate),
          sgst_rate: Number(order.bill.sgst_rate),
          cgst: Number(order.bill.cgst),
          sgst: Number(order.bill.sgst),
          discount: Number(order.bill.discount),
          tip: Number(order.bill.tip),
          total: Number(order.bill.total),
        }
      : null;

    return success({
      order_status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      table_number: order.table?.table_number ?? null,
      bill,
      preview,
    });
  } catch (err) {
    console.error("[GET /api/admin/orders/[id]/bill]", err);
    return error("Failed to load bill", 500);
  }
}
