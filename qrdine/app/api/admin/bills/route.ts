import { NextRequest } from "next/server";
import { Prisma, PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveStaffAuth } from "@/lib/waiter-auth";
import { z } from "zod";
import { success, error } from "@/lib/api-response";
import { calculateBill, generateBillNumber } from "@/lib/billing";
import { emitSocketEvent } from "@/lib/socket-emitter";

const generateSchema = z.object({
  order_id: z.string().min(1),
  discount_percent: z.number().min(0).max(100).optional(),
  tip_amount: z.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return error("Unauthorized", 401);
    const restaurantId = ctx.restaurantId;

    const body: unknown = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { order_id, discount_percent = 0, tip_amount = 0 } = parsed.data;

    // Fetch order + items + restaurant tax config
    const [order, restaurant] = await Promise.all([
      prisma.order.findFirst({
        where: { id: order_id, restaurant_id: restaurantId },
        include: {
          items: { select: { item_name: true, item_price: true, quantity: true } },
          table: { select: { table_number: true } },
          bill: true,
        },
      }),
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { cgst_rate: true, sgst_rate: true },
      }),
    ]);

    if (!order) return error("Order not found", 404);
    if (order.bill) return error("Bill already generated for this order", 409);
    if (order.status === "cancelled") return error("Cannot generate bill for cancelled order", 400);

    const billCalc = calculateBill({
      items: order.items.map((i) => ({
        item_name: i.item_name,
        item_price: Number(i.item_price),
        quantity: i.quantity,
      })),
      cgst_rate: Number(restaurant?.cgst_rate ?? 2.5),
      sgst_rate: Number(restaurant?.sgst_rate ?? 2.5),
      discount_percent,
      tip_amount,
    });

    const billNumber = await generateBillNumber(restaurantId);

    const bill = await prisma.bill.create({
      data: {
        order_id,
        restaurant_id: restaurantId,
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

    // Notify customer that bill is ready
    await emitSocketEvent({
      type: "bill:generated",
      data: {
        orderId: order_id,
        billId: bill.id,
        billNumber,
        restaurantId,
        total: billCalc.final_amount,
      },
    });

    return success({ bill_id: bill.id, bill_number: billNumber, ...billCalc }, 201);
  } catch (err) {
    console.error("[POST /api/admin/bills]", err);
    return error("Failed to generate bill", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return error("Unauthorized", 401);
    const restaurantId = ctx.restaurantId;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const skip = (page - 1) * limit;
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");
    const paymentMethod = searchParams.get("payment_method");
    const paymentStatus = searchParams.get("payment_status");
    const search = searchParams.get("q");

    const where: Prisma.BillWhereInput = { restaurant_id: restaurantId };
    if (dateFrom || dateTo) {
      where.created_at = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
      };
    }
    if (search) {
      where.bill_number = { contains: search, mode: "insensitive" };
    }

    // Filter by order's payment fields
    const orderWhere: Prisma.OrderWhereInput = {};
    if (paymentMethod) orderWhere.payment_method = paymentMethod as PaymentMethod;
    if (paymentStatus) orderWhere.payment_status = paymentStatus as PaymentStatus;
    if (Object.keys(orderWhere).length) where.order = orderWhere;

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          order: {
            select: {
              order_number: true,
              payment_status: true,
              payment_method: true,
              table: { select: { table_number: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where }),
    ]);

    return success({ bills, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/admin/bills]", err);
    return error("Failed to fetch bills", 500);
  }
}
