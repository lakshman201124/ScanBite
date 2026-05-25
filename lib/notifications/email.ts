import { Resend } from "resend";
import type { BillResult } from "@/lib/billing";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummykeyfortypecheck");

export async function sendInvoiceEmail(opts: {
  to: string;
  restaurant_name: string;
  bill_number: string;
  order_number: string;
  bill: BillResult;
  invoice_pdf?: Uint8Array;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "Resend API key not configured" };
  }

  const itemsHtml = opts.bill.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">${i.name}</td>
         <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:center">${i.quantity}</td>
         <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right">Rs.${i.total.toFixed(2)}</td></tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 4px">${opts.restaurant_name}</h2>
  <p style="margin:0 0 20px;color:#888;font-size:14px">Tax Invoice — ${opts.bill_number}</p>

  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#f8f8f8">
        <th style="padding:8px;text-align:left;font-weight:600">Item</th>
        <th style="padding:8px;text-align:center;font-weight:600">Qty</th>
        <th style="padding:8px;text-align:right;font-weight:600">Total</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <table style="width:100%;font-size:13px;margin-top:16px">
    <tr><td style="padding:4px 0;color:#666">Subtotal</td><td style="text-align:right">Rs.${opts.bill.subtotal.toFixed(2)}</td></tr>
    ${opts.bill.discount_amount > 0 ? `<tr><td style="padding:4px 0;color:#666">Discount (${opts.bill.discount_percent}%)</td><td style="text-align:right">-Rs.${opts.bill.discount_amount.toFixed(2)}</td></tr>` : ""}
    <tr><td style="padding:4px 0;color:#666">CGST @ ${opts.bill.cgst_rate}%</td><td style="text-align:right">Rs.${opts.bill.cgst_amount.toFixed(2)}</td></tr>
    <tr><td style="padding:4px 0;color:#666">SGST @ ${opts.bill.sgst_rate}%</td><td style="text-align:right">Rs.${opts.bill.sgst_amount.toFixed(2)}</td></tr>
    ${opts.bill.tip_amount > 0 ? `<tr><td style="padding:4px 0;color:#666">Tip</td><td style="text-align:right">Rs.${opts.bill.tip_amount.toFixed(2)}</td></tr>` : ""}
    <tr style="border-top:2px solid #eee;font-weight:700;font-size:15px">
      <td style="padding:10px 0 0">TOTAL</td>
      <td style="text-align:right;padding:10px 0 0">Rs.${opts.bill.final_amount.toFixed(2)}</td>
    </tr>
  </table>

  <p style="margin-top:28px;font-size:12px;color:#aaa;text-align:center">
    Thank you for dining with us!<br/>Powered by ScanBite
  </p>
</body>
</html>`;

  const attachments = opts.invoice_pdf
    ? [{ filename: `invoice-${opts.bill_number}.pdf`, content: Buffer.from(opts.invoice_pdf).toString("base64") }]
    : [];

  try {
    const { data, error } = await resend.emails.send({
      from: `${opts.restaurant_name} <billing@scanbite.app>`,
      to: [opts.to],
      subject: `Invoice ${opts.bill_number} — ${opts.restaurant_name}`,
      html,
      attachments,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] send failed:", message);
    return { success: false, error: message };
  }
}
