"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, X, Loader2 } from "lucide-react";
import type { OrderStatus } from "@/types";

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "preparing", "ready"]);

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
  onStatusChange: (orderId: string, newStatus: OrderStatus, reason?: string) => Promise<void>;
  showCancel?: boolean;
}

export function OrderStatusActions({ orderId, currentStatus, onStatusChange, showCancel = true }: Props) {
  const [loading, setLoading] = useState<"served" | "cancelled" | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");

  if (!ACTIVE_STATUSES.has(currentStatus)) return null;

  async function handleServed() {
    setLoading("served");
    try {
      await onStatusChange(orderId, "served");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("cancelled");
    try {
      await onStatusChange(orderId, "cancelled", reason.trim() || "Rejected by restaurant");
      setShowRejectModal(false);
      setReason("");
    } finally {
      setLoading(null);
    }
  }

  function closeRejectModal() {
    if (loading) return;
    setShowRejectModal(false);
    setReason("");
  }

  return (
    <>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {/* Mark Served */}
        <motion.button
          disabled={!!loading}
          onClick={handleServed}
          whileTap={!loading ? { scale: 0.94 } : {}}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 700,
            background: "var(--green-soft)",
            color: "var(--green)",
            border: "1px solid rgba(30,158,94,.22)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading === "cancelled" ? 0.45 : 1,
            fontFamily: "var(--sans)",
            transition: "opacity .15s",
          }}
        >
          {loading === "served" ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-flex" }}
            >
              <Loader2 size={11} strokeWidth={2.5} />
            </motion.span>
          ) : (
            <CheckCircle size={11} strokeWidth={2} />
          )}
          {loading === "served" ? "Serving…" : "Mark Served"}
        </motion.button>

        {/* Cancel — subtle icon button, admin only */}
        {showCancel && (
          <motion.button
            disabled={!!loading}
            onClick={() => setShowRejectModal(true)}
            whileTap={!loading ? { scale: 0.94 } : {}}
            title="Cancel order"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "transparent",
              color: "var(--muted)",
              border: "1px solid var(--hairline)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading === "served" ? 0.45 : 1,
              transition: "color .15s, background .15s",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--red)";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(224,58,48,.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(224,58,48,.22)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--hairline)";
            }}
          >
            {loading === "cancelled" ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-flex" }}
              >
                <Loader2 size={11} strokeWidth={2.5} />
              </motion.span>
            ) : (
              <X size={11} strokeWidth={3} />
            )}
          </motion.button>
        )}
      </div>

      {showRejectModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,19,26,.52)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            zIndex: 400,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
          onClick={closeRejectModal}
        >
          <motion.div
            initial={{ scale: 0.93, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            style={{
              background: "var(--surface)",
              borderRadius: "var(--r-3)",
              padding: "22px 22px 20px",
              width: "100%",
              maxWidth: 360,
              boxShadow: "var(--sh-3)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(224,58,48,.1)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--red)",
                  flexShrink: 0,
                }}
              >
                <X size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>
                  Cancel Order?
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.4 }}>
                  The customer will be notified. Optionally explain why.
                </p>
              </div>
            </div>

            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Item unavailable, kitchen closing soon…"
              rows={3}
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--hairline)",
                fontSize: 13,
                fontFamily: "var(--sans)",
                resize: "vertical",
                outline: "none",
                color: "var(--ink)",
                background: "var(--bg)",
                lineHeight: 1.5,
                marginBottom: 14,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(224,58,48,.35)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--hairline)"; }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={closeRejectModal}
                disabled={!!loading}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 999,
                  border: "1px solid var(--hairline)",
                  background: "transparent",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--sans)",
                  color: "var(--ink-2)",
                }}
              >
                Keep Order
              </button>
              <button
                onClick={handleReject}
                disabled={!!loading}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 999,
                  background: "var(--red)",
                  color: "#fff",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--sans)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: loading ? 0.75 : 1,
                  transition: "opacity .15s",
                }}
              >
                {loading === "cancelled" ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      style={{ display: "inline-flex" }}
                    >
                      <Loader2 size={13} strokeWidth={2.5} />
                    </motion.span>
                    Cancelling…
                  </>
                ) : (
                  <>
                    <X size={13} strokeWidth={3} />
                    Cancel Order
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
