"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { KDSOrderCard } from "./KDSOrderCard";
import { KDSHeader } from "./KDSHeader";
import { useOrderUpdates } from "@/hooks/useOrderUpdates";
import type { LiveOrder } from "@/hooks/useOrderUpdates";
import type { OrderStatus } from "@/types";

interface Props {
  restaurantId: string;
  restaurantName: string;
  initialOrders: LiveOrder[];
}

async function markOrderReady(orderId: string): Promise<void> {
  const res = await fetch(`/api/chef/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ready" }),
  });
  if (!res.ok) throw new Error("Failed to mark order ready");
}

function playChime(type: "new" | "overdue" | "complete") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "new") {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.24);
    } else if (type === "overdue") {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.15);
    } else {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
    }

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* audio not supported */ }
}

type FilterTab = "all" | "fresh" | "warn" | "crit";

function orderUrgency(createdAt: string): FilterTab {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (mins >= 20) return "crit";
  if (mins >= 10) return "warn";
  return "fresh";
}

export function KDSGrid({ restaurantId, restaurantName, initialOrders }: Props) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const prevCountRef = useRef(initialOrders.length);

  const { orders, setOrders, status: socketStatus } = useOrderUpdates({
    mode: "chef",
    restaurantId,
    initialOrders,
  });

  // Active orders only (pending + confirmed + preparing); overdue first
  const activeOrders = orders
    .filter(o => ["confirmed", "preparing", "pending"].includes(o.status))
    .sort((a, b) => {
      const ageA = Date.now() - new Date(a.createdAt).getTime();
      const ageB = Date.now() - new Date(b.createdAt).getTime();
      return ageB - ageA;
    });

  const freshCount = activeOrders.filter(o => orderUrgency(o.createdAt) === "fresh").length;
  const warnCount  = activeOrders.filter(o => orderUrgency(o.createdAt) === "warn").length;
  const critCount  = activeOrders.filter(o => orderUrgency(o.createdAt) === "crit").length;

  const filteredOrders = filter === "all"
    ? activeOrders
    : activeOrders.filter(o => orderUrgency(o.createdAt) === filter);

  // Sound on new order
  useEffect(() => {
    if (orders.filter(o => ["pending", "confirmed", "preparing"].includes(o.status)).length > prevCountRef.current) {
      if (soundEnabled) playChime("new");
    }
    prevCountRef.current = activeOrders.length;
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps

  // Repeating overdue alert every 30s
  useEffect(() => {
    if (!soundEnabled) return;
    const t = setInterval(() => {
      const hasOverdue = activeOrders.some(o => (Date.now() - new Date(o.createdAt).getTime()) / 60000 >= 20);
      if (hasOverdue) playChime("overdue");
    }, 30000);
    return () => clearInterval(t);
  }, [activeOrders, soundEnabled]);

  const handleMarkReady = useCallback(async (orderId: string) => {
    await markOrderReady(orderId);
    setOrders(prev => prev.map(o =>
      o.orderId === orderId ? { ...o, status: "ready" as OrderStatus, updatedAt: new Date().toISOString() } : o
    ));
    if (soundEnabled) playChime("complete");
  }, [setOrders, soundEnabled]);

  const FILTER_TABS: Array<{ id: FilterTab; label: string; count: number; color?: string; dotBg?: string; activeBg?: string }> = [
    { id: "all",   label: "All active",      count: activeOrders.length },
    { id: "fresh", label: "Fresh",            count: freshCount, color: "var(--green)",  dotBg: "var(--green)", activeBg: "var(--green-soft)" },
    { id: "warn",  label: "Approaching",      count: warnCount,  color: "#B07900",       dotBg: "var(--amber)", activeBg: "var(--amber-soft)" },
    { id: "crit",  label: "Overdue",          count: critCount,  color: "var(--red)",    dotBg: "var(--red)",   activeBg: "rgba(224,58,48,.10)" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", display: "flex", flexDirection: "column" }}>
      <KDSHeader
        restaurantName={restaurantName}
        activeCount={activeOrders.length}
        critCount={critCount}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(s => !s)}
      />

      {/* Reconnection banner */}
      {socketStatus === "disconnected" && (
        <div style={{
          background: "rgba(224,58,48,.07)",
          borderBottom: "1px solid rgba(224,58,48,.18)",
          color: "var(--red)", padding: "9px 24px",
          fontSize: 12, fontWeight: 700, textAlign: "center",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", display: "inline-block", flexShrink: 0 }} />
          Socket disconnected — changes may be delayed. Reconnecting…
        </div>
      )}

      <div style={{ flex: 1, padding: "20px 24px 40px", overflowY: "auto" }}>

        {/* Filter tabs */}
        {activeOrders.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            {FILTER_TABS.map(tab => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "8px 14px",
                    border: `1px solid ${isActive ? (tab.color ?? "var(--ink)") : "var(--hairline)"}`,
                    background: isActive
                      ? tab.id === "all" ? "var(--ink)" : tab.activeBg
                      : "var(--surface)",
                    borderRadius: 999,
                    fontSize: 12, fontWeight: 600,
                    color: isActive
                      ? tab.id === "all" ? "#fff" : tab.color
                      : "var(--ink-2)",
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                    transition: "all .15s",
                  }}
                >
                  {tab.dotBg && (
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: tab.dotBg, display: "inline-block", flexShrink: 0 }} />
                  )}
                  {tab.label}
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: "2px 7px", borderRadius: 999,
                    background: isActive
                      ? tab.id === "all" ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.55)"
                      : "var(--bg)",
                    color: isActive
                      ? tab.id === "all" ? "rgba(255,255,255,.9)" : tab.color
                      : "var(--muted)",
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
              </svg>
              Live · auto-refresh
            </div>
          </div>
        )}

        {/* Empty state */}
        {activeOrders.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--green-soft)", display: "grid", placeItems: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 5 5 9-11"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>All caught up!</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>No active orders right now</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 13, fontFamily: "var(--sans)" }}>
            No {filter} orders right now
          </div>
        ) : (
          <div style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}>
            <AnimatePresence mode="popLayout">
              {filteredOrders.map(order => (
                <KDSOrderCard
                  key={order.orderId}
                  order={{
                    orderId: order.orderId,
                    orderNumber: order.orderNumber,
                    tableName: order.tableName,
                    items: order.items.map(i => ({ name: i.name, quantity: i.quantity })),
                    notes: order.notes,
                    status: order.status,
                    createdAt: order.createdAt,
                  }}
                  onMarkReady={handleMarkReady}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
