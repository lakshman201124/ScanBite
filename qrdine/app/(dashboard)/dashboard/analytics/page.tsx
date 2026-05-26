"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SummaryCards } from '@/components/analytics/SummaryCards';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { OrdersBreakdown } from '@/components/analytics/OrdersBreakdown';
import { AnalyticsHeatmap } from '@/components/analytics/AnalyticsHeatmap';
import { CustomerCRM } from '@/components/analytics/CustomerCRM';
import { CategoryBreakdown } from '@/components/analytics/CategoryBreakdown';
import { TopDishes } from '@/components/analytics/TopDishes';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { Download, FileText, BarChart2 } from 'lucide-react';
import type { CSSProperties } from 'react';

interface AnalyticsData {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    uniqueCustomers: number;
    repeatRate: number;
    priorRevenue: number;
    priorOrders: number;
  };
  revenueChart: Array<{ date: string; revenue: number; priorRevenue: number }>;
  revenueStats: { bestDay: string | null; bestDayRevenue: number; worstDay: string | null; worstDayRevenue: number };
  popularItems: Array<{ name: string; quantity: number; revenue: number }>;
  topDishes: Array<{ name: string; category: string; sold: number; revenue: number; trend: string | null; trendPositive: boolean | null }>;
  categoryBreakdown: Array<{ name: string; orders: number; revenue: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  paymentMethods: Array<{ method: string; count: number }>;
  heatmap: Array<{ day: string; hours: Array<{ hour: number; count: number }> }>;
  peakInfo: { day: string; hour: number; count: number };
  customerBreakdown: { total: number; newCount: number; returningCount: number; loyalCount: number; winBackReady: number };
}

const exportPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  font: "600 12px var(--sans)",
  color: "var(--muted)",
  padding: "7px 14px",
  border: "1.5px solid var(--hairline)",
  borderRadius: 999,
  background: "var(--surface)",
  textDecoration: "none",
  cursor: "pointer",
  transition: "border-color 0.15s, color 0.15s",
  letterSpacing: ".01em",
};

function Skeleton({ h, w = "100%" }: { h: number; w?: string }) {
  return (
    <div style={{ height: h, width: w, background: "var(--surface-2)", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
  );
}

function KPISkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 20, padding: "22px 24px", boxShadow: "var(--sh-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <Skeleton h={44} w="44px" />
            <Skeleton h={24} w="52px" />
          </div>
          <Skeleton h={10} w="80px" />
          <div style={{ marginTop: 8 }}><Skeleton h={34} w="130px" /></div>
          <div style={{ marginTop: 8 }}><Skeleton h={10} w="70px" /></div>
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ height }: { height: number }) {
  return (
    <div className="card" style={{ padding: "24px", height, borderRadius: 20 }}>
      <Skeleton h={15} w="130px" />
      <div style={{ marginTop: 6, marginBottom: 24 }}><Skeleton h={10} w="180px" /></div>
      <Skeleton h={height - 100} />
    </div>
  );
}

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(false);
      try {
        const from = searchParams.get("from") || "";
        const to   = searchParams.get("to")   || "";
        const query = new URLSearchParams();
        if (from) query.set("from", from);
        if (to)   query.set("to", to);
        const res = await fetch(`/api/admin/analytics?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json() as { success: boolean; data: AnalyticsData };
        if (json.success) setData(json.data);
        else throw new Error("Bad response");
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [searchParams]);

  const from = searchParams.get("from") || "";
  const to   = searchParams.get("to")   || "";

  const dateLabel = from && to
    ? `${from} — ${to}`
    : "All time";

  return (
    <main className="adm-main">
      <header className="adm-top" style={{ gap: 10, flexWrap: "wrap" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--display)",
            fontSize: 28, fontWeight: 400,
            letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1,
          }}>
            Analytics
            <em style={{ fontStyle: "italic", color: "var(--brand)", marginLeft: 8 }}>insights</em>
          </h1>
          <div className="adm-top__sub" style={{ marginTop: 4 }}>
            {dateLabel} · Revenue · Orders · Performance
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
          <DateRangePicker />
          <div style={{ width: 1, height: 22, background: "var(--hairline)" }} />
          <a
            href={`/api/admin/export/orders?from=${from}&to=${to}`}
            download
            style={exportPill}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ink-2)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--hairline)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)"; }}
          >
            <Download size={12} strokeWidth={2.2} /> Orders
          </a>
          <a
            href={`/api/admin/export/bills?from=${from}&to=${to}`}
            download
            style={exportPill}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ink-2)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--hairline)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)"; }}
          >
            <FileText size={12} strokeWidth={2.2} /> Bills
          </a>
          <a
            href={`/api/admin/export/analytics?from=${from}&to=${to}`}
            download
            style={{
              ...exportPill,
              background: "var(--brand)",
              color: "#fff",
              border: "none",
              boxShadow: "var(--sh-coral)",
            }}
          >
            <BarChart2 size={12} strokeWidth={2.2} /> PDF Report
          </a>
        </div>
      </header>

      <div className="adm-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {loading ? (
          <>
            <KPISkeleton />
            <div style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)" }}>
              <CardSkeleton height={380} />
              <CardSkeleton height={380} />
            </div>
            <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))" }}>
              <CardSkeleton height={320} />
              <CardSkeleton height={320} />
              <CardSkeleton height={320} />
            </div>
            <CardSkeleton height={340} />
          </>
        ) : error || !data ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--surface-2)", display: "grid", placeItems: "center", margin: "0 auto 16px", fontSize: 26 }}></div>
            <p style={{ font: "700 15px var(--sans)", color: "var(--ink)", margin: 0 }}>Failed to load analytics</p>
            <p style={{ font: "500 12px var(--sans)", color: "var(--muted)", margin: "6px 0 0" }}>Try refreshing the page</p>
          </div>
        ) : (
          <>
            <SummaryCards kpis={data.kpis} />
            <div className="as-grid">
              <RevenueChart data={data.revenueChart} revenueStats={data.revenueStats} />
              <CustomerCRM breakdown={data.customerBreakdown} />
            </div>
            <div className="as-grid as-grid--2-1">
              <AnalyticsHeatmap heatmap={data.heatmap} peakInfo={data.peakInfo} />
              <CategoryBreakdown data={data.categoryBreakdown} />
            </div>
            <TopDishes dishes={data.topDishes} />
            <OrdersBreakdown ordersByStatus={data.ordersByStatus} paymentMethods={data.paymentMethods} />
          </>
        )}
      </div>
    </main>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <main className="adm-main">
        <header className="adm-top">
          <div>
            <h1 style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em" }}>
              Analytics<em style={{ fontStyle: "italic", color: "var(--brand)", marginLeft: 8 }}>insights</em>
            </h1>
            <div className="adm-top__sub">Revenue · Orders · Performance</div>
          </div>
        </header>
        <div className="adm-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 140, background: "var(--surface)", borderRadius: 20, border: "1px solid var(--hairline)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        </div>
      </main>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}
