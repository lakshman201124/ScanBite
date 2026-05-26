"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Printer, X } from "lucide-react";
import { OrderDetailModal } from "./OrderDetailModal";
import { OrderStatusActions } from "./OrderStatusActions";
import type { OrderStatus } from "@/types";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface AdminOrder {
  orderId: string;
  orderNumber: string;
  tableId: string;
  tableName: string;
  items: OrderItem[];
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  cancellationReason?: string;
}

interface Props {
  order: AdminOrder;
  onStatusChange: (orderId: string, newStatus: OrderStatus, reason?: string) => Promise<void>;
}

/* ─── elapsed helpers ─── */

function elapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function elapsedLabel(createdAt: string): {
  label: string;
  mins: number;
  isOverdue: boolean;
  isWarning: boolean;
  isUrgent: boolean; // > 20 min — red blink
} {
  const mins = elapsedMinutes(createdAt);
  const isUrgent  = mins > 20;
  const isOverdue = mins >= 20;
  const isWarning = mins >= 10 && mins < 20;
  const label = mins < 1 ? "just now" : mins === 1 ? "1 min ago" : `${mins} min ago`;
  return { label, mins, isOverdue, isWarning, isUrgent };
}

/* ─── status config ─── */

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; topBorder: string }
> = {
  pending:   { label: "New",       color: "#2E6EF7",        bg: "#E8EFFF",             topBorder: "#2E6EF7" },
  confirmed: { label: "Confirmed", color: "var(--brand)",   bg: "var(--brand-soft)",   topBorder: "var(--brand)" },
  preparing: { label: "Preparing", color: "#9A6000",        bg: "var(--amber-soft)",   topBorder: "var(--amber)" },
  ready:     { label: "Ready",     color: "var(--green)",   bg: "var(--green-soft)",   topBorder: "var(--green)" },
  served:    { label: "Served",    color: "var(--muted)",   bg: "var(--surface-2)",    topBorder: "var(--hairline)" },
  cancelled: { label: "Cancelled", color: "var(--red)",     bg: "rgba(224,58,48,.08)", topBorder: "var(--red)" },
};

/* ─── table number extraction ─── */

function extractTableNumber(tableName: string): string {
  const match = tableName.match(/\d+/);
  return match ? match[0] : tableName;
}

/* ═══════════════════ PrintBillModal ═══════════════════ */

interface PrintBillModalProps {
  order: AdminOrder;
  onClose: () => void;
}

function PrintBillModal({ order, onClose }: PrintBillModalProps) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const gst      = subtotal * 0.05;
  const total    = subtotal + gst;
  const tableNum = extractTableNumber(order.tableName);

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print-only global styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #scanbite-bill-print { display: block !important; }
          #scanbite-bill-print { position: fixed; inset: 0; z-index: 99999; }
        }
        #scanbite-bill-print { display: none; }
      `}</style>

      {/* Screen modal backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,.45)",
          zIndex: 60,
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Screen modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 61,
          width: "min(380px, 92vw)",
          background: "var(--surface)",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(0,0,0,.22)",
          overflow: "hidden",
          fontFamily: "var(--sans)",
        }}
      >
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px", borderBottom: "1px solid var(--hairline)",
        }}>
          <div>
            <div style={{ font: "800 15px var(--sans)", color: "var(--ink)" }}>Print Bill</div>
            <div style={{ font: "500 11.5px var(--sans)", color: "var(--muted)", marginTop: 2 }}>
              {order.orderNumber} · Table {tableNum}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 9,
              border: "1px solid var(--hairline)", background: "var(--bg)",
              display: "grid", placeItems: "center",
              cursor: "pointer", color: "var(--muted)",
            }}
          >
            <X size={13} />
          </motion.button>
        </div>

        {/* Bill preview */}
        <div style={{ padding: "18px 20px" }}>
          {/* Thermal-receipt-style preview */}
          <div style={{
            background: "#FAFAF8",
            border: "1px solid var(--hairline)",
            borderRadius: 12,
            padding: "16px 14px",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            color: "#222",
          }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: "-.01em", fontFamily: "var(--sans)" }}>
                ScanBite
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                Thank you for dining with us
              </div>
              <div style={{ borderBottom: "1px dashed #ccc", margin: "8px 0" }} />
              <div style={{ fontSize: 11 }}>Table {tableNum}</div>
              <div style={{ fontSize: 11 }}>Order: {order.orderNumber}</div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                {new Date().toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit", hour12: true,
                })}
              </div>
            </div>

            <div style={{ borderBottom: "1px dashed #ccc", marginBottom: 8 }} />

            {/* Items */}
            {order.items.map((item, idx) => (
              <div key={idx} style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 4, alignItems: "flex-start",
              }}>
                <span style={{ flex: 1, paddingRight: 8, wordBreak: "break-word" }}>
                  {item.quantity}x {item.name}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}

            <div style={{ borderBottom: "1px dashed #ccc", margin: "8px 0" }} />

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span>Subtotal</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>₹{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11, color: "#555" }}>
              <span>GST (5%)</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>₹{gst.toFixed(2)}</span>
            </div>
            <div style={{ borderBottom: "1px dashed #ccc", margin: "6px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 14 }}>
              <span>TOTAL</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>₹{total.toFixed(2)}</span>
            </div>

            <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: "#888" }}>
              ···· Scan. Order. Enjoy. ····
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: "flex", gap: 8, padding: "0 20px 18px",
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "11px", borderRadius: 12,
              border: "1px solid var(--hairline)", background: "var(--bg)",
              font: "700 13px var(--sans)", cursor: "pointer", color: "var(--muted)",
            }}
          >
            Close
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handlePrint}
            style={{
              flex: 1, padding: "11px", borderRadius: 12,
              border: "none", background: "var(--ink)",
              font: "700 13px var(--sans)", cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            <Printer size={14} />
            Print
          </motion.button>
        </div>
      </motion.div>

      {/* Print-only bill — always in DOM, revealed via CSS on print */}
      <div id="scanbite-bill-print" aria-hidden="true" style={{
        background: "#fff",
        padding: 24,
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: 13,
        color: "#000",
        maxWidth: 320,
        margin: "0 auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 18, fontFamily: "sans-serif" }}>ScanBite</div>
          <div style={{ fontSize: 11 }}>Thank you for dining with us</div>
          <div style={{ borderBottom: "1px dashed #000", margin: "8px 0" }} />
          <div>Table {tableNum}</div>
          <div>Order: {order.orderNumber}</div>
          <div style={{ fontSize: 11 }}>
            {new Date().toLocaleString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit", hour12: true,
            })}
          </div>
        </div>
        <div style={{ borderBottom: "1px dashed #000", marginBottom: 8 }} />
        {order.items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>{item.quantity}x {item.name}</span>
            <span>₹{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ borderBottom: "1px dashed #000", margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
          <span>GST (5%)</span><span>₹{gst.toFixed(2)}</span>
        </div>
        <div style={{ borderBottom: "1px dashed #000", margin: "6px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 15 }}>
          <span>TOTAL</span><span>₹{total.toFixed(2)}</span>
        </div>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 10 }}>
          ···· Scan. Order. Enjoy. ····
        </div>
      </div>
    </>
  );
}

/* ═══════════════════ AdminOrderCard ═══════════════════ */

export function AdminOrderCard({ order, onStatusChange }: Props) {
  const [showDetail,   setShowDetail]   = useState(false);
  const [showBill,     setShowBill]     = useState(false);

  const { label: elapsed, isOverdue, isWarning, isUrgent } = elapsedLabel(order.createdAt);
  const subtotal  = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.served;
  const tableNum  = extractTableNumber(order.tableName);

  const canPrintBill = order.status === "ready" || order.status === "served";

  const topBorderColor = isOverdue
    ? "var(--red)"
    : isWarning
      ? "var(--amber)"
      : statusCfg.topBorder;

  /* time indicator color: < 10 min green, 10-20 amber, > 20 red */
  const timeColor = isUrgent
    ? "var(--red)"
    : isWarning
      ? "#9A6000"
      : "var(--green)";

  const timeBg = isUrgent
    ? "rgba(224,58,48,.09)"
    : isWarning
      ? "var(--amber-soft)"
      : "var(--green-soft)";

  const timeDotColor = isUrgent
    ? "var(--red)"
    : isWarning
      ? "var(--amber)"
      : "var(--green)";

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -1, boxShadow: "var(--sh-2)" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={() => setShowDetail(true)}
        style={{
          background: "var(--surface)",
          borderRadius: "var(--r-2)",
          border: "1px solid var(--hairline)",
          borderTop: `3px solid ${topBorderColor}`,
          cursor: "pointer",
          boxShadow: isOverdue
            ? "0 0 0 1.5px rgba(224,58,48,.18), var(--sh-1)"
            : "var(--sh-1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Overdue pulse outline */}
        {isOverdue && (
          <motion.div
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: -1,
              borderRadius: "var(--r-2)",
              border: "1.5px solid var(--red)",
              pointerEvents: "none",
            }}
          />
        )}

        <div style={{ padding: "11px 13px 12px" }}>
          {/* ── Top row ── */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 9,
          }}>
            {/* Left: avatar + order info */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `hsl(${(order.orderNumber.charCodeAt(order.orderNumber.length - 1) * 47) % 360}, 60%, 88%)`,
                color: `hsl(${(order.orderNumber.charCodeAt(order.orderNumber.length - 1) * 47) % 360}, 55%, 35%)`,
                display: "grid", placeItems: "center",
                font: "800 12px var(--sans)",
                flexShrink: 0, border: "2px solid var(--surface)",
              }}>
                T{tableNum.slice(-2)}
              </div>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 800, color: "var(--ink)",
                  fontFamily: "var(--mono)", letterSpacing: ".02em",
                }}>
                  {order.orderNumber}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--brand)", marginTop: 2 }}>
                  {order.tableName}
                </div>
              </div>
            </div>

            {/* Right: table badge + stats + status */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              {/* Prominent table pill */}
              <div style={{
                background: "var(--ink)",
                color: "#fff",
                fontSize: 10.5,
                fontWeight: 900,
                padding: "3px 9px",
                borderRadius: 999,
                letterSpacing: ".04em",
              }}>
                T-{tableNum}
              </div>

              {/* Items count + total */}
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}>
                <span>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ color: "var(--ink-2)" }}>₹{subtotal.toFixed(0)}</span>
              </div>

              {/* Status badge */}
              <div style={{
                fontSize: 9.5, fontWeight: 800,
                color: statusCfg.color, background: statusCfg.bg,
                padding: "2px 8px", borderRadius: 999,
                textTransform: "uppercase", letterSpacing: ".07em",
              }}>
                {statusCfg.label}
              </div>
            </div>
          </div>

          {/* ── Time elapsed indicator ── */}
          <div style={{ marginBottom: 9 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10.5,
              fontWeight: 700,
              color: timeColor,
              background: timeBg,
              padding: "3px 9px 3px 6px",
              borderRadius: 999,
            }}>
              {/* Blinking dot for urgent */}
              <span style={{
                width: 6, height: 6,
                borderRadius: "50%",
                background: timeDotColor,
                flexShrink: 0,
                animation: isUrgent ? "blink 1s ease-in-out infinite" : "none",
                display: "inline-block",
              }} />
              <Clock size={9} strokeWidth={2.5} />
              {elapsed}
            </div>
          </div>

          {/* ── Item list ── */}
          <div style={{ marginBottom: 9 }}>
            {order.items.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: 12, padding: "3px 0", color: "var(--ink-2)",
                  borderBottom: idx < Math.min(order.items.length, 3) - 1
                    ? "1px dashed var(--hairline)" : "none",
                }}
              >
                <span style={{
                  display: "flex", alignItems: "center", gap: 6,
                  minWidth: 0, flex: 1, marginRight: 8,
                }}>
                  <span style={{
                    background: "var(--bg)", color: "var(--ink-2)",
                    fontSize: 10, fontWeight: 800,
                    padding: "1px 5px", borderRadius: 5,
                    border: "1px solid var(--hairline)",
                    minWidth: 20, textAlign: "center", flexShrink: 0,
                  }}>
                    {item.quantity}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </span>
                </span>
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0, fontSize: 11.5 }}>
                  ₹{(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}

            {order.items.length > 3 && (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, fontWeight: 600 }}>
                +{order.items.length - 3} more item{order.items.length - 3 > 1 ? "s" : ""}
              </div>
            )}

            {order.notes && (
              <div style={{
                marginTop: 7, fontSize: 11, color: "#7A4D00",
                background: "var(--amber-soft)",
                padding: "4px 8px", borderRadius: 7, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{ fontSize: 11 }}>📝</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {order.notes}
                </span>
              </div>
            )}
          </div>

          {/* ── Footer: total + print bill + status actions ── */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderTop: "1px solid var(--hairline)", paddingTop: 9, gap: 8,
          }}>
            <span style={{
              fontWeight: 800, fontSize: 14, color: "var(--ink)",
              fontVariantNumeric: "tabular-nums",
            }}>
              ₹{subtotal.toFixed(0)}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
              {/* Print Bill button — only for ready / served */}
              {canPrintBill && (
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowBill(true)}
                  title="Print Bill"
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 11px", borderRadius: 8,
                    border: "1px solid var(--hairline)",
                    background: "var(--bg)",
                    font: "700 11px var(--sans)",
                    color: "var(--ink-2)",
                    cursor: "pointer",
                  }}
                >
                  <Printer size={11} strokeWidth={2} />
                  Bill
                </motion.button>
              )}

              <OrderStatusActions
                orderId={order.orderId}
                currentStatus={order.status as OrderStatus}
                onStatusChange={onStatusChange}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDetail && (
          <OrderDetailModal
            order={order}
            elapsed={elapsed}
            open={showDetail}
            onClose={() => setShowDetail(false)}
            onStatusChange={onStatusChange}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBill && (
          <PrintBillModal
            order={order}
            onClose={() => setShowBill(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
