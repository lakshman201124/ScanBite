import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import React from "react";
import { DashboardQuickActions } from "@/components/admin/DashboardQuickActions";

// ── Donut chart helpers ───────────────────────────────────
const R = 50;
const C = 2 * Math.PI * R;

function buildDonutSegments(data: { lbl: string; val: number; color: string }[]) {
  let offset = 0;
  return data.map((d) => {
    const len = (d.val / 100) * C;
    const seg = { ...d, len, offset: -offset };
    offset += len;
    return seg;
  });
}

// ── Revenue chart helpers ─────────────────────────────────
const W = 700, H = 180, P = 12;

/** Smooth cubic-bezier path through data points */
function buildSmoothPath(pts: number[]) {
  if (pts.length < 2) return { lineD: "", areaD: "", coords: [] as { x: number; y: number }[] };
  const mx = Math.max(...pts, 1);
  const stp = (W - P * 2) / Math.max(pts.length - 1, 1);
  const coords = pts.map((p, i) => ({
    x: P + i * stp,
    y: P + (1 - p / mx) * (H - P * 2),
  }));
  let lineD = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const p0 = coords[i - 1], p1 = coords[i];
    const cpx = ((p0.x + p1.x) / 2).toFixed(1);
    lineD += ` C${cpx},${p0.y.toFixed(1)} ${cpx},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  const last = coords[coords.length - 1], first = coords[0];
  const areaD = `${lineD} L${last.x.toFixed(1)},${(H - P).toFixed(1)} L${first.x.toFixed(1)},${(H - P).toFixed(1)} Z`;
  return { lineD, areaD, coords };
}

function fmtHour(h: number) {
  if (h === 0)  return "12a";
  if (h < 12)   return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

// ── Table status mapping ──────────────────────────────────
const TABLE_DOT_CLASS: Record<string, string> = {
  available: "free",
  occupied:  "busy",
  reserved:  "alert",
};
const TABLE_DOT_LABEL: Record<string, string> = {
  available: "Free",
  occupied:  "Busy",
  reserved:  "Reserved",
};

// ── Data layer ────────────────────────────────────────────
async function getStats(restaurantId: string) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();

  const [
    menuItems,
    allTables,
    recentOrders,
    todayOrderCount,
    pendingOrderCount,
    todayItems,
    allRecentItems,
    todayOrdersByStatus,
  ] = await Promise.all([
    prisma.menuItem.count({ where: { restaurant_id: restaurantId, is_available: true } }),

    prisma.restaurantTable.findMany({
      where:   { restaurant_id: restaurantId },
      select:  { table_number: true, status: true },
      orderBy: { table_number: "asc" },
      take: 15,
    }),

    prisma.order.findMany({
      where:   { restaurant_id: restaurantId },
      include: {
        items: { select: { item_name: true, item_price: true, quantity: true } },
        table: { select: { table_number: true } },
      },
      orderBy: { created_at: "desc" },
      take: 5,
    }),

    prisma.order.count({
      where: {
        restaurant_id: restaurantId,
        created_at: { gte: dayStart },
        status: { not: "cancelled" },
      },
    }),

    prisma.order.count({
      where: { restaurant_id: restaurantId, status: "pending" },
    }),

    // Today's order items → revenue + hourly chart
    prisma.orderItem.findMany({
      where:  { restaurant_id: restaurantId, created_at: { gte: dayStart } },
      select: { item_price: true, quantity: true, created_at: true },
    }),

    // Last 90 days order items → top sellers
    prisma.orderItem.findMany({
      where:  {
        restaurant_id: restaurantId,
        created_at: { gte: new Date(dayStartMs - 90 * 24 * 60 * 60 * 1000) },
      },
      select: { item_name: true, quantity: true, item_price: true },
    }),

    // Today's orders by status → donut chart
    prisma.order.groupBy({
      by:    ["status"],
      where: { restaurant_id: restaurantId, created_at: { gte: dayStart } },
      _count: { _all: true },
    }),
  ]);

  // ── Revenue ──────────────────────────────────────────────
  const todayRevenue = todayItems.reduce(
    (s, i) => s + Number(i.item_price) * i.quantity, 0
  );
  const avgOrderValue = todayOrderCount > 0 ? todayRevenue / todayOrderCount : 0;

  // ── Hourly chart — one bucket per clock hour (0 → currentHour) ──
  const currentHour = new Date().getHours();
  const numHours = Math.max(currentHour + 1, 3); // at least 3 points for curve
  const hourlyRevenue = Array.from({ length: numHours }, (_, h) => {
    const lo = dayStartMs + h * 3_600_000;
    const hi = lo + 3_600_000;
    return todayItems
      .filter((x) => { const t = new Date(x.created_at).getTime(); return t >= lo && t < hi; })
      .reduce((s, x) => s + Number(x.item_price) * x.quantity, 0);
  });

  const peakIdx    = hourlyRevenue.indexOf(Math.max(...hourlyRevenue));
  const peakRevenue = hourlyRevenue[peakIdx] ?? 0;
  const peakLabel  = fmtHour(peakIdx).replace("a", " AM").replace("p", " PM");

  // ── Tables ───────────────────────────────────────────────
  const occupiedCount = allTables.filter((t) => t.status === "occupied").length;
  const freeCount     = allTables.filter((t) => t.status === "available").length;

  // ── Top sellers ──────────────────────────────────────────
  const itemMap: Record<string, { qty: number; rev: number }> = {};
  allRecentItems.forEach((item) => {
    if (!itemMap[item.item_name]) itemMap[item.item_name] = { qty: 0, rev: 0 };
    itemMap[item.item_name].qty += item.quantity;
    itemMap[item.item_name].rev += item.quantity * Number(item.item_price);
  });
  const topSellers = Object.entries(itemMap)
    .sort(([, a], [, b]) => b.qty - a.qty)
    .slice(0, 4)
    .map(([name, s]) => ({ name, qty: s.qty, rev: `₹${Math.round(s.rev).toLocaleString("en-IN")}` }));

  // ── Order-status donut ───────────────────────────────────
  const sc: Record<string, number> = {};
  todayOrdersByStatus.forEach((s) => { sc[s.status] = s._count._all; });
  const newCount    = sc["pending"] ?? 0;
  const activeCount = (sc["confirmed"] ?? 0) + (sc["preparing"] ?? 0) + (sc["ready"] ?? 0);
  const doneCount   = sc["served"] ?? 0;
  const totalSC     = newCount + activeCount + doneCount;

  const donutData: { lbl: string; val: number; color: string }[] =
    totalSC > 0
      ? [
          { lbl: "New",    val: Math.round((newCount    / totalSC) * 100), color: "#2E6EF7" },
          { lbl: "Active", val: Math.round((activeCount / totalSC) * 100), color: "#F2A500" },
          { lbl: "Served", val: Math.round((doneCount   / totalSC) * 100), color: "#1E9E5E" },
        ]
      : [{ lbl: "No orders", val: 100, color: "#F2EEE8" }];

  return {
    menuItems,
    tables:        allTables.length,
    occupiedCount,
    freeCount,
    allTables,
    recentOrders,
    todayOrders:   todayOrderCount,
    pendingOrders: pendingOrderCount,
    todayRevenue,
    avgOrderValue,
    hourlyRevenue,
    peakLabel,
    peakRevenue,
    topSellers,
    donutData,
    newCount,
    activeCount,
    doneCount,
  };
}

// ── Page ──────────────────────────────────────────────────
export default async function DashboardPage() {
  const session      = await auth();
  const name         = session?.user?.name ?? "Admin";
  const restaurantId = session?.user?.restaurantId ?? "";

  const {
    tables,
    occupiedCount,
    freeCount,
    allTables,
    recentOrders,
    todayOrders,
    pendingOrders,
    todayRevenue,
    avgOrderValue,
    hourlyRevenue,
    peakLabel,
    peakRevenue,
    topSellers,
    donutData,
    newCount,
    activeCount,
    doneCount,
  } = await getStats(restaurantId);

  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // Revenue chart
  const hasRevenue          = hourlyRevenue.some((v) => v > 0);
  const chartPeakIdx        = hourlyRevenue.indexOf(Math.max(...hourlyRevenue));
  const { lineD, areaD, coords } = buildSmoothPath(hourlyRevenue);
  const tipCoord = coords[chartPeakIdx] ?? { x: P, y: P };
  // Clamp tooltip within SVG bounds so it never overflows left/right/top
  const tipX    = Math.max(38, Math.min(tipCoord.x, W - 38));
  const tipY    = Math.max(36, tipCoord.y);
  // X-axis labels: show every ~3 hours
  const xLabels: { h: number; x: number }[] = [];
  const xStp    = (W - P * 2) / Math.max(hourlyRevenue.length - 1, 1);
  hourlyRevenue.forEach((_, h) => {
    if (h === 0 || h === hourlyRevenue.length - 1 || h % Math.max(Math.floor(hourlyRevenue.length / 4), 1) === 0) {
      xLabels.push({ h, x: P + h * xStp });
    }
  });

  // Donut
  const segments = buildDonutSegments(donutData);
  const totalDonut = newCount + activeCount + doneCount;

  return (
    <main className="adm-main">
      <style>{`
        .new-order-btn {
          transition: transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .15s;
        }
        .new-order-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px -4px rgba(255,77,61,.60), 0 2px 8px -2px rgba(255,77,61,.35) !important;
        }
        .new-order-btn:active { transform: scale(0.97); }

        /* Floor plan grid — 4 columns, proper spacing */
        .tbl-grid {
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 10px !important;
        }
        .tbl-dot {
          min-height: 82px !important;
          aspect-ratio: unset !important;
        }
        .floor-legend { flex-direction: row !important; flex-wrap: wrap; }

        /* Card headings — use display font for personality */
        .card__h h3 {
          font-family: var(--display) !important;
          font-size: 18px !important;
          font-weight: 400 !important;
          letter-spacing: -.01em !important;
        }

        /* Live order rows — richer design */
        .order-card-row {
          display: grid;
          grid-template-columns: 90px 80px 1fr auto auto;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border-left: 3px solid transparent;
          transition: background .12s, transform .12s;
          cursor: default;
        }
        .order-card-row:hover {
          background: var(--bg);
          transform: translateX(2px);
        }
        .order-card-row.status-pending   { border-left-color: #2E6EF7; background: rgba(46,110,247,.025); }
        .order-card-row.status-confirmed { border-left-color: var(--brand); }
        .order-card-row.status-preparing { border-left-color: var(--amber); background: rgba(242,165,0,.025); }
        .order-card-row.status-ready     { border-left-color: var(--green); background: rgba(30,158,94,.025); }
        .order-card-row.status-served    { border-left-color: var(--muted-2); opacity: .7; }
        .order-card-row.status-cancelled { border-left-color: var(--red); opacity: .55; }
        .order-num { font: 800 12px var(--mono, monospace); letter-spacing: .02em; color: var(--ink); }

        @keyframes live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .45; transform: scale(.85); }
        }
        .live-dot { animation: live-pulse 1.4s ease-in-out infinite; }
      `}</style>
      {/* ── Top bar ── */}
      <header className="adm-top" style={{ gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 400, fontSize: 26, letterSpacing: "-.02em", margin: 0, lineHeight: 1.1 }}>
            Welcome, <em style={{ fontStyle: "italic", color: "var(--brand)" }}>{name.split(" ")[0]}</em>
          </h1>
          <div className="adm-top__sub" style={{ marginTop: 3 }}>{dateStr}&nbsp;&middot;&nbsp;{timeStr}</div>
        </div>
        <div className="adm-top__spacer" />

        <div className="adm-search" style={{ width: 260 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input placeholder="Search orders, tables…" />
        </div>

        {/* Notification bell */}
        <div className="adm-icon-btn" style={{ position: "relative" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          {pendingOrders > 0 && (
            <span className="dot" style={{ position: "absolute", top: 7, right: 8 }}>
              <span className="live-dot" style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: "var(--brand)", border: "2px solid var(--bg)" }} />
            </span>
          )}
        </div>

        {/* New order CTA */}
        <Link href="/dashboard/orders/new" style={{ textDecoration: "none" }}>
          <button
            className="new-order-btn"
            style={{
              background: "linear-gradient(135deg, #FF4D3D 0%, #FF6B4A 100%)",
              color: "#fff",
              border: 0,
              padding: "10px 22px 10px 16px",
              borderRadius: 999,
              font: "800 13px var(--sans)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              boxShadow: "0 6px 20px -6px rgba(255,77,61,.60), 0 2px 8px -2px rgba(255,77,61,.32)",
              letterSpacing: ".01em",
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: 7,
              background: "rgba(255,255,255,.2)",
              display: "grid", placeItems: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </span>
            New order
          </button>
        </Link>
      </header>

      {/* ── Quick actions ── */}
      <DashboardQuickActions />

      <div className="adm-body">
        {/* ── KPI grid ── */}
        <div className="kpi-grid">
          {/* Featured — Today's revenue */}
          <div className="kpi feature">
            <div className="kpi__label">
              <span className="ico">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12M6 8h12M16 13H6c5 0 7 4 12 8"/></svg>
              </span>
              Today&apos;s revenue
            </div>
            <div className="kpi__val">
              ₹{Math.round(todayRevenue).toLocaleString("en-IN")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ font: "500 11px var(--sans)", color: "rgba(255,255,255,.55)" }}>
                {todayOrders} order{todayOrders !== 1 ? "s" : ""} · ₹{Math.round(avgOrderValue).toLocaleString("en-IN")} avg
              </span>
            </div>
          </div>

          {/* Orders */}
          <div className="kpi">
            <div className="kpi__label">
              <span className="ico">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>
              </span>
              Orders today
            </div>
            <div className="kpi__val">{todayOrders}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {pendingOrders > 0 ? (
                <span className="kpi__delta">
                  {pendingOrders} pending
                </span>
              ) : (
                <span style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>no pending</span>
              )}
            </div>
          </div>

          {/* Avg order value */}
          <div className="kpi">
            <div className="kpi__label">
              <span className="ico">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </span>
              Avg order value
            </div>
            <div className="kpi__val">
              {avgOrderValue > 0
                ? <><span style={{ font: "600 16px var(--sans)", color: "var(--muted)" }}>₹</span>{Math.round(avgOrderValue).toLocaleString("en-IN")}</>
                : <span style={{ font: "600 18px var(--sans)", color: "var(--muted-2)" }}>—</span>
              }
            </div>
            <div>
              <span style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>per order</span>
            </div>
          </div>

          {/* Tables */}
          <div className="kpi">
            <div className="kpi__label">
              <span className="ico">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16l-1 4H5z"/><path d="M6 13v7M18 13v7"/></svg>
              </span>
              Tables seated
            </div>
            <div className="kpi__val">
              {occupiedCount}
              <span style={{ font: "600 14px var(--sans)", color: "var(--muted)", marginLeft: 4 }}>/ {tables}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {tables > 0 ? (
                <span className="kpi__delta">
                  {tables > 0 ? Math.round((occupiedCount / tables) * 100) : 0}% full
                </span>
              ) : null}
              <span style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>
                {freeCount} free
              </span>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div style={{ height: 16 }} />
        <div className="grid-2">
          {/* Left col */}
          <div className="col-stack">
            {/* Revenue chart */}
            <div className="card">
              <div className="card__h">
                <div>
                  <h3>Revenue &middot; Today</h3>
                  <div style={{ font: "500 12px var(--sans)", color: "var(--muted)", marginTop: 2 }}>
                    From order items &middot; resets at midnight
                  </div>
                </div>
                <Link href="/dashboard/analytics" style={{ font: "600 12px var(--sans)", color: "var(--brand)", textDecoration: "none" }}>
                  Full report →
                </Link>
              </div>
              <div className="chart-wrap">
                {!hasRevenue ? (
                  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted-2)" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 3 5-7"/></svg>
                    <p style={{ margin: 0, font: "600 13px var(--sans)", color: "var(--muted)" }}>No orders yet today</p>
                    <p style={{ margin: 0, font: "500 11px var(--sans)", color: "var(--muted-2)" }}>Revenue will chart as orders come in</p>
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${W} ${H + 20}`} width="100%" height="100%" overflow="visible" style={{ display: "block" }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%"   stopColor="#FF4D3D" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#FF4D3D" stopOpacity="0"    />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75, 1].map((t) => (
                      <line key={t} x1={P} x2={W - P}
                        y1={P + (1 - t) * (H - P * 2)}
                        y2={P + (1 - t) * (H - P * 2)}
                        stroke="rgba(20,19,26,0.06)" strokeDasharray="4 5" />
                    ))}
                    {/* Baseline */}
                    <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="rgba(20,19,26,0.08)" />
                    {/* Area fill + smooth line */}
                    <path d={areaD} fill="url(#areaGrad)" />
                    <path d={lineD} fill="none" stroke="#FF4D3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {/* X-axis hour labels */}
                    {xLabels.map(({ h, x }) => (
                      <text key={h} x={x} y={H + 14} textAnchor="middle"
                        fill="var(--muted-2)" fontSize="9" fontWeight="600" fontFamily="Plus Jakarta Sans">
                        {fmtHour(h)}
                      </text>
                    ))}
                    {/* Peak dot + tooltip — only when revenue exists */}
                    {peakRevenue > 0 && (
                      <>
                        <circle cx={tipCoord.x} cy={tipCoord.y} r="5" fill="#FF4D3D" />
                        <circle cx={tipCoord.x} cy={tipCoord.y} r="9" fill="none" stroke="#FF4D3D" strokeOpacity="0.25" />
                        <g transform={`translate(${tipX - 38},${tipY - 40})`}>
                          <rect x="0" y="0" width="76" height="28" rx="7" fill="#14131A" />
                          <text x="38" y="11" textAnchor="middle" fill="rgba(255,255,255,.6)" fontSize="8.5" fontWeight="600" fontFamily="Plus Jakarta Sans">{peakLabel}</text>
                          <text x="38" y="22" textAnchor="middle" fill="#FF9385" fontSize="10" fontWeight="800" fontFamily="Plus Jakarta Sans">₹{Math.round(peakRevenue).toLocaleString("en-IN")}</text>
                        </g>
                      </>
                    )}
                  </svg>
                )}
              </div>
              <div style={{ display: "flex", gap: 28, marginTop: 14 }}>
                {[
                  { l: "Total",      v: `₹${Math.round(todayRevenue).toLocaleString("en-IN")}` },
                  { l: "Avg ticket", v: avgOrderValue > 0 ? `₹${Math.round(avgOrderValue).toLocaleString("en-IN")}` : "—" },
                  { l: "Peak",       v: peakRevenue > 0 ? peakLabel : "—" },
                ].map((s) => (
                  <div key={s.l}>
                    <div style={{ font: "600 11px var(--sans)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.l}</div>
                    <div style={{ font: "800 22px var(--sans)", letterSpacing: "-.02em" }}>{s.v}</div>
                  </div>
                ))}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "#FF4D3D", display: "inline-block" }} />
                  <span style={{ font: "600 12px var(--sans)" }}>Today</span>
                </div>
              </div>
            </div>

            {/* Live orders */}
            <div className="card" style={{ padding: "18px 18px 14px" }}>
              <div className="card__h" style={{ marginBottom: 14 }}>
                <div>
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    Live orders
                    {recentOrders.length > 0 && pendingOrders > 0 && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "rgba(46,110,247,.10)", color: "#2E6EF7",
                        font: "700 9.5px var(--sans)", padding: "3px 8px",
                        borderRadius: 999, letterSpacing: ".06em", textTransform: "uppercase",
                      }}>
                        <span className="live-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#2E6EF7", display: "inline-block" }} />
                        {pendingOrders} new
                      </span>
                    )}
                  </h3>
                  <div style={{ font: "500 11.5px var(--sans)", color: "var(--muted)", marginTop: 2 }}>
                    Last {recentOrders.length} orders · updates live
                  </div>
                </div>
                <Link href="/dashboard/orders" style={{ font: "700 12px var(--sans)", color: "var(--brand)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                  All orders
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div style={{ padding: "36px 0", textAlign: "center" }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16, background: "var(--surface-2)",
                    display: "grid", placeItems: "center", margin: "0 auto 12px",
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted-2)" strokeWidth="1.5"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>
                  </div>
                  <p style={{ margin: 0, font: "600 13px var(--sans)", color: "var(--ink)" }}>No orders yet</p>
                  <p style={{ margin: "4px 0 0", font: "500 11.5px var(--sans)", color: "var(--muted)" }}>
                    Orders appear here in real time
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {recentOrders.map((o) => {
                    const total = o.items.reduce((s, i) => s + Number(i.item_price) * i.quantity, 0);
                    const minutesAgo = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
                    const timeAgo = minutesAgo < 1 ? "just now" : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;
                    const isUrgent = minutesAgo > 20 && (o.status === "pending" || o.status === "confirmed" || o.status === "preparing");
                    const pillClass = o.status === "pending" ? "new" : o.status;

                    // Per-status left accent color
                    const accentColors: Record<string, string> = {
                      pending: "#2E6EF7", confirmed: "var(--brand)",
                      preparing: "var(--amber)", ready: "var(--green)",
                      served: "var(--muted-2)", cancelled: "var(--red)",
                    };
                    const accent = accentColors[o.status] ?? "var(--muted-2)";

                    return (
                      <Link key={o.id} href="/dashboard/orders" style={{ textDecoration: "none" }}>
                        <div className={`order-card-row status-${o.status}`} style={{ borderLeftColor: accent }}>
                          {/* Order num + time */}
                          <div>
                            <div className="order-num" style={{ color: isUrgent ? "var(--red)" : "var(--ink)" }}>
                              {o.order_number}
                            </div>
                            <div style={{ font: "500 10px var(--sans)", color: isUrgent ? "rgba(224,58,48,.8)" : "var(--muted-2)", marginTop: 2 }}>
                              {timeAgo}
                            </div>
                          </div>

                          {/* Table badge */}
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: "var(--bg)", border: "1px solid var(--hairline)",
                            borderRadius: 8, padding: "3px 8px",
                            font: "700 11px var(--sans)", color: "var(--ink-2)",
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16l-1 4H5z"/><path d="M6 13v4M18 13v4"/></svg>
                            {o.table ? o.table.table_number : "TW"}
                          </div>

                          {/* Items + amount */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ font: "500 11.5px var(--sans)", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {o.items.slice(0, 2).map(i => i.item_name).join(", ")}
                              {o.items.length > 2 ? ` +${o.items.length - 2}` : ""}
                            </div>
                            <div style={{ font: "800 13px var(--sans)", color: "var(--ink)", marginTop: 1 }}>
                              ₹{total.toFixed(0)}
                            </div>
                          </div>

                          {/* Status pill */}
                          <span className={`status-pill ${pillClass}`} style={{ flexShrink: 0 }}>
                            <span className="dot" />
                            {o.status === "pending" ? "New" : o.status}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right col */}
          <div className="col-stack">
            {/* Order status donut */}
            <div className="card">
              <div className="card__h">
                <h3>Today&apos;s orders</h3>
                <Link href="/dashboard/orders" style={{ font: "600 12px var(--sans)", color: "var(--brand)", textDecoration: "none" }}>
                  Orders →
                </Link>
              </div>
              <div className="donut-wrap">
                <svg width="140" height="140" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="#F2EEE8" strokeWidth="14" />
                  {segments.map((s, i) => (
                    <circle
                      key={i} cx="60" cy="60" r={R} fill="none"
                      stroke={s.color} strokeWidth="14"
                      strokeDasharray={`${s.len} ${C}`}
                      strokeDashoffset={s.offset}
                      transform="rotate(-90 60 60)"
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
                <div className="donut-center">
                  <div>
                    <div className="donut-center__v">{totalDonut}</div>
                    <div className="donut-center__l">Today</div>
                  </div>
                </div>
              </div>
              <div className="legend" style={{ marginTop: 18 }}>
                {totalDonut === 0 ? (
                  <div style={{ textAlign: "center", font: "500 12px var(--sans)", color: "var(--muted-2)", padding: "4px 0" }}>
                    No orders yet today
                  </div>
                ) : (
                  [
                    { lbl: "New",    count: newCount,    color: "#2E6EF7" },
                    { lbl: "Active", count: activeCount, color: "#F2A500" },
                    { lbl: "Served", count: doneCount,   color: "#1E9E5E" },
                  ].map((d) => (
                    <div key={d.lbl} className="legend__row">
                      <span className="sw" style={{ background: d.color }} />
                      {d.lbl}
                      <span className="val">{d.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top sellers */}
            <div className="card">
              <div className="card__h">
                <h3>Top sellers</h3>
                <Link href="/dashboard/menu" style={{ font: "600 12px var(--sans)", color: "var(--brand)", textDecoration: "none" }}>
                  Menu →
                </Link>
              </div>
              {topSellers.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🍽️</div>
                  <p style={{ margin: 0, font: "600 13px var(--sans)", color: "var(--muted)" }}>No orders yet</p>
                  <p style={{ margin: "4px 0 0", font: "500 11px var(--sans)", color: "var(--muted-2)" }}>
                    Top items appear once customers order
                  </p>
                </div>
              ) : (
                topSellers.map((it, i) => (
                  <div key={it.name} className="top-item">
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: "var(--surface-2)",
                      display: "grid", placeItems: "center",
                      font: "800 16px var(--sans)", color: "var(--brand)",
                    }}>
                      #{i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="top-item__name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.name}
                      </div>
                      <div className="top-item__cat">{it.qty} sold</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="top-item__qty">{it.qty}</div>
                      <div className="top-item__rev">{it.rev}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Floor plan */}
            <div className="card" style={{ padding: "18px 18px 16px" }}>
              <div className="card__h" style={{ marginBottom: 12 }}>
                <div>
                  <h3>Floor plan</h3>
                  <div style={{ font: "500 11.5px var(--sans)", color: "var(--muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: occupiedCount > 0 ? "var(--amber)" : "var(--green)", display: "inline-block" }} className="live-dot" />
                    {occupiedCount} occupied &nbsp;·&nbsp; {freeCount} free
                  </div>
                </div>
                <Link href="/dashboard/tables" style={{ font: "600 12px var(--sans)", color: "var(--brand)", textDecoration: "none" }}>
                  Full view →
                </Link>
              </div>

              {allTables.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🪑</div>
                  <p style={{ margin: 0, font: "600 13px var(--sans)", color: "var(--muted)" }}>No tables configured</p>
                  <Link href="/dashboard/tables" style={{ font: "600 12px var(--sans)", color: "var(--brand)", display: "inline-block", marginTop: 8 }}>
                    Add tables →
                  </Link>
                </div>
              ) : (
                <>
                  <div className="tbl-grid">
                    {allTables.map((t) => {
                      const cls = TABLE_DOT_CLASS[t.status] ?? "free";
                      const isOccupied = t.status === "occupied";
                      const isReserved = t.status === "reserved";
                      return (
                        <div key={t.table_number} className={`tbl-dot ${cls}`}>
                          {/* Subtle table icon top */}
                          <svg
                            width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            style={{ opacity: .45 }}
                          >
                            <path d="M4 9h16l-1 4H5z"/><path d="M6 13v5M18 13v5"/>
                          </svg>
                          <span className="tbl-num">{t.table_number}</span>
                          <span className="tbl-label">
                            {isOccupied ? "Busy" : isReserved ? "Reserved" : "Free"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Occupancy bar */}
                  <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--bg)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--hairline)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${tables > 0 ? Math.round((occupiedCount / tables) * 100) : 0}%`,
                        background: occupiedCount / tables > 0.8
                          ? "var(--red)"
                          : occupiedCount / tables > 0.5
                            ? "var(--amber)"
                            : "var(--green)",
                        borderRadius: 999,
                        transition: "width .4s ease",
                      }} />
                    </div>
                    <span style={{ font: "700 11px var(--sans)", color: "var(--ink)", minWidth: 40, textAlign: "right" }}>
                      {tables > 0 ? Math.round((occupiedCount / tables) * 100) : 0}% full
                    </span>
                  </div>

                  <div className="floor-legend" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--hairline)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {[
                      { cls: "free",  bg: "var(--green-soft)", border: "rgba(30,158,94,.3)",    label: "Free",     count: freeCount },
                      { cls: "busy",  bg: "var(--amber-soft)", border: "rgba(242,165,0,.3)",    label: "Occupied", count: occupiedCount },
                      { cls: "alert", bg: "rgba(224,58,48,.08)", border: "rgba(224,58,48,.25)", label: "Reserved", count: allTables.filter(t => t.status === "reserved").length },
                    ].map((item) => (
                      <div key={item.cls} className="floor-legend__item">
                        <span className="floor-legend__swatch" style={{ background: item.bg, borderColor: item.border }} />
                        {item.label}
                        <span className="floor-legend__count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
