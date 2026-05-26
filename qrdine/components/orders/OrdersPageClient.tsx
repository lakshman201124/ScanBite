"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, Plus, Download, CalendarDays, Filter, List, LayoutGrid,
  Phone, Mail, FileText, Printer, ChevronRight, ChevronLeft, ChevronDown,
  Check, X, Clock, UtensilsCrossed,
} from "lucide-react";
import { useOrderUpdates } from "@/hooks/useOrderUpdates";
import type { LiveOrder } from "@/hooks/useOrderUpdates";
import type { OrderStatus } from "@/types";
import { OrderStatusActions } from "@/components/orders/OrderStatusActions";

/* ─────────────────────────── types ─────────────────────────── */

interface MenuItemRaw {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  is_vegetarian: boolean;
  category: { name: string };
}

interface TableRow {
  id: string;
  table_number: string;
  status: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Props {
  restaurantId: string;
  token: string;
  initialOrders: LiveOrder[];
  tables: TableRow[];
  menuItems: MenuItemRaw[];
  categories: string[];
}

/* ─────────────────────── helpers ────────────────────── */

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

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 7200) return "1 hr ago";
  return `${Math.floor(diff / 3600)} hr ago`;
}

function statusPillClass(status: string) {
  if (status === "pending")   return "new";
  if (status === "confirmed") return "preparing";
  if (status === "preparing") return "preparing";
  if (status === "ready")     return "ready";
  if (status === "served")    return "served";
  if (status === "cancelled") return "cancel";
  return "new";
}

function statusLabel(status: string) {
  if (status === "pending")   return "New";
  if (status === "confirmed") return "Preparing";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

type TabFilter = "all" | "pending" | "preparing" | "ready" | "served" | "cancelled";
type ChannelFilter = "all" | "dine-in" | "takeaway";

/* ─────────────────────── channel icon ─────────────────────── */

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "takeaway") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>
      </svg>
    );
  }
  if (channel === "delivery") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="6" width="13" height="11" rx="2"/>
        <path d="M14 9h4l3 4v4h-7"/>
        <circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h16l-1 4H5z"/><path d="M6 13v7M18 13v7"/>
    </svg>
  );
}

/* ════════════════════════ NewOrderPanel ════════════════════════ */

function NewOrderPanel({
  tables,
  menuItems,
  categories,
  onClose,
}: {
  tables: TableRow[];
  menuItems: MenuItemRaw[];
  categories: string[];
  onClose: () => void;
}) {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return menuItems.filter(m => {
      if (catFilter !== "all" && m.category.name !== catFilter) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [menuItems, catFilter, search]);

  function addToCart(item: MenuItemRaw) {
    setCart(prev => {
      const idx = prev.findIndex(c => c.menuItemId === item.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function adjustCart(menuItemId: string, delta: number) {
    setCart(prev => {
      const idx = prev.findIndex(c => c.menuItemId === menuItemId);
      if (idx === -1) return prev;
      const qty = prev[idx].quantity + delta;
      if (qty <= 0) return prev.filter(c => c.menuItemId !== menuItemId);
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: qty };
      return next;
    });
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  async function handleSubmit() {
    if (!selectedTable || cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: selectedTable,
          items: cart.map(c => ({ menu_item_id: c.menuItemId, quantity: c.quantity })),
        }),
      });
      if (!res.ok) throw new Error("Failed to place order");
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 60, backdropFilter: "blur(4px)" }}
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(500px, 95vw)",
          background: "var(--surface)", zIndex: 61, display: "flex", flexDirection: "column",
          boxShadow: "-24px 0 80px rgba(0,0,0,.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ font: "800 15px var(--sans)", color: "var(--ink)" }}>New Order</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--hairline)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)" }}>
            <X size={14} />
          </button>
        </div>

        {/* Table select */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline)" }}>
          <label style={{ font: "700 10px var(--sans)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 6 }}>Table</label>
          <select
            value={selectedTable}
            onChange={e => setSelectedTable(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1.5px solid var(--hairline)", background: "var(--bg)", font: "600 13px var(--sans)", color: "var(--ink)", outline: "none" }}
          >
            <option value="">Select a table…</option>
            {tables.map(t => <option key={t.id} value={t.id}>Table {t.table_number}</option>)}
          </select>
        </div>

        {/* Search + category */}
        <div style={{ padding: "10px 20px 8px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div className="adm-search" style={{ flex: "1", minWidth: 160 }}>
            <Search size={14} />
            <input placeholder="Search menu…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
            {["all", ...categories].map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{
                padding: "6px 10px", borderRadius: 20, font: "600 11px var(--sans)",
                background: catFilter === c ? "var(--ink)" : "var(--surface-2)",
                color: catFilter === c ? "#fff" : "var(--ink-2)",
                border: "none", cursor: "pointer", whiteSpace: "nowrap",
              }}>
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        </div>

        {/* Items grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 8 }}>
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.menuItemId === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  style={{
                    padding: "12px", borderRadius: 14,
                    background: inCart ? "var(--brand-soft)" : "var(--bg)",
                    border: `1.5px solid ${inCart ? "rgba(255,77,61,.3)" : "var(--hairline)"}`,
                    cursor: "pointer", textAlign: "left", transition: "all .14s",
                  }}
                >
                  <div style={{ font: "700 12px var(--sans)", color: "var(--ink)", marginBottom: 2 }}>{item.name}</div>
                  <div style={{ font: "600 12px var(--sans)", color: "var(--brand)" }}>₹{item.price}</div>
                  {inCart && <div style={{ font: "700 10px var(--sans)", color: "var(--brand)", marginTop: 3 }}>×{inCart.quantity} in cart</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div style={{ padding: "12px 20px 20px", borderTop: "1px solid var(--hairline)", background: "var(--surface)" }}>
            <div style={{ font: "700 11px var(--sans)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Cart</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              {cart.map(c => (
                <div key={c.menuItemId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, font: "600 12px var(--sans)", color: "var(--ink)" }}>{c.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => adjustCart(c.menuItemId, -1)} style={{ width: 22, height: 22, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--hairline)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-2)" }}><X size={10} /></button>
                    <span style={{ font: "800 12px var(--sans)", color: "var(--ink)", minWidth: 16, textAlign: "center" }}>{c.quantity}</span>
                    <button onClick={() => adjustCart(c.menuItemId, 1)} style={{ width: 22, height: 22, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--hairline)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-2)" }}><Plus size={10} /></button>
                  </div>
                  <div style={{ font: "700 12px var(--sans)", color: "var(--ink)", minWidth: 52, textAlign: "right" }}>₹{(c.price * c.quantity).toFixed(0)}</div>
                </div>
              ))}
            </div>
            {error && <div style={{ font: "600 11px var(--sans)", color: "var(--red)", marginBottom: 8 }}>{error}</div>}
            <button
              onClick={handleSubmit}
              disabled={!selectedTable || submitting}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 12,
                background: !selectedTable || submitting ? "var(--surface-2)" : "var(--brand)",
                color: !selectedTable || submitting ? "var(--muted)" : "#fff",
                border: "none", font: "800 14px var(--sans)", cursor: !selectedTable || submitting ? "not-allowed" : "pointer",
                boxShadow: !selectedTable || submitting ? "none" : "var(--sh-coral)",
              }}
            >
              {submitting ? "Placing…" : `Place Order · ₹${subtotal.toFixed(0)}`}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

/* ════════════════════════ OrderDetail ════════════════════════ */

function printBill(order: LiveOrder) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const gst      = Math.round(subtotal * 0.05);
  const service  = Math.round(subtotal * 0.08);
  const total    = subtotal + gst + service;

  const rows = order.items.map(i =>
    `<tr><td>${i.name}</td><td style="text-align:center">×${i.quantity}</td><td style="text-align:right">₹${(i.price * i.quantity).toFixed(0)}</td></tr>`
  ).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Bill – ${order.orderNumber}</title>
<style>
  body{font-family:monospace;font-size:12px;width:280px;margin:0 auto;padding:12px}
  h2{text-align:center;font-size:14px;margin:0 0 4px}
  .sub{text-align:center;color:#555;margin:0 0 10px;font-size:11px}
  hr{border:none;border-top:1px dashed #999;margin:8px 0}
  table{width:100%;border-collapse:collapse}
  td{padding:2px 0}
  .tot{font-weight:bold}
  .center{text-align:center;margin-top:10px;font-size:11px;color:#555}
</style>
</head><body>
<h2>BILL</h2>
<div class="sub">Table ${order.tableName || "—"} &nbsp;·&nbsp; ${order.orderNumber}</div>
<div class="sub">${new Date(order.createdAt).toLocaleString("en-IN")}</div>
<hr/>
<table>
  <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Amt</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<hr/>
<table>
  <tr><td>Subtotal</td><td style="text-align:right">₹${subtotal.toFixed(0)}</td></tr>
  <tr><td>GST 5%</td><td style="text-align:right">₹${gst}</td></tr>
  <tr><td>Service 8%</td><td style="text-align:right">₹${service}</td></tr>
  <tr class="tot"><td><b>Total</b></td><td style="text-align:right"><b>₹${total.toFixed(0)}</b></td></tr>
</table>
<hr/>
<div class="center">Thank you for dining with us!</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open("", "_blank", "width=320,height=500");
  if (w) { w.document.write(html); w.document.close(); }
}

function OrderDetail({ order, onClose }: { order: LiveOrder; onClose: () => void }) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const gst      = Math.round(subtotal * 0.05);
  const service  = Math.round(subtotal * 0.08);
  const total    = subtotal + gst + service;

  const timelineSteps = [
    { label: "Order placed",   detail: `Table ${order.tableName || "Takeaway"}`, done: true,                                                          current: false },
    { label: "Preparing",      detail: "Kitchen",                                done: ["preparing","ready","served"].includes(order.status),          current: order.status === "preparing" },
    { label: "Ready to serve", detail: "—",                                      done: ["ready","served"].includes(order.status),                      current: order.status === "ready" },
    { label: "Served",         detail: "—",                                      done: order.status === "served",                                      current: false },
  ];

  return (
    <aside className="ord-detail">
      {/* Header */}
      <div className="ord-detail__h">
        <div>
          <div>{order.orderNumber}</div>
          <div>{order.tableName ? `Table ${order.tableName} · Dine-in` : "Takeaway"}</div>
          <div>Placed {fmtTime(order.createdAt)} · {timeAgo(order.createdAt)}</div>
        </div>
        <span className={`status-pill ${statusPillClass(order.status)}`}>
          <span className="dot" />{statusLabel(order.status)}
        </span>
      </div>

      {/* Customer card */}
      <div className="ord-cust-card">
        <div className="ord-cust-card__av" />
        <div>
          <div>Guest · {order.tableName || "Takeaway"}</div>
          <div><span>Table {order.tableName || "—"}</span></div>
        </div>
        <button className="ord-iconbtn" title="Email"><Mail size={12} /></button>
        <button className="ord-iconbtn" title="Call"><Phone size={12} /></button>
      </div>

      {/* Items */}
      <div className="ord-section-h">
        <span>Items</span>
        <span>{order.items.reduce((s, i) => s + i.quantity, 0)} total</span>
      </div>
      <div className="ord-items">
        {order.items.map((item, idx) => (
          <div key={idx} className="ord-item">
            <div className="ord-item__img">
              <span className="ord-item__qty">×{item.quantity}</span>
            </div>
            <div>
              <div className="ord-item__name">{item.name}</div>
            </div>
            <div className="ord-item__price">₹{(item.price * item.quantity).toFixed(0)}</div>
          </div>
        ))}
      </div>

      {/* Note */}
      {order.notes && (
        <div className="ord-note">
          <FileText size={12} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div>Note from guest</div>
            <div>{order.notes}</div>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="ord-totals">
        <div className="ord-totals__row"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
        <div className="ord-totals__row"><span>GST · 5%</span><span>₹{gst}</span></div>
        <div className="ord-totals__row"><span>Service · 8%</span><span>₹{service}</span></div>
        <div className="ord-totals__row ord-totals__row--big"><span>Total</span><span>₹{total.toFixed(0)}</span></div>
        <div className="ord-pay">
          <div className="ord-pay__chip">
            <span className="ord-pay__sw" />
            {order.status === "served" ? "Paid" : "Pending payment"}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="ord-section-h">Timeline</div>
      <div className="ord-timeline">
        {timelineSteps.map((step, idx) => (
          <div key={idx} className={`ord-step${step.done ? " is-done" : step.current ? " is-current" : ""}`}>
            <div className="ord-step__bullet">
              {step.done ? <Check size={12} /> : step.current ? <span className="ord-step__pulse" /> : null}
            </div>
            <div className="ord-step__body">
              <div className="ord-step__label">{step.label}</div>
              <div className="ord-step__detail">{step.detail}</div>
            </div>
            <div className="ord-step__t">
              {step.done || step.current ? fmtTime(order.updatedAt) : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="ord-actions">
        <button className="ord-btn-ghost" onClick={() => printBill(order)}>
          <Printer size={13} /> Print Bill
        </button>
        <OrderStatusActions
          orderId={order.orderId}
          currentStatus={order.status as OrderStatus}
          onStatusChange={async (id, status, reason) => {
            await updateStatus(id, status, reason);
          }}
        />
      </div>
    </aside>
  );
}

/* ════════════════════════ MAIN COMPONENT ════════════════════════ */

const PAGE_SIZE = 12;

export function OrdersPageClient({ restaurantId, token, initialOrders, tables, menuItems, categories }: Props) {
  const { orders } = useOrderUpdates({ mode: "admin", restaurantId, token, initialOrders });
  const [tab, setTab] = useState<TabFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  /* Derived */
  const todayOrders = useMemo(() => {
    const today = new Date();
    return orders.filter(o => {
      const d = new Date(o.createdAt);
      return d.toDateString() === today.toDateString();
    });
  }, [orders]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, pending: 0, preparing: 0, ready: 0, served: 0, cancelled: 0 };
    todayOrders.forEach(o => {
      counts.all++;
      if (o.status === "pending")  counts.pending++;
      else if (o.status === "confirmed" || o.status === "preparing") counts.preparing++;
      else if (o.status === "ready") counts.ready++;
      else if (o.status === "served") counts.served++;
      else if (o.status === "cancelled") counts.cancelled++;
    });
    return counts;
  }, [todayOrders]);

  const filtered = useMemo(() => {
    return todayOrders.filter(o => {
      if (tab !== "all") {
        if (tab === "preparing" && !["confirmed","preparing"].includes(o.status)) return false;
        if (tab !== "preparing" && o.status !== tab) return false;
      }
      if (channelFilter === "dine-in"  && !o.tableName) return false;
      if (channelFilter === "takeaway" &&  o.tableName) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.orderNumber.includes(q) && !o.tableName?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [todayOrders, tab, channelFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [tab, search]);

  const selectedOrder = orders.find(o => o.orderId === selectedId) ?? null;

  /* KPIs */
  const activeCount = todayOrders.filter(o => ["pending","confirmed","preparing","ready"].includes(o.status)).length;
  const newCount    = todayOrders.filter(o => o.status === "pending").length;
  const prepCount   = todayOrders.filter(o => ["confirmed","preparing"].includes(o.status)).length;
  const readyCount  = todayOrders.filter(o => o.status === "ready").length;
  const avgTicket   = todayOrders.length > 0
    ? Math.round(todayOrders.reduce((s,o) => s + o.items.reduce((x,i) => x + i.price * i.quantity, 0), 0) / todayOrders.length)
    : 0;
  const cancelPct = todayOrders.length > 0
    ? ((todayOrders.filter(o => o.status === "cancelled").length / todayOrders.length) * 100).toFixed(1)
    : "0";

  return (
    <main className="adm-main">
      {/* ─── Header ─── */}
      <header className="adm-top" style={{ gap: 8, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Orders
          </h1>
          <div className="adm-top__sub">
            {todayOrders.length} today · {activeCount} active · Last updated just now
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 280 }}>
          <div className="adm-search">
            <Search size={15} />
            <input
              placeholder="Search order ID, table…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <button className="ord-btn-ghost">
          <CalendarDays size={13} /> Today <ChevronDown size={11} />
        </button>
        <button className="ord-btn-ghost">
          <Download size={13} /> Export
        </button>
        <button className="ord-btn-primary" onClick={() => setShowNewOrder(true)}>
          <Plus size={13} /> New order
        </button>
      </header>

      <div className="adm-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ─── KPI Strip ─── */}
        <div className="ord-kpi-strip">
          <div className="ord-kpi">
            <div className="ord-kpi__label"><span className="ord-kpi__dot" />Active right now</div>
            <div className="ord-kpi__row">
              <div className="ord-kpi__val">{activeCount}</div>
              <div className="ord-kpi__split">
                <span><b>{newCount}</b> new</span>
                <span><b>{prepCount}</b> prep</span>
                <span><b>{readyCount}</b> ready</span>
              </div>
            </div>
          </div>
          <div className="ord-kpi">
            <div className="ord-kpi__label">Tonight&apos;s orders</div>
            <div className="ord-kpi__row">
              <div className="ord-kpi__val">{todayOrders.length}</div>
              <span className="kpi__delta">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6"/></svg>
                Live
              </span>
            </div>
          </div>
          <div className="ord-kpi">
            <div className="ord-kpi__label">Avg ticket</div>
            <div className="ord-kpi__row">
              <div className="ord-kpi__val">₹{avgTicket}</div>
            </div>
          </div>
          <div className="ord-kpi">
            <div className="ord-kpi__label">Avg fulfil time</div>
            <div className="ord-kpi__row">
              <div className="ord-kpi__val">—<span className="ord-kpi__u"></span></div>
            </div>
          </div>
          <div className="ord-kpi">
            <div className="ord-kpi__label">Cancellations</div>
            <div className="ord-kpi__row">
              <div className="ord-kpi__val">{todayOrders.filter(o => o.status === "cancelled").length}</div>
              <span style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>{cancelPct}%</span>
            </div>
          </div>
        </div>

        {/* ─── Tabs row ─── */}
        <div className="ord-tabs-row">
          <div className="ord-tabs">
            {(["all","pending","preparing","ready","served","cancelled"] as TabFilter[]).map(t => (
              <button
                key={t}
                className={`ord-tab${tab === t ? " is-on" : ""}`}
                onClick={() => setTab(t)}
              >
                {t !== "all" && (
                  <span className={`ord-tab__pip ${
                    t === "pending" ? "blue" :
                    t === "preparing" ? "amber" :
                    t === "ready" ? "green" :
                    t === "served" ? "coral" : "red"
                  }`} />
                )}
                <span style={{ textTransform: "capitalize" }}>{t === "all" ? "All orders" : t}</span>
                <span className="ord-tab__cnt">{tabCounts[t]}</span>
              </button>
            ))}
          </div>
          <div className="ord-tabs-row__spacer" />
          <button
            className={`ord-chip${channelFilter !== "all" ? " is-on" : ""}`}
            onClick={() => {
              setChannelFilter(f =>
                f === "all" ? "dine-in" : f === "dine-in" ? "takeaway" : "all"
              );
              setPage(1);
            }}
            title="Cycle: All → Dine-in → Takeaway"
          >
            {channelFilter === "all"
              ? <><ChannelIcon channel="dine-in" /> All channels</>
              : channelFilter === "dine-in"
                ? <><ChannelIcon channel="dine-in" /> Dine-in</>
                : <><ChannelIcon channel="takeaway" /> Takeaway</>
            }
            <ChevronDown size={11} />
          </button>
          <div className="ord-seg">
            <button className={viewMode === "list" ? "is-on" : ""} onClick={() => setViewMode("list")}>
              <List size={12} />
            </button>
            <button className={viewMode === "board" ? "is-on" : ""} onClick={() => setViewMode("board")}>
              <LayoutGrid size={12} />
            </button>
          </div>
        </div>

        {/* ─── Split layout ─── */}
        <div className="ord-split">
          {/* Table */}
          <div className="ord-table card">
            <div className="ord-thead">
              <div>Order</div>
              <div>Customer</div>
              <div>Channel</div>
              <div>Table</div>
              <div>Items</div>
              <div>Amount</div>
              <div>Status</div>
              <div />
            </div>
            <div className="ord-tbody">
              {pageOrders.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: "var(--surface-2)", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "var(--muted)" }}>
                    <UtensilsCrossed size={22} strokeWidth={1.5} />
                  </div>
                  <div style={{ font: "700 13px var(--sans)", color: "var(--ink-2)", margin: 0 }}>No orders</div>
                  <div style={{ font: "500 12px var(--sans)", color: "var(--muted)", marginTop: 4 }}>
                    {tab === "all" ? "No orders today yet" : `No ${tab} orders`}
                  </div>
                </div>
              ) : (
                pageOrders.map(order => {
                  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
                  const amount = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
                  const isSel = selectedId === order.orderId;
                  const channel = order.tableName ? "dine-in" : "takeaway";
                  return (
                    <div
                      key={order.orderId}
                      className={`ord-tr${isSel ? " is-sel" : ""}`}
                      onClick={() => setSelectedId(isSel ? null : order.orderId)}
                    >
                      <div>
                        <div className="ord-id">ORD-{order.orderNumber}</div>
                        <div className="ord-id__t">{fmtTime(order.createdAt)}</div>
                      </div>
                      <div className="c-cust">
                        <div className="ord-av" />
                        <div>
                          <div className="ord-name">Table {order.tableName || "—"}</div>
                          <div className="ord-sub">{timeAgo(order.createdAt)}</div>
                        </div>
                      </div>
                      <div>
                        <span className="ord-ch">
                          <span className="ord-ch__ico"><ChannelIcon channel={channel} /></span>
                          {channel === "dine-in" ? "Dine-in" : "Takeaway"}
                        </span>
                      </div>
                      <div>
                        {order.tableName
                          ? <span className="ord-tbl">T-{order.tableName}</span>
                          : <span className="ord-tbl is-empty">—</span>
                        }
                      </div>
                      <div className="c-items">{itemCount} item{itemCount !== 1 ? "s" : ""}</div>
                      <div className="c-amt">₹{amount.toFixed(0)}</div>
                      <div>
                        <span className={`status-pill ${statusPillClass(order.status)}`}>
                          <span className="dot" />{statusLabel(order.status)}
                        </span>
                      </div>
                      <div>
                        <span className={`ord-go${isSel ? " is-sel" : ""}`}>
                          <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Pagination */}
            <div className="ord-foot">
              <div>Showing <b>{Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)}</b> of {filtered.length} orders</div>
              <div className="ord-pager">
                <button className={page === 1 ? "is-dim" : ""} onClick={() => setPage(p => Math.max(1, p-1))}>
                  <ChevronLeft size={12} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={page === p ? "is-on" : ""} onClick={() => setPage(p)}>{p}</button>
                ))}
                {totalPages > 5 && <span style={{ font: "500 12px var(--sans)", color: "var(--muted)", alignSelf: "center" }}>…</span>}
                <button className={page === totalPages ? "is-dim" : ""} onClick={() => setPage(p => Math.min(totalPages, p+1))}>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.orderId}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              >
                <OrderDetail
                  order={selectedOrder}
                  onClose={() => setSelectedId(null)}
                />
              </motion.div>
            ) : (
              <aside className="ord-detail" key="empty">
                <div className="ord-detail__empty">
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--surface-2)", display: "grid", placeItems: "center", color: "var(--muted)" }}>
                    <Clock size={22} strokeWidth={1.5} />
                  </div>
                  <h4>Select an order</h4>
                  <p>Click any row to view details, timeline, and manage status</p>
                </div>
              </aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New Order Panel */}
      <AnimatePresence>
        {showNewOrder && (
          <NewOrderPanel
            tables={tables}
            menuItems={menuItems}
            categories={categories}
            onClose={() => setShowNewOrder(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
