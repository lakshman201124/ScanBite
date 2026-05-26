import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { validateCustomerSession } from "@/lib/session";
import { CustomerMenuClient } from "@/components/customer/CustomerMenuClient";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string; error?: string }>;
}

export default async function MenuPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { t: qrToken, error } = await searchParams;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, is_active: true },
    select: { id: true, name: true, slug: true, logo_url: true },
  });
  if (!restaurant) notFound();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken && qrToken) {
    redirect(`/api/session/create?slug=${encodeURIComponent(slug)}&t=${encodeURIComponent(qrToken)}&return=/m/${encodeURIComponent(slug)}`);
  }

  const session = sessionToken ? await validateCustomerSession(sessionToken) : null;

  if (session && session.restaurantId !== restaurant.id) {
    if (qrToken) {
      redirect(`/api/session/create?slug=${encodeURIComponent(slug)}&t=${encodeURIComponent(qrToken)}&return=/m/${encodeURIComponent(slug)}`);
    }
  }

  if (error === "invalid-qr") {
    return (
      <div className="customer-scope" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>️</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>Invalid QR Code</h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>This QR code is not valid. Please ask your server for a new one.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="customer-scope" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 280 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--brand)", display: "grid", placeItems: "center", margin: "0 auto 20px", boxShadow: "var(--sh-brand)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3M14 21h3v0"/>
            </svg>
          </div>
          <h1 style={{ margin: "0 0 8px", fontFamily: "var(--display)", fontWeight: 400, fontSize: 28, color: "var(--ink)" }}>
            Scan to <em style={{ fontStyle: "italic", color: "var(--brand)" }}>order</em>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
            Please scan the QR code on your table to view the menu and place your order.
          </p>
        </div>
      </div>
    );
  }

  const table = await prisma.restaurantTable.findUnique({
    where: { id: session.tableId },
    select: { table_number: true },
  });

  return (
    <CustomerMenuClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      restaurantLogo={restaurant.logo_url}
      tableNumber={table?.table_number ?? ""}
      tableId={session.tableId}
    />
  );
}
