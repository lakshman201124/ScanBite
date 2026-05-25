import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont } from "pdf-lib";
import type { BillResult } from "@/lib/billing";

export interface InvoiceInput {
  restaurant_name: string;
  restaurant_address?: string | null;
  restaurant_phone?: string | null;
  gstin?: string | null;
  logo_url?: string | null;
  bill_number: string;
  order_number: string;
  table_number: string;
  created_at: string;
  payment_method?: string | null;
  bill: BillResult;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0.1, 0.1, 0.1)
) {
  page.drawText(text, { x, y, font, size, color });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: rgb(0.8, 0.8, 0.8) });
}

export async function generateInvoicePDF(input: InvoiceInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // A5 size: 148mm × 210mm = 419.5 × 595.3 pt
  const page = doc.addPage([419.5, 595.3]);
  const { height } = page.getSize();
  const W = 419.5;
  const margin = 36;
  const contentW = W - margin * 2;

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  let y = height - margin;

  // Header
  drawText(page, input.restaurant_name, margin, y, fontBold, 16);
  y -= 18;

  if (input.restaurant_address) {
    drawText(page, input.restaurant_address, margin, y, fontReg, 8, rgb(0.4, 0.4, 0.4));
    y -= 12;
  }
  if (input.restaurant_phone) {
    drawText(page, `Ph: ${input.restaurant_phone}`, margin, y, fontReg, 8, rgb(0.4, 0.4, 0.4));
    y -= 12;
  }
  if (input.gstin) {
    drawText(page, `GSTIN: ${input.gstin}`, margin, y, fontReg, 8, rgb(0.4, 0.4, 0.4));
    y -= 12;
  }

  y -= 4;
  drawLine(page, margin, y, W - margin, y);
  y -= 14;

  // Invoice title
  drawText(page, "TAX INVOICE", margin, y, fontBold, 12);
  y -= 16;

  // Bill meta
  const date = new Date(input.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const cols: Array<[string, string]> = [
    ["Bill No.", input.bill_number],
    ["Order No.", input.order_number],
    ["Date", date],
    ["Table", `T${input.table_number}`],
  ];
  if (input.payment_method) cols.push(["Payment", input.payment_method.toUpperCase()]);

  for (const [label, value] of cols) {
    drawText(page, label, margin, y, fontReg, 8, rgb(0.5, 0.5, 0.5));
    drawText(page, value, margin + 80, y, fontBold, 8);
    y -= 13;
  }

  y -= 6;
  drawLine(page, margin, y, W - margin, y, 1);
  y -= 14;

  // Table header
  const colX = { name: margin, qty: margin + contentW * 0.52, price: margin + contentW * 0.68, total: margin + contentW * 0.84 };
  drawText(page, "ITEM", colX.name, y, fontBold, 8, rgb(0.3, 0.3, 0.3));
  drawText(page, "QTY", colX.qty, y, fontBold, 8, rgb(0.3, 0.3, 0.3));
  drawText(page, "RATE", colX.price, y, fontBold, 8, rgb(0.3, 0.3, 0.3));
  drawText(page, "TOTAL", colX.total, y, fontBold, 8, rgb(0.3, 0.3, 0.3));
  y -= 10;
  drawLine(page, margin, y, W - margin, y);
  y -= 12;

  // Items
  for (const item of input.bill.items) {
    const name = item.name.length > 28 ? item.name.slice(0, 27) + "…" : item.name;
    drawText(page, name, colX.name, y, fontReg, 8);
    drawText(page, String(item.quantity), colX.qty, y, fontReg, 8);
    drawText(page, `Rs.${item.unit_price.toFixed(2)}`, colX.price, y, fontReg, 8);
    drawText(page, `Rs.${item.total.toFixed(2)}`, colX.total, y, fontReg, 8);
    y -= 13;
  }

  y -= 4;
  drawLine(page, margin, y, W - margin, y);
  y -= 14;

  // Totals
  const totalsX = margin + contentW * 0.5;
  const valX = W - margin;
  const valWidth = (text: string, font: PDFFont, size: number) => font.widthOfTextAtSize(text, size);

  function totalsRow(label: string, value: string, bold = false) {
    const f = bold ? fontBold : fontReg;
    drawText(page, label, totalsX, y, f, bold ? 9 : 8);
    const vw = valWidth(value, f, bold ? 9 : 8);
    drawText(page, value, valX - vw, y, f, bold ? 9 : 8);
    y -= bold ? 14 : 12;
  }

  totalsRow("Subtotal", `Rs.${input.bill.subtotal.toFixed(2)}`);
  if (input.bill.discount_amount > 0) {
    totalsRow(`Discount (${input.bill.discount_percent}%)`, `-Rs.${input.bill.discount_amount.toFixed(2)}`);
  }
  totalsRow(`CGST @ ${input.bill.cgst_rate}%`, `Rs.${input.bill.cgst_amount.toFixed(2)}`);
  totalsRow(`SGST @ ${input.bill.sgst_rate}%`, `Rs.${input.bill.sgst_amount.toFixed(2)}`);
  if (input.bill.tip_amount > 0) {
    totalsRow("Tip", `Rs.${input.bill.tip_amount.toFixed(2)}`);
  }

  y -= 2;
  drawLine(page, totalsX, y, W - margin, y, 1);
  y -= 14;
  totalsRow("TOTAL", `Rs.${input.bill.final_amount.toFixed(2)}`, true);

  // Footer
  y -= 20;
  drawLine(page, margin, y, W - margin, y);
  y -= 14;
  const footer = "Thank you for dining with us!";
  const fw = fontReg.widthOfTextAtSize(footer, 8);
  drawText(page, footer, (W - fw) / 2, y, fontReg, 8, rgb(0.5, 0.5, 0.5));
  y -= 12;
  const poweredBy = "Powered by ScanBite";
  const pw = fontReg.widthOfTextAtSize(poweredBy, 7);
  drawText(page, poweredBy, (W - pw) / 2, y, fontReg, 7, rgb(0.7, 0.7, 0.7));

  return doc.save();
}
