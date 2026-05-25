"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX, ChefHat } from "lucide-react";

interface Props {
  restaurantName: string;
  activeCount: number;
  critCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function KDSHeader({ restaurantName, activeCount, critCount, soundEnabled, onToggleSound }: Props) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    const ms = 60000 - (Date.now() % 60000);
    const first = setTimeout(() => {
      tick();
      const interval = setInterval(tick, 60000);
      return () => clearInterval(interval);
    }, ms);
    return () => clearTimeout(first);
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "16px 24px",
      background: "var(--surface)",
      borderBottom: "1px solid var(--hairline)",
      gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: "var(--brand)", display: "grid", placeItems: "center",
          color: "#fff", boxShadow: "var(--sh-coral)", flexShrink: 0,
        }}>
          <ChefHat size={18} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)", letterSpacing: "-.01em" }}>
            Kitchen —{" "}
            <span style={{ color: "var(--brand)" }}>{restaurantName}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
            {activeCount} active order{activeCount !== 1 ? "s" : ""}
            {critCount > 0 && (
              <span style={{ color: "var(--red)", fontWeight: 700 }}>
                · {critCount} overdue
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onToggleSound}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "7px 14px",
            background: soundEnabled ? "var(--green-soft)" : "var(--surface-2)",
            color: soundEnabled ? "var(--green)" : "var(--muted)",
            border: `1px solid ${soundEnabled ? "var(--green)" : "var(--hairline)"}`,
            borderRadius: 999, fontWeight: 700, fontSize: 12,
            cursor: "pointer", fontFamily: "var(--sans)", transition: "all .15s",
          }}
        >
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          Sound {soundEnabled ? "on" : "off"}
        </button>
        <div style={{
          fontSize: 18, fontWeight: 800, color: "var(--ink)",
          fontFamily: "var(--mono)", letterSpacing: "-.02em",
        }}>
          {time}
        </div>
      </div>
    </div>
  );
}
