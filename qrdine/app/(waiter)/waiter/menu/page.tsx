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

const FOOD_BADGE: Record<string, { label: string; color: string; dot: string }> = {
  veg:     { label: "Veg",     color: "#16a34a", dot: "#22c55e" },
  non_veg: { label: "Non-Veg", color: "#dc2626", dot: "#ef4444" },
  egg:     { label: "Egg",     color: "#d97706", dot: "#f59e0b" },
  vegan:   { label: "Vegan",   color: "#059669", dot: "#10b981" },
};

export default async function StaffMenuPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/staff-login");

  const categories = await prisma.menuCategory.findMany({
    where: { restaurant_id: ctx.restaurantId, is_active: true },
    include: {
      items: {
        where: { restaurant_id: ctx.restaurantId },
        orderBy: { sort_order: "asc" },
        select: {
          id: true, name: true, description: true, price: true,
          image_url: true, food_type: true, is_available: true,
          prep_time_minutes: true,
        },
      },
    },
    orderBy: { sort_order: "asc" },
  });

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const availableItems = categories.reduce((s, c) => s + c.items.filter(i => i.is_available).length, 0);

  return (
    <main className="adm-main">
      <header className="adm-top" style={{ gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Menu
            <em style={{ fontStyle: "italic", color: "var(--brand)", marginLeft: 8 }}>&amp; Items</em>
          </h1>
          <div className="adm-top__sub" style={{ marginTop: 4 }}>
            {availableItems} available · {totalItems} total
          </div>
        </div>
      </header>

      <div className="adm-body" style={{ paddingTop: 24 }}>
        {categories.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            <p style={{ font: "500 15px var(--sans)" }}>No menu categories found.</p>
          </div>
        )}

        {categories.map((cat) => (
          <div key={cat.id} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <h2 style={{ font: "700 16px var(--sans)", color: "var(--ink)", margin: 0 }}>{cat.name}</h2>
              <span style={{ font: "600 11px var(--sans)", color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--hairline)", borderRadius: 999, padding: "2px 8px" }}>
                {cat.items.length}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {cat.items.map((item) => {
                const badge = FOOD_BADGE[item.food_type] ?? FOOD_BADGE.veg;
                return (
                  <div key={item.id} style={{
                    background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 16,
                    padding: "14px 16px", opacity: item.is_available ? 1 : 0.45,
                    display: "flex", gap: 12, alignItems: "flex-start",
                  }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 52, height: 52, borderRadius: 10, background: "var(--bg)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                        </div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, border: `1.5px solid ${badge.color}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: badge.dot, display: "block" }} />
                        </span>
                        <span style={{ font: "600 13px var(--sans)", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                      </div>
                      {item.description && (
                        <p style={{ font: "400 11px var(--sans)", color: "var(--muted)", margin: "0 0 6px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {item.description}
                        </p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ font: "700 14px var(--sans)", color: "var(--brand)" }}>₹{Number(item.price).toLocaleString("en-IN")}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {item.prep_time_minutes && (
                            <span style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>{item.prep_time_minutes}m</span>
                          )}
                          {!item.is_available && (
                            <span style={{ font: "600 10px var(--sans)", color: "#dc2626", background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 6, padding: "2px 6px" }}>
                              Unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
