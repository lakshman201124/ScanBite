import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature, isOnlinePaymentsEnabled } from "@/lib/razorpay";
import { emitSocketEvent } from "@/lib/socket-emitter";
import { calculateBill, generateBillNumber } from "@/lib/billing";
import { auditLog } from "@/lib/audit";
import { captureException } from "@/lib/sentry";

export async function POST(request: NextRequest) {
  try {
    // v1: online payments are dormant — the webhook is inert until keys exist.
    if (!isOnlinePaymentsEnabled()) {
      return NextResponse.json({ success: false, error: "Online payments disabled." }, { status: 503 });
    }

    const signature = request.headers.get("x-razorpay-signature") ?? "";
    const rawBody = await request.text();

    if (!verifyWebhookSignature(rawBody, signature)) {
      // A bad signature means we cannot trust the payload, so there is no valid
      // restaurant_id to scope a DB audit row to (the AuditLog FK requires a real
      // one). Capture to Sentry for fraud observability instead.
      const fraudErr = new Error("Webhook fraud: invalid Razorpay signature");
      console.warn("[webhook] invalid Razorpay signature — possible fraud attempt", {
        signaturePrefix: signature.slice(0, 12),
      });
      captureException(fraudErr);
      return NextResponse.json({ success: false, error: "Invalid signature." }, { status: 400 });
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      payload: {
        payment: {
          entity: {
            id: string;
            order_id: string;
            amount: number;
            status: string;
            method: string;
          };
        };
      };
    };

    if (payload.event !== "payment.captured") {
      return NextResponse.json({ received: true });
    }

    const payment = payload.payload.payment.entity;
    const razorpayOrderId = payment.order_id;
    const razorpayPaymentId = payment.id;

    // Find order by razorpay_order_id
    const order = await prisma.order.findFirst({
      where: { razorpay_order_id: razorpayOrderId },
      include: {
        items: { select: { item_name: true, item_price: true, quantity: true } },
        restaurant: { select: { cgst_rate: true, sgst_rate: true } },
      },
    });

    if (!order) {
      console.warn("[webhook] order not found for razorpay_order_id:", razorpayOrderId);
      return NextResponse.json({ received: true });
    }

    // Idempotency: skip if already paid (bill already created)
    if (order.payment_status === "paid") {
      return NextResponse.json({ received: true, skipped: "already_paid" });
    }

    const paymentMethod = payment.method === "upi" ? "upi"
      : payment.method === "card" ? "card"
      : "wallet";

    // Check if bill already exists (idempotency)
    const existingBill = await prisma.bill.findUnique({ where: { order_id: order.id } });

    const billCalc = calculateBill({
      items: order.items.map((i) => ({
        item_name: i.item_name,
        item_price: Number(i.item_price),
        quantity: i.quantity,
      })),
      cgst_rate: Number(order.restaurant.cgst_rate),
      sgst_rate: Number(order.restaurant.sgst_rate),
    });

    await prisma.$transaction(async (tx) => {
      // Update order payment status
      await tx.order.update({
        where: { id: order.id },
        data: {
          payment_status: "paid",
          payment_method: paymentMethod as "upi" | "card" | "wallet",
          razorpay_payment_id: razorpayPaymentId,
        },
      });

      // Create bill if not already present
      if (!existingBill) {
        const billNumber = await generateBillNumber(order.restaurant_id, tx);
        await tx.bill.create({
          data: {
            order_id: order.id,
            restaurant_id: order.restaurant_id,
            bill_number: billNumber,
            subtotal: billCalc.subtotal,
            cgst_rate: billCalc.cgst_rate,
            sgst_rate: billCalc.sgst_rate,
            cgst: billCalc.cgst_amount,
            sgst: billCalc.sgst_amount,
            discount: billCalc.discount_amount,
            tip: billCalc.tip_amount,
            total: billCalc.final_amount,
          },
        });
      }

      // Free the table
      await tx.restaurantTable.update({
        where: { id: order.table_id },
        data: { status: "available" },
      });
    });

    await emitSocketEvent({
      type: "payment:confirmed",
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId: order.restaurant_id,
        tableId: order.table_id,
        paymentId: razorpayPaymentId,
        amount: payment.amount / 100,
      },
    });

    await auditLog({
      restaurantId: order.restaurant_id,
      action: "order.paid_online",
      entityType: "order",
      entityId: order.id,
      newValue: {
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        amount: payment.amount / 100,
        method: paymentMethod,
      },
    });

    return NextResponse.json({ success: true, received: true, order_id: order.id });
  } catch (err) {
    console.error("[POST /api/payments/webhook]", err);
    captureException(err);
    return NextResponse.json({ success: false, error: "Webhook processing failed." }, { status: 500 });
  }
}

// Disable body parsing — we need raw body for signature verification
export const dynamic = "force-dynamic";
