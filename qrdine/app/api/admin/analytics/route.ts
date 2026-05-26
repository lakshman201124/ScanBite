import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { startOfDay, endOfDay, subDays, eachDayOfInterval, format, getDay, getHours } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);
    const restaurantId = session.user.restaurantId;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam   = searchParams.get("to");

    const dateTo   = toParam   ? endOfDay(new Date(toParam))   : endOfDay(new Date());
    const dateFrom = fromParam ? startOfDay(new Date(fromParam)) : startOfDay(subDays(new Date(), 29));
    const dateFilter = { gte: dateFrom, lte: dateTo };

    // Prior period (same duration)
    const periodMs      = dateTo.getTime() - dateFrom.getTime();
    const priorDateTo   = new Date(dateFrom.getTime() - 1);
    const priorDateFrom = new Date(priorDateTo.getTime() - periodMs);
    const priorFilter   = { gte: priorDateFrom, lte: priorDateTo };

    // ── Phase 1: parallel fetches ─────────────────────────────────────────
    const [
      ordersWithMeta,
      bills,
      priorBills,
      orderItemsWithCat,
      priorOrderItems,
      ordersByStatusRaw,
      paymentMethodsRaw,
      priorOrdersCount,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { restaurant_id: restaurantId, created_at: dateFilter },
        select: { id: true, created_at: true, session_id: true, status: true },
      }),
      prisma.bill.findMany({
        where: { restaurant_id: restaurantId, created_at: dateFilter },
        select: { total: true, created_at: true },
      }),
      prisma.bill.findMany({
        where: { restaurant_id: restaurantId, created_at: priorFilter },
        select: { total: true, created_at: true },
      }),
      prisma.orderItem.findMany({
        where: {
          restaurant_id: restaurantId,
          created_at: dateFilter,
          order: { status: { not: "cancelled" } },
        },
        select: {
          item_name: true,
          quantity: true,
          item_price: true,
          menu_item: { select: { category: { select: { name: true } } } },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          restaurant_id: restaurantId,
          created_at: priorFilter,
          order: { status: { not: "cancelled" } },
        },
        select: { item_name: true, quantity: true, item_price: true },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: { restaurant_id: restaurantId, created_at: dateFilter },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["payment_method"],
        where: {
          restaurant_id: restaurantId,
          created_at: dateFilter,
          payment_status: "paid",
          payment_method: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.order.count({
        where: { restaurant_id: restaurantId, created_at: priorFilter, status: { not: "cancelled" } },
      }),
    ]);

    // ── Phase 2: session history (needs current session IDs) ──────────────
    const currentSessionIds = [...new Set(ordersWithMeta.map(o => o.session_id))];
    const sessionHistoryRaw = currentSessionIds.length > 0
      ? await prisma.order.groupBy({
          by: ["session_id"],
          where: { restaurant_id: restaurantId, session_id: { in: currentSessionIds } },
          _count: { _all: true },
        })
      : [];

    // ── KPIs ──────────────────────────────────────────────────────────────
    const nonCancelled     = ordersWithMeta.filter(o => o.status !== "cancelled");
    const ordersCount      = nonCancelled.length;
    const billRevenue      = bills.reduce((s, b) => s + Number(b.total), 0);
    const itemRevenue      = orderItemsWithCat.reduce((s, i) => s + Number(i.item_price) * i.quantity, 0);
    const totalRevenue     = billRevenue > 0 ? billRevenue : itemRevenue;
    const revenueBase      = billRevenue > 0 ? bills.length : ordersCount;
    const averageOrderValue = revenueBase > 0 ? totalRevenue / revenueBase : 0;
    const uniqueCustomers  = currentSessionIds.length;

    const priorRevenue = priorBills.reduce((s, b) => s + Number(b.total), 0);
    const priorItemRev = priorOrderItems.reduce((s, i) => s + Number(i.item_price) * i.quantity, 0);
    const totalPriorRevenue = priorRevenue > 0 ? priorRevenue : priorItemRev;

    // ── Revenue chart with prior overlay ─────────────────────────────────
    const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
    const revenueChart = days.map((day) => {
      const ds = startOfDay(day).getTime();
      const de = endOfDay(day).getTime();
      const revenue = bills
        .filter(b => b.created_at.getTime() >= ds && b.created_at.getTime() <= de)
        .reduce((s, b) => s + Number(b.total), 0);

      // Corresponding prior-period day
      const priorDay   = new Date(day.getTime() - (periodMs + 86_400_000));
      const pds        = startOfDay(priorDay).getTime();
      const pde        = endOfDay(priorDay).getTime();
      const priorDayRev = priorBills
        .filter(b => b.created_at.getTime() >= pds && b.created_at.getTime() <= pde)
        .reduce((s, b) => s + Number(b.total), 0);

      return { date: format(day, "MMM dd"), revenue, priorRevenue: priorDayRev };
    });

    const daysWithRev = revenueChart.filter(d => d.revenue > 0);
    const bestDayEntry  = daysWithRev.length ? daysWithRev.reduce((a, b) => a.revenue > b.revenue ? a : b) : null;
    const worstDayEntry = daysWithRev.length ? daysWithRev.reduce((a, b) => a.revenue < b.revenue ? a : b) : null;

    // ── Popular items + top dishes ────────────────────────────────────────
    const itemStats: Record<string, { quantity: number; revenue: number; category: string }> = {};
    orderItemsWithCat.forEach(i => {
      const cat = i.menu_item?.category?.name ?? "Other";
      if (!itemStats[i.item_name]) itemStats[i.item_name] = { quantity: 0, revenue: 0, category: cat };
      itemStats[i.item_name].quantity += i.quantity;
      itemStats[i.item_name].revenue  += i.quantity * Number(i.item_price);
    });

    const priorItemStats: Record<string, number> = {};
    priorOrderItems.forEach(i => {
      priorItemStats[i.item_name] = (priorItemStats[i.item_name] ?? 0) + i.quantity;
    });

    const popularItems = Object.entries(itemStats)
      .map(([name, s]) => ({ name, quantity: s.quantity, revenue: s.revenue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const topDishes = Object.entries(itemStats)
      .map(([name, s]) => {
        const prior = priorItemStats[name] ?? 0;
        const trendPct = prior > 0 ? ((s.quantity - prior) / prior) * 100 : null;
        return {
          name,
          category: s.category,
          sold: s.quantity,
          revenue: s.revenue,
          trend: trendPct !== null ? `${trendPct > 0 ? "+" : ""}${trendPct.toFixed(1)}%` : null,
          trendPositive: trendPct !== null ? trendPct > 0 : null,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ── Category breakdown ────────────────────────────────────────────────
    const catStats: Record<string, { orders: number; revenue: number }> = {};
    orderItemsWithCat.forEach(i => {
      const cat = i.menu_item?.category?.name ?? "Other";
      if (!catStats[cat]) catStats[cat] = { orders: 0, revenue: 0 };
      catStats[cat].orders  += i.quantity;
      catStats[cat].revenue += i.quantity * Number(i.item_price);
    });
    const categoryBreakdown = Object.entries(catStats)
      .map(([name, s]) => ({ name, orders: s.orders, revenue: s.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Heatmap (orders by weekday × hour) ───────────────────────────────
    const DAYS_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grid: Record<string, number> = {};
    ordersWithMeta.forEach(o => {
      const key = `${getDay(o.created_at)}-${getHours(o.created_at)}`;
      grid[key] = (grid[key] ?? 0) + 1;
    });
    const heatmap = DAYS_LABELS.map((day, dIdx) => ({
      day,
      hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: grid[`${dIdx}-${h}`] ?? 0 })),
    }));
    let peakDay = "", peakHour = 0, peakCount = 0;
    DAYS_LABELS.forEach((day, dIdx) => {
      for (let h = 0; h < 24; h++) {
        const c = grid[`${dIdx}-${h}`] ?? 0;
        if (c > peakCount) { peakCount = c; peakDay = day; peakHour = h; }
      }
    });

    // ── CRM breakdown ─────────────────────────────────────────────────────
    const sessionOrderCounts: Record<string, number> = {};
    sessionHistoryRaw.forEach(r => { sessionOrderCounts[r.session_id] = r._count._all; });
    let newCount = 0, returningCount = 0, loyalCount = 0;
    currentSessionIds.forEach(sid => {
      const total = sessionOrderCounts[sid] ?? 1;
      if (total === 1)      newCount++;
      else if (total >= 5)  loyalCount++;
      else                  returningCount++;
    });
    const repeatRate = uniqueCustomers > 0
      ? Math.round(((returningCount + loyalCount) / uniqueCustomers) * 100) : 0;

    // ── Status & payments ─────────────────────────────────────────────────
    const ordersByStatus = ordersByStatusRaw.map(s => ({ status: s.status, count: s._count._all }));
    const paymentMethods  = paymentMethodsRaw.map(p => ({ method: p.payment_method, count: p._count._all }));

    return success({
      kpis: {
        totalRevenue,
        totalOrders: ordersCount,
        averageOrderValue,
        uniqueCustomers,
        repeatRate,
        priorRevenue: totalPriorRevenue,
        priorOrders: priorOrdersCount,
      },
      revenueChart,
      revenueStats: {
        bestDay: bestDayEntry?.date ?? null,
        bestDayRevenue: bestDayEntry?.revenue ?? 0,
        worstDay: worstDayEntry?.date ?? null,
        worstDayRevenue: worstDayEntry?.revenue ?? 0,
      },
      popularItems,
      topDishes,
      categoryBreakdown,
      ordersByStatus,
      paymentMethods,
      heatmap,
      peakInfo: { day: peakDay, hour: peakHour, count: peakCount },
      customerBreakdown: {
        total: uniqueCustomers,
        newCount,
        returningCount,
        loyalCount,
        winBackReady: 0,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/analytics]", err);
    return error("Failed to fetch analytics", 500);
  }
}
