"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { QueryProvider } from "@/components/providers/QueryProvider";
import type { RestaurantTable, Bill } from "@/types";
import QRCode from "qrcode";
import {
  Bell,
  Copy,
  Download,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  X,
  Printer,
  UtensilsCrossed,
  Receipt,
  CheckCircle,
} from "lucide-react";
import { OrderStatusActions } from "@/components/orders/OrderStatusActions";

/* ─── Types ─────────────────────────────────────────────── */

type FloorStatus = "open" | "seated" | "ordering" | "bill_ready" | "cleaning";
type AreaFilter = "Indoor" | "Terrace" | "Bar";
type StatusFilter = "all" | FloorStatus;
type PanelMode = "add" | "edit" | "bill" | null;

interface LiveOrder {
  orderId: string;
  tableId: string;
  tableName: string;
  status: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  createdAt: string;
  updatedAt: string;
}

interface TableFloor {
  status: FloorStatus;
  activeOrders: LiveOrder[];
  seatedMinutes: number;
  itemCount: number;
  amount: number;
}

interface BillOrderItem {
  name: string;
  item_name: string;
  item_price: number;
  price: number;
  quantity: number;
}

interface BillOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  items: BillOrderItem[];
  bill: Bill | null;
}

interface Props { restaurantId: string; restaurantSlug: string }

/* ─── Helpers ─────────────────────────────────────────────── */

function deriveFloor(table: RestaurantTable, orders: LiveOrder[]): TableFloor {
  const tableOrders = orders.filter(
    o => o.tableId === table.id && !["served", "cancelled"].includes(o.status)
  );

  if (table.status === "reserved") {
    return { status: "cleaning", activeOrders: [], seatedMinutes: 0, itemCount: 0, amount: 0 };
  }
  if (table.status === "available" || tableOrders.length === 0) {
    return { status: "open", activeOrders: [], seatedMinutes: 0, itemCount: 0, amount: 0 };
  }

  const earliest = tableOrders.reduce((m, o) =>
    new Date(o.createdAt).getTime() < new Date(m.createdAt).getTime() ? o : m
  );
  const seatedMinutes = Math.floor((Date.now() - new Date(earliest.createdAt).getTime()) / 60000);
  const itemCount = tableOrders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0);
  const amount = tableOrders.reduce(
    (s, o) => s + o.items.reduce((si, i) => si + i.price * i.quantity, 0),
    0
  );

  const hasPending = tableOrders.some(o => o.status === "pending");
  const status: FloorStatus = hasPending ? "ordering" : "seated";
  return { status, activeOrders: tableOrders, seatedMinutes, itemCount, amount };
}

function elapsedLabel(mins: number): string {
  if (mins < 1) return "Just seated";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

async function buildQRDataUrl(url: string) {
  return QRCode.toDataURL(url, { width: 260, margin: 2, color: { dark: "#14131A", light: "#FFFFFF" } });
}

/* ─── Status metadata ─────────────────────────────────────── */

const STATUS_META: Record<FloorStatus, {
  label: string; color: string; bg: string; border: string;
  cardBg: string; cardBorder: string; iconColor: string;
}> = {
  open: {
    label: "AVAILABLE", color: "#1E9E5E", bg: "var(--green-soft)", border: "rgba(30,158,94,.25)",
    cardBg: "var(--green-soft)", cardBorder: "rgba(30,158,94,.25)", iconColor: "#1E9E5E",
  },
  seated: {
    label: "OCCUPIED", color: "#F2A500", bg: "var(--amber-soft)", border: "rgba(242,165,0,.30)",
    cardBg: "var(--amber-soft)", cardBorder: "rgba(242,165,0,.30)", iconColor: "#F2A500",
  },
  ordering: {
    label: "ORDERING", color: "#F2A500", bg: "var(--amber-soft)", border: "rgba(242,165,0,.30)",
    cardBg: "var(--amber-soft)", cardBorder: "rgba(242,165,0,.30)", iconColor: "#F2A500",
  },
  bill_ready: {
    label: "BILL READY", color: "var(--brand)", bg: "var(--brand-soft)", border: "rgba(255,77,61,.30)",
    cardBg: "var(--brand-soft)", cardBorder: "rgba(255,77,61,.30)", iconColor: "var(--brand)",
  },
  cleaning: {
    label: "RESERVED", color: "#2E6EF7", bg: "rgba(46,110,247,.07)", border: "rgba(46,110,247,.20)",
    cardBg: "rgba(46,110,247,.07)", cardBorder: "rgba(46,110,247,.20)", iconColor: "#2E6EF7",
  },
};

/* ─── Premium Table Card ──────────────────────────────────── */

function PremiumTableCard({
  table, floor, onOpenQR, onDelete, onRegen, onViewBill,
  confirmDelete, confirmRegen, setConfirmDelete, setConfirmRegen,
}: {
  table: RestaurantTable;
  floor: TableFloor;
  onOpenQR: () => void;
  onDelete: () => void;
  onRegen: () => void;
  onViewBill: () => void;
  confirmDelete: boolean;
  confirmRegen: boolean;
  setConfirmDelete: (v: boolean) => void;
  setConfirmRegen: (v: boolean) => void;
}) {
  const meta = STATUS_META[floor.status];
  const isOccupied = floor.status === "seated" || floor.status === "ordering" || floor.status === "bill_ready";
  const tableLabel = table.table_number.startsWith("T-")
    ? table.table_number.replace("T-", "")
    : table.table_number;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileHover={{ scale: 1.06, boxShadow: "0 12px 32px -8px rgba(20,19,26,.18)" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onViewBill}
      style={{
        width: 100,
        height: 100,
        borderRadius: 16,
        background: meta.cardBg,
        border: `2px solid ${meta.cardBorder}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        cursor: "pointer",
        boxShadow: "var(--sh-1)",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* QR icon – top right */}
      <button
        onClick={e => { e.stopPropagation(); onOpenQR(); }}
        title="View QR code"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: 6,
          border: 0,
          background: "rgba(255,255,255,.55)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          color: meta.iconColor,
          backdropFilter: "blur(4px)",
          padding: 0,
        }}
      >
        <QrCode size={12} />
      </button>

      {/* Table icon */}
      <UtensilsCrossed size={18} color={meta.iconColor} style={{ opacity: 0.7, marginBottom: 4 }} />

      {/* Table number */}
      <div style={{
        fontFamily: "var(--sans)",
        fontWeight: 900,
        fontSize: 24,
        letterSpacing: "-.03em",
        lineHeight: 1,
        color: "var(--ink)",
      }}>
        {tableLabel}
      </div>

      {/* Status label */}
      <div style={{
        marginTop: 4,
        fontFamily: "var(--sans)",
        fontWeight: 700,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: ".07em",
        color: meta.color,
      }}>
        {meta.label}
      </div>

      {/* View Bill – bottom overlay for occupied tables */}
      {isOccupied && (
        <button
          onClick={e => { e.stopPropagation(); onViewBill(); }}
          title="View bill"
          style={{
            position: "absolute",
            bottom: 5,
            left: 5,
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "2px 6px",
            borderRadius: 6,
            border: 0,
            background: "rgba(255,255,255,.6)",
            color: "var(--ink-2)",
            fontFamily: "var(--sans)",
            fontSize: 9,
            fontWeight: 700,
            cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          <Receipt size={9} /> Bill
        </button>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            background: "rgba(224,58,48,.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span style={{ color: "#fff", fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700 }}>Delete?</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ padding: "3px 8px", borderRadius: 6, border: 0, background: "#fff", color: "var(--red)", fontFamily: "var(--sans)", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
              Yes
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,.4)", background: "transparent", color: "#fff", fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              No
            </button>
          </div>
        </motion.div>
      )}

      {/* Regen confirm */}
      {confirmRegen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            background: "rgba(20,19,26,.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span style={{ color: "#fff", fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700 }}>Regen QR?</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={e => { e.stopPropagation(); onRegen(); }}
              style={{ padding: "3px 8px", borderRadius: 6, border: 0, background: "var(--brand)", color: "#fff", fontFamily: "var(--sans)", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
              Yes
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirmRegen(false); }}
              style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "#fff", fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              No
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── QR Modal ─────────────────────────────────────────────── */

function QRModal({
  table, restaurantSlug, onClose,
}: {
  table: RestaurantTable;
  restaurantSlug: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const menuUrl = typeof window !== "undefined"
    ? `${window.location.origin}/m/${restaurantSlug}?t=${table.qr_token}`
    : "";

  useEffect(() => {
    buildQRDataUrl(menuUrl).then(setDataUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.qr_token]);

  function handleCopy() {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-${table.table_number}.png`;
    a.click();
  }

  function handlePrint() {
    if (!dataUrl) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><body style="text-align:center;padding:40px;font-family:sans-serif;">
        <h2>Table ${table.table_number}</h2>
        <img src="${dataUrl}" style="width:280px;height:280px;" />
        <p style="font-size:12px;color:#666;margin-top:16px;">${menuUrl}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  const SPRING = { type: "spring" as const, stiffness: 380, damping: 30 };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,.6)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={SPRING}
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: 24,
          padding: 28,
          width: "100%",
          maxWidth: 360,
          boxShadow: "var(--sh-3)",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 32, height: 32, borderRadius: "50%",
            border: "1px solid var(--hairline)", background: "var(--bg)",
            display: "grid", placeItems: "center", cursor: "pointer",
            color: "var(--muted)",
          }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <h3 style={{ margin: "0 0 2px", fontFamily: "var(--display)", fontSize: 22, fontWeight: 400, color: "var(--ink)" }}>
          Table {table.table_number}
        </h3>
        <p style={{ margin: "0 0 20px", fontFamily: "var(--sans)", fontSize: 12, color: "var(--muted)" }}>
          {table.capacity} seats · Scan to order
        </p>

        {/* QR image */}
        <div style={{
          background: "var(--bg)", borderRadius: 20, padding: 16,
          display: "inline-block", boxShadow: "var(--sh-1)", marginBottom: 16,
        }}>
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR code" style={{ width: 200, height: 200, display: "block" }} />
          ) : (
            <div style={{ width: 200, height: 200, background: "var(--surface-2)", borderRadius: 12, display: "grid", placeItems: "center" }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--muted)" }}>Generating…</div>
            </div>
          )}
        </div>

        {/* URL */}
        <p style={{
          margin: "0 0 20px",
          fontFamily: "var(--sans)", fontSize: 11, color: "var(--muted-2)",
          wordBreak: "break-all",
        }}>
          {menuUrl}
        </p>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1, padding: "11px 0",
              borderRadius: 999,
              border: `1.5px solid ${copied ? "var(--green)" : "var(--hairline)"}`,
              background: copied ? "var(--green-soft)" : "var(--surface)",
              color: copied ? "var(--green)" : "var(--ink-2)",
              fontFamily: "var(--sans)", fontWeight: 700, fontSize: 13,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Copy size={13} /> {copied ? "Copied!" : "Copy link"}
          </button>

          <button
            onClick={handleDownload}
            style={{
              flex: 1, padding: "11px 0",
              borderRadius: 999, border: 0,
              background: "var(--brand)", color: "#fff",
              fontFamily: "var(--sans)", fontWeight: 700, fontSize: 13,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "var(--sh-coral)",
            }}
          >
            <Download size={13} /> Download
          </button>

          <button
            onClick={handlePrint}
            style={{
              padding: "11px 14px",
              borderRadius: 999,
              border: "1.5px solid var(--hairline)",
              background: "var(--surface)",
              color: "var(--ink-2)",
              cursor: "pointer",
              display: "grid", placeItems: "center",
            }}
          >
            <Printer size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Slide Panel ──────────────────────────────────────────── */

function SlidePanel({
  open, onClose, children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(0,0,0,.4)",
              backdropFilter: "blur(3px)",
            }}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            style={{
              position: "fixed", right: 0, top: 0, bottom: 0, zIndex: 51,
              width: 400,
              background: "var(--surface)",
              boxShadow: "-8px 0 40px -8px rgba(20,19,26,.18)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Add/Edit Table Panel ─────────────────────────────────── */

function TableFormPanel({
  open,
  onClose,
  onSave,
  onDelete,
  editTable,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { table_number: string; capacity: number; section: string }) => void;
  onDelete?: () => void;
  editTable: RestaurantTable | null;
  saving: boolean;
}) {
  const [tableNum, setTableNum] = useState(editTable?.table_number ?? "");
  const [capacity, setCapacity] = useState(String(editTable?.capacity ?? 4));
  const [section, setSection] = useState("Indoor");
  const [confirmDel, setConfirmDel] = useState(false);

  // Sync fields when editTable changes
  useEffect(() => {
    setTableNum(editTable?.table_number ?? "");
    setCapacity(String(editTable?.capacity ?? 4));
    setConfirmDel(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTable?.id]);

  const isEdit = !!editTable;
  const title = isEdit ? `Edit Table ${editTable.table_number}` : "Add Table";

  return (
    <SlidePanel open={open} onClose={onClose}>
      {/* Header */}
      <div style={{
        padding: "24px 24px 20px",
        borderBottom: "1px solid var(--hairline)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <h2 style={{
          margin: 0,
          fontFamily: "var(--display)",
          fontSize: 22,
          fontWeight: 400,
          color: "var(--ink)",
        }}>
          {title}
        </h2>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "1px solid var(--hairline)", background: "var(--bg)",
            display: "grid", placeItems: "center", cursor: "pointer",
            color: "var(--muted)",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Table number */}
        <div style={{ position: "relative" }}>
          <label style={{
            position: "absolute", top: tableNum ? 8 : "50%", left: 16,
            transform: tableNum ? "none" : "translateY(-50%)",
            transition: "all .18s ease",
            fontFamily: "var(--sans)",
            fontSize: tableNum ? 10 : 14,
            fontWeight: tableNum ? 700 : 500,
            color: "var(--muted)",
            textTransform: tableNum ? "uppercase" : "none",
            letterSpacing: tableNum ? ".07em" : "normal",
            pointerEvents: "none",
          }}>
            Table number / name
          </label>
          <input
            type="text"
            value={tableNum}
            onChange={e => setTableNum(e.target.value)}
            placeholder=""
            autoFocus
            style={{
              width: "100%",
              boxSizing: "border-box",
              paddingTop: tableNum ? 22 : 14,
              paddingBottom: tableNum ? 10 : 14,
              paddingLeft: 16,
              paddingRight: 16,
              borderRadius: 999,
              border: "1.5px solid var(--hairline)",
              fontFamily: "var(--sans)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--ink)",
              outline: "none",
              background: "var(--bg)",
              transition: "border-color .18s",
            }}
            onFocus={e => { e.target.style.borderColor = "var(--brand)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--hairline)"; }}
          />
        </div>

        {/* Capacity */}
        <div>
          <div style={{
            fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700,
            color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em",
            marginBottom: 10,
          }}>
            Capacity
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[2, 4, 6, 8, 10].map(c => (
              <button
                key={c}
                onClick={() => setCapacity(String(c))}
                style={{
                  flex: 1, padding: "10px 0",
                  borderRadius: 999,
                  border: `1.5px solid ${capacity === String(c) ? "var(--ink)" : "var(--hairline)"}`,
                  background: capacity === String(c) ? "var(--ink)" : "var(--surface)",
                  color: capacity === String(c) ? "#fff" : "var(--ink-2)",
                  fontFamily: "var(--sans)", fontWeight: 700, fontSize: 14,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Section */}
        <div>
          <div style={{
            fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700,
            color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em",
            marginBottom: 10,
          }}>
            Section
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Indoor", "Terrace", "Bar"].map(s => (
              <button
                key={s}
                onClick={() => setSection(s)}
                style={{
                  flex: 1, padding: "10px 0",
                  borderRadius: 999,
                  border: `1.5px solid ${section === s ? "var(--brand)" : "var(--hairline)"}`,
                  background: section === s ? "var(--brand-soft)" : "var(--surface)",
                  color: section === s ? "var(--brand)" : "var(--ink-2)",
                  fontFamily: "var(--sans)", fontWeight: 700, fontSize: 13,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "16px 24px 24px",
        borderTop: "1px solid var(--hairline)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        flexShrink: 0,
      }}>
        <button
          onClick={() => onSave({ table_number: tableNum, capacity: parseInt(capacity), section })}
          disabled={!tableNum || saving}
          style={{
            padding: "14px 0",
            borderRadius: 999,
            border: 0,
            background: "var(--brand)",
            color: "#fff",
            fontFamily: "var(--sans)", fontWeight: 700, fontSize: 15,
            cursor: !tableNum ? "not-allowed" : "pointer",
            opacity: !tableNum ? 0.5 : 1,
            boxShadow: "var(--sh-coral)",
          }}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create & Generate QR"}
        </button>

        {isEdit && onDelete && (
          confirmDel ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onDelete}
                style={{
                  flex: 1, padding: "12px 0",
                  borderRadius: 999,
                  border: 0,
                  background: "var(--red)", color: "#fff",
                  fontFamily: "var(--sans)", fontWeight: 700, fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                style={{
                  padding: "12px 20px",
                  borderRadius: 999,
                  border: "1px solid var(--hairline)",
                  background: "var(--surface)", color: "var(--muted)",
                  fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              style={{
                padding: "12px 0",
                borderRadius: 999,
                border: "1.5px solid rgba(224,58,48,.35)",
                background: "rgba(224,58,48,.05)",
                color: "var(--red)",
                fontFamily: "var(--sans)", fontWeight: 700, fontSize: 14,
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Trash2 size={14} /> Delete Table
              </span>
            </button>
          )
        )}
      </div>
    </SlidePanel>
  );
}

/* ─── Bill Panel ───────────────────────────────────────────── */

interface MenuItemBasic {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  category: { name: string };
}

function BillPanel({
  open,
  onClose,
  table,
}: {
  open: boolean;
  onClose: () => void;
  table: RestaurantTable | null;
}) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderCart, setOrderCart] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Fetch orders for this table from the admin orders API
  const { data: ordersData, isLoading: ordersLoading } = useQuery<BillOrder[]>({
    queryKey: ["table-orders", table?.id],
    enabled: open && !!table,
    queryFn: async () => {
      const res = await fetch(`/api/admin/orders?table_id=${table!.id}&status=active`);
      const json = await res.json() as { data?: BillOrder[] };
      return (json.data ?? []) as BillOrder[];
    },
    refetchInterval: open ? 15_000 : false,
  });

  // Fetch available menu items for new order form
  const { data: menuItemsData } = useQuery<MenuItemBasic[]>({
    queryKey: ["menu-items-basic"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/menu/items");
      const json = await res.json() as { data?: MenuItemBasic[] };
      return (json.data ?? []).filter((m: MenuItemBasic) => m.is_available);
    },
    staleTime: 60_000,
  });
  const menuItems: MenuItemBasic[] = menuItemsData ?? [];

  const orders: BillOrder[] = ordersData ?? [];

  function cartAdd(item: MenuItemBasic) {
    setOrderCart(prev => {
      const idx = prev.findIndex(c => c.id === item.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function cartAdj(id: string, delta: number) {
    setOrderCart(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const qty = prev[idx].qty + delta;
      if (qty <= 0) return prev.filter(c => c.id !== id);
      const next = [...prev];
      next[idx] = { ...next[idx], qty };
      return next;
    });
  }

  async function submitOrder() {
    if (!table || orderCart.length === 0) return;
    setOrderSubmitting(true);
    setOrderError(null);
    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: table.id,
          items: orderCart.map(c => ({ menu_item_id: c.id, quantity: c.qty })),
        }),
      });
      if (!res.ok) {
        const j = await res.json() as { message?: string };
        throw new Error(j.message ?? "Failed to place order");
      }
      setOrderCart([]);
      setShowOrderForm(false);
      qc.invalidateQueries({ queryKey: ["table-orders", table.id] });
      qc.invalidateQueries({ queryKey: ["admin-orders-floor"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
    } catch (e: unknown) {
      setOrderError(e instanceof Error ? e.message : "Failed");
    } finally {
      setOrderSubmitting(false);
    }
  }

  async function handleOrderStatusChange(orderId: string, status: string, reason?: string) {
    await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(reason ? { cancellation_reason: reason } : {}) }),
    });
    qc.invalidateQueries({ queryKey: ["table-orders", table?.id] });
    qc.invalidateQueries({ queryKey: ["admin-orders-floor"] });
    qc.invalidateQueries({ queryKey: ["tables"] });
  }

  // Compute totals from order items
  const allItems = orders.flatMap(o => o.items);
  const subtotal = allItems.reduce((s, i) => s + i.item_price * i.quantity, 0);
  const cgstRate = 5;
  const sgstRate = 5;
  const cgst = (subtotal * cgstRate) / 100;
  const sgst = (subtotal * sgstRate) / 100;
  const total = subtotal + cgst + sgst;

  // Existing bill from first order that has one
  const existingBill = orders.find(o => o.bill)?.bill ?? null;

  async function handleGenerateBill() {
    if (!orders.length || !table) return;
    setGenerating(true);
    try {
      // Generate bill for each order that doesn't have one
      for (const order of orders.filter(o => !o.bill)) {
        await fetch("/api/admin/bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: order.id, discount_percent: 0, tip_amount: 0 }),
        });
      }
      qc.invalidateQueries({ queryKey: ["table-orders", table.id] });
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    const printContent = `
      <html><body style="font-family:monospace;padding:24px;max-width:320px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:16px;">
          <h2 style="margin:0;font-size:18px;">Table ${table?.table_number ?? ""}</h2>
          ${existingBill ? `<p style="margin:4px 0;font-size:13px;">Bill #${existingBill.bill_number ?? ""}</p>` : ""}
          <p style="margin:4px 0;font-size:11px;color:#666;">${new Date().toLocaleString("en-IN")}</p>
        </div>
        <div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:12px 0;margin-bottom:12px;">
          ${allItems.map(i => `
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;">
              <span>${i.item_name} × ${i.quantity}</span>
              <span>₹${(i.item_price * i.quantity).toFixed(2)}</span>
            </div>
          `).join("")}
        </div>
        <div style="font-size:13px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>CGST (5%)</span><span>₹${cgst.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>SGST (5%)</span><span>₹${sgst.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:15px;border-top:2px solid #333;padding-top:8px;"><span>TOTAL</span><span>₹${total.toFixed(2)}</span></div>
        </div>
        <div style="text-align:center;margin-top:20px;font-size:11px;color:#999;">Thank you for dining with us!</div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    win.print();
  }

  return (
    <SlidePanel open={open} onClose={onClose}>
      {/* Header */}
      <div style={{
        padding: "24px 24px 20px",
        borderBottom: "1px solid var(--hairline)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <h2 style={{
            margin: "0 0 2px",
            fontFamily: "var(--display)",
            fontSize: 22,
            fontWeight: 400,
            color: "var(--ink)",
          }}>
            Table {table?.table_number}
          </h2>
          <p style={{ margin: 0, fontFamily: "var(--sans)", fontSize: 12, color: "var(--muted)" }}>
            Active bill
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "1px solid var(--hairline)", background: "var(--bg)",
            display: "grid", placeItems: "center", cursor: "pointer",
            color: "var(--muted)",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body – receipt area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

        {/* ── Inline new order form ── */}
        {showOrderForm && (
          <div style={{ marginBottom: 20, border: "1.5px solid var(--hairline)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>Add Items</span>
              <button onClick={() => { setShowOrderForm(false); setOrderCart([]); setOrderError(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "grid", placeItems: "center" }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ padding: 12, maxHeight: 240, overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 6 }}>
                {menuItems.map(item => {
                  const inCart = orderCart.find(c => c.id === item.id);
                  return (
                    <button key={item.id} onClick={() => cartAdd(item)}
                      style={{
                        padding: "8px 10px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                        background: inCart ? "var(--brand-soft)" : "var(--bg)",
                        border: `1.5px solid ${inCart ? "rgba(255,77,61,.3)" : "var(--hairline)"}`,
                        transition: "all .12s",
                      }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 1 }}>{item.name}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, color: "var(--brand)" }}>₹{item.price}</div>
                      {inCart && <div style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700, color: "var(--brand)", marginTop: 2 }}>×{inCart.qty} added</div>}
                    </button>
                  );
                })}
              </div>
            </div>
            {orderCart.length > 0 && (
              <div style={{ padding: "10px 14px", borderTop: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: 6 }}>
                {orderCart.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)" }}>{c.name}</span>
                    <button onClick={() => cartAdj(c.id, -1)} style={{ width: 20, height: 20, borderRadius: 5, background: "var(--surface-2)", border: "1px solid var(--hairline)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-2)" }}><X size={9} /></button>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 800, minWidth: 14, textAlign: "center" }}>{c.qty}</span>
                    <button onClick={() => cartAdj(c.id, 1)} style={{ width: 20, height: 20, borderRadius: 5, background: "var(--surface-2)", border: "1px solid var(--hairline)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-2)" }}><Plus size={9} /></button>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, minWidth: 42, textAlign: "right" }}>₹{(c.price * c.qty).toFixed(0)}</span>
                  </div>
                ))}
                {orderError && <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--red)" }}>{orderError}</div>}
                <button onClick={submitOrder} disabled={orderSubmitting}
                  style={{
                    marginTop: 4, padding: "9px 0", borderRadius: 10, border: "none",
                    background: orderSubmitting ? "var(--surface-2)" : "var(--brand)", color: orderSubmitting ? "var(--muted)" : "#fff",
                    fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, cursor: orderSubmitting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                  <CheckCircle size={13} />
                  {orderSubmitting ? "Placing…" : `Place Order · ₹${orderCart.reduce((s,c) => s + c.price * c.qty, 0).toFixed(0)}`}
                </button>
              </div>
            )}
          </div>
        )}

        {ordersLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 40, borderRadius: 10, background: "var(--surface-2)", animation: "pulse 2s infinite" }} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <Receipt size={40} style={{ margin: "0 auto 12px", color: "var(--muted-2)" }} />
            <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--muted)", margin: 0 }}>
              No active orders for this table.
            </p>
            <button onClick={() => setShowOrderForm(true)}
              style={{ marginTop: 14, padding: "9px 20px", borderRadius: 999, border: "none", background: "var(--brand)", color: "#fff", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "var(--sh-coral)" }}>
              <Plus size={13} /> Place Order
            </button>
          </div>
        ) : (
          <div>
            {/* Bill header */}
            {existingBill && (
              <div style={{
                background: "var(--green-soft)",
                border: "1px solid rgba(30,158,94,.2)",
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0,
                }} />
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--green)" }}>
                  Bill #{existingBill.bill_number} generated
                </span>
              </div>
            )}

            {/* Order list */}
            {orders.map(order => (
              <div key={order.id} style={{ marginBottom: 20 }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 10,
                }}>
                  <div style={{
                    fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700,
                    color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".07em",
                  }}>
                    Order #{order.order_number}
                  </div>
                  <OrderStatusActions
                    orderId={order.id}
                    currentStatus={order.status as import("@/types").OrderStatus}
                    onStatusChange={async (id, status, reason) => {
                      await handleOrderStatusChange(id, status, reason);
                    }}
                    showCancel={false}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 6,
                          background: "var(--surface-2)",
                          display: "grid", placeItems: "center",
                          fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700,
                          color: "var(--muted)",
                        }}>
                          {item.quantity}
                        </span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>
                          {item.item_name}
                        </span>
                      </div>
                      <span style={{
                        fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)",
                      }}>
                        ₹{(item.item_price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Divider */}
            <div style={{
              borderTop: "1.5px dashed var(--hairline)",
              margin: "16px 0",
            }} />

            {/* Totals */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--muted)" }}>Subtotal</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--muted)" }}>CGST ({cgstRate}%)</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--muted)" }}>
                  ₹{cgst.toFixed(2)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--muted)" }}>SGST ({sgstRate}%)</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--muted)" }}>
                  ₹{sgst.toFixed(2)}
                </span>
              </div>

              {/* Total divider */}
              <div style={{ borderTop: "2px solid var(--ink)", marginTop: 4, paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontFamily: "var(--sans)", fontSize: 16, fontWeight: 800,
                    letterSpacing: "-.02em", color: "var(--ink)",
                  }}>
                    Total
                  </span>
                  <span style={{
                    fontFamily: "var(--sans)", fontSize: 20, fontWeight: 900,
                    letterSpacing: "-.03em", color: "var(--ink)",
                  }}>
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!ordersLoading && (
        <div style={{
          padding: "16px 24px 24px",
          borderTop: "1px solid var(--hairline)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flexShrink: 0,
        }}>
          {/* Place Order — always visible */}
          <button
            onClick={() => setShowOrderForm(v => !v)}
            style={{
              padding: "12px 0",
              borderRadius: 999,
              border: `1.5px solid ${showOrderForm ? "var(--hairline)" : "rgba(255,77,61,.35)"}`,
              background: showOrderForm ? "var(--surface-2)" : "var(--brand-soft)",
              color: showOrderForm ? "var(--muted)" : "var(--brand)",
              fontFamily: "var(--sans)", fontWeight: 700, fontSize: 14,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Plus size={14} /> {showOrderForm ? "Cancel New Order" : "Place Order"}
          </button>

          {orders.length > 0 && (
            <>
              {!existingBill && (
                <button
                  onClick={handleGenerateBill}
                  disabled={generating}
                  style={{
                    padding: "14px 0",
                    borderRadius: 999,
                    border: 0,
                    background: "var(--brand)",
                    color: "#fff",
                    fontFamily: "var(--sans)", fontWeight: 700, fontSize: 15,
                    cursor: generating ? "not-allowed" : "pointer",
                    opacity: generating ? 0.7 : 1,
                    boxShadow: "var(--sh-coral)",
                  }}
                >
                  {generating ? "Generating…" : "Generate Bill"}
                </button>
              )}
              <button
                onClick={handlePrint}
                style={{
                  padding: "12px 0",
                  borderRadius: 999,
                  border: "1.5px solid var(--hairline)",
                  background: "var(--surface)",
                  color: "var(--ink-2)",
                  fontFamily: "var(--sans)", fontWeight: 700, fontSize: 14,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <Printer size={14} /> Print Bill
              </button>
            </>
          )}
        </div>
      )}
    </SlidePanel>
  );
}

/* ─── Main Component ────────────────────────────────────────── */

function TablesManagerInner({ restaurantId, restaurantSlug }: Props) {
  const qc = useQueryClient();
  const [area, setArea] = useState<AreaFilter>("Indoor");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editTable, setEditTable] = useState<RestaurantTable | null>(null);
  const [billTable, setBillTable] = useState<RestaurantTable | null>(null);
  const [qrTable, setQrTable] = useState<RestaurantTable | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);
  const [lastSync] = useState(4);

  const { data: tables, isLoading: tablesLoading } = useQuery<RestaurantTable[]>({
    queryKey: ["tables", restaurantId],
    queryFn: () =>
      fetch("/api/tables").then(r => r.json()).then(r => (r.data ?? []) as RestaurantTable[]),
    refetchInterval: 30_000,
  });
  const tableList: RestaurantTable[] = tables ?? [];

  const { data: liveOrdersData } = useQuery<LiveOrder[]>({
    queryKey: ["admin-orders-floor", restaurantId],
    queryFn: () =>
      fetch("/api/admin/orders").then(r => r.json()).then(r =>
        ((r.data ?? []) as LiveOrder[]).filter(o => !["served", "cancelled"].includes(o.status))
      ),
    refetchInterval: 15_000,
  });
  const liveOrders: LiveOrder[] = liveOrdersData ?? [];

  const addTable = useMutation({
    mutationFn: async (data: { table_number: string; capacity: number }) => {
      setSaving(true);
      return fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables"] });
      setPanelMode(null);
    },
    onSettled: () => setSaving(false),
  });

  const updateTable = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { table_number?: string; capacity?: number } }) => {
      setSaving(true);
      return fetch(`/api/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables"] });
      setPanelMode(null);
      setEditTable(null);
    },
    onSettled: () => setSaving(false),
  });

  const deleteTable = useMutation({
    mutationFn: (id: string) => fetch(`/api/tables/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables"] });
      setPanelMode(null);
      setEditTable(null);
      setConfirmDelete(null);
    },
  });

  const regenQR = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate_qr: true }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables"] });
      setConfirmRegen(null);
    },
  });

  function handleSave(data: { table_number: string; capacity: number; section: string }) {
    if (editTable) {
      updateTable.mutate({ id: editTable.id, data: { table_number: data.table_number, capacity: data.capacity } });
    } else {
      addTable.mutate({ table_number: data.table_number, capacity: data.capacity });
    }
  }

  function openEdit(table: RestaurantTable) {
    setEditTable(table);
    setPanelMode("edit");
  }

  function openBill(table: RestaurantTable) {
    setBillTable(table);
    setPanelMode("bill");
  }

  const openQR = useCallback((table: RestaurantTable) => {
    setQrTable(table);
  }, []);

  // Floor state
  const floorData = useMemo(
    () => new Map(tableList.map(t => [t.id, deriveFloor(t, liveOrders)])),
    [tableList, liveOrders]
  );

  // Filtered tables
  const filteredTables = useMemo(() => {
    let list = tableList;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.table_number.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter(t => floorData.get(t.id)?.status === statusFilter);
    }
    return list;
  }, [tableList, search, statusFilter, floorData]);

  // KPIs
  const totalTables = tableList.length;
  const available   = tableList.filter(t => floorData.get(t.id)?.status === "open").length;
  const occupied    = tableList.filter(t => {
    const s = floorData.get(t.id)?.status;
    return s === "seated" || s === "ordering" || s === "bill_ready";
  }).length;
  const reserved    = tableList.filter(t => floorData.get(t.id)?.status === "cleaning").length;
  const ordering    = tableList.filter(t => floorData.get(t.id)?.status === "ordering").length;

  // Status counts
  const statusCounts: Record<StatusFilter, number> = {
    all:        tableList.length,
    open:       available,
    seated:     tableList.filter(t => floorData.get(t.id)?.status === "seated").length,
    ordering,
    bill_ready: tableList.filter(t => floorData.get(t.id)?.status === "bill_ready").length,
    cleaning:   reserved,
  };

  const SPRING = { type: "spring" as const, stiffness: 350, damping: 30 };

  return (
    <div style={{ fontFamily: "var(--sans)", color: "var(--ink)" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            margin: 0,
            fontFamily: "var(--display)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "-.01em",
            color: "var(--ink)",
          }}>
            Floor Plan
          </h1>
          <p style={{ margin: "3px 0 0", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>
            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
            {" · "}
            {occupied} of {totalTables} occupied
            {ordering > 0 ? ` · ${ordering} ordering` : ""}
          </p>
        </div>

        {/* Area tabs */}
        <div style={{
          display: "inline-flex",
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: 12,
          padding: 4, gap: 2,
        }}>
          {(["Indoor", "Terrace", "Bar"] as AreaFilter[]).map(a => (
            <button key={a} onClick={() => setArea(a)}
              style={{
                padding: "7px 14px", borderRadius: 9, border: 0,
                fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600,
                cursor: "pointer",
                background: area === a ? "var(--ink)" : "transparent",
                color: area === a ? "#fff" : "var(--muted)",
              }}>
              {a}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--surface)", border: "1px solid var(--hairline)",
          borderRadius: 12, padding: "9px 14px", width: 220,
        }}>
          <Search size={14} style={{ color: "var(--muted-2)", flexShrink: 0 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Find table…"
            style={{
              flex: 1, border: 0, outline: 0, background: "transparent",
              fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
              color: "var(--ink)",
            }}
          />
        </div>

        {/* Bell */}
        <button style={{
          width: 40, height: 40, borderRadius: 12,
          border: "1px solid var(--hairline)", background: "var(--surface)",
          display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)",
        }}>
          <Bell size={16} strokeWidth={2} />
        </button>

        {/* Add table */}
        <button
          onClick={() => { setEditTable(null); setPanelMode("add"); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 16px",
            background: "var(--brand)", color: "#fff",
            borderRadius: 12, border: 0,
            fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700,
            cursor: "pointer",
            boxShadow: "var(--sh-coral)",
          }}
        >
          <Plus size={14} /> Add table
        </button>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total Tables",  value: totalTables, color: "var(--ink)" },
          { label: "Available",     value: available,   color: "var(--green)" },
          { label: "Occupied",      value: occupied,    color: "#F2A500" },
          { label: "Reserved",      value: reserved,    color: "#2E6EF7" },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: "var(--surface)",
            border: "1px solid var(--hairline)",
            borderRadius: 16,
            padding: "12px 16px",
            boxShadow: "var(--sh-1)",
            minWidth: 100,
          }}>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500,
              color: "var(--muted-2)", marginBottom: 4,
            }}>
              {kpi.label}
            </div>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 24, fontWeight: 800,
              letterSpacing: "-.03em", color: kpi.color,
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── STATUS FILTER BAR ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {([
          ["all", "All"],
          ["open", "Available"],
          ["seated", "Seated"],
          ["ordering", "Ordering"],
          ["bill_ready", "Bill ready"],
          ["cleaning", "Reserved"],
        ] as [StatusFilter, string][]).map(([key, label]) => {
          const count = statusCounts[key];
          const active = statusFilter === key;
          return (
            <button key={key} onClick={() => setStatusFilter(key)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 999,
                border: `1px solid ${active ? "var(--ink)" : "var(--hairline)"}`,
                background: active ? "var(--ink)" : "var(--surface)",
                fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 600,
                cursor: "pointer",
                color: active ? "#fff" : "var(--ink-2)",
              }}>
              {key !== "all" && (
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background:
                    key === "open" ? "var(--green)" :
                    key === "seated" || key === "ordering" ? "#F2A500" :
                    key === "bill_ready" ? "var(--brand)" :
                    "#2E6EF7",
                }} />
              )}
              {label}
              <span style={{
                fontFamily: "var(--sans)", fontSize: 11, fontWeight: 700,
                background: active ? "rgba(255,255,255,.18)" : "var(--bg)",
                color: active ? "#fff" : "var(--muted)",
                padding: "2px 7px", borderRadius: 999,
              }}>
                {count}
              </span>
            </button>
          );
        })}

        <div style={{
          marginLeft: "auto",
          fontFamily: "var(--sans)", fontSize: 12, color: "var(--muted)",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
          Last sync · {lastSync}s ago
        </div>
      </div>

      {/* ── FLOOR PLAN ── */}
      {tablesLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 14 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} style={{
              width: 100, height: 100, borderRadius: 16,
              background: "var(--surface-2)", animation: "pulse 2s infinite",
            }} />
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        /* ── EMPTY STATE ── */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          style={{
            textAlign: "center",
            padding: "80px 24px",
            border: "1.5px dashed var(--hairline)",
            borderRadius: 24,
            background: "var(--surface)",
          }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "var(--surface-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <UtensilsCrossed size={36} style={{ color: "var(--muted-2)" }} />
          </div>
          <h3 style={{
            margin: "0 0 8px",
            fontFamily: "var(--display)", fontSize: 28, fontWeight: 400,
            color: "var(--ink)",
          }}>
            No tables yet
          </h3>
          <p style={{
            margin: "0 0 24px",
            fontFamily: "var(--sans)", fontSize: 14, color: "var(--muted)",
            maxWidth: 320, marginLeft: "auto", marginRight: "auto",
          }}>
            Add your first table to start managing your restaurant floor
          </p>
          <button
            onClick={() => { setEditTable(null); setPanelMode("add"); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 28px",
              borderRadius: 999, border: 0,
              background: "var(--brand)", color: "#fff",
              fontFamily: "var(--sans)", fontSize: 15, fontWeight: 700,
              cursor: "pointer",
              boxShadow: "var(--sh-coral)",
            }}
          >
            <Plus size={18} /> Add Table
          </button>
        </motion.div>
      ) : (
        <>
          {/* Section heading */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{
              margin: 0,
              fontFamily: "var(--display)", fontSize: 18, fontWeight: 400,
              color: "var(--ink-2)",
            }}>
              Floor Plan{" "}
              <span style={{ color: "var(--muted)", fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500 }}>
                — {filteredTables.length} table{filteredTables.length !== 1 ? "s" : ""}
              </span>
            </h2>
          </div>

          {/* Table grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: 14,
          }}>
            <AnimatePresence mode="popLayout">
              {filteredTables.map(table => (
                <div
                  key={table.id}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                >
                  <PremiumTableCard
                    table={table}
                    floor={floorData.get(table.id) ?? deriveFloor(table, liveOrders)}
                    onOpenQR={() => openQR(table)}
                    onDelete={() => { deleteTable.mutate(table.id); }}
                    onRegen={() => { regenQR.mutate(table.id); }}
                    onViewBill={() => openBill(table)}
                    confirmDelete={confirmDelete === table.id}
                    confirmRegen={confirmRegen === table.id}
                    setConfirmDelete={v => setConfirmDelete(v ? table.id : null)}
                    setConfirmRegen={v => setConfirmRegen(v ? table.id : null)}
                  />

                  {/* Table action row below the card */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => openEdit(table)}
                      title="Edit table"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid var(--hairline)",
                        background: "var(--surface)",
                        fontFamily: "var(--sans)", fontSize: 10, fontWeight: 600,
                        color: "var(--muted)",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 3,
                      }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => setConfirmRegen(table.id)}
                      title="Regen QR"
                      style={{
                        width: 24, height: 24,
                        borderRadius: 999,
                        border: "1px solid var(--hairline)",
                        background: "var(--surface)",
                        display: "grid", placeItems: "center",
                        cursor: "pointer", color: "var(--muted)",
                      }}
                    >
                      <RefreshCw size={10} />
                    </button>

                    <button
                      onClick={() => setConfirmDelete(table.id)}
                      title="Delete table"
                      style={{
                        width: 24, height: 24,
                        borderRadius: 999,
                        border: "1px solid rgba(224,58,48,.2)",
                        background: "rgba(224,58,48,.06)",
                        display: "grid", placeItems: "center",
                        cursor: "pointer", color: "var(--red)",
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* ── QR MODAL ── */}
      <AnimatePresence>
        {qrTable && (
          <QRModal
            table={qrTable}
            restaurantSlug={restaurantSlug}
            onClose={() => setQrTable(null)}
          />
        )}
      </AnimatePresence>

      {/* ── ADD / EDIT TABLE PANEL ── */}
      <TableFormPanel
        open={panelMode === "add" || panelMode === "edit"}
        onClose={() => { setPanelMode(null); setEditTable(null); }}
        onSave={handleSave}
        onDelete={editTable ? () => { deleteTable.mutate(editTable.id); } : undefined}
        editTable={editTable}
        saving={saving}
      />

      {/* ── BILL PANEL ── */}
      <BillPanel
        open={panelMode === "bill"}
        onClose={() => { setPanelMode(null); setBillTable(null); }}
        table={billTable}
      />
    </div>
  );
}

export function TablesManager(props: Props) {
  return <QueryProvider><TablesManagerInner {...props} /></QueryProvider>;
}
