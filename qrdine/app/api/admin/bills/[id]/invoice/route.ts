export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { error } from "@/lib/api-response";
import { generateInvoicePDF } from "@/lib/invoice";
import { calculateBill } from "@/lib/billing";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);
    const restaurantId = session.user.restaurantId;
    const { id } = await params;

    const bill = await prisma.bill.findFirst({
      where: { id, restaurant_id: restaurantId },
      include: {
        order: {
          include: {
            items: { select: { item_name: true, item_price: true, quantity: true } },
            table: { select: { table_number: true } },
          },
        },
        restaurant: {
          select: {
            name: true,
            address: true,
            phone: true,
            gstin: true,
            logo_url: true,
            cgst_rate: true,
            sgst_rate: true,
          },
        },
      },
    });

    if (!bill) return error("Bill not found", 404);

    const billCalc = calculateBill({
      items: bill.order.items.map((i) => ({
        item_name: i.item_name,
        item_price: Number(i.item_price),
        quantity: i.quantity,
      })),
      cgst_rate: Number(bill.cgst_rate),
      sgst_rate: Number(bill.sgst_rate),
      discount_percent: Number(bill.discount) > 0
        ? (Number(bill.discount) / Number(bill.subtotal)) * 100
        : 0,
      tip_amount: Number(bill.tip),
    });

    const pdfBytes = await generateInvoicePDF({
      restaurant_name: bill.restaurant.name,
      restaurant_address: bill.restaurant.address,
      restaurant_phone: bill.restaurant.phone,
      gstin: bill.restaurant.gstin,
      logo_url: bill.restaurant.logo_url,
      bill_number: bill.bill_number ?? id,
      order_number: bill.order.order_number,
      table_number: bill.order.table?.table_number ?? "?",
      created_at: bill.created_at.toISOString(),
      payment_method: bill.order.payment_method,
      bill: billCalc,
    });

    // Store invoice URL if not already stored (would need Cloudinary upload in production)
    if (!bill.invoice_url) {
      await prisma.bill.update({
        where: { id },
        data: { invoice_url: `/api/admin/bills/${id}/invoice` },
      });
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${bill.bill_number ?? id}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/bills/[id]/invoice]", err);
    return error("Failed to generate invoice", 500);
  }
}
