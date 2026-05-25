import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { validateCustomerSession } from "@/lib/session";
import { success, error } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (!sessionToken) return error("Session required", 401);

    const session = await validateCustomerSession(sessionToken);
    if (!session) return error("Session expired", 401);

    const { id: orderId } = await params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurant_id: session.restaurantId },
      select: {
        id: true,
        order_number: true,
        status: true,
        payment_status: true,
        notes: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!order) return error("Order not found", 404);

    return success({
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      notes: order.notes,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
    });
  } catch (err) {
    console.error("[GET /api/customer/orders/[id]/status]", err);
    return error("Failed to fetch order status", 500);
  }
}
