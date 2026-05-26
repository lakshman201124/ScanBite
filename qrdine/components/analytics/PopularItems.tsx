"use client";

interface PopularItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface PopularItemProps {
  items: PopularItem[];
}

export function PopularItems({ items }: PopularItemProps) {
  const maxQty = Math.max(...items.map(i => i.quantity), 1);

  return (
    <div className="card">
      <div className="card__h">
        <div>
          <h3>Popular items</h3>
          <div>By quantity sold · this period</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.slice(0, 8).map((item, idx) => {
          const pct = Math.round((item.quantity / maxQty) * 100);
          return (
            <div key={item.name}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 6,
                    background: idx === 0 ? "var(--brand)" : "var(--surface-2)",
                    display: "grid", placeItems: "center",
                    font: "800 9px var(--sans)",
                    color: idx === 0 ? "#fff" : "var(--muted)",
                    flexShrink: 0,
                  }}>{idx + 1}</span>
                  <span style={{ font: "600 12px var(--sans)", color: "var(--ink)" }}>{item.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ font: "700 12px var(--sans)", color: "var(--ink-2)" }}>{item.quantity.toLocaleString("en-IN")}</span>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>
                    ₹{item.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
              <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${pct}%`, borderRadius: 2,
                  background: idx === 0
                    ? "linear-gradient(to right, var(--brand), rgba(255,77,61,.6))"
                    : "linear-gradient(to right, var(--ink-2), rgba(20,19,26,.35))",
                  transition: "width .5s cubic-bezier(.22,1,.36,1)",
                }} />
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div style={{ padding: "32px 0", textAlign: "center", font: "500 12px var(--sans)", color: "var(--muted)" }}>
            No item data for this period
          </div>
        )}
      </div>
    </div>
  );
}
