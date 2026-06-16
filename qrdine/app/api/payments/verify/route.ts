export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { validateCustomerSession } from "@/lib/session";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { verifyPaymentSignature, isOnlinePaymentsEnabled } from "@/lib/razorpay";

const schema = z.object({
  order_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // v1: online payments are disabled.
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

    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    // Verify client-side signature (defense-in-depth; webhook is the authoritative source)
    const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) return error("Invalid payment signature", 400);

    const order = await prisma.order.findFirst({
      where: { id: order_id, restaurant_id: session.restaurantId },
      select: { payment_status: true, order_number: true },
    });

    if (!order) return error("Order not found", 404);

    return success({
      verified: true,
      payment_status: order.payment_status,
      order_number: order.order_number,
    });
  } catch (err) {
    console.error("[POST /api/payments/verify]", err);
    return error("Verification failed", 500);
  }
}
