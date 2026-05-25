"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { ShoppingBag, Clock, CheckCircle, Archive, Bell, ChefHat, CheckCircle2, Inbox } from "lucide-react";
import { AdminOrderCard } from "./AdminOrderCard";
import { OrdersHeader } from "./OrdersHeader";
import { useOrderUpdates } from "@/hooks/useOrderUpdates";
import type { OrderStatus } from "@/types";

const COLUMNS: { key: string; label: string; statuses: string[]; color: string; softBg: string; emptyIcon: ReactNode; emptyLabel: string; emptyHint?: string; icon: ReactNode }[] = [
  {
    key: "pending",
    label: "New",
    statuses: ["pending"],
    color: "#2E6EF7",
    softBg: "rgba(46,110,247,.07)",
    emptyIcon: <Bell size={20} strokeWidth={1.25} />,
    emptyLabel: "The counter is quiet",
    emptyHint: "New orders will appear here instantly",
    icon: <ShoppingBag size={13} strokeWidth={2.5} />,
  },
  {
    key: "active",
    label: "Active",
    statuses: ["confirmed", "preparing"],
    color: "#D97706",
    softBg: "rgba(217,119,6,.07)",
    emptyIcon: <ChefHat size={20} strokeWidth={1.25} />,
    emptyLabel: "Knives clean, stoves quiet",
    emptyHint: "No active dishes currently in preparation",
    icon: <Clock size={13} strokeWidth={2.5} />,
  },
  {
    key: "ready",
    label: "Ready",
    statuses: ["ready"],
    color: "#1E9E5E",
    softBg: "rgba(30,158,94,.07)",
    emptyIcon: <CheckCircle2 size={20} strokeWidth={1.25} />,
    emptyLabel: "The pass is clear",
    emptyHint: "No dishes waiting to be run to tables",
    icon: <CheckCircle size={13} strokeWidth={2.5} />,
  },
  {
    key: "done",
    label: "Done",
    statuses: ["served", "cancelled"],
    color: "#9A99A4",
    softBg: "rgba(154,153,164,.06)",
    emptyIcon: <Inbox size={20} strokeWidth={1.25} />,
    emptyLabel: "A spotless register",
    emptyHint: "All served and cancelled orders cleared",
    icon: <Archive size={13} strokeWidth={2.5} />,
  },
];

interface Props {
  restaurantId: string;
  token: string;
  initialOrders: import("@/hooks/useOrderUpdates").LiveOrder[];
  soundEnabled: boolean;
}

async function updateStatus(orderId: string, status: OrderStatus, reason?: string): Promise<void> {
  const res = await fetch(`/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, cancellation_reason: reason }),
  });
  if (!res.ok) {
    const json = (await res.json()) as { message?: string };
    throw new Error(json.message ?? "Failed to update status");
  }
}

export function OrderFeed({ restaurantId, token, initialOrders, soundEnabled: initialSoundEnabled }: Props) {
  const { orders, setOrders, status: socketStatus } = useOrderUpdates({
    mode: "admin",
    restaurantId,
    token,
    initialOrders,
  });

  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const prevPendingCount = useRef(orders.filter(o => o.status === "pending").length);
  const [activeTab, setActiveTab] = useState("pending");

  function playChime() {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      /* audio not available */
    }
  }

  useEffect(() => {
    const newCount = orders.filter(o => o.status === "pending").length;
    if (newCount > prevPendingCount.current) playChime();
    prevPendingCount.current = newCount;
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: OrderStatus, reason?: string) => {
      await updateStatus(orderId, newStatus, reason);
      setOrders(prev =>
        prev.map(o =>
          o.orderId === orderId
            ? { ...o, status: newStatus, cancellationReason: reason, updatedAt: new Date().toISOString() }
            : o,
        ),
      );
    },
    [setOrders],
  );

  const totalActive = orders.filter(o => !["served", "cancelled"].includes(o.status)).length;
  const overdueCount = orders.filter(o => {
    const mins = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
    return mins >= 20 && !["served", "cancelled"].includes(o.status);
  }).length;

  return (
    <div>
      <OrdersHeader
        totalActive={totalActive}
        overdueCount={overdueCount}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(s => !s)}
        onRefresh={() => window.location.reload()}
      />

      {/* Socket status banner */}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <AnimatePresence>
        {socketStatus !== "connected" && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            style={{
              background: socketStatus === "connecting"
                ? "var(--amber-soft)"
                : socketStatus === "offline"
                ? "var(--surface-2)"
                : "rgba(224,58,48,.08)",
              color: socketStatus === "connecting"
                ? "#9A6000"
                : socketStatus === "offline"
                ? "var(--muted)"
                : "var(--red)",
              padding: "9px 14px",
              borderRadius: 12,
              marginBottom: 16,
              fontSize: 12.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: `1px solid ${
                socketStatus === "connecting"
                  ? "rgba(242,165,0,.22)"
                  : socketStatus === "offline"
                  ? "var(--hairline)"
                  : "rgba(224,58,48,.15)"
              }`,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "currentColor", display: "inline-block", flexShrink: 0,
              animation: socketStatus === "connecting" ? "blink 1s ease-in-out infinite" : "none",
            }} />
            {socketStatus === "connecting" && "Reconnecting to live feed…"}
            {socketStatus === "disconnected" && "Disconnected — retrying…"}
            {socketStatus === "offline" && "Live feed unavailable — orders won't auto-update"}
            {socketStatus === "offline" && (
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginLeft: "auto", padding: "4px 10px", borderRadius: 8,
                  border: "1px solid var(--hairline)", background: "var(--surface)",
                  font: "700 11px var(--sans)", color: "var(--ink)", cursor: "pointer",
                }}
              >
                Retry
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI strip */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Active orders", value: totalActive, color: "var(--brand)", bg: "var(--brand-tint)" },
          { label: "Overdue", value: overdueCount, color: "var(--red)", bg: "rgba(224,58,48,.08)" },
          { label: "New", value: orders.filter(o => o.status === "pending").length, color: "var(--blue)", bg: "#E8EFFF" },
          { label: "Ready", value: orders.filter(o => o.status === "ready").length, color: "var(--green)", bg: "var(--green-soft)" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: stat.value > 0 ? stat.bg : "var(--surface)",
              border: `1px solid ${stat.value > 0 ? stat.bg : "var(--hairline)"}`,
              borderRadius: "var(--r-2)",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: "1 1 120px",
            }}
          >
            <span style={{ font: "800 22px var(--sans)", color: stat.value > 0 ? stat.color : "var(--muted-2)", letterSpacing: "-.02em" }}>
              {stat.value}
            </span>
            <span style={{ font: "600 11.5px var(--sans)", color: stat.value > 0 ? stat.color : "var(--muted-2)", lineHeight: 1.3 }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Desktop: Kanban columns */}
      <div
        className="hidden lg:grid"
        style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}
      >
        {COLUMNS.map(col => {
          const colOrders = orders
            .filter(o => col.statuses.includes(o.status))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          return (
            <div key={col.key}>
              {/* Column header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  padding: "11px 14px",
                  background: "var(--surface)",
                  borderRadius: 12,
                  border: "1px solid var(--hairline)",
                  borderLeft: `3px solid ${col.color}`,
                  boxShadow: "var(--sh-1)",
                }}
              >
                <span style={{ color: col.color, display: "flex" }}>{col.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 13, color: "var(--ink)", flex: 1 }}>
                  {col.label}
                </span>
                <AnimatePresence mode="wait">
                  {colOrders.length > 0 ? (
                    <motion.span
                      key="count"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      style={{
                        background: col.color,
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: 999,
                        minWidth: 22,
                        textAlign: "center",
                        display: "inline-block",
                      }}
                    >
                      {colOrders.length}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-2)" }}
                    >
                      —
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 120 }}>
                <AnimatePresence mode="popLayout">
                  {colOrders.map(order => (
                    <AdminOrderCard
                      key={order.orderId}
                      order={order}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </AnimatePresence>

                {colOrders.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: "linear-gradient(135deg, rgba(255, 248, 243, 0.6) 0%, rgba(255, 255, 255, 0.95) 100%)",
                      backdropFilter: "blur(8px)",
                      borderRadius: 16,
                      padding: "36px 20px",
                      textAlign: "center",
                      border: "1px solid rgba(20, 19, 26, 0.05)",
                      boxShadow: "0 10px 30px -10px rgba(255, 77, 61, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    <div style={{
                      width: 52, height: 52,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${col.color}0a 0%, ${col.color}15 100%)`,
                      color: col.color,
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto 16px",
                      border: `1px solid ${col.color}18`,
                      boxShadow: `0 8px 20px -6px ${col.color}25`,
                    }}>
                      {col.emptyIcon}
                    </div>
                    <h4 style={{
                      margin: "0 0 6px 0",
                      fontFamily: "var(--display)",
                      fontSize: 21,
                      fontWeight: 400,
                      fontStyle: "italic",
                      color: "var(--ink)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.25,
                    }}>
                      {col.emptyLabel}
                    </h4>
                    {col.emptyHint && (
                      <p style={{
                        margin: 0,
                        fontFamily: "var(--sans)",
                        fontSize: 12,
                        color: "var(--muted)",
                        fontWeight: 500,
                        lineHeight: 1.45,
                      }}>
                        {col.emptyHint}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: Tabs */}
      <div className="lg:hidden">
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: "0 0 12px",
            scrollbarWidth: "none",
          }}
        >
          {COLUMNS.map(col => {
            const count = orders.filter(o => col.statuses.includes(o.status)).length;
            const isActive = activeTab === col.key;
            return (
              <motion.button
                key={col.key}
                onClick={() => setActiveTab(col.key)}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: "8px 15px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  background: isActive ? "var(--ink)" : "var(--surface)",
                  color: isActive ? "#fff" : "var(--muted)",
                  border: `1px solid ${isActive ? "var(--ink)" : "var(--hairline)"}`,
                  cursor: "pointer",
                  fontFamily: "var(--sans)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background .15s, color .15s, border-color .15s",
                }}
              >
                <span
                  style={{
                    color: isActive ? "rgba(255,255,255,.75)" : col.color,
                    display: "flex",
                  }}
                >
                  {col.icon}
                </span>
                {col.label}
                {count > 0 && (
                  <span
                    style={{
                      background: isActive ? "rgba(255,255,255,.22)" : col.color,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "1px 7px",
                      borderRadius: 999,
                    }}
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(() => {
            const activeCol = COLUMNS.find(c => c.key === activeTab);
            const colOrders = orders
              .filter(o => activeCol?.statuses.includes(o.status))
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            if (colOrders.length === 0 && activeCol) {
              return (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "linear-gradient(135deg, rgba(255, 248, 243, 0.6) 0%, rgba(255, 255, 255, 0.95) 100%)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 16,
                    padding: "36px 20px",
                    textAlign: "center",
                    border: "1px solid rgba(20, 19, 26, 0.05)",
                    boxShadow: "0 10px 30px -10px rgba(255, 77, 61, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
                  }}
                >
                  <div style={{
                    width: 52, height: 52,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${activeCol.color}0a 0%, ${activeCol.color}15 100%)`,
                    color: activeCol.color,
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 16px",
                    border: `1px solid ${activeCol.color}18`,
                    boxShadow: `0 8px 20px -6px ${activeCol.color}25`,
                  }}>
                    {activeCol.emptyIcon}
                  </div>
                  <h4 style={{
                    margin: "0 0 6px 0",
                    fontFamily: "var(--display)",
                    fontSize: 21,
                    fontWeight: 400,
                    fontStyle: "italic",
                    color: "var(--ink)",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.25,
                  }}>
                    {activeCol.emptyLabel}
                  </h4>
                  {activeCol.emptyHint && (
                    <p style={{
                      margin: 0,
                      fontFamily: "var(--sans)",
                      fontSize: 12,
                      color: "var(--muted)",
                      fontWeight: 500,
                      lineHeight: 1.45,
                    }}>
                      {activeCol.emptyHint}
                    </p>
                  )}
                </motion.div>
              );
            }

            return (
              <AnimatePresence mode="popLayout">
                {colOrders.map(order => (
                  <AdminOrderCard
                    key={order.orderId}
                    order={order}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </AnimatePresence>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
