"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, Printer, QrCode, Send } from "lucide-react";
import Link from "next/link";

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  customizations?: string;
}

interface BillData {
  id: string;
  bill_number: string | null;
  subtotal: number;
  cgst_rate: number;
  sgst_rate: number;
  cgst: number;
  sgst: number;
  discount: number;
  tip: number;
  total: number;
  is_printed: boolean;
  invoice_url: string | null;
  order: {
    id: string;
    order_number: string;
    payment_status: string;
    payment_method: string | null;
    table: { table_number: string; capacity?: number } | null;
    items: OrderItem[];
    created_at?: string;
    notes?: string | null;
  };
}

interface Props {
  bill: BillData;
  restaurantName?: string;
  restaurantGstin?: string;
}

type PaymentMethod = "upi" | "card" | "cash" | "loyalty";
type SplitMode = "none" | "equal" | "by_item";
type TipPercent = 0 | 10 | 15 | 20 | "custom";

const PAYMENT_METHODS: { key: PaymentMethod; label: string; sub: string; icon: React.ReactNode }[] = [
  { key: "upi", label: "UPI", sub: "GPay · PhonePe · Paytm", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
  { key: "card", label: "Card", sub: "Visa · Master · Amex", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h2"/></svg> },
  { key: "cash", label: "Cash", sub: "Change drawer", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></svg> },
  { key: "loyalty", label: "Loyalty", sub: "320 pts · ₹160 off", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
];

function fmt(v: number) { return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`; }

export function BillPaymentPage({ bill, restaurantName = "Olio Trattoria", restaurantGstin = "29ABCDE1234F1Z5" }: Props) {
  const [payMethod, setPayMethod] = useState<PaymentMethod>("upi");
  const [split, setSplit] = useState<SplitMode>("none");
  const [tip, setTip] = useState<TipPercent>(15);
  const [customTip, setCustomTip] = useState("");
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(bill.order.payment_status === "paid");

  const tableLabel = bill.order.table
    ? (bill.order.table.table_number.startsWith("T-") ? bill.order.table.table_number : `T-${bill.order.table.table_number}`)
    : "—";
  const guestCount = bill.order.table?.capacity ?? 4;

  const tipAmount = tip === "custom"
    ? (parseFloat(customTip) || 0)
    : (bill.subtotal * (tip as number) / 100);
  const grandTotal = bill.total + tipAmount - (payMethod === "loyalty" ? 160 : 0);

  const seatedMinutes = bill.order.created_at
    ? Math.floor((Date.now() - new Date(bill.order.created_at).getTime()) / 60000)
    : 52;

  async function markPaid() {
    setMarking(true);
    try {
      await fetch(`/api/admin/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: payMethod, tip: tipAmount }),
      });
      setMarked(true);
    } catch {
      // ignore
    } finally {
      setMarking(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", color: "var(--ink)" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", background: "var(--surface)", borderBottom: "1px solid var(--hairline)", position: "sticky", top: 0, zIndex: 20 }}>
        <Link href="/dashboard/billing" style={{ textDecoration: "none" }}>
          <button style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--bg)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--ink-2)" }}>
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        </Link>

        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, font: "800 18px var(--sans)", letterSpacing: "-.01em" }}>
            Bill · Table {tableLabel}
          </h1>
          <p style={{ margin: 0, font: "500 12px var(--sans)", color: "var(--muted)" }}>
            {guestCount} guests · Seated {seatedMinutes} min ago
          </p>
        </div>

        <button style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", border: "1px solid var(--hairline)", borderRadius: 12, background: "var(--surface)", font: "600 13px var(--sans)", cursor: "pointer", color: "var(--ink-2)" }}>
          <Printer size={15} /> Print KOT copy
        </button>

        <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", background: "var(--brand)", color: "#fff", border: 0, borderRadius: 12, font: "700 14px var(--sans)", cursor: "pointer", boxShadow: "var(--sh-coral)" }}>
          <Send size={15} /> WhatsApp invoice
        </button>
      </div>

      {/* ── BODY: two columns ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 0, maxHeight: "calc(100vh - 65px)", overflow: "hidden" }}>

        {/* ──── LEFT: Bill document ──── */}
        <div style={{ overflowY: "auto", padding: 28 }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            {/* Bill header card */}
            <div style={{ background: "#14131A", borderRadius: 20, padding: "24px 28px 28px", marginBottom: 24, color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ font: "600 10px var(--sans)", color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".1em" }}>BILL NO.</div>
                  <div style={{ font: "800 15px var(--sans)", marginTop: 2, letterSpacing: "-.01em" }}>{bill.bill_number ?? `BILL-2026-${Math.floor(Math.random() * 9000 + 1000)}`}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ font: "600 10px var(--sans)", color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".1em" }}>GSTIN</div>
                  <div style={{ font: "700 13px var(--mono)", marginTop: 2, letterSpacing: ".04em" }}>{restaurantGstin}</div>
                </div>
              </div>
              <div style={{ font: "800 42px var(--sans)", letterSpacing: "-.03em", lineHeight: 1 }}>
                Total <span style={{ color: "var(--brand)" }}>{fmt(grandTotal)}</span>
              </div>
              <div style={{ font: "500 13px var(--sans)", color: "rgba(255,255,255,.5)", marginTop: 8 }}>
                {restaurantName} · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </div>
            </div>

            {/* Items table */}
            <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--hairline)", overflow: "hidden", marginBottom: 24 }}>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 100px", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--hairline)", font: "700 11px var(--sans)", color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                <div>QTY</div><div>ITEM</div><div style={{ textAlign: "right" }}>RATE</div><div style={{ textAlign: "right" }}>TOTAL</div>
              </div>

              {bill.order.items.map((item, idx) => {
                const lineTotal = Number(item.item_price) * item.quantity;
                return (
                  <div key={item.id}
                    style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 100px", gap: 12, padding: "14px 20px", borderBottom: idx < bill.order.items.length - 1 ? "1px solid var(--hairline)" : "none", alignItems: "center" }}>
                    <div style={{ font: "600 13px var(--sans)", color: "var(--muted)" }}>×{item.quantity}</div>
                    <div>
                      <div style={{ font: "600 14px var(--sans)", color: "var(--ink)" }}>{item.item_name}</div>
                      {item.customizations && (
                        <div style={{ font: "500 11.5px var(--sans)", color: "var(--muted)", marginTop: 2 }}>{item.customizations}</div>
                      )}
                    </div>
                    <div style={{ font: "500 13px var(--sans)", color: "var(--muted)", textAlign: "right" }}>{fmt(Number(item.item_price))}</div>
                    <div style={{ font: "700 14px var(--sans)", textAlign: "right" }}>{fmt(lineTotal)}</div>
                  </div>
                );
              })}
            </div>

            {/* Bill summary */}
            <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--hairline)", padding: "16px 20px" }}>
              {[
                { label: "Subtotal", value: fmt(bill.subtotal), color: "var(--ink-2)", size: 14, weight: 500 },
                ...(bill.discount > 0 ? [{ label: `Discount · FOODIE20`, value: `−${fmt(bill.discount)}`, color: "var(--green)", size: 14, weight: 600 }] : []),
                { label: `CGST ${bill.cgst_rate ?? 2.5}%`, value: fmt(bill.cgst), color: "var(--muted)", size: 13, weight: 500 },
                { label: `SGST ${bill.sgst_rate ?? 2.5}%`, value: fmt(bill.sgst), color: "var(--muted)", size: 13, weight: 500 },
                ...(tipAmount > 0 ? [{ label: `Service tip (${tip === "custom" ? "custom" : `${tip}%`})`, value: fmt(tipAmount), color: "var(--muted)", size: 13, weight: 500 }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", font: `${row.weight} ${row.size}px var(--sans)`, color: row.color, borderBottom: "1px solid var(--hairline-2)" }}>
                  <span>{row.label}</span><span>{row.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0", font: "800 18px var(--sans)" }}>
                <span>Grand total</span>
                <span style={{ color: "var(--brand)" }}>{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ──── RIGHT: Payment panel ──── */}
        <div style={{ overflowY: "auto", borderLeft: "1px solid var(--hairline)", background: "var(--surface)", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: "24px 20px" }}>
            <h2 style={{ margin: "0 0 4px", font: "800 20px var(--sans)", letterSpacing: "-.01em" }}>Payment</h2>
            <p style={{ margin: "0 0 24px", font: "500 12.5px var(--sans)", color: "var(--muted)" }}>Pick method · choose split · add tip</p>

            {/* Payment methods */}
            <div style={{ font: "700 10px var(--sans)", color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Payment method</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {PAYMENT_METHODS.map(m => {
                const active = payMethod === m.key;
                return (
                  <button key={m.key} onClick={() => setPayMethod(m.key)}
                    style={{
                      padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                      border: `1.5px solid ${active ? "var(--brand)" : "var(--hairline)"}`,
                      background: active ? "var(--brand-tint)" : "var(--bg)",
                      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                      position: "relative", textAlign: "left",
                    }}>
                    {active && (
                      <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", background: "var(--brand)", display: "grid", placeItems: "center" }}>
                        <Check size={11} strokeWidth={3} color="#fff" />
                      </div>
                    )}
                    <div style={{ color: active ? "var(--brand)" : "var(--muted)" }}>{m.icon}</div>
                    <div style={{ font: "700 13px var(--sans)", color: "var(--ink)" }}>{m.label}</div>
                    <div style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>{m.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Split bill */}
            <div style={{ font: "700 10px var(--sans)", color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Split bill</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {([
                { key: "none",    label: "No split",    sub: "1 payment" },
                { key: "equal",   label: "Equal",       sub: `${guestCount} × ${fmt(Math.ceil(grandTotal / guestCount))}` },
                { key: "by_item", label: "By item",     sub: "Per guest" },
              ] as { key: SplitMode; label: string; sub: string }[]).map(s => (
                <button key={s.key} onClick={() => setSplit(s.key)}
                  style={{ flex: 1, padding: "10px 8px", borderRadius: 12, border: `1.5px solid ${split === s.key ? "var(--ink)" : "var(--hairline)"}`, background: split === s.key ? "var(--ink)" : "var(--bg)", color: split === s.key ? "#fff" : "var(--ink-2)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ font: "700 13px var(--sans)" }}>{s.label}</div>
                  <div style={{ font: "500 11px var(--sans)", color: split === s.key ? "rgba(255,255,255,.6)" : "var(--muted)", marginTop: 2 }}>{s.sub}</div>
                </button>
              ))}
            </div>

            {/* Tip */}
            <div style={{ font: "700 10px var(--sans)", color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Tip for the team</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
              {([0, 10, 15, 20, "custom"] as TipPercent[]).map(t => {
                const active = tip === t;
                return (
                  <button key={String(t)} onClick={() => setTip(t)}
                    style={{ flex: "1 1 60px", padding: "10px 8px", borderRadius: 12, border: `1.5px solid ${active ? "var(--brand)" : "var(--hairline)"}`, background: active ? "var(--brand)" : "var(--bg)", color: active ? "#fff" : "var(--ink-2)", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ font: "700 13px var(--sans)" }}>{t === "custom" ? "Custom" : `${t}%`}</div>
                    {t !== "custom" && t !== 0 && (
                      <div style={{ font: "500 11px var(--sans)", color: active ? "rgba(255,255,255,.7)" : "var(--muted)", marginTop: 2 }}>
                        {fmt(bill.subtotal * (t as number) / 100)}
                      </div>
                    )}
                    {t === 0 && <div style={{ font: "500 11px var(--sans)", color: active ? "rgba(255,255,255,.7)" : "var(--muted)", marginTop: 2 }}>No tip</div>}
                  </button>
                );
              })}
            </div>
            {tip === "custom" && (
              <input type="number" value={customTip} onChange={e => setCustomTip(e.target.value)}
                placeholder="Enter tip amount (₹)"
                style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, border: "1.5px solid var(--brand)", background: "var(--bg)", font: "600 13px var(--sans)", color: "var(--ink)", outline: "none", marginBottom: 24 }} />
            )}

            {/* QR for guest */}
            <div style={{ font: "700 10px var(--sans)", color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>QR for guest</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--bg)", borderRadius: 14, border: "1px solid var(--hairline)" }}>
              <div style={{ width: 48, height: 48, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--hairline)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <QrCode size={24} style={{ color: "var(--ink)" }} />
              </div>
              <div>
                <div style={{ font: "700 13px var(--sans)", color: "var(--ink)" }}>Scan to pay</div>
                <div style={{ font: "500 11.5px var(--sans)", color: "var(--muted)", marginTop: 2 }}>Or tap "Send invoice via WhatsApp" — guest can pay from phone.</div>
              </div>
            </div>
          </div>

          {/* Footer: Mark paid CTA */}
          <div style={{ padding: "16px 20px 24px", borderTop: "1px solid var(--hairline)", display: "flex", gap: 10 }}>
            <button style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--bg)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)", flexShrink: 0 }}>
              <Printer size={18} />
            </button>
            <motion.button
              onClick={markPaid}
              disabled={marking || marked}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 1, padding: "13px 16px", borderRadius: 12, border: 0,
                background: marked ? "var(--green)" : "var(--brand)",
                color: "#fff", font: "700 14px var(--sans)", cursor: marked ? "default" : "pointer",
                boxShadow: marked ? "0 8px 24px -8px rgba(30,158,94,.4)" : "var(--sh-coral)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              {marked ? (
                <><Check size={16} strokeWidth={3} /> Bill settled</>
              ) : (
                <><Check size={16} strokeWidth={2.5} /> Mark paid · {fmt(grandTotal)}</>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
