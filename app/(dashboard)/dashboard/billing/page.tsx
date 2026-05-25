import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DailySummary } from "@/components/billing/DailySummary";
import { BillsList } from "@/components/billing/BillsList";

async function getDailySummary(restaurantId: string) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const bills = await prisma.bill.findMany({
    where: {
      restaurant_id: restaurantId,
      created_at: { gte: dayStart },
    },
    include: {
      order: {
        select: { payment_status: true, payment_method: true },
      },
    },
  });

  let total_revenue = 0;
  let cash_revenue = 0;
  let online_revenue = 0;
  let unpaid_amount = 0;
  let unpaid_count = 0;

  for (const bill of bills) {
    const amount = Number(bill.total);
    if (bill.order.payment_status === "paid") {
      total_revenue += amount;
      if (bill.order.payment_method === "cash") {
        cash_revenue += amount;
      } else {
        online_revenue += amount;
      }
    } else {
      unpaid_amount += amount;
      unpaid_count++;
    }
  }

  const paid_count = bills.filter((b) => b.order.payment_status === "paid").length;

  return {
    total_revenue: Math.round(total_revenue * 100) / 100,
    total_orders: paid_count,
    avg_order_value: paid_count > 0 ? Math.round((total_revenue / paid_count) * 100) / 100 : 0,
    cash_revenue: Math.round(cash_revenue * 100) / 100,
    online_revenue: Math.round(online_revenue * 100) / 100,
    unpaid_count,
    unpaid_amount: Math.round(unpaid_amount * 100) / 100,
  };
}

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.restaurantId) redirect("/login");
  const restaurantId = session.user.restaurantId;

  const summary = await getDailySummary(restaurantId);

  return (
    <main className="adm-main">
      <header className="adm-top" style={{ gap: 14 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--display)",
            fontSize: 28, fontWeight: 400,
            letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1,
          }}>
            Billing
            <em style={{ fontStyle: "italic", color: "var(--brand)", marginLeft: 8 }}>& Receipts</em>
          </h1>
          <div className="adm-top__sub" style={{ marginTop: 4 }}>
            GST-compliant bills · Payments · Invoices
          </div>
        </div>
        <div className="adm-top__spacer" />
        {/* Summary pill */}
        {summary.unpaid_count > 0 && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "8px 14px",
            background: "rgba(224,58,48,.06)",
            border: "1px solid rgba(224,58,48,.20)",
            borderRadius: 999,
            font: "700 12px var(--sans)",
            color: "var(--red)",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", display: "inline-block" }} />
            {summary.unpaid_count} unpaid · ₹{summary.unpaid_amount.toLocaleString("en-IN")}
          </div>
        )}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "8px 14px",
          background: "var(--green-soft)",
          border: "1px solid rgba(30,158,94,.2)",
          borderRadius: 999,
          font: "700 12px var(--sans)",
          color: "var(--green)",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12M6 8h12M16 13H6c5 0 7 4 12 8"/>
          </svg>
          ₹{summary.total_revenue.toLocaleString("en-IN")} today
        </div>
      </header>

      <div className="adm-body" style={{ paddingTop: 24 }}>
        <DailySummary data={summary} />

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "var(--sh-2)",
          marginBottom: 48,
        }}>
          <div style={{
            padding: "18px 22px 16px",
            borderBottom: "1px solid var(--hairline)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <h3 style={{ font: "700 16px var(--sans)", color: "var(--ink)", margin: 0, letterSpacing: "-.005em" }}>
                All Bills
              </h3>
              <div style={{ font: "500 12px var(--sans)", color: "var(--muted)", marginTop: 3 }}>
                Search, filter, print and send invoices
              </div>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              font: "700 11px var(--sans)", color: "var(--muted)",
              background: "var(--bg)", border: "1px solid var(--hairline)",
              padding: "6px 12px", borderRadius: 999,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              {summary.total_orders} paid today
            </div>
          </div>
          <div style={{ padding: "18px 22px 22px" }}>
            <BillsList restaurantId={restaurantId} />
          </div>
        </div>
      </div>
    </main>
  );
}
