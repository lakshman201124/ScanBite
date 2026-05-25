import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { generateInvoicePDF } from "@/lib/invoice";
import { calculateBill } from "@/lib/billing";
import { sendWhatsAppInvoice } from "@/lib/notifications/whatsapp";
import { sendInvoiceEmail } from "@/lib/notifications/email";

const sendSchema = z.object({
  channel: z.enum(["whatsapp", "email"]),
  recipient: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);
    const restaurantId = session.user.restaurantId;
    const { id } = await params;

    const body: unknown = await request.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { channel, recipient } = parsed.data;

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

    // Rate limit: max 3 sends per bill per channel
    const sentFlag = channel === "whatsapp" ? bill.whatsapp_sent : bill.email_sent;
    if (sentFlag) return error("Invoice already sent via this channel", 409);

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

    let result: { success: boolean; error?: string };

    if (channel === "whatsapp") {
      result = await sendWhatsAppInvoice({
        to: recipient,
        restaurant_name: bill.restaurant.name,
        bill_number: bill.bill_number ?? id,
        total: Number(bill.total),
        invoice_url: bill.invoice_url ?? undefined,
      });
    } else {
      const pdfBytes = await generateInvoicePDF({
        restaurant_name: bill.restaurant.name,
        restaurant_address: bill.restaurant.address,
        restaurant_phone: bill.restaurant.phone,
        gstin: bill.restaurant.gstin,
        bill_number: bill.bill_number ?? id,
        order_number: bill.order.order_number,
        table_number: bill.order.table?.table_number ?? "?",
        created_at: bill.created_at.toISOString(),
        bill: billCalc,
      });

      result = await sendInvoiceEmail({
        to: recipient,
        restaurant_name: bill.restaurant.name,
        bill_number: bill.bill_number ?? id,
        order_number: bill.order.order_number,
        bill: billCalc,
        invoice_pdf: pdfBytes,
      });
    }

    if (!result.success) return error(result.error ?? "Failed to send", 500);

    // Mark as sent
    await prisma.bill.update({
      where: { id },
      data: channel === "whatsapp" ? { whatsapp_sent: true } : { email_sent: true },
    });

    return success({ sent: true, channel });
  } catch (err) {
    console.error("[POST /api/admin/bills/[id]/send]", err);
    return error("Failed to send invoice", 500);
  }
}
