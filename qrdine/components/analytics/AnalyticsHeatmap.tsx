"use client";

interface HeatmapProps {
  heatmap: Array<{ day: string; hours: Array<{ hour: number; count: number }> }>;
  peakInfo: { day: string; hour: number; count: number };
}

const DISPLAY_HOURS = [11,12,13,14,15,16,17,18,19,20,21,22,23,0];

function hourLabel(h: number) {
  if (h === 0) return "12a";
  if (h < 12)  return `${h}a`;
  if (h === 12) return "12p";
  return `${h-12}p`;
}

export function AnalyticsHeatmap({ heatmap, peakInfo }: HeatmapProps) {
  const maxCount = Math.max(...heatmap.flatMap(d => d.hours.map(h => h.count)), 1);

  function cellOpacity(count: number) {
    if (count === 0) return 0.07;
    return 0.07 + (count / maxCount) * 0.83;
  }

  return (
    <div className="card">
      <div className="card__h">
        <div>
          <h3>When you&apos;re busiest</h3>
          <div>Orders by day &amp; hour · last 30 days</div>
        </div>
        <div className="as-heat-legend">
          <span>Low</span>
          <span className="as-heat-legend__bar" />
          <span>High</span>
        </div>
      </div>

      <div className="as-heat">
        <div className="as-heat__head">
          <span />
          {DISPLAY_HOURS.map(h => (
            <span key={h} className="as-heat__hr">{hourLabel(h)}</span>
          ))}
        </div>
        {heatmap.map(row => (
          <div key={row.day} className="as-heat__row">
            <span className="as-heat__day">{row.day}</span>
            {DISPLAY_HOURS.map(h => {
              const cell = row.hours.find(x => x.hour === h);
              const count = cell?.count ?? 0;
              const opacity = cellOpacity(count);
              const isPeak = peakInfo.day === row.day && peakInfo.hour === h;
              return (
                <div
                  key={h}
                  className="as-heat__cell"
                  title={`${row.day} ${hourLabel(h)}: ${count} orders`}
                  style={{ background: `rgba(255,77,61,${opacity})` }}
                >
                  {(count > maxCount * 0.6 || isPeak) && (
                    <span
                      className="as-heat__peak"
                      style={{
                        background: isPeak
                          ? "rgba(255,77,61,0.35)"
                          : `rgba(255,77,61,${opacity * 0.6})`,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="as-heat-foot">
        <span>
          {peakInfo.day && peakInfo.count > 0 ? (
            <><b>{peakInfo.day} {hourLabel(peakInfo.hour)}</b> is your peak — {peakInfo.count} orders</>
          ) : "Track your busiest hours"}
        </span>
        {peakInfo.count > 0 && (
          <span className="as-heat-foot__pill">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 15 6-6 6 6"/>
            </svg>
            Staff up on {peakInfo.day}s {hourLabel(peakInfo.hour)}–{hourLabel((peakInfo.hour+2)%24)}
          </span>
        )}
      </div>
    </div>
  );
}
