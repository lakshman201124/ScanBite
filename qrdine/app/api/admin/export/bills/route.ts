export const dynamic = "force-dynamic";
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

    const bills = await prisma.bill.findMany({
      where: { restaurant_id: restaurantId },
      include: { order: { include: { table: true } } },
      orderBy: { created_at: "desc" }
    });

    const csvData = bills.map(b => ({
      bill_number: b.bill_number,
      date: format(new Date(b.created_at), "yyyy-MM-dd HH:mm:ss"),
      table: b.order?.table?.table_number || "Unknown",
      subtotal: b.subtotal.toString(),
      cgst: b.cgst.toString(),
      sgst: b.sgst.toString(),
      total: b.total.toString(),
      payment_method: b.order?.payment_method || "N/A"
    }));

    const csv = jsonToCsv(
      csvData,
      ["Bill Number", "Date", "Table", "Subtotal", "CGST", "SGST", "Total", "Payment Method"],
      ["bill_number", "date", "table", "subtotal", "cgst", "sgst", "total", "payment_method"]
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="bills_export_${format(new Date(), "yyyyMMdd")}.csv"`
      }
    });
  } catch (err) {
    console.error("[GET /api/admin/export/bills]", err);
    return new Response("Failed to export bills", { status: 500 });
  }
}
