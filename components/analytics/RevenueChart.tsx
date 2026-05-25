"use client";

import { useState, useMemo } from "react";

interface ChartProps {
  data: Array<{ date: string; revenue: number; priorRevenue?: number }>;
  revenueStats?: {
    bestDay: string | null;
    bestDayRevenue: number;
    worstDay: string | null;
    worstDayRevenue: number;
  };
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function RevenueChart({ data, revenueStats }: ChartProps) {
  const [range, setRange] = useState<"7D" | "30D" | "90D" | "YTD">("30D");

  const visibleData = useMemo(() => {
    if (range === "7D") return data.slice(-7);
    if (range === "90D") return data.slice(-90);
    return data;
  }, [data, range]);

  const W = 740, H = 200, padT = 10, padB = 10, padL = 0, padR = 0;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxRev = Math.max(...visibleData.map(d => Math.max(d.revenue, d.priorRevenue ?? 0)), 1);

  function toY(v: number) {
    return padT + innerH - (v / maxRev) * innerH;
  }
  function toX(i: number) {
    return padL + (i / Math.max(visibleData.length - 1, 1)) * innerW;
  }

  const currentPoints = visibleData.map((d, i) => ({ x: toX(i), y: toY(d.revenue) }));
  const priorPoints   = visibleData.map((d, i) => ({ x: toX(i), y: toY(d.priorRevenue ?? 0) }));

  const currentPath = buildPath(currentPoints);
  const priorPath   = buildPath(priorPoints);
  const areaPath    = currentPath + ` L${toX(visibleData.length-1).toFixed(1)},${H} L${toX(0).toFixed(1)},${H} Z`;

  // Peak point
  const peakIdx = visibleData.reduce((best, d, i) => d.revenue > (visibleData[best]?.revenue ?? 0) ? i : best, 0);
  const peakPt  = currentPoints[peakIdx];
  const peakDay = visibleData[peakIdx];

  const gridLines = [padT, padT + innerH * 0.25, padT + innerH * 0.5, padT + innerH * 0.75, padT + innerH];

  return (
    <div className="card">
      <div className="card__h">
        <div>
          <h3>Revenue trend</h3>
          <div>Daily net · this period vs prior 30 days</div>
        </div>
        <div className="seg">
          {(["7D","30D","90D","YTD"] as const).map(r => (
            <button key={r} className={range === r ? "is-on" : ""} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="asArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#FF5640" stopOpacity="0.28"/>
              <stop offset="1" stopColor="#FF5640" stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((y, i) => (
            <line key={i} x1={0} x2={W} y1={y} y2={y} stroke="rgba(20,19,26,0.05)" strokeDasharray="3 4"/>
          ))}

          {/* Area fill */}
          {currentPath && <path d={areaPath} fill="url(#asArea)"/>}

          {/* Prior period dashed line */}
          {priorPath && (
            <path d={priorPath} fill="none" stroke="#A0A89F" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"/>
          )}

          {/* Current period line */}
          {currentPath && (
            <path d={currentPath} fill="none" stroke="#FF5640" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          )}

          {/* Peak tooltip */}
          {peakPt && peakDay && peakDay.revenue > 0 && (
            <g>
              <line x1={peakPt.x} x2={peakPt.x} y1={peakPt.y} y2={H}
                stroke="#FF5640" strokeOpacity=".25" strokeDasharray="2 3"/>
              <circle cx={peakPt.x} cy={peakPt.y} r="6" fill="#fff" stroke="#FF5640" strokeWidth="3"/>
              <g transform={`translate(${Math.min(Math.max(peakPt.x - 46, 0), W - 92)}, ${Math.max(peakPt.y - 44, -8)})`}>
                <rect x="0" y="0" width="92" height="34" rx="8" fill="#14211A"/>
                <text x="46" y="14" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="var(--sans)">
                  {peakDay.date}
                </text>
                <text x="46" y="27" textAnchor="middle" fill="#FF8A5E" fontSize="11" fontWeight="800" fontFamily="var(--sans)">
                  ₹{peakDay.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <div className="as-legend">
        <div><span className="sw"/>{" "}This period</div>
        <div><span className="sw dashed"/>{" "}Prior 30 days</div>
        {revenueStats?.bestDay && (
          <div className="as-legend__stat">
            <span className="as-legend__lbl">Best day</span>
            <span className="as-legend__val">
              {revenueStats.bestDay} · ₹{revenueStats.bestDayRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
        {revenueStats?.worstDay && (
          <div className="as-legend__stat">
            <span className="as-legend__lbl">Worst day</span>
            <span className="as-legend__val">
              {revenueStats.worstDay} · ₹{revenueStats.worstDayRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
