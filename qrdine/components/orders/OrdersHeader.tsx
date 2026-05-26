"use client";

import { motion } from "framer-motion";
import { Plus, RefreshCw, Volume2, VolumeX } from "lucide-react";

interface Props {
  totalActive: number;
  overdueCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRefresh: () => void;
}

export function OrdersHeader({ totalActive, overdueCount, soundEnabled, onToggleSound, onRefresh }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Top row: title + controls */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--display)",
                fontWeight: 400,
                fontSize: 32,
                letterSpacing: "-.02em",
                color: "var(--ink)",
                lineHeight: 1.1,
              }}
            >
              Live <em style={{ fontStyle: "italic", color: "var(--brand)" }}>Orders</em>
            </h1>
            <AnimatedBadge count={totalActive} />
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            Real-time order management — no refresh needed
            {overdueCount > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(224,58,48,.08)", color: "var(--red)", fontSize: 11.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999, border: "1px solid rgba(224,58,48,.15)" }}
              >
                {overdueCount} overdue
              </motion.span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {/* New order button */}
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 14px",
              background: "var(--brand)",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              font: "700 13px var(--sans)",
              cursor: "pointer",
              boxShadow: "var(--sh-coral)",
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            New order
          </button>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onRefresh}
            title="Refresh orders"
            style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--hairline)", background: "var(--surface)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)", boxShadow: "var(--sh-1)" }}
          >
            <RefreshCw size={15} strokeWidth={2} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onToggleSound}
            title={soundEnabled ? "Mute order alerts" : "Unmute order alerts"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid ${soundEnabled ? "var(--hairline)" : "rgba(224,58,48,.18)"}`,
              background: soundEnabled ? "var(--green-soft)" : "rgba(224,58,48,.06)",
              color: soundEnabled ? "var(--green)" : "var(--red)",
              font: "700 12px var(--sans)",
              cursor: "pointer",
              boxShadow: "var(--sh-1)",
              transition: "background .15s, border-color .15s, color .15s",
            }}
          >
            {soundEnabled ? <Volume2 size={14} strokeWidth={2} /> : <VolumeX size={14} strokeWidth={2} />}
            {soundEnabled ? "Sound on" : "Sound off"}
          </motion.button>
        </div>
      </div>

      {/* Status filter strip (KDS-style) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatusChip label="All active" count={totalActive} color="var(--ink)" bg="var(--ink)" active />
        <StatusChip label="Fresh" count={0} color="var(--green)" bg="var(--green-soft)" dot />
        <StatusChip label="Approaching late" count={0} color="#8a5b00" bg="var(--amber-soft)" dot />
        {overdueCount > 0 && (
          <StatusChip label="Overdue" count={overdueCount} color="var(--red)" bg="rgba(224,58,48,.08)" dot />
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, font: "500 12px var(--sans)", color: "var(--muted)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          Auto-refresh · live
        </div>
      </div>
    </div>
  );
}

function StatusChip({ label, count, color, bg, active, dot }: { label: string; count: number; color: string; bg: string; active?: boolean; dot?: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        border: `1px solid ${active ? "var(--ink)" : "var(--hairline)"}`,
        background: active ? "var(--ink)" : "var(--surface)",
        borderRadius: 999,
        font: "600 12px var(--sans)",
        color: active ? "#fff" : color,
      }}
    >
      {dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />}
      <span>{label}</span>
      {count > 0 && (
        <span
          style={{
            font: "700 10px var(--sans)",
            background: active ? "rgba(255,255,255,.18)" : bg,
            color: active ? "#fff" : color,
            padding: "2px 7px",
            borderRadius: 999,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function AnimatedBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <motion.div
      key={count}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      style={{ background: "var(--brand)", color: "#fff", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 999, boxShadow: "var(--sh-coral)", fontFamily: "var(--sans)" }}
    >
      {count} active
    </motion.div>
  );
}
