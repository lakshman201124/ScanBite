"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BillDetailModal } from "./BillDetailModal";
import { usePrinter } from "@/hooks/usePrinter";
import { Eye, Printer, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Bill {
  id: string;
  bill_number: string | null;
  total: number;
  is_printed: boolean;
  whatsapp_sent: boolean;
  email_sent: boolean;
  invoice_url: string | null;
  created_at: string;
  order: {
    order_number: string;
    payment_status: string;
    payment_method: string | null;
    table: { table_number: string } | null;
  };
}

interface Props {
  restaurantId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  paid:    { label: "Paid",    color: "var(--green)", bg: "var(--green-soft)",        border: "rgba(30,158,94,.2)" },
  unpaid:  { label: "Unpaid",  color: "var(--amber)", bg: "var(--amber-soft)",        border: "rgba(242,165,0,.25)" },
  refunded:{ label: "Refunded",color: "var(--blue)",  bg: "rgba(46,110,247,0.09)",    border: "rgba(46,110,247,.2)" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "var(--muted)", bg: "var(--surface-2)", border: "var(--hairline)" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "4px 10px",
      borderRadius: 999,
      font: "700 10px var(--sans)",
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      textTransform: "uppercase",
      letterSpacing: ".06em",
    }}>
      {cfg.label === "Paid" && (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 4l1.7 1.7L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {cfg.label}
    </span>
  );
}

function BillCard({ bill, onView, onPrint }: { bill: Bill; onView: () => void; onPrint: () => void }) {
  const time = new Date(bill.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const date = new Date(bill.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onClick={onView}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 16,
        alignItems: "center",
        padding: "14px 18px",
        background: "var(--surface)",
        border: "1px solid var(--hairline)",
        borderRadius: 14,
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(20,19,26,0.14)";
        el.style.boxShadow = "var(--sh-2)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--hairline)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Left: Bill # + Table badge */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
        <span style={{
          fontFamily: "var(--sans)",
          fontSize: 13,
          fontWeight: 800,
          color: "var(--ink)",
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: "'tnum'",
          letterSpacing: "-0.01em",
        }}>
          {bill.bill_number ?? bill.id.slice(0, 8).toUpperCase()}
        </span>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          borderRadius: 999,
          background: "var(--ink)",
          color: "#fff",
          font: "700 9px var(--sans)",
          letterSpacing: ".06em",
          width: "fit-content",
        }}>
          TABLE {bill.order.table?.table_number ?? "?"}
        </span>
      </div>

      {/* Center: Order info + timestamp */}
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "600 13px var(--sans)", color: "var(--ink)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {bill.order.order_number}
        </div>
        <div style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>
          {date} · {time}
          {bill.order.payment_method && (
            <span style={{ marginLeft: 6, textTransform: "capitalize" }}>
              · {bill.order.payment_method}
            </span>
          )}
        </div>
      </div>

      {/* Right: Total + Status */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        <span style={{
          fontFamily: "var(--sans)",
          fontSize: 20,
          fontWeight: 800,
          color: "var(--brand)",
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}>
          ₹{Number(bill.total).toFixed(2)}
        </span>
        <StatusBadge status={bill.order.payment_status} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onView}
          title="View"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "var(--surface-2)",
            border: "1px solid var(--hairline)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
            transition: "background 0.12s, color 0.12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ink)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
        >
          <Eye size={13} strokeWidth={2.2} />
        </button>
        <button
          onClick={onPrint}
          title="Print"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "var(--surface-2)",
            border: "1px solid var(--hairline)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
            transition: "background 0.12s, color 0.12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ink)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
        >
          <Printer size={13} strokeWidth={2.2} />
        </button>
        <a
          href={`/api/admin/bills/${bill.id}/invoice`}
          target="_blank"
          rel="noreferrer"
          title="PDF"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "var(--surface-2)",
            border: "1px solid var(--hairline)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
            textDecoration: "none",
            transition: "background 0.12s, color 0.12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--brand)"; (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)"; }}
          onClick={(e) => e.stopPropagation()}
        >
          <FileText size={13} strokeWidth={2.2} />
        </a>
      </div>
    </motion.div>
  );
}

export function BillsList({ restaurantId }: Props) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const { printBill } = usePrinter();

  const fetchBills = useCallback(async (p = 1, q = search, ps = paymentStatus) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("q", q);
      if (ps) params.set("payment_status", ps);
      const res = await fetch(`/api/admin/bills?${params}`);
      const data = await res.json();
      if (data.success) {
        setBills(data.data.bills);
        setTotalPages(data.data.pages);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }, [search, paymentStatus]);

  useEffect(() => { fetchBills(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePrint(billId: string) {
    const res = await fetch(`/api/admin/bills/${billId}`);
    const data = await res.json();
    if (!data.success) return;
    const bill = data.data;
    await printBill({
      bill_number: bill.bill_number ?? billId,
      restaurant_name: "Restaurant",
      table_number: bill.order.table?.table_number ?? "?",
      order_number: bill.order.order_number,
      bill: {
        items: bill.order.items.map((i: { item_name: string; item_price: number; quantity: number }) => ({
          name: i.item_name,
          quantity: i.quantity,
          unit_price: Number(i.item_price),
          total: Number(i.item_price) * i.quantity,
        })),
        subtotal: Number(bill.subtotal),
        discount_percent: 0,
        discount_amount: Number(bill.discount),
        discounted_subtotal: Number(bill.subtotal) - Number(bill.discount),
        cgst_rate: Number(bill.cgst_rate),
        sgst_rate: Number(bill.sgst_rate),
        cgst_amount: Number(bill.cgst),
        sgst_amount: Number(bill.sgst),
        tax_total: Number(bill.cgst) + Number(bill.sgst),
        tip_amount: Number(bill.tip),
        final_amount: Number(bill.total),
      },
      created_at: bill.created_at,
    });
  }

  return (
    <div>
      {/* Filters row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{
          flex: 1,
          minWidth: 200,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: 999,
          padding: "8px 14px",
          transition: "border-color 0.15s",
        }}
          onFocusCapture={(e) => (e.currentTarget.style.borderColor = "rgba(20,19,26,0.2)")}
          onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--hairline)")}
        >
          <Search size={13} color="var(--muted)" strokeWidth={2.2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchBills(1, search, paymentStatus)}
            placeholder="Search by bill number…"
            style={{
              flex: 1,
              border: 0,
              outline: "none",
              background: "transparent",
              font: "500 13px var(--sans)",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={paymentStatus}
          onChange={(e) => { setPaymentStatus(e.target.value); fetchBills(1, search, e.target.value); }}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid var(--hairline)",
            font: "600 12px var(--sans)",
            background: "var(--surface)",
            color: "var(--ink)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>

        {/* Search button */}
        <button
          onClick={() => fetchBills(1, search, paymentStatus)}
          style={{
            padding: "8px 20px",
            borderRadius: 999,
            background: "var(--brand)",
            color: "#fff",
            border: 0,
            font: "700 12px var(--sans)",
            cursor: "pointer",
            boxShadow: "var(--sh-coral)",
            letterSpacing: ".02em",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
        >
          Search
        </button>
      </div>

      {/* Bills list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 72, borderRadius: 14, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--surface-2)", display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 24 }}>
            🧾
          </div>
          <p style={{ margin: 0, font: "700 14px var(--sans)", color: "var(--ink)" }}>No bills found</p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)", font: "500 12px var(--sans)" }}>
            Bills appear here once generated for served orders.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                onView={() => setSelectedBill(bill as unknown as Parameters<typeof setSelectedBill>[0])}
                onPrint={() => handlePrint(bill.id)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 20 }}>
          <button
            onClick={() => fetchBills(page - 1)}
            disabled={page <= 1}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid var(--hairline)",
              background: "var(--surface)",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.35 : 1,
              display: "grid",
              placeItems: "center",
              color: "var(--ink)",
            }}
          >
            <ChevronLeft size={14} strokeWidth={2.2} />
          </button>
          <span style={{ font: "600 12px var(--sans)", color: "var(--muted)", padding: "0 8px" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchBills(page + 1)}
            disabled={page >= totalPages}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid var(--hairline)",
              background: "var(--surface)",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.35 : 1,
              display: "grid",
              placeItems: "center",
              color: "var(--ink)",
            }}
          >
            <ChevronRight size={14} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Detail modal */}
      <BillDetailModal
        bill={selectedBill as Parameters<typeof BillDetailModal>[0]["bill"]}
        onClose={() => setSelectedBill(null)}
        onPrint={handlePrint}
      />
    </div>
  );
}
