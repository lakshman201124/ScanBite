import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.restaurantId) redirect("/login");
  if (session.user.role === "chef") redirect("/kds");
  if (session.user.role === "waiter") redirect("/waiter/orders");

  let restaurant: { name: string; slug: string } | null = null;
  try {
    restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: { name: true, slug: true },
    });
  } catch (err) {
    console.error("[DashboardLayout] DB unreachable:", err);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", color: "#333" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Database Unavailable</h1>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>Unable to connect to the database. Please try again in a moment.</p>
        <a href="/dashboard" style={{ padding: "0.5rem 1.25rem", background: "var(--brand)", color: "#fff", borderRadius: "6px", textDecoration: "none" }}>Retry</a>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="hidden lg:block">
        <Sidebar
          restaurantSlug={restaurant?.slug ?? ""}
          userName={session.user.name ?? "Admin"}
          userEmail={session.user.email ?? ""}
        />
      </div>
      {children}
    </div>
  );
}
