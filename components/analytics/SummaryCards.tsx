"use client";

interface ExtendedKPIs {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  repeatRate?: number;
  priorRevenue?: number;
  priorOrders?: number;
}

interface KPIProps {
  kpis: ExtendedKPIs;
}

function pctChange(current: number, prior: number) {
  if (!prior || prior === 0) return null;
  const pct = ((current - prior) / prior) * 100;
  return { pct, up: pct >= 0, label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` };
}

function UpArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 15 6-6 6 6"/>
    </svg>
  );
}

function DnArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

export function SummaryCards({ kpis }: KPIProps) {
  const revenueChange = pctChange(kpis.totalRevenue, kpis.priorRevenue ?? 0);
  const ordersChange  = pctChange(kpis.totalOrders,  kpis.priorOrders  ?? 0);
  const dailyAvg = Math.round(kpis.totalOrders / 30);

  return (
    <div className="as-kpis">
      {/* Feature KPI — Revenue with sparkline */}
      <div className="as-kpi feature">
        <div className="as-kpi__l">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12M6 8h12M16 13H6c5 0 7 4 12 8"/>
          </svg>
          Net revenue
        </div>
        <div className="as-kpi__v">
          ₹{kpis.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </div>
        <div className="as-kpi__row">
          {revenueChange ? (
            <span className={`as-delta ${revenueChange.up ? "up" : "dn"}`}>
              {revenueChange.up ? <UpArrow /> : <DnArrow />} {revenueChange.label}
            </span>
          ) : null}
          {kpis.priorRevenue ? (
            <span className="as-kpi__hint">vs ₹{kpis.priorRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} prior</span>
          ) : null}
        </div>
        <div className="as-spark">
          <svg viewBox="0 0 120 36" width="100%" height="36" preserveAspectRatio="none">
            <path
              d="M0 28 L10 24 L20 26 L30 20 L40 22 L50 16 L60 18 L70 12 L80 14 L90 8 L100 10 L110 6 L120 4"
              stroke="rgba(255,255,255,.65)" strokeWidth="1.6" fill="none" strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Orders */}
      <div className="as-kpi">
        <div className="as-kpi__l">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>
          </svg>
          Orders
        </div>
        <div className="as-kpi__v">{kpis.totalOrders.toLocaleString("en-IN")}</div>
        <div className="as-kpi__row">
          {ordersChange ? (
            <span className={`as-delta ${ordersChange.up ? "up" : "dn"}`}>
              {ordersChange.up ? <UpArrow /> : <DnArrow />} {ordersChange.label}
            </span>
          ) : null}
          <span className="as-kpi__hint">{dailyAvg}/day avg</span>
        </div>
      </div>

      {/* Avg ticket */}
      <div className="as-kpi">
        <div className="as-kpi__l">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Avg ticket
        </div>
        <div className="as-kpi__v">₹{kpis.averageOrderValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        <div className="as-kpi__row">
          <span className="as-delta up"><UpArrow /> —</span>
          <span className="as-kpi__hint">Per bill</span>
        </div>
      </div>

      {/* Repeat rate */}
      <div className="as-kpi">
        <div className="as-kpi__l">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
          Repeat rate
        </div>
        <div className="as-kpi__v">{kpis.repeatRate ?? 0}%</div>
        <div className="as-kpi__row">
          <span className="as-kpi__hint">{kpis.uniqueCustomers.toLocaleString("en-IN")} unique guests</span>
        </div>
      </div>

      {/* Unique customers */}
      <div className="as-kpi">
        <div className="as-kpi__l">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2 14.5 8.5 21 9.3l-5 4.6 1.3 6.6L12 17.3 6.7 20.5 8 13.9 3 9.3l6.5-.8z"/>
          </svg>
          Avg rating
        </div>
        <div className="as-kpi__v">4.7<span className="as-kpi__sub">/5</span></div>
        <div className="as-kpi__row">
          <span className="as-delta dn"><DnArrow /> 0.1</span>
          <span className="as-kpi__hint">{kpis.uniqueCustomers} guests</span>
        </div>
      </div>
    </div>
  );
}
