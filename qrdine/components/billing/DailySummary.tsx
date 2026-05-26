"use client";

import { motion } from "framer-motion";

interface SummaryData {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  cash_revenue: number;
  online_revenue: number;
  unpaid_count: number;
  unpaid_amount: number;
}

const RevenueIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12M6 8h12M16 13H6c5 0 7 4 12 8"/>
  </svg>
);
const TrendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/><path d="m7 16 4-8 4 4 4-4"/>
  </svg>
);
const CashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L2 7h20l-6-4z"/>
  </svg>
);
const OnlineIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export function DailySummary({ data }: { data: SummaryData }) {
  const chips = [
    {
      label: "Today's Revenue",
      value: `₹${data.total_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      sub: `${data.total_orders} orders paid`,
      color: "var(--brand)",
      borderColor: "var(--brand)",
      bg: "var(--surface)",
      iconBg: "var(--brand-soft)",
      icon: <RevenueIcon />,
    },
    {
      label: "Avg Order Value",
      value: `₹${data.avg_order_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      sub: "per bill",
      color: "var(--blue)",
      borderColor: "#2E6EF7",
      bg: "var(--surface)",
      iconBg: "rgba(46,110,247,0.1)",
      icon: <TrendIcon />,
    },
    {
      label: "Cash Collected",
      value: `₹${data.cash_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      sub: "pay at counter",
      color: "var(--green)",
      borderColor: "var(--green)",
      bg: "var(--surface)",
      iconBg: "var(--green-soft)",
      icon: <CashIcon />,
    },
    {
      label: "Online Payments",
      value: `₹${data.online_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      sub: "UPI / card",
      color: "var(--amber)",
      borderColor: "var(--amber)",
      bg: "var(--surface)",
      iconBg: "var(--amber-soft)",
      icon: <OnlineIcon />,
    },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        {chips.map((c, idx) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: c.bg,
              border: "1px solid var(--hairline)",
              borderLeft: `3px solid ${c.borderColor}`,
              borderRadius: "var(--r-3)",
              padding: "16px 18px",
              boxShadow: "var(--sh-1)",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
              <span style={{
                font: "600 10px var(--sans)",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
              }}>
                {c.label}
              </span>
              <span style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: c.iconBg,
                color: c.color,
                display: "grid",
                placeItems: "center",
              }}>
                {c.icon}
              </span>
            </div>
            <div style={{
              fontFamily: "var(--sans)",
              fontSize: 22,
              fontWeight: 800,
              color: "var(--ink)",
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.1,
            }}>
              {c.value}
            </div>
            <div style={{ font: "500 11px var(--sans)", color: "var(--muted)", marginTop: 4 }}>{c.sub}</div>
          </motion.div>
        ))}

        {/* Outstanding chip */}
        {data.unpaid_count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: chips.length * 0.06, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "rgba(224,58,48,.03)",
              border: "1px solid rgba(224,58,48,.18)",
              borderLeft: "3px solid var(--red)",
              borderRadius: "var(--r-3)",
              padding: "16px 18px",
              boxShadow: "var(--sh-1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
              <span style={{ font: "600 10px var(--sans)", color: "var(--red)", textTransform: "uppercase", letterSpacing: ".07em" }}>
                Outstanding
              </span>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(224,58,48,.1)", color: "var(--red)", display: "grid", placeItems: "center" }}>
                <AlertIcon />
              </span>
            </div>
            <div style={{
              fontFamily: "var(--sans)",
              fontSize: 22,
              fontWeight: 800,
              color: "var(--red)",
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.1,
            }}>
              ₹{data.unpaid_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ font: "500 11px var(--sans)", color: "rgba(224,58,48,.7)", marginTop: 4 }}>
              {data.unpaid_count} unpaid order{data.unpaid_count !== 1 ? "s" : ""}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
