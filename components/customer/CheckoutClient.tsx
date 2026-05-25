"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cartSubtotal, useCartStore } from "@/store/cart";
import { QueryProvider } from "@/components/providers/QueryProvider";

interface Props { restaurantSlug: string }

function CheckoutInner({ restaurantSlug }: Props) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = cartSubtotal(items);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const cgst = subtotal * 0.025;
  const sgst = subtotal * 0.025;
  const total = subtotal + cgst + sgst;

  async function placeOrder() {
    if (items.length === 0) return;
    setPlacing(true);
    setError("");
    try {
      const res = await fetch("/api/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({
            menu_item_id: i.menuItemId,
            quantity: i.quantity,
            customizations: i.customizations.reduce<Record<string, string>>((acc, c) => { acc[c.groupName] = c.optionLabel; return acc; }, {}),
            note: i.note,
          })),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to place order");
      clearCart();
      router.push(`/m/${restaurantSlug}/order/${data.data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="customer-scope" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 56 }}>🛒</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>Your bag is empty</h2>
        <button onClick={() => router.back()} style={{ padding: "10px 24px", borderRadius: 999, background: "var(--brand)", color: "#fff", border: 0, fontWeight: 700, cursor: "pointer", fontFamily: "var(--sans)" }}>
          Browse menu
        </button>
      </div>
    );
  }

  return (
    <div className="customer-scope" style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px 12px" }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--hairline)", display: "grid", placeItems: "center", cursor: "pointer" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-.01em", color: "var(--ink)" }}>Review order</h1>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{items.length} item{items.length !== 1 ? "s" : ""} · Pay at counter</p>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "0 20px" }}>
        {items.map(item => {
          const extra = item.customizations.reduce((s, c) => s + c.priceDelta, 0);
          return (
            <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--surface)", borderRadius: 20, padding: 10, marginBottom: 10, border: "1px solid var(--hairline)" }}>
              {item.image_url && (
                <div style={{ width: 60, height: 60, borderRadius: 12, backgroundImage: `url(${item.image_url})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{item.name}</p>
                {item.customizations.length > 0 && <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{item.customizations.map(c => c.optionLabel).join(", ")}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "var(--ink)" }}>₹{((item.price + extra) * item.quantity).toFixed(0)}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>× {item.quantity}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div style={{ margin: "4px 20px 14px", background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 20, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h6M8 17h4"/></svg>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Allergies, special requests for the chef…" style={{ flex: 1, border: 0, outline: "none", background: "transparent", fontSize: 13, fontFamily: "var(--sans)", color: "var(--ink)" }} />
      </div>

      {/* Bill */}
      <div style={{ margin: "0 20px 20px", background: "var(--surface)", borderRadius: 20, border: "1px solid var(--hairline)", padding: "14px 16px" }}>
        {[
          { label: "Subtotal", val: `₹${subtotal.toFixed(2)}`, muted: false },
          { label: "CGST 2.5%", val: `₹${cgst.toFixed(2)}`, muted: true },
          { label: "SGST 2.5%", val: `₹${sgst.toFixed(2)}`, muted: true },
        ].map(r => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500, color: r.muted ? "var(--muted)" : "var(--ink-2)", padding: "5px 0" }}>
            <span>{r.label}</span><span>{r.val}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, color: "var(--ink)", borderTop: "1px dashed var(--hairline)", marginTop: 6, paddingTop: 10 }}>
          <span>Grand total</span>
          <span style={{ color: "var(--brand)" }}>₹{total.toFixed(0)}</span>
        </div>
      </div>

      {error && <p style={{ color: "var(--red)", fontSize: 13, padding: "0 20px 12px", margin: 0 }}>{error}</p>}

      {/* Place order */}
      <div style={{ padding: "0 20px 36px" }}>
        <motion.button
          onClick={placeOrder}
          disabled={placing}
          whileTap={{ scale: 0.98 }}
          style={{ width: "100%", padding: "16px 0", borderRadius: 999, background: placing ? "var(--muted)" : "var(--brand)", color: "#fff", border: 0, fontWeight: 700, fontSize: 15, cursor: placing ? "not-allowed" : "pointer", fontFamily: "var(--sans)", boxShadow: placing ? "none" : "var(--sh-brand)" }}
        >
          {placing ? "Placing order…" : `Place Order · ₹${total.toFixed(0)}`}
        </motion.button>
        <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
          Pay at counter = cash when your bill arrives.
        </p>
      </div>
    </div>
  );
}

export function CheckoutClient(props: Props) {
  return <QueryProvider><CheckoutInner {...props} /></QueryProvider>;
}
