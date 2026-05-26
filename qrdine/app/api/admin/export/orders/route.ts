import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonToCsv } from "@/lib/export";
import { format } from "date-fns";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return new Response("Unauthorized", { status: 401 });
    const restaurantId = session.user.restaurantId;

    const orders = await prisma.order.findMany({
      where: { restaurant_id: restaurantId },
      include: { table: true, bill: true, items: true },
      orderBy: { created_at: "desc" }
    });

    const csvData = orders.map(o => ({
      order_number: o.order_number,
      date: format(new Date(o.created_at), "yyyy-MM-dd HH:mm:ss"),
      table: o.table?.table_number || "Unknown",
      items_count: o.items.length,
      subtotal: o.bill?.subtotal?.toString() || "0",
      tax: (Number(o.bill?.cgst || 0) + Number(o.bill?.sgst || 0)).toString(),
      total: o.bill?.total?.toString() || "0",
      payment_method: o.payment_method || "N/A",
      status: o.status
    }));

    const csv = jsonToCsv(
      csvData,
      ["Order Number", "Date", "Table", "Items Count", "Subtotal", "Tax", "Total", "Payment Method", "Status"],
      ["order_number", "date", "table", "items_count", "subtotal", "tax", "total", "payment_method", "status"]
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="orders_export_${format(new Date(), "yyyyMMdd")}.csv"`
      }
    });
  } catch (err) {
    console.error("[GET /api/admin/export/orders]", err);
    return new Response("Failed to export orders", { status: 500 });
  }
}
