import { cookies } from "next/headers";
import { validateCustomerSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { OrderTracker } from "@/components/customer/OrderTracker";

interface Props {
  params: Promise<{ slug: string; orderId: string }>;
}

export default async function OrderPage({ params }: Props) {
  const { slug, orderId } = await params;

  // Try to load session context for socket auth
  let tableId: string | undefined;
  let restaurantId: string | undefined;

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (sessionToken) {
      const session = await validateCustomerSession(sessionToken);
      if (session) {
        tableId = session.tableId;
        restaurantId = session.restaurantId;
      }
    }
  } catch { /* fallback to polling */ }

  // Try to load initial order data server-side
  let initialOrder: {
    id: string; order_number: string; status: string;
    payment_status: string; notes: string | null;
    created_at: string; items: Array<{ id: string; item_name: string; item_price: number; quantity: number }>;
  } | undefined;

  if (restaurantId) {
    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, restaurant_id: restaurantId },
        include: { items: { select: { id: true, item_name: true, item_price: true, quantity: true } } },
      });
      if (order) {
        initialOrder = {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          payment_status: order.payment_status,
          notes: order.notes,
          created_at: order.created_at.toISOString(),
          items: order.items.map(i => ({
            id: i.id, item_name: i.item_name,
            item_price: Number(i.item_price), quantity: i.quantity,
          })),
        };
      }
    } catch { /* fallback */ }
  }

  return (
    <OrderTracker
      orderId={orderId}
      restaurantSlug={slug}
      tableId={tableId}
      restaurantId={restaurantId}
      initialOrder={initialOrder}
    />
  );
}
