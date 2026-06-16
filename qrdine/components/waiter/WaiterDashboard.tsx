"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, X } from "lucide-react";
import { WaiterTableGrid } from "./WaiterTableGrid";
import { ReadyToServeList } from "./ReadyToServeList";
import { TakeOrderModal } from "./TakeOrderModal";
import { WaiterNav } from "./WaiterNav";
import { useWaiterSocket } from "@/hooks/useWaiterSocket";
import type { WaiterTable } from "./WaiterTableGrid";
import type { WaiterOrder } from "./WaiterOrderCard";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  is_vegetarian?: boolean;
  category: { name: string };
}

interface Props {
  restaurantId: string;
  restaurantName: string;
  userName: string;
  initialTables: WaiterTable[];
  initialOrders: WaiterOrder[];
  menuItems: MenuItem[];
}

interface Toast {
  id: string;
  message: string;
  type: "ready" | "info";
}

export function WaiterDashboard({
  restaurantId, restaurantName, userName,
  initialTables, initialOrders, menuItems,
}: Props) {
  const [tables, setTables]         = useState<WaiterTable[]>(initialTables);
  const [orders, setOrders]         = useState<WaiterOrder[]>(initialOrders);
  const [toasts, setToasts]         = useState<Toast[]>([]);
  const [orderModal, setOrderModal] = useState<WaiterTable | null>(null);
  const [activeSection, setSection] = useState<"tables" | "ready">("tables");

  const readyCount = orders.filter(o => o.status === "ready").length;

  function addToast(message: string, type: Toast["type"] = "info") {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  // Refresh tables from API
  const refreshTables = useCallback(async () => {
    try {
      const res = await fetch("/api/waiter/tables");
      const data = await res.json() as { success: boolean; data?: WaiterTable[] };
      if (data.success && data.data) setTables(data.data);
    } catch { /* silent */ }
  }, []);

  // Refresh orders from API
  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/waiter/orders");
      const data = await res.json() as { success: boolean; data?: WaiterOrder[] };
      if (data.success && data.data) setOrders(data.data);
    } catch { /* silent */ }
  }, []);

  // Socket live updates
  useWaiterSocket(restaurantId, {
    onOrderReady: (_, tableName, orderNumber) => {
      addToast(`Order #${orderNumber} at ${tableName} is ready to serve!`, "ready");
      void refreshOrders();
    },
    onOrderUpdated: () => { void refreshOrders(); },
    onOrderCreated: () => { void refreshOrders(); void refreshTables(); },
  });

  // Seat table
  async function handleSeat(tableId: string) {
    try {
      await fetch(`/api/waiter/tables/${tableId}/seat`, { method: "POST" });
      await refreshTables();
      const table = tables.find(t => t.id === tableId);
      if (table) setOrderModal(table);
    } catch { /* silent */ }
  }

  // Mark served
  async function handleMarkServed(orderId: string) {
    const res = await fetch(`/api/waiter/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "served" }),
    });
    if (res.ok) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      void refreshTables();
      addToast("Order marked as served.", "info");
    }
  }

  // Poll every 30s as fallback
  useEffect(() => {
    const t = setInterval(() => { void refreshOrders(); void refreshTables(); }, 30000);
    return () => clearInterval(t);
  }, [refreshOrders, refreshTables]);

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f11" }}>
      <WaiterNav userName={userName} restaurantName={restaurantName} notifCount={readyCount} />

      {/* Main content — offset for sidebar on desktop, bottom nav on mobile */}
      <main style={{ paddingLeft: 0, paddingBottom: 80 }} className="lg:pl-[220px] lg:pb-6">
        <div style={{ padding: "20px 16px 0" }} className="lg:px-8 lg:pt-6">

          {/* Page header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ font: "800 22px var(--sans,sans-serif)", color: "#fff", margin: 0 }}>
              Floor View
            </h1>
            <p style={{ font: "500 13px var(--sans,sans-serif)", color: "#71717a", marginTop: 4 }}>
              {restaurantName} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
            </p>
          </div>

          {/* Stats bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Tables",   value: tables.length,                                   color: "#fff" },
              { label: "Occupied", value: tables.filter(t => t.status === "occupied").length, color: "#ef4444" },
              { label: "Ready",    value: readyCount,                                       color: "#22c55e" },
            ].map(s => (
              <div key={s.label} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ font: `800 22px var(--sans,sans-serif)`, color: s.color }}>{s.value}</div>
                <div style={{ font: "500 11px var(--sans,sans-serif)", color: "#71717a", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Section tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {([["tables", "Table Grid"], ["ready", `Ready to Serve${readyCount > 0 ? ` (${readyCount})` : ""}`]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSection(key)}
                style={{
                  padding: "7px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                  background: activeSection === key ? "#2E6EF7" : "#27272a",
                  color: activeSection === key ? "#fff" : "#a1a1aa",
                  font: `${activeSection === key ? 700 : 500} 12px var(--sans,sans-serif)`,
                  transition: "all 0.15s",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeSection === "tables" && (
            <WaiterTableGrid
              tables={tables}
              onTakeOrder={setOrderModal}
              onSeat={handleSeat}
            />
          )}
          {activeSection === "ready" && (
            <ReadyToServeList orders={orders} onMarkServed={handleMarkServed} />
          )}
        </div>
      </main>

      {/* Order modal */}
      <AnimatePresence>
        {orderModal && (
          <TakeOrderModal
            tableId={orderModal.id}
            tableName={`T${orderModal.table_number}`}
            menuItems={menuItems}
            onClose={() => setOrderModal(null)}
            onPlaced={(orderNumber) => {
              addToast(`Order #${orderNumber} placed!`, "info");
              setOrderModal(null);
              void refreshOrders();
              void refreshTables();
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 300, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              style={{
                background: toast.type === "ready" ? "#14532d" : "#27272a",
                border: `1px solid ${toast.type === "ready" ? "#22c55e40" : "#3f3f46"}`,
                borderRadius: 12, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}
            >
              {toast.type === "ready"
                ? <CheckCircle2 size={16} style={{ color: "#22c55e", flexShrink: 0 }} />
                : <Bell size={16} style={{ color: "#a1a1aa", flexShrink: 0 }} />
              }
              <span style={{ font: "600 12px var(--sans,sans-serif)", color: "#e4e4e7", flex: 1 }}>{toast.message}</span>
              <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a", display: "grid", placeItems: "center" }}>
                <X size={14} strokeWidth={2.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
