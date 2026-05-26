"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BillDetail {
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
  whatsapp_sent: boolean;
  email_sent: boolean;
  created_at: string;
  order: {
    order_number: string;
    payment_status: string;
    payment_method: string | null;
    table: { table_number: string } | null;
    items: Array<{ id: string; item_name: string; item_price: number; quantity: number }>;
  };
}

interface Props {
  bill: BillDetail | null;
  onClose: () => void;
  onPrint: (billId: string, type: "bill") => void;
}

export function BillDetailModal({ bill, onClose, onPrint }: Props) {
  const [sendChannel, setSendChannel] = useState<"whatsapp" | "email" | null>(null);
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  if (!bill) return null;

  async function sendInvoice() {
    if (!sendChannel || !recipient || !bill) return;
    setSending(true);
    setSendMsg("");
    try {
      const res = await fetch(`/api/admin/bills/${bill.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: sendChannel, recipient }),
      });
      const data = await res.json();
      setSendMsg(data.success ? "Sent successfully!" : data.error ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const subtotal = Number(bill.subtotal);
  const cgst = Number(bill.cgst);
  const sgst = Number(bill.sgst);
  const discount = Number(bill.discount);
  const tip = Number(bill.tip);
  const total = Number(bill.total);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          style={{ background: "var(--base)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, font: "800 18px var(--sans)", letterSpacing: "-.01em" }}>
                {bill.bill_number ?? `Bill ${bill.id.slice(0, 8)}`}
              </h2>
              <p style={{ margin: "3px 0 0", font: "500 12px var(--sans)", color: "var(--muted)" }}>
                {bill.order.order_number} · Table {bill.order.table?.table_number ?? "?"}
              </p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--hairline)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Status */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bill.order.payment_status === "paid" ? "rgba(30,158,94,.1)" : "rgba(242,165,0,.1)", color: bill.order.payment_status === "paid" ? "var(--green)" : "var(--amber)", textTransform: "uppercase", letterSpacing: ".06em" }}>
              {bill.order.payment_status}
            </span>
            {bill.order.payment_method && (
              <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--surface)", color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                {bill.order.payment_method}
              </span>
            )}
          </div>

          {/* Items */}
          <div style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            {bill.order.items.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--hairline)", fontSize: 13 }}>
                <span style={{ color: "var(--ink)" }}>{item.item_name} × {item.quantity}</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>₹{(Number(item.item_price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
            {[
              { l: "Subtotal", v: subtotal },
              discount > 0 && { l: "Discount", v: -discount },
              { l: `CGST @ ${bill.cgst_rate}%`, v: cgst },
              { l: `SGST @ ${bill.sgst_rate}%`, v: sgst },
              tip > 0 && { l: "Tip", v: tip },
            ].filter(Boolean).map((row) => {
              if (!row) return null;
              return (
                <div key={row.l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "var(--ink-2)" }}>
                  <span>{row.l}</span>
                  <span>{row.v < 0 ? "-" : ""}₹{Math.abs(row.v).toFixed(2)}</span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 5px", borderTop: "2px dashed var(--hairline)", marginTop: 6, fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>
              <span>TOTAL</span>
              <span style={{ color: "var(--brand)" }}>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              onClick={() => onPrint(bill.id, "bill")}
              style={{ flex: 1, minWidth: 120, padding: "10px 16px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--hairline)", font: "600 13px var(--sans)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Bill
            </button>
            <a
              href={`/api/admin/bills/${bill.id}/invoice`}
              target="_blank"
              rel="noreferrer"
              style={{ flex: 1, minWidth: 120, padding: "10px 16px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--hairline)", font: "600 13px var(--sans)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h6M9 11h3"/></svg>
              PDF Invoice
            </a>
          </div>

          {/* Send invoice */}
          <div style={{ background: "var(--surface)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ margin: "0 0 10px", font: "600 12px var(--sans)", color: "var(--ink-2)" }}>Send Invoice</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {(["whatsapp", "email"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSendChannel(ch)}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1.5px solid ${sendChannel === ch ? "var(--brand)" : "var(--hairline)"}`, background: sendChannel === ch ? "rgba(255,77,61,.08)" : "transparent", font: "600 12px var(--sans)", color: sendChannel === ch ? "var(--brand)" : "var(--muted)", cursor: "pointer", textTransform: "capitalize" }}
                >
                  {ch === "whatsapp" ? " WhatsApp" : "️ Email"}
                  {(ch === "whatsapp" ? bill.whatsapp_sent : bill.email_sent) && " "}
                </button>
              ))}
            </div>
            {sendChannel && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={sendChannel === "whatsapp" ? "Phone number (e.g. 9876543210)" : "Email address"}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--hairline)", font: "13px var(--sans)", background: "var(--base)", color: "var(--ink)", outline: "none" }}
                />
                <button
                  onClick={sendInvoice}
                  disabled={sending || !recipient}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "var(--brand)", color: "#fff", border: 0, font: "600 13px var(--sans)", cursor: sending ? "not-allowed" : "pointer", opacity: sending || !recipient ? 0.6 : 1 }}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            )}
            {sendMsg && <p style={{ margin: "8px 0 0", fontSize: 12, color: sendMsg.includes("success") ? "var(--green)" : "var(--red)" }}>{sendMsg}</p>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
