"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    Razorpay: new (opts: object) => { open(): void; on(evt: string, cb: (response: object) => void): void };
  }
}

interface Props {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  restaurantSlug: string;
  onSuccess: (paymentId: string) => void;
  onClose: () => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentSheet({ orderId, orderNumber, totalAmount, restaurantSlug, onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<"select" | "paying" | "error">("select");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  async function handleOnlinePay() {
    setLoading(true);
    setMode("paying");
    setErrorMsg("");
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Payment SDK failed to load");

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to initiate payment");

      const { razorpay_order_id, amount, currency, key_id, restaurant_name, brand_color, order_number: orderNum } = data.data;

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: key_id,
          amount,
          currency,
          name: restaurant_name,
          description: `Order ${orderNum}`,
          order_id: razorpay_order_id,
          theme: { color: brand_color ?? "var(--brand)" },
          handler: async (response: Record<string, string>) => {
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  order_id: orderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                onSuccess(response.razorpay_payment_id);
                resolve();
              } else {
                reject(new Error("Payment verification failed"));
              }
            } catch (e) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("cancelled")),
          },
        });
        rzp.open();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (msg === "cancelled") {
        setMode("select");
      } else {
        setErrorMsg(msg);
        setMode("error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePayAtCounter() {
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          style={{ background: "var(--bg)", borderRadius: "24px 24px 0 0", padding: "28px 24px 48px", width: "100%", maxWidth: 480 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--hairline)", margin: "0 auto 24px" }} />

          <h2 style={{ margin: "0 0 4px", font: "800 20px var(--sans)", letterSpacing: "-.01em", color: "var(--ink)" }}>
            Pay for your order
          </h2>
          <p style={{ margin: "0 0 24px", font: "500 13px var(--sans)", color: "var(--muted)" }}>
            {orderNumber} · Total: <strong>₹{totalAmount.toFixed(2)}</strong>
          </p>

          {mode === "error" && (
            <div style={{ background: "rgba(224,58,48,.08)", border: "1px solid rgba(224,58,48,.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--red)", fontWeight: 600 }}>Payment failed</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--red)", opacity: 0.8 }}>{errorMsg}</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Pay online */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleOnlinePay}
              disabled={loading}
              style={{ width: "100%", padding: "16px 20px", borderRadius: 16, background: "var(--brand)", color: "#fff", border: 0, font: "700 15px var(--sans)", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 24px rgba(255,77,61,.25)" }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <div>{loading ? "Opening payment…" : "Pay Online"}</div>
                <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.8, marginTop: 1 }}>UPI · Card · Net Banking</div>
              </div>
              <svg style={{ marginLeft: "auto" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </motion.button>

            {/* Pay at counter */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePayAtCounter}
              style={{ width: "100%", padding: "16px 20px", borderRadius: 16, background: "var(--surface)", color: "var(--ink)", border: "1.5px solid var(--hairline)", font: "700 15px var(--sans)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--base)", border: "1px solid var(--hairline)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L2 7h20l-6-4z"/></svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <div>Pay at Counter</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginTop: 1 }}>Cash · Pay when you&apos;re done</div>
              </div>
              <svg style={{ marginLeft: "auto" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </motion.button>
          </div>

          <p style={{ margin: "20px 0 0", textAlign: "center", font: "500 11px var(--sans)", color: "var(--muted)" }}>
            Payments secured by Razorpay · 256-bit SSL
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
