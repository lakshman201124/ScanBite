import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { validateCustomerSession } from "@/lib/session";
import { success, error } from "@/lib/api-response";
import { emitSocketEvent } from "@/lib/socket-emitter";

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
      include: { bill: true },
    });

    if (!order) return error("Order not found", 404);
    if (!order.bill) return error("Bill not yet generated", 404);

    return success(order.bill);
  } catch (err) {
    console.error("[GET /api/customer/orders/[id]/bill]", err);
    return error("Failed to fetch bill", 500);
  }
}

// Customer requests bill — notifies admin
export async function POST(
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
      include: { table: { select: { table_number: true } } },
    });

    if (!order) return error("Order not found", 404);
    if (order.bill_requested) return success({ requested: true, already: true });

    await prisma.order.update({
      where: { id: orderId },
      data: { bill_requested: true },
    });

    await emitSocketEvent({
      type: "bill:requested",
      data: {
        orderId,
        orderNumber: order.order_number,
        restaurantId: session.restaurantId,
        tableId: session.tableId,
        tableName: `Table ${order.table?.table_number ?? "?"}`,
      },
    });

    return success({ requested: true });
  } catch (err) {
    console.error("[POST /api/customer/orders/[id]/bill]", err);
    return error("Failed to request bill", 500);
  }
}
