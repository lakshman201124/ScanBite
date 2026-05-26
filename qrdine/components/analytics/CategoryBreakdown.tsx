"use client";

interface CategoryRow {
  name: string;
  orders: number;
  revenue: number;
}

interface CategoryProps {
  data: CategoryRow[];
}

export function CategoryBreakdown({ data }: CategoryProps) {
  const totalRev = data.reduce((s, c) => s + c.revenue, 0) || 1;

  function fmtRev(v: number) {
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  }

  return (
    <div className="card">
      <div className="card__h">
        <h3>By category</h3>
        <button className="adm-icon-btn">···</button>
      </div>
      <div className="as-cats">
        {data.map(cat => {
          const pct = Math.round((cat.revenue / totalRev) * 100);
          return (
            <div key={cat.name} className="as-cat">
              <div className="as-cat__t">
                <span className="as-cat__name">{cat.name}</span>
                <span className="as-cat__pct">{pct}%</span>
              </div>
              <div className="as-cat__bar">
                <div className="as-cat__fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="as-cat__rev">{fmtRev(cat.revenue)}</div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div style={{ padding: "24px 0", textAlign: "center", font: "500 12px var(--sans)", color: "var(--muted)" }}>
            No category data
          </div>
        )}
      </div>
    </div>
  );
}
