"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface DishRow {
  name: string;
  category: string;
  sold: number;
  revenue: number;
  trend: string | null;
  trendPositive: boolean | null;
}

interface TopDishesProps {
  dishes: DishRow[];
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

type SortKey = "Revenue" | "Volume" | "Margin" | "Rating";

export function TopDishes({ dishes }: TopDishesProps) {
  const [sortKey, setSortKey] = useState<SortKey>("Revenue");

  const sorted = [...dishes].sort((a, b) => {
    if (sortKey === "Volume") return b.sold - a.sold;
    return b.revenue - a.revenue;
  });

  return (
    <div className="card">
      <div className="card__h">
        <div>
          <h3>Top performing dishes</h3>
          <div>30-day · sorted by {sortKey.toLowerCase()}</div>
        </div>
        <div className="seg">
          {(["Revenue","Volume","Margin","Rating"] as SortKey[]).map(k => (
            <button key={k} className={sortKey === k ? "is-on" : ""} onClick={() => setSortKey(k)}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="as-table">
        <div className="as-table__head">
          <div>Dish</div>
          <div>Category</div>
          <div className="num">Sold</div>
          <div className="num">Revenue</div>
          <div className="num">Margin</div>
          <div className="num">Trend</div>
          <div />
        </div>
        {sorted.map((dish, idx) => (
          <div key={dish.name} className="as-table__row">
            <div className="as-table__dish">
              <div className="as-table__rank">{idx + 1}</div>
              <div className="as-table__img" />
              <div>
                <div className="as-table__name">{dish.name}</div>
                <div className="as-table__sub">{dish.category}</div>
              </div>
            </div>
            <div className="as-table__cat">{dish.category}</div>
            <div className="as-table__v num">{dish.sold.toLocaleString("en-IN")}</div>
            <div className="as-table__v num">₹{dish.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="as-table__v num">—</div>
            <div className="num">
              {dish.trend ? (
                <span className={`as-delta ${dish.trendPositive ? "up" : "dn"}`}>
                  {dish.trendPositive ? <UpArrow /> : <DnArrow />} {dish.trend}
                </span>
              ) : <span style={{ color: "var(--muted)", font: "500 11px var(--sans)" }}>—</span>}
            </div>
            <div>
              <button className="adm-icon-btn">
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div style={{ padding: "32px 12px", textAlign: "center", font: "500 12px var(--sans)", color: "var(--muted)" }}>
            No dish data for this period
          </div>
        )}
      </div>
    </div>
  );
}
