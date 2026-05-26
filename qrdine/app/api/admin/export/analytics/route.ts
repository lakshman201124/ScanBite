import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAnalyticsPdf } from "@/lib/export";
import { error, unauthorized } from "@/lib/api-response";
import { startOfDay, endOfDay, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const dateTo = toParam ? endOfDay(new Date(toParam)) : endOfDay(new Date());
    const dateFrom = fromParam ? startOfDay(new Date(fromParam)) : startOfDay(subDays(new Date(), 30));

    const dateFilter = {
      gte: dateFrom,
      lte: dateTo,
    };

    // Query restaurant details
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true }
    });

    if (!restaurant) return error("Restaurant not found", 404);

    // Compute KPIs
    const [ordersCount, bills, uniqueSessions, orderItems] = await Promise.all([
      prisma.order.count({
        where: { restaurant_id: restaurantId, created_at: dateFilter, status: { not: "cancelled" } },
      }),
      prisma.bill.findMany({
        where: { restaurant_id: restaurantId, created_at: dateFilter },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { restaurant_id: restaurantId, created_at: dateFilter },
        distinct: ['session_id'],
        select: { session_id: true },
      }),
      prisma.orderItem.findMany({
        where: {
          restaurant_id: restaurantId,
          created_at: dateFilter,
          order: { status: { not: "cancelled" } }
        },
        select: { item_name: true, quantity: true, item_price: true },
      }),
    ]);

    const totalRevenue = bills.reduce((sum, bill) => sum + Number(bill.total), 0);
    const averageOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;
    const uniqueCustomers = uniqueSessions.length;

    const itemStats: Record<string, { quantity: number; revenue: number }> = {};
    orderItems.forEach((item) => {
      if (!itemStats[item.item_name]) {
        itemStats[item.item_name] = { quantity: 0, revenue: 0 };
      }
      itemStats[item.item_name].quantity += item.quantity;
      itemStats[item.item_name].revenue += item.quantity * Number(item.item_price);
    });

    const popularItems = Object.entries(itemStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const pdfBytes = await generateAnalyticsPdf(restaurant, {
      totalRevenue,
      totalOrders: ordersCount,
      averageOrderValue,
      uniqueCustomers,
      popularItems
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="scanbite-analytics-report.pdf"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/export/analytics]", err);
    return error("Failed to generate monthly performance PDF report", 500);
  }
}
