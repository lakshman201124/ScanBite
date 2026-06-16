export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { resolveStaffAuth } from "@/lib/waiter-auth";
import { success, error } from "@/lib/api-response";
import { calculateBill, generateBillNumber } from "@/lib/billing";
import { emitSocketEvent } from "@/lib/socket-emitter";
import { auditLog } from "@/lib/audit";
import { captureException } from "@/lib/sentry";
import { z } from "zod";

/**
 * Counter checkout (v1). Staff (admin/waiter) settle a bill at the counter.
 * This is the SOLE source of truth for "paid" in v1 — online payment routes are
 * dormant. It is atomic and idempotent:
 *   - ensures a bill exists (recomputed server-side from DB prices + restaurant tax),
 *   - marks the order paid with the offline method used,
 *   - frees the table,
 * all in one transaction. Calling it twice never double-bills or errors.
 */
const schema = z.object({
  payment_method: z.enum(["cash", "card", "upi"]).default("cash"),
  discount_percent: z.number().min(0).max(100).optional(),
  tip_amount: z.number().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return error("Unauthorized", 401);
    if (ctx.role === "chef") return error("Forbidden", 403);
    const restaurantId = ctx.restaurantId;
    const { id: orderId } = await params;

    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(rawBody ?? {});
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    const { payment_method, discount_percent = 0, tip_amount = 0 } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, restaurant_id: restaurantId },
        include: {
          items: { select: { item_name: true, item_price: true, quantity: true } },
          bill: true,
          restaurant: { select: { cgst_rate: true, sgst_rate: true } },
        },
      });
      if (!order) return { kind: "not_found" as const };
      if (order.status === "cancelled") return { kind: "cancelled" as const };

      // Idempotent: already settled → no double bill, no error.
      if (order.payment_status === "paid") {
        return {
          kind: "already_paid" as const,
          billId: order.bill?.id ?? null,
          billNumber: order.bill?.bill_number ?? null,
          total: order.bill ? Number(order.bill.total) : null,
        };
      }

      // Ensure a bill exists, recomputed server-side (never trust client amounts).
      let billId: string;
      let billNumber: string | null;
      let total: number;
      if (order.bill) {
        billId = order.bill.id;
        billNumber = order.bill.bill_number;
        total = Number(order.bill.total);
      } else {
        const billCalc = calculateBill({
          items: order.items.map((i) => ({
            item_name: i.item_name,
            item_price: Number(i.item_price),
            quantity: i.quantity,
          })),
          cgst_rate: Number(order.restaurant.cgst_rate ?? 2.5),
          sgst_rate: Number(order.restaurant.sgst_rate ?? 2.5),
          discount_percent,
          tip_amount,
        });
        const newBillNumber = await generateBillNumber(restaurantId, tx);
        const created = await tx.bill.create({
          data: {
            order_id: order.id,
            restaurant_id: restaurantId,
            bill_number: newBillNumber,
            subtotal: billCalc.subtotal,
            cgst_rate: billCalc.cgst_rate,
            sgst_rate: billCalc.sgst_rate,
            cgst: billCalc.cgst_amount,
            sgst: billCalc.sgst_amount,
            discount: billCalc.discount_amount,
            tip: billCalc.tip_amount,
            total: billCalc.final_amount,
          },
          select: { id: true, bill_number: true },
        });
        billId = created.id;
        billNumber = created.bill_number;
        total = billCalc.final_amount;
      }

      await tx.order.update({
        where: { id: order.id },
        data: { payment_status: "paid", payment_method },
      });
      await tx.restaurantTable.update({
        where: { id: order.table_id },
        data: { status: "available" },
      });

      return {
        kind: "paid" as const,
        billId, billNumber, total,
        tableId: order.table_id,
        orderNumber: order.order_number,
      };
    });

    if (result.kind === "not_found") return error("Order not found", 404);
    if (result.kind === "cancelled") return error("Cannot settle a cancelled order", 400);
    if (result.kind === "already_paid") {
      return success({ paid: true, already_paid: true, bill_id: result.billId, bill_number: result.billNumber, total: result.total });
    }

    emitSocketEvent({
      type: "payment:confirmed",
      data: {
        orderId,
        orderNumber: result.orderNumber,
        restaurantId,
        tableId: result.tableId,
        paymentId: `counter:${payment_method}`,
        amount: result.total,
      },
    });

    await auditLog({
      restaurantId,
      userId: ctx.userId,
      action: "order.paid",
      entityType: "order",
      entityId: orderId,
      newValue: {
        payment_method,
        bill_number: result.billNumber,
        total: result.total,
      },
    });

    return success({ paid: true, bill_id: result.billId, bill_number: result.billNumber, total: result.total });
  } catch (err) {
    console.error("[POST /api/admin/orders/[id]/pay]", err);
    captureException(err);
    return error("Failed to settle order", 500);
  }
}
