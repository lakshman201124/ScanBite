import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthSecretKey } from "@/lib/secret";

const JWT_SECRET = getAuthSecretKey();

async function getStaffContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get("chef_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "waiter" && payload.role !== "chef") return null;
    return { restaurantId: payload.restaurantId as string };
  } catch { return null; }
}

export default async function StaffQRPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/staff-login");

  const [tables, restaurant] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { restaurant_id: ctx.restaurantId },
      orderBy: { table_number: "asc" },
      select: { id: true, table_number: true, qr_token: true, status: true, capacity: true },
    }),
    prisma.restaurant.findUnique({
      where: { id: ctx.restaurantId },
      select: { slug: true, name: true },
    }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <main className="adm-main">
      <header className="adm-top" style={{ gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            QR Codes
            <em style={{ fontStyle: "italic", color: "var(--brand)", marginLeft: 8 }}>per Table</em>
          </h1>
          <div className="adm-top__sub" style={{ marginTop: 4 }}>
            {tables.length} table{tables.length !== 1 ? "s" : ""} · Scan to open customer menu
          </div>
        </div>
      </header>

      <div className="adm-body" style={{ paddingTop: 24 }}>
        {tables.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            <p style={{ font: "500 15px var(--sans)" }}>No tables found. Ask your admin to add tables.</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {tables.map((table) => {
            const menuUrl = `${baseUrl}/m/${restaurant?.slug}?table=${table.qr_token}`;
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(menuUrl)}`;
            const statusColor = table.status === "available" ? "#16a34a" : table.status === "occupied" ? "#dc2626" : "#d97706";

            return (
              <div key={table.id} style={{
                background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 20,
                padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                boxShadow: "var(--sh-1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 4 }}>
                  <span style={{ font: "700 15px var(--sans)", color: "var(--ink)" }}>
                    Table {table.table_number}
                  </span>
                  <span style={{ font: "600 10px var(--sans)", color: statusColor, background: statusColor + "15", border: `1px solid ${statusColor}30`, borderRadius: 999, padding: "2px 8px", textTransform: "capitalize" }}>
                    {table.status}
                  </span>
                </div>

                <div style={{ background: "#fff", borderRadius: 12, padding: 10, lineHeight: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrApiUrl}
                    alt={`QR for Table ${table.table_number}`}
                    width={140}
                    height={140}
                    style={{ display: "block", borderRadius: 6 }}
                  />
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>
                    {table.capacity} seat{table.capacity !== 1 ? "s" : ""}
                  </div>
                  <div style={{ font: "400 10px var(--sans)", color: "var(--muted)", marginTop: 2, wordBreak: "break-all", opacity: 0.6 }}>
                    {restaurant?.name}
                  </div>
                </div>

                <a
                  href={menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: "100%", padding: "8px 0", background: "var(--bg)", border: "1px solid var(--hairline)",
                    borderRadius: 10, font: "600 12px var(--sans)", color: "var(--ink)", textDecoration: "none",
                    textAlign: "center", display: "block",
                  }}
                >
                  Open Menu ↗
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
