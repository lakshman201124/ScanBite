import type { BillResult } from "@/lib/billing";
import { CMD, buildBuffer, boldLine, centeredLine, dashes, threeColLine, twoColLine } from "./escpos";

export interface BillPrintInput {
  restaurant_name: string;
  restaurant_address?: string | null;
  gstin?: string | null;
  bill_number: string;
  table_number: string;
  order_number: string;
  created_at: string;
  bill: BillResult;
  payment_method?: string;
}

export function buildBillBuffer(input: BillPrintInput): Uint8Array {
  const date = new Date(input.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const segments: number[][] = [
    CMD.INIT,
    ...centeredLine(input.restaurant_name).map(n => [n]),
  ];

  if (input.restaurant_address) {
    segments.push(centeredLine(input.restaurant_address.slice(0, 32)));
  }
  if (input.gstin) {
    segments.push(centeredLine(`GSTIN: ${input.gstin}`));
  }

  segments.push(
    dashes(),
    twoColLine("Bill No:", input.bill_number),
    twoColLine("Date   :", date),
    twoColLine("Table  :", `T${input.table_number}`),
    twoColLine("Order  :", input.order_number),
    dashes(),
    threeColLine("ITEM", "QTY", "AMOUNT"),
    dashes(),
  );

  for (const item of input.bill.items) {
    const name = item.name.slice(0, 18);
    const qty = String(item.quantity);
    const amt = `${item.total.toFixed(2)}`;
    segments.push(threeColLine(name, qty, amt));
  }

  segments.push(
    dashes(),
    twoColLine("Subtotal:", `Rs.${input.bill.subtotal.toFixed(2)}`),
  );

  if (input.bill.discount_amount > 0) {
    segments.push(twoColLine(`Discount ${input.bill.discount_percent}%:`, `-Rs.${input.bill.discount_amount.toFixed(2)}`));
  }

  segments.push(
    twoColLine(`CGST @${input.bill.cgst_rate}%:`, `Rs.${input.bill.cgst_amount.toFixed(2)}`),
    twoColLine(`SGST @${input.bill.sgst_rate}%:`, `Rs.${input.bill.sgst_amount.toFixed(2)}`),
  );

  if (input.bill.tip_amount > 0) {
    segments.push(twoColLine("Tip:", `Rs.${input.bill.tip_amount.toFixed(2)}`));
  }

  segments.push(
    dashes(),
    ...boldLine(`TOTAL: Rs.${input.bill.final_amount.toFixed(2)}`).map(n => [n]),
    dashes(),
  );

  if (input.payment_method) {
    segments.push(twoColLine("Payment:", input.payment_method.toUpperCase()));
  }

  segments.push(
    CMD.LF,
    centeredLine("Thank you! Visit again."),
    centeredLine("Powered by ScanBite"),
    CMD.LF,
    CMD.CUT,
  );

  return buildBuffer(segments);
}
