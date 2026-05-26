"use client";

interface BreakdownProps {
  ordersByStatus: Array<{ status: string; count: number }>;
  paymentMethods: Array<{ method: string | null; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "#2E6EF7",
  confirmed: "var(--amber)",
  preparing: "var(--amber)",
  ready:     "var(--green)",
  served:    "var(--brand)",
  cancelled: "var(--red)",
};

const PAYMENT_COLORS = ["var(--brand)", "#2E6EF7", "var(--green)", "var(--amber)", "#9A99A4"];

export function OrdersBreakdown({ ordersByStatus, paymentMethods }: BreakdownProps) {
  const totalOrders   = ordersByStatus.reduce((s, x) => s + x.count, 0) || 1;
  const totalPayments = paymentMethods.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Orders by status */}
      <div className="card">
        <div className="card__h"><h3>Orders by status</h3></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ordersByStatus.map(s => {
            const pct = Math.round((s.count / totalOrders) * 100);
            const color = STATUS_COLORS[s.status] ?? "#9A99A4";
            return (
              <div key={s.status}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ font: "600 12px var(--sans)", color: "var(--ink)", textTransform: "capitalize" }}>
                      {s.status === "pending" ? "New" : s.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ font: "700 12px var(--sans)", color: "var(--ink)" }}>{s.count}</span>
                    <span style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: color, opacity: 0.8 }} />
                </div>
              </div>
            );
          })}
          {ordersByStatus.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", font: "500 12px var(--sans)", color: "var(--muted)" }}>No data</div>
          )}
        </div>
      </div>

      {/* Payment methods */}
      <div className="card">
        <div className="card__h"><h3>Payment methods</h3></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {paymentMethods.map((p, idx) => {
            const pct = Math.round((p.count / totalPayments) * 100);
            const color = PAYMENT_COLORS[idx % PAYMENT_COLORS.length];
            const label = p.method
              ? p.method.charAt(0).toUpperCase() + p.method.slice(1)
              : "Other";
            return (
              <div key={p.method ?? "other"}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ font: "600 12px var(--sans)", color: "var(--ink)" }}>{label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ font: "700 12px var(--sans)", color: "var(--ink)" }}>{p.count}</span>
                    <span style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: color, opacity: 0.8 }} />
                </div>
              </div>
            );
          })}
          {paymentMethods.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", font: "500 12px var(--sans)", color: "var(--muted)" }}>No payments yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
