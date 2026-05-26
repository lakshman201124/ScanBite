"use client";

import { useState } from "react";
import { usePrinter } from "@/hooks/usePrinter";

interface PrintButtonProps {
  orderId: string;
  orderNumber: string;
  type: "kot" | "bill";
  label?: string;
}

export function PrintButton({ orderId, orderNumber, type, label }: PrintButtonProps) {
  const [printing, setPrinting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { isSupported, printKOT, printBill, forgetPrinter, printerName } = usePrinter();

  if (!isSupported) {
    return (
      <span title="Printing not supported on this browser" style={{ fontSize: 11, color: "var(--muted)", cursor: "default" }}>
        🖨️ Not supported
      </span>
    );
  }

  async function handlePrint() {
    setPrinting(true);
    setStatus("idle");
    try {
      const res = await fetch(`/api/admin/bills?order_id=${orderId}`);
      if (type === "kot") {
        const orderRes = await fetch(`/api/admin/orders/${orderId}/status`);
        const orderData = await orderRes.json();
        if (!orderData.success) throw new Error("Order not found");
        const order = orderData.data;
        const ok = await printKOT({
          restaurant_name: "Restaurant",
          table_number: order.tableName?.replace("Table ", "") ?? "?",
          order_number: orderNumber,
          created_at: order.createdAt,
          items: order.items ?? [],
        });
        setStatus(ok ? "success" : "error");
      } else {
        const data = await res.json();
        if (!data.success || !data.data.bills?.length) {
          setStatus("error");
          return;
        }
        const bill = data.data.bills[0];
        const billRes = await fetch(`/api/admin/bills/${bill.id}`);
        const billData = await billRes.json();
        if (!billData.success) throw new Error("Bill not found");
        const b = billData.data;
        const ok = await printBill({
          restaurant_name: "Restaurant",
          table_number: b.order.table?.table_number ?? "?",
          order_number: b.order.order_number,
          bill_number: b.bill_number ?? b.id,
          created_at: b.created_at,
          bill: {
            items: b.order.items.map((i: { item_name: string; item_price: number; quantity: number }) => ({
              name: i.item_name,
              quantity: i.quantity,
              unit_price: Number(i.item_price),
              total: Number(i.item_price) * i.quantity,
            })),
            subtotal: Number(b.subtotal),
            discount_percent: 0,
            discount_amount: Number(b.discount),
            discounted_subtotal: Number(b.subtotal) - Number(b.discount),
            cgst_rate: Number(b.cgst_rate),
            sgst_rate: Number(b.sgst_rate),
            cgst_amount: Number(b.cgst),
            sgst_amount: Number(b.sgst),
            tax_total: Number(b.cgst) + Number(b.sgst),
            tip_amount: Number(b.tip),
            final_amount: Number(b.total),
          },
        });
        setStatus(ok ? "success" : "error");
      }
    } catch {
      setStatus("error");
    } finally {
      setPrinting(false);
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  const colors: Record<string, string> = { idle: "var(--surface)", success: "rgba(30,158,94,.1)", error: "rgba(224,58,48,.1)" };
  const textColors: Record<string, string> = { idle: "var(--ink)", success: "var(--green)", error: "var(--red)" };

  return (
    <button
      onClick={handlePrint}
      disabled={printing}
      title={printerName ? `Connected: ${printerName}` : "Click to select printer"}
      style={{
        padding: "7px 12px",
        borderRadius: 8,
        background: colors[status],
        border: "1px solid var(--hairline)",
        font: "600 12px var(--sans)",
        color: textColors[status],
        cursor: printing ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "background .2s",
      }}
    >
      {printing ? (
        <>
          <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
          Printing…
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          {status === "success" ? "Printed ✓" : status === "error" ? "Failed ✗" : (label ?? (type === "kot" ? "Print KOT" : "Print Bill"))}
        </>
      )}
    </button>
  );
}
