"use client";

import { Users, Plus } from "lucide-react";

export interface WaiterTable {
  id: string;
  table_number: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
  orders?: Array<{ id: string; status: string; order_number: string; created_at: string }>;
}

interface Props {
  tables: WaiterTable[];
  onTakeOrder: (table: WaiterTable) => void;
  onSeat: (tableId: string) => void;
  loading?: boolean;
}

const STATUS_CFG = {
  available: { dot: "#22c55e", bg: "#14532d18", label: "Available", textColor: "#22c55e" },
  occupied:  { dot: "#ef4444", bg: "#7f1d1d18", label: "Occupied",  textColor: "#ef4444" },
  reserved:  { dot: "#f59e0b", bg: "#78350f18", label: "Reserved",  textColor: "#f59e0b" },
};

export function WaiterTableGrid({ tables, onTakeOrder, onSeat, loading }: Props) {
  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 120, borderRadius: 16, background: "#27272a", animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#71717a" }}>
        <Users size={32} style={{ margin: "0 auto 12px" }} />
        <p style={{ font: "600 14px var(--sans, sans-serif)" }}>No tables found</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
      {tables.map(table => {
        const cfg = STATUS_CFG[table.status] ?? STATUS_CFG.available;
        const activeOrder = table.orders?.[0];

        return (
          <button
            key={table.id}
            onClick={() => table.status === "available" ? onSeat(table.id) : onTakeOrder(table)}
            style={{
              background: cfg.bg,
              border: `1.5px solid ${cfg.dot}40`,
              borderRadius: 16,
              padding: "14px 12px",
              cursor: "pointer",
              textAlign: "left",
              transition: "transform 0.12s, box-shadow 0.12s",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {/* Table number */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ font: "800 18px var(--sans, sans-serif)", color: "#fff" }}>
                T{table.table_number}
              </span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
            </div>

            {/* Status */}
            <span style={{ font: "600 10px var(--sans, sans-serif)", color: cfg.textColor, textTransform: "uppercase", letterSpacing: ".06em" }}>
              {cfg.label}
            </span>

            {/* Capacity */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#71717a" }}>
              <Users size={12} strokeWidth={2} />
              <span style={{ font: "500 11px var(--sans, sans-serif)" }}>{table.capacity}</span>
            </div>

            {/* Active order badge */}
            {activeOrder && (
              <div style={{
                background: "#27272a", borderRadius: 8, padding: "4px 8px",
                font: "600 10px var(--sans, sans-serif)", color: "#a1a1aa",
              }}>
                #{activeOrder.order_number}
              </div>
            )}

            {/* CTA */}
            {table.status === "available" && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#22c55e", font: "600 11px var(--sans,sans-serif)", marginTop: 2 }}>
                <Plus size={12} strokeWidth={2.5} /> Seat guests
              </div>
            )}
            {table.status === "occupied" && (
              <div style={{ color: "#2E6EF7", font: "600 11px var(--sans,sans-serif)", marginTop: 2 }}>
                + Add order
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
