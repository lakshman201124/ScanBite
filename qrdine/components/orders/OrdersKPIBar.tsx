"use client";

import { Clock, TrendingUp, TrendingDown, Activity, ShoppingBag, IndianRupee, AlertTriangle } from "lucide-react";

interface KPI {
  label: string;
  value: string;
  sub?: string;
  trend?: { direction: "up" | "down" | "neutral"; value: string };
  icon: typeof Activity;
  color: string;
  bg: string;
}

interface Props {
  activeNow: number;
  todayTotal: number;
  todayChange?: { direction: "up" | "down"; value: string };
  avgTicket: string;
  avgTicketChange?: string;
  avgFulfillTime?: string;
  fulfillTimeChange?: string;
  cancellationRate?: string;
  lastUpdated?: string;
}

export function OrdersKPIBar({
  activeNow,
  todayTotal,
  todayChange,
  avgTicket,
  avgTicketChange,
  avgFulfillTime,
  fulfillTimeChange,
  cancellationRate,
  lastUpdated,
}: Props) {
  const kpis: KPI[] = [
    {
      label: "Active right now",
      value: String(activeNow),
      sub: "new → prep → ready",
      icon: Activity,
      color: "#2E6EF7",
      bg: "rgba(46,110,247,0.08)",
    },
    {
      label: "Tonight's orders",
      value: todayTotal.toLocaleString("en-IN"),
      sub: todayChange ? `${todayChange.direction === "up" ? "+" : "-"}${todayChange.value} vs yesterday` : "Today",
      trend: todayChange ? { direction: todayChange.direction, value: todayChange.value } : undefined,
      icon: ShoppingBag,
      color: "var(--brand)",
      bg: "var(--brand-tint)",
    },
    {
      label: "Avg ticket",
      value: avgTicket,
      sub: avgTicketChange ? `+${avgTicketChange} vs yesterday` : "Per bill",
      trend: avgTicketChange ? { direction: "up", value: avgTicketChange } : undefined,
      icon: IndianRupee,
      color: "var(--green)",
      bg: "var(--green-soft)",
    },
    {
      label: "Avg fulfil time",
      value: avgFulfillTime ?? "--",
      sub: fulfillTimeChange ? `-${fulfillTimeChange} vs yesterday` : "Prep → served",
      trend: fulfillTimeChange ? { direction: "up", value: fulfillTimeChange } : undefined,
      icon: Clock,
      color: "var(--amber)",
      bg: "var(--amber-soft)",
    },
    {
      label: "Cancellations",
      value: cancellationRate ?? "0%",
      sub: "Last 7 days",
      icon: AlertTriangle,
      color: cancellationRate && parseFloat(cancellationRate) > 5 ? "var(--red)" : "var(--muted-2)",
      bg: cancellationRate && parseFloat(cancellationRate) > 5 ? "rgba(224,58,48,0.08)" : "var(--surface-2)",
    },
  ];

  return (
    <div>
      {/* Subheader */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ font: "500 13px var(--sans)", color: "var(--muted)" }}>
          <strong style={{ color: "var(--ink)" }}>{todayTotal.toLocaleString("en-IN")}</strong> today
          <span style={{ margin: "0 8px", color: "var(--hairline)" }}>·</span>
          <strong style={{ color: "var(--brand)" }}>{activeNow}</strong> active
        </span>
        {lastUpdated && (
          <>
            <span style={{ color: "var(--hairline)" }}>·</span>
            <span style={{ font: "500 12px var(--sans)", color: "var(--muted-2)" }}>
              Last updated {lastUpdated}
            </span>
          </>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: 16,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: kpi.bg, display: "grid", placeItems: "center",
                color: kpi.color,
              }}>
                <kpi.icon size={16} strokeWidth={2.2} />
              </div>
              {kpi.trend && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 7px", borderRadius: 999,
                  background: kpi.trend.direction === "up" ? "var(--green-soft)" : "rgba(224,58,48,.08)",
                  border: `1px solid ${kpi.trend.direction === "up" ? "rgba(30,158,94,.15)" : "rgba(224,58,48,.15)"}`,
                }}>
                  {kpi.trend.direction === "up" ? (
                    <TrendingUp size={10} color="var(--green)" strokeWidth={2.5} />
                  ) : (
                    <TrendingDown size={10} color="var(--red)" strokeWidth={2.5} />
                  )}
                  <span style={{
                    font: "700 10px var(--sans)",
                    color: kpi.trend.direction === "up" ? "var(--green)" : "var(--red)",
                  }}>
                    {kpi.trend.value}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: 6 }}>
              <div style={{
                font: "600 11px var(--sans)",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 2,
              }}>
                {kpi.label}
              </div>
              <div style={{
                font: "800 24px var(--sans)",
                color: "var(--ink)",
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}>
                {kpi.value}
              </div>
              <div style={{ font: "500 11px var(--sans)", color: "var(--muted-2)" }}>
                {kpi.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
