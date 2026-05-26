"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface Props {
  orderId: string;
  orderNumber: string;
  total: number;
  paymentId: string;
  restaurantSlug: string;
}

export function PaymentSuccess({ orderId, orderNumber, total, paymentId, restaurantSlug }: Props) {
  return (
    <div className="customer-scope" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 32, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        style={{ width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg, var(--green), #26c972)", display: "grid", placeItems: "center", marginBottom: 24, boxShadow: "0 8px 32px rgba(30,158,94,.3)" }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7"/>
        </svg>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h1 style={{ margin: "0 0 8px", font: "800 26px var(--sans)", color: "var(--ink)", letterSpacing: "-.02em" }}>
          Payment Successful! 
        </h1>
        <p style={{ margin: "0 0 24px", font: "500 14px var(--sans)", color: "var(--muted)" }}>
          Your payment of <strong>₹{total.toFixed(2)}</strong> has been received.
        </p>

        <div style={{ background: "var(--surface)", borderRadius: 16, padding: "16px 20px", marginBottom: 24, border: "1px solid var(--hairline)", textAlign: "left" }}>
          {[
            { l: "Order", v: orderNumber },
            { l: "Amount", v: `₹${total.toFixed(2)}` },
            { l: "Payment ID", v: paymentId.slice(0, 18) + "…" },
          ].map(({ l, v }) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>{l}</span>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>{v}</span>
            </div>
          ))}
        </div>

        <Link
          href={`/m/${restaurantSlug}/order/${orderId}`}
          style={{ display: "block", padding: "14px 32px", borderRadius: 999, background: "var(--brand)", color: "#fff", textDecoration: "none", font: "700 15px var(--sans)", boxShadow: "0 4px 16px rgba(255,77,61,.25)" }}
        >
          Track order
        </Link>
      </motion.div>
    </div>
  );
}
