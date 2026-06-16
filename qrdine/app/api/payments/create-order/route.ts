import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { validateCustomerSession } from "@/lib/session";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { razorpay, isOnlinePaymentsEnabled } from "@/lib/razorpay";

const schema = z.object({
  order_id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // v1: online payments are disabled — settle at the counter instead.
    if (!isOnlinePaymentsEnabled()) {
      return error("Online payments are not available. Please pay at the counter.", 503);
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (!sessionToken) return error("Session required", 401);

    const session = await validateCustomerSession(sessionToken);
    if (!session) return error("Session expired", 401);

    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { order_id } = parsed.data;

    const order = await prisma.order.findFirst({
      where: { id: order_id, restaurant_id: session.restaurantId },
      include: {
        bill: { select: { total: true } },
        restaurant: { select: { name: true, brand_color: true, cgst_rate: true, sgst_rate: true } },
      },
    });

    if (!order) return error("Order not found", 404);
    if (order.payment_status === "paid") return error("Order already paid", 409);

    // Calculate total from bill or recalculate using restaurant tax config (never trust client-sent amounts)
    let amountRupees: number;
    if (order.bill) {
      amountRupees = Number(order.bill.total);
    } else {
      // Fetch items and recalculate using restaurant's own CGST/SGST rates
      const items = await prisma.orderItem.findMany({
        where: { order_id },
        select: { item_price: true, quantity: true },
      });
      const subtotal = items.reduce((s, i) => s + Number(i.item_price) * i.quantity, 0);
      const cgstRate = Number(order.restaurant.cgst_rate ?? 0);
      const sgstRate = Number(order.restaurant.sgst_rate ?? 0);
      amountRupees = Math.round(subtotal * (1 + (cgstRate + sgstRate) / 100) * 100) / 100;
    }

    const amountPaise = Math.round(amountRupees * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: order_id,
      notes: { order_id, restaurant_id: session.restaurantId },
    });

    // Store Razorpay order ID
    await prisma.order.update({
      where: { id: order_id },
      data: { razorpay_order_id: razorpayOrder.id as string },
    });

    return success({
      razorpay_order_id: razorpayOrder.id,
      amount: amountPaise,
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID,
      restaurant_name: order.restaurant.name,
      brand_color: order.restaurant.brand_color ?? "#FF4D3D",
      order_number: order.order_number,
    });
  } catch (err) {
    console.error("[POST /api/payments/create-order]", err);
    return error("Failed to create payment order", 500);
  }
}
