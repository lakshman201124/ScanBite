"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SplitBillSheet } from "@/components/customer/SplitBillSheet";

interface OrderItem { id: string; item_name: string; item_price: number; quantity: number; image_url?: string | null }
interface Order {
  id: string; order_number: string; status: string;
  payment_status: string; notes: string | null;
  created_at: string; items: OrderItem[];
}

const STEPS = [
  { key: "pending",   label: "Order received",      desc: "We got your order",            time: "" },
  { key: "confirmed", label: "KOT sent to kitchen", desc: "Kitchen picked it up",          time: "" },
  { key: "preparing", label: "Preparing",           desc: "Chef is cooking your food",     time: "" },
  { key: "ready",     label: "Ready!",              desc: "On the way to your table",      time: "" },
  { key: "served",    label: "Served",              desc: "Enjoy your meal!",              time: "" },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0, confirmed: 1, preparing: 2, ready: 3, served: 4, cancelled: -1,
};

const STATUS_HEADLINE: Record<string, React.ReactElement> = {
  pending:   <><em>Order placed!</em> Hang tight…</>,
  confirmed: <>Order <em>confirmed</em></>,
  preparing: <>Chef is <em>cooking</em></>,
  ready:     <>Ready to <em>be served!</em></>,
  served:    <>Enjoy your <em>meal!</em></>,
};

function requestBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission().then(perm => {
      if (perm === "granted") new Notification(title, { body, icon: "/favicon.ico" });
    });
  }
}

function OrderTrackerInner({
  orderId, restaurantSlug, tableId, restaurantId, initialOrder,
}: {
  orderId: string; restaurantSlug: string; tableId?: string; restaurantId?: string; initialOrder?: Order;
}) {
  const [order, setOrder] = useState<Order | null>(initialOrder ?? null);
  const [isLoading, setIsLoading] = useState(!initialOrder);
  const prevStatusRef = useRef(initialOrder?.status ?? "");
  const [billRequested, setBillRequested] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const socketAuth = restaurantId && tableId
    ? { role: "customer", restaurantId, tableId, orderId }
    : null;
  const { socket, status: socketStatus } = useSocket(socketAuth);

  useEffect(() => {
    if (initialOrder) return;
    fetch(`/api/customer/orders?id=${orderId}`)
      .then(r => r.json())
      .then(r => { if (r.data) setOrder(r.data); })
      .finally(() => setIsLoading(false));
  }, [orderId, initialOrder]);

  useEffect(() => {
    if (!socket) return;
    function onOrderUpdated(data: { orderId: string; status: string }) {
      if (data.orderId !== orderId) return;
      setOrder(prev => {
        if (!prev) return prev;
        if (data.status === "ready" && prev.status !== "ready") {
          requestBrowserNotification("Your order is ready!", `Order ${prev.order_number} is ready to be served.`);
        }
        return { ...prev, status: data.status };
      });
    }
    socket.on("order:updated", onOrderUpdated);
    return () => { socket.off("order:updated", onOrderUpdated); };
  }, [socket, orderId]);

  useEffect(() => {
    if (socketStatus === "connected") return;
    const t = setInterval(() => {
      fetch(`/api/customer/orders?id=${orderId}`)
        .then(r => r.json())
        .then(r => { if (r.data) setOrder(r.data); })
        .catch(() => {});
    }, 10_000);
    return () => clearInterval(t);
  }, [socketStatus, orderId]);

  if (isLoading || !order) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--sans)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,.15)", borderTopColor: "var(--brand)", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14 }}>Loading order…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const stepIdx = isCancelled ? -1 : (STATUS_INDEX[order.status] ?? 0);
  const subtotal = order.items.reduce((s, i) => s + Number(i.item_price) * i.quantity, 0);
  const total = subtotal * 1.05;

  const checkIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11" /></svg>
  );
  const dotIcon = (filled: boolean) => (
    <svg width={filled ? 10 : 8} height={filled ? 10 : 8} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r={filled ? 6 : 4} /></svg>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", fontFamily: "var(--sans)", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes trk-blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.85)} }
        @keyframes trk-bounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes trk-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .trk-pulse-dot { animation: trk-blink 1.1s ease-in-out infinite; }
        .trk-bounce-now { animation: trk-bounce 1.6s ease-in-out infinite; }
      `}</style>

      {/* Reconnection banner */}
      <AnimatePresence>
        {socketStatus === "disconnected" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ background: "rgba(224,58,48,.12)", color: "var(--red)", padding: "8px 18px", fontSize: 12, fontWeight: 700, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
            Reconnecting… (polling every 10s)
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 0" }}>
        <Link href={`/m/${restaurantSlug}`} style={{ textDecoration: "none" }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", display: "grid", placeItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </div>
        </Link>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".14em" }}>Order</span>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-.005em", color: "#fff" }}>{order.order_number}</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", padding: "5px 10px 5px 7px", borderRadius: 999, fontSize: 10, fontWeight: 800, color: socketStatus === "connected" ? "#FF8A5E" : "rgba(255,255,255,.4)", letterSpacing: ".04em" }}>
          <span className="trk-pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: socketStatus === "connected" ? "var(--red)" : "rgba(255,255,255,.3)", display: "inline-block" }} />
          {socketStatus === "connected" ? "LIVE" : "POLL"}
        </div>
      </div>

      {/* ── DARK HERO ── */}
      <div className="track-hero" style={{ backgroundColor: "#000", marginTop: 14 }}>
        {/* Radial brand glow */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(255,77,61,.45), transparent 65%)", borderRadius: "50%", pointerEvents: "none" }} />

        {isCancelled ? (
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="track-hero__order">Order · {order.order_number}</div>
            <div className="track-hero__num" style={{ color: "var(--red)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
              Cancelled
            </div>
            <p className="track-hero__eta" style={{ color: "rgba(255,255,255,.7)", fontSize: 22 }}>
              Order was <em style={{ color: "#FF9385" }}>cancelled</em>
            </p>
            <p className="track-hero__sub">Please speak to a staff member for assistance.</p>
          </div>
        ) : (
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="track-hero__order">Order · {order.order_number}</div>
                <div className="track-hero__num">
                  <span className="pulse" />
                  {order.status === "preparing" ? "Being prepared" : order.status === "ready" ? "Ready to serve!" : order.status === "confirmed" ? "Confirmed" : order.status === "served" ? "Served" : "Placed"}
                </div>
              </div>
              <div className="table-chip" style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}>
                TABLE <span className="table-chip__num">T-{tableId?.slice(0, 4) ?? "12"}</span>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <p className="track-hero__eta">
                {STATUS_HEADLINE[order.status] ?? <>Your order is <em>on the way!</em></>}
              </p>
              <p className="track-hero__sub">
                {order.status === "preparing" ? "Chef is working on your dishes right now" :
                 order.status === "ready" ? "Your food is plated and coming to you!" :
                 order.status === "confirmed" ? "Your order has been confirmed at the counter" :
                 order.status === "served" ? "Hope you enjoy your meal!" :
                 "Sending your order to the kitchen…"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ paddingBottom: 100 }}>
        {/* ── STEPS JOURNEY ── */}
        {!isCancelled && (
          <div className="track-steps" style={{ margin: "0 16px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800 }}>Order journey</h3>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                {new Date(order.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div style={{ position: "relative", paddingLeft: 4 }}>
              <div className="track-step__bullet" style={{ position: "absolute", left: 10, top: 14, bottom: 14, width: 2, height: "auto", background: "rgba(20,19,26,.1)", borderLeft: "2px dashed var(--hairline)" }} />
              {stepIdx > 0 && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${(stepIdx / (STEPS.length - 1)) * 84}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 20 }}
                  style={{ position: "absolute", left: 10.5, top: 18, width: 2, background: "var(--green)", zIndex: 0, borderRadius: 2 }}
                />
              )}
              {STEPS.map((step, idx) => {
                const done = idx < stepIdx;
                const now = idx === stepIdx;
                const future = idx > stepIdx;
                return (
                  <motion.div
                    key={step.key}
                    animate={now ? { x: [0, 3, 0] } : {}}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="track-step"
                    style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "6px 0 18px", position: "relative" }}
                  >
                    <div
                      className={now ? "track-step__bullet trk-bounce-now" : "track-step__bullet"}
                      style={{
                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        background: done ? "var(--green)" : now ? "var(--brand)" : "var(--surface-2)",
                        color: done || now ? "#fff" : "var(--muted-2)",
                        display: "grid", placeItems: "center",
                        border: `2px solid ${done ? "var(--green)" : now ? "var(--brand)" : "#fff"}`,
                        boxShadow: now ? "0 0 0 1px var(--brand), 0 8px 18px -4px rgba(255,77,61,.4)" : done ? "0 0 0 1px var(--green)" : "0 0 0 1px var(--hairline)",
                        position: "relative", zIndex: 1,
                      }}
                    >
                      {done ? checkIcon : dotIcon(now)}
                    </div>
                    <div style={{ flex: 1, paddingTop: 6 }}>
                      <p className="track-step__t" style={{ color: future ? "var(--muted)" : "var(--ink)", display: "flex", justifyContent: "space-between" }}>
                        <span>{step.label}</span>
                        {now && <span className="track-step__time" style={{ color: "var(--brand)", fontWeight: 800 }}>Now</span>}
                      </p>
                      <p className="track-step__d">{step.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── GAMES CARD ── */}
        {!isCancelled && order.status !== "served" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ margin: "0 16px 14px", borderRadius: "var(--r-3)", background: "var(--surface)", border: "1px solid var(--hairline)", padding: 16, display: "flex", gap: 14, alignItems: "center", boxShadow: "var(--sh-2)" }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #FFB838, var(--brand))", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0, boxShadow: "0 8px 20px -4px rgba(255,77,61,.4)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12h4M9 10v4M14 13h.01M16 11h.01" /><path d="M17 18a4 4 0 0 0 4-4 8 8 0 0 0-16 0 4 4 0 0 0 4 4 6 6 0 0 0 4-1 6 6 0 0 0 4 1Z" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font: "800 14px var(--sans)", color: "var(--ink)" }}>While you wait — let&apos;s play</div>
              <div style={{ font: "500 12px var(--sans)", color: "var(--muted)", marginTop: 2 }}>Trivia · Truth or Dare · Spin the bottle</div>
            </div>
            <button style={{ background: "var(--ink)", color: "#fff", border: 0, padding: "9px 14px", borderRadius: 999, font: "700 12px var(--sans)", cursor: "pointer", whiteSpace: "nowrap" }}>
              Play
            </button>
          </motion.div>
        )}

        {/* ── ITEMS SNAPSHOT ── */}
        <div style={{ margin: "0 16px 14px", borderRadius: "var(--r-3)", background: "var(--surface)", border: "1px solid var(--hairline)", padding: "14px 16px", boxShadow: "var(--sh-1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800 }}>Your order</h3>
            <div style={{ textAlign: "right" }}>
              <div style={{ font: "500 10px var(--sans)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>Total</div>
              <div style={{ font: "800 16px var(--sans)", letterSpacing: "-.01em" }}>₹{total.toFixed(0)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {order.items.slice(0, 3).map((item, i) => (
              <div
                key={item.id}
                style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: item.image_url ? `url(${item.image_url})` : "var(--surface-2)",
                  backgroundSize: "cover", backgroundPosition: "center",
                  boxShadow: "var(--sh-2)", flexShrink: 0,
                  animation: `trk-float ${2.5 + i * 0.4}s ease-in-out infinite`,
                  display: "grid", placeItems: "center",
                  color: "var(--muted-2)",
                }}
              >
                {!item.image_url && (
                  <span style={{ font: "700 9px var(--sans)", color: "var(--muted)", textAlign: "center", padding: "0 4px", lineHeight: 1.2 }}>
                    {item.item_name.split(" ")[0]}
                  </span>
                )}
              </div>
            ))}
            {order.items.length > 3 && (
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface-2)", display: "grid", placeItems: "center", font: "700 12px var(--sans)", color: "var(--muted)", flexShrink: 0 }}>
                +{order.items.length - 3}
              </div>
            )}
          </div>
          <div style={{ marginTop: 14, borderTop: "1px dashed var(--hairline)", paddingTop: 12 }}>
            {order.items.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>{item.quantity}× {item.item_name}</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>₹{(Number(item.item_price) * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bill request + split (when served) */}
        {order.status === "served" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ margin: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {order.payment_status !== "paid" && (
              <button
                onClick={async () => {
                  if (billRequested) return;
                  await fetch(`/api/customer/orders/${orderId}/bill`, { method: "POST" });
                  setBillRequested(true);
                }}
                style={{ width: "100%", padding: "15px 0", borderRadius: 999, background: billRequested ? "var(--green-soft)" : "var(--brand)", color: billRequested ? "var(--green)" : "#fff", border: billRequested ? "1.5px solid var(--green)" : 0, fontWeight: 800, fontSize: 14, cursor: billRequested ? "default" : "pointer", fontFamily: "var(--sans)", boxShadow: billRequested ? "none" : "var(--sh-coral)" }}
              >
                {billRequested ? "Bill requested — staff notified" : "Request Bill"}
              </button>
            )}
            <button onClick={() => setShowSplit(true)} style={{ width: "100%", padding: "13px 0", borderRadius: 999, background: "var(--surface)", color: "var(--ink)", border: "1.5px solid var(--hairline)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--sans)" }}>
              Split Bill
            </button>
          </motion.div>
        )}

        {showSplit && (
          <SplitBillSheet orderId={orderId} total={total} items={order.items} onClose={() => setShowSplit(false)} />
        )}
      </div>

      {/* ── STICKY FOOTER ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "14px 16px 28px", background: "linear-gradient(180deg, rgba(13,13,13,0) 0%, #0d0d0d 30%)", display: "flex", gap: 8 }}>
        {order.status !== "served" ? (
          <Link href={`/m/${restaurantSlug}`} style={{ textDecoration: "none", flex: 1 }}>
            <button className="trk-cta" style={{ width: "100%" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
              + Order more
            </button>
          </Link>
        ) : (
          <button
            onClick={async () => {
              if (billRequested) return;
              await fetch(`/api/customer/orders/${orderId}/bill`, { method: "POST" });
              setBillRequested(true);
            }}
            className="trk-cta"
            style={{ flex: 1 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
            {billRequested ? "Bill requested" : "Request bill"}
          </button>
        )}
        <button
          onClick={() => { /* call server ping — future feature */ }}
          className="trk-cta ghost"
          style={{ background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.12)", boxShadow: "none", padding: "15px 20px" }}
        >
          Call server
        </button>
      </div>
    </div>
  );
}

export function OrderTracker({
  orderId, restaurantSlug, tableId, restaurantId, initialOrder,
}: {
  orderId: string; restaurantSlug: string; tableId?: string; restaurantId?: string; initialOrder?: Order;
}) {
  return (
    <QueryProvider>
      <OrderTrackerInner orderId={orderId} restaurantSlug={restaurantSlug} tableId={tableId} restaurantId={restaurantId} initialOrder={initialOrder} />
    </QueryProvider>
  );
}
