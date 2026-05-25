"use client";

import { useRouter, useSearchParams } from 'next/navigation';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d',    label: '7 Days' },
  { key: '30d',   label: '30 Days' },
] as const;

export function DateRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get('range') || '7d';

  const setRange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    const to = new Date();
    const from = new Date();
    if (range === 'today') {
      from.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
    } else if (range === '30d') {
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
    }
    params.set('from', from.toISOString());
    params.set('to', to.toISOString());
    router.push(`/dashboard/analytics?${params.toString()}`);
  };

  return (
    <div style={{
      display: "flex", gap: 3,
      background: "var(--surface-2)",
      borderRadius: "var(--r-2)",
      padding: 4,
      border: "1px solid var(--hairline)",
    }}>
      {RANGES.map(({ key, label }) => {
        const isActive = currentRange === key;
        return (
          <button
            key={key}
            onClick={() => setRange(key)}
            style={{
              padding: "6px 13px",
              borderRadius: 10,
              border: "none",
              font: "600 12px var(--sans)",
              cursor: "pointer",
              transition: "all 0.15s",
              background: isActive ? "var(--surface)" : "transparent",
              color: isActive ? "var(--brand)" : "var(--muted)",
              boxShadow: isActive ? "var(--sh-1)" : "none",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
