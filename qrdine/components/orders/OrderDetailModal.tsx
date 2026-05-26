"use client";

import { motion } from "framer-motion";
import { X, Clock, FileText, AlertCircle, MapPin } from "lucide-react";
import { OrderStatusActions } from "./OrderStatusActions";
import type { OrderStatus } from "@/types";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderDetailOrder {
  orderId: string;
  orderNumber: string;
  tableName: string;
  items: OrderItem[];
  notes: string | null;
  status: string;
  cancellationReason?: string;
}

interface Props {
  order: OrderDetailOrder;
  elapsed: string;
  open: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus, reason?: string) => Promise<void>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "New",       color: "#2E6EF7",        bg: "#E8EFFF" },
  confirmed: { label: "Confirmed", color: "var(--brand)",   bg: "var(--brand-soft)" },
  preparing: { label: "Preparing", color: "#9A6000",        bg: "var(--amber-soft)" },
  ready:     { label: "Ready",     color: "var(--green)",   bg: "var(--green-soft)" },
  served:    { label: "Served",    color: "var(--muted)",   bg: "var(--surface-2)" },
  cancelled: { label: "Cancelled", color: "var(--red)",     bg: "rgba(224,58,48,.08)" },
};

export function OrderDetailModal({ order, elapsed, open, onClose, onStatusChange }: Props) {
  if (!open) return null;

  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.served;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,19,26,.55)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        zIndex: 300,
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        style={{
          background: "var(--surface)",
          borderRadius: "var(--r-3)",
          width: "100%",
          maxWidth: 420,
          boxShadow: "var(--sh-3)",
          maxHeight: "85vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div
          style={{
            padding: "16px 18px 14px",
            borderBottom: "1px solid var(--hairline)",
            position: "sticky",
            top: 0,
            background: "var(--surface)",
            zIndex: 1,
            borderRadius: "var(--r-3) var(--r-3) 0 0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 800,
                  fontSize: 15.5,
                  color: "var(--ink)",
                  letterSpacing: ".02em",
                }}
              >
                {order.orderNumber}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 5,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    color: "var(--muted)",
                    fontWeight: 600,
                  }}
                >
                  <MapPin size={11} strokeWidth={2.5} />
                  {order.tableName}
                </span>
                <span style={{ color: "var(--hairline)", fontSize: 14 }}>·</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    color: "var(--muted)",
                    fontWeight: 600,
                  }}
                >
                  <Clock size={11} strokeWidth={2.5} />
                  {elapsed}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: statusCfg.color,
                  background: statusCfg.bg,
                  padding: "4px 10px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  whiteSpace: "nowrap",
                }}
              >
                {statusCfg.label}
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid var(--hairline)",
                  background: "var(--bg)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--muted)",
                  flexShrink: 0,
                }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px", flex: 1 }}>
          {/* Section label */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--muted-2)",
              textTransform: "uppercase",
              letterSpacing: ".09em",
              marginBottom: 10,
            }}
          >
            Order Items
          </div>

          {/* Item rows */}
          <div style={{ marginBottom: 14 }}>
            {order.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 0",
                  borderBottom:
                    idx < order.items.length - 1
                      ? "1px solid var(--hairline)"
                      : "none",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}
                >
                  <span
                    style={{
                      background: "var(--bg)",
                      color: "var(--ink-2)",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "2px 7px",
                      borderRadius: 7,
                      border: "1px solid var(--hairline)",
                      minWidth: 28,
                      textAlign: "center",
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.quantity}×
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--ink-2)",
                      fontSize: 13.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </span>
                </div>
                <span
                  style={{
                    fontWeight: 800,
                    color: "var(--ink)",
                    fontSize: 13.5,
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  ₹{(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          {/* Subtotal */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 14px",
              background: "var(--bg)",
              borderRadius: "var(--r-2)",
              marginBottom: order.notes || order.cancellationReason ? 12 : 0,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--muted)" }}>
              Subtotal
            </span>
            <span
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: "var(--ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ₹{subtotal.toFixed(0)}
            </span>
          </div>

          {/* Special instructions */}
          {order.notes && (
            <div
              style={{
                background: "var(--amber-soft)",
                borderRadius: "var(--r-2)",
                padding: "10px 13px",
                marginBottom: order.cancellationReason ? 10 : 0,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <FileText
                size={14}
                color="#9A6000"
                style={{ marginTop: 1, flexShrink: 0 }}
                strokeWidth={2}
              />
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#9A6000",
                    fontSize: 9.5,
                    textTransform: "uppercase",
                    letterSpacing: ".09em",
                    marginBottom: 3,
                  }}
                >
                  Special Instructions
                </div>
                <div style={{ fontSize: 13, color: "#7A4D00", fontWeight: 500, lineHeight: 1.4 }}>
                  {order.notes}
                </div>
              </div>
            </div>
          )}

          {/* Cancellation reason */}
          {order.cancellationReason && (
            <div
              style={{
                background: "rgba(224,58,48,.06)",
                borderRadius: "var(--r-2)",
                padding: "10px 13px",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <AlertCircle
                size={14}
                color="var(--red)"
                style={{ marginTop: 1, flexShrink: 0 }}
                strokeWidth={2}
              />
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--red)",
                    fontSize: 9.5,
                    textTransform: "uppercase",
                    letterSpacing: ".09em",
                    marginBottom: 3,
                  }}
                >
                  Cancellation Reason
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--red)", fontWeight: 500, lineHeight: 1.4 }}
                >
                  {order.cancellationReason}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer with actions */}
        <div
          style={{
            padding: "13px 18px 16px",
            borderTop: "1px solid var(--hairline)",
            position: "sticky",
            bottom: 0,
            background: "var(--surface)",
            borderRadius: "0 0 var(--r-3) var(--r-3)",
          }}
        >
          <OrderStatusActions
            orderId={order.orderId}
            currentStatus={order.status as OrderStatus}
            onStatusChange={async (id, status, reason) => {
              await onStatusChange(id, status, reason);
              onClose();
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
