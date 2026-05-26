import twilio from "twilio";

export async function sendWhatsAppInvoice(opts: {
  to: string;
  restaurant_name: string;
  bill_number: string;
  total: number;
  invoice_url?: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER ?? "whatsapp:+14155238886";

  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  const client = twilio(accountSid, authToken);

  // Normalize phone: ensure +91 prefix for India numbers
  const phone = opts.to.startsWith("+") ? opts.to : `+91${opts.to.replace(/\D/g, "")}`;
  const to = `whatsapp:${phone}`;

  const body = `Hi! Here's your bill from *${opts.restaurant_name}*.
Bill No: ${opts.bill_number}
Total: Rs.${opts.total.toFixed(2)}

${opts.invoice_url ? `View/download invoice: ${opts.invoice_url}` : ""}

Thank you for dining with us! 🙏`;

  try {
    const msg = await client.messages.create({ from, to, body: body.trim() });
    return { success: true, sid: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[whatsapp] send failed:", message);
    return { success: false, error: message };
  }
}
