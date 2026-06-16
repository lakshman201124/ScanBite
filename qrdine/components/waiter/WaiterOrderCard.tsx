"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Clock } from "lucide-react";

export interface WaiterOrder {
  id: string;
  orderNumber: string;
  tableId: string;
  tableName: string;
  status: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  notes?: string | null;
  createdAt: string;
}

interface Props {
  order: WaiterOrder;
  onMarkServed?: (orderId: string) => Promise<void>;
  onRequestBill?: (orderId: string) => Promise<void>;
  compact?: boolean;
}

function elapsedLabel(createdAt: string) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "#f59e0b",
  confirmed:  "#2E6EF7",
  preparing:  "#a855f7",
  ready:      "#22c55e",
  served:     "#71717a",
  cancelled:  "#ef4444",
};

export function WaiterOrderCard({ order, onMarkServed, onRequestBill, compact }: Props) {
  const [loadingServe, setLoadingServe]   = useState(false);
  const [loadingBill, setLoadingBill]     = useState(false);
  const isReady = order.status === "ready";
  const color = STATUS_COLORS[order.status] ?? "#71717a";
  const elapsed = elapsedLabel(order.createdAt);
  const total = order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  async function handleServe() {
    if (!onMarkServed) return;
    setLoadingServe(true);
    try { await onMarkServed(order.id); }
    finally { setLoadingServe(false); }
  }

  async function handleBill() {
    if (!onRequestBill) return;
    setLoadingBill(true);
    try { await onRequestBill(order.id); }
    finally { setLoadingBill(false); }
  }

  return (
    <div style={{
      background: "#18181b",
      border: `1.5px solid ${isReady ? "#22c55e60" : "#27272a"}`,
      borderRadius: 16,
      padding: compact ? "12px 14px" : "16px 18px",
      transition: "border-color 0.2s",
      boxShadow: isReady ? "0 0 0 3px #22c55e15" : undefined,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "700 14px var(--sans, sans-serif)", color: "#fff" }}>
            {order.tableName}
          </span>
          <span style={{ font: "500 11px var(--sans, sans-serif)", color: "#71717a" }}>
            #{order.orderNumber}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3, color: "#71717a" }}>
            <Clock size={11} strokeWidth={2} />
            <span style={{ font: "500 11px var(--sans, sans-serif)" }}>{elapsed}</span>
          </div>
          <span style={{
            padding: "2px 8px", borderRadius: 999,
            background: `${color}20`, color,
            font: "700 10px var(--sans, sans-serif)",
            textTransform: "capitalize",
          }}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Items */}
      {!compact && (
        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", font: "500 12px var(--sans, sans-serif)", color: "#a1a1aa" }}>
              <span>{item.quantity}× {item.name}</span>
              <span>₹{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
          {order.notes && (
            <p style={{ font: "500 11px var(--sans, sans-serif)", color: "#71717a", marginTop: 4, fontStyle: "italic" }}>
              Note: {order.notes}
            </p>
          )}
        </div>
      )}

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isReady || onRequestBill ? 10 : 0 }}>
        <span style={{ font: "500 11px var(--sans, sans-serif)", color: "#71717a" }}>
          {order.items.reduce((s, i) => s + i.quantity, 0)} items
        </span>
        <span style={{ font: "800 14px var(--sans, sans-serif)", color: "#fff" }}>
          ₹{total.toFixed(0)}
        </span>
      </div>

      {/* Actions */}
      {isReady && onMarkServed && (
        <button
          onClick={handleServe}
          disabled={loadingServe}
          style={{
            width: "100%", height: 38, borderRadius: 10,
            background: loadingServe ? "#27272a" : "#22c55e",
            color: "#fff", border: "none", cursor: "pointer",
            font: "700 12px var(--sans, sans-serif)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "opacity 0.15s",
          }}
        >
          {loadingServe ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} strokeWidth={2.5} />}
          {loadingServe ? "Marking…" : "Mark Served"}
        </button>
      )}

      {!isReady && onRequestBill && order.status !== "served" && order.status !== "cancelled" && (
        <button
          onClick={handleBill}
          disabled={loadingBill}
          style={{
            width: "100%", height: 36, borderRadius: 10,
            background: "transparent", border: "1.5px solid #27272a",
            color: "#a1a1aa", cursor: "pointer",
            font: "600 11px var(--sans, sans-serif)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s",
          }}
        >
          {loadingBill ? <Loader2 size={12} className="animate-spin" /> : null}
          {loadingBill ? "Requesting…" : "Request Bill"}
        </button>
      )}
    </div>
  );
}
