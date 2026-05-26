"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { KDSItemRow } from "./KDSItemRow";
import type { OrderStatus } from "@/types";

interface KDSOrder {
  orderId: string;
  orderNumber: string;
  tableName: string;
  items: Array<{ name: string; quantity: number; note?: string }>;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface Props {
  order: KDSOrder;
  onMarkReady: (orderId: string) => Promise<void>;
}

function useElapsed(createdAt: string, intervalMs = 10_000) {
  const [mins, setMins] = useState(Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  useEffect(() => {
    const t = setInterval(() => {
      setMins(Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    }, intervalMs);
    return () => clearInterval(t);
  }, [createdAt, intervalMs]);
  return mins;
}

type Urgency = "fresh" | "warn" | "crit";

function getUrgency(mins: number): Urgency {
  if (mins >= 20) return "crit";
  if (mins >= 10) return "warn";
  return "fresh";
}

const URGENCY: Record<Urgency, { borderColor: string; timerBg: string; timerColor: string; headerBg: string }> = {
  fresh: {
    borderColor: "var(--green)",
    timerBg: "var(--green-soft)",
    timerColor: "var(--green)",
    headerBg: "rgba(30,158,94,.05)",
  },
  warn: {
    borderColor: "var(--amber)",
    timerBg: "var(--amber-soft)",
    timerColor: "#B07900",
    headerBg: "rgba(242,165,0,.06)",
  },
  crit: {
    borderColor: "var(--red)",
    timerBg: "rgba(224,58,48,.12)",
    timerColor: "var(--red)",
    headerBg: "rgba(224,58,48,.05)",
  },
};

export function KDSOrderCard({ order, onMarkReady }: Props) {
  const mins = useElapsed(order.createdAt);
  const u = getUrgency(mins);
  const s = URGENCY[u];
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const allReady = checkedItems.size === order.items.length && order.items.length > 0;

  const toggleItem = useCallback((idx: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  async function handleAllReady() {
    if (!allReady || loading) return;
    setLoading(true);
    try {
      await onMarkReady(order.orderId);
    } finally {
      setLoading(false);
    }
  }

  const elapsedLabel = mins < 1 ? "<1m" : `${mins}m`;

  return (
    <motion.div
      layout
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ x: -40, opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      style={{
        background: "var(--surface)",
        borderRadius: 14,
        borderTop: `5px solid ${s.borderColor}`,
        borderRight: "1px solid var(--hairline)",
        borderBottom: "1px solid var(--hairline)",
        borderLeft: "1px solid var(--hairline)",
        boxShadow: "var(--sh-2)",
        overflow: "hidden",
        fontFamily: "var(--sans)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Card header */}
      <div style={{
        background: s.headerBg,
        padding: "12px 14px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", letterSpacing: "-.01em" }}>
            {order.tableName}
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 1 }}>
            {order.orderNumber} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 800,
          fontFamily: "var(--mono)",
          color: s.timerColor,
          background: s.timerBg,
          padding: "4px 10px", borderRadius: 999,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
          </svg>
          {elapsedLabel}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "0 14px", flex: 1, borderTop: "1px dashed var(--hairline)" }}>
        {order.items.map((item, idx) => (
          <KDSItemRow
            key={idx}
            item={item}
            checked={checkedItems.has(idx)}
            onToggle={() => toggleItem(idx)}
          />
        ))}

        {order.notes && (
          <div style={{
            margin: "6px 0 10px",
            padding: "6px 10px",
            background: "var(--amber-soft)",
            color: "#8a5b00",
            borderRadius: 8,
            fontSize: 11.5, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>
            </svg>
            {order.notes}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px 14px", background: "var(--bg-2)" }}>
        <motion.button
          onClick={handleAllReady}
          disabled={!allReady || loading}
          animate={allReady ? { scale: [1, 1.02, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.4 }}
          style={{
            width: "100%", padding: "11px 12px", borderRadius: 10,
            background: allReady
              ? u === "crit" ? "var(--ink)" : "var(--brand)"
              : "var(--surface)",
            color: allReady ? "#fff" : "var(--muted-2)",
            border: `1px solid ${allReady
              ? u === "crit" ? "var(--ink)" : "var(--brand)"
              : "var(--hairline)"}`,
            fontWeight: 800, fontSize: 13,
            cursor: allReady ? "pointer" : "not-allowed",
            fontFamily: "var(--sans)",
            boxShadow: allReady && u !== "crit" ? "var(--sh-coral)" : "none",
            transition: "background .2s, color .2s, border-color .2s",
          }}
        >
          {loading ? "Marking ready…" : allReady ? "ALL READY →" : `${checkedItems.size} / ${order.items.length} done`}
        </motion.button>
      </div>
    </motion.div>
  );
}
