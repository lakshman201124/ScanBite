"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, ClipboardList, Bell, LogOut } from "lucide-react";

interface Props {
  userName: string;
  restaurantName: string;
  notifCount?: number;
}

const NAV = [
  { href: "/waiter",               icon: Home,          label: "Home"   },
  { href: "/waiter/tables",        icon: LayoutGrid,    label: "Tables" },
  { href: "/waiter/orders",        icon: ClipboardList, label: "Orders" },
  { href: "/waiter/notifications", icon: Bell,          label: "Alerts" },
];

export function WaiterNav({ userName, restaurantName, notifCount = 0 }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/staff/logout", { method: "POST" });
    router.push("/staff-login");
    router.refresh();
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 220,
        background: "#18181b", borderRight: "1px solid #27272a",
        display: "flex", flexDirection: "column",
        zIndex: 50,
      }} className="hidden lg:flex">
        {/* Logo */}
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid #27272a" }}>
          <div style={{ font: "800 15px var(--sans, sans-serif)", color: "#fff", marginBottom: 2 }}>
            ScanBite
          </div>
          <div style={{ font: "500 11px var(--sans, sans-serif)", color: "#71717a" }}>{restaurantName}</div>
        </div>

        {/* Staff badge */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#2563eb22", display: "grid", placeItems: "center", color: "#2E6EF7", fontSize: 14, fontWeight: 800 }}>
            {userName[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ font: "600 12px var(--sans, sans-serif)", color: "#e4e4e7" }}>{userName}</div>
            <div style={{ font: "500 10px var(--sans, sans-serif)", color: "#2E6EF7" }}>Waiter</div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "10px 10px 0" }}>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/waiter" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, marginBottom: 2,
                background: active ? "#2E6EF722" : "transparent",
                color: active ? "#2E6EF7" : "#a1a1aa",
                font: `${active ? 700 : 500} 13px var(--sans, sans-serif)`,
                textDecoration: "none", transition: "background 0.15s, color 0.15s",
              }}>
                <Icon size={16} strokeWidth={2.2} />
                {label}
                {label === "Alerts" && notifCount > 0 && (
                  <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", borderRadius: 999, font: "700 10px var(--sans,sans-serif)", padding: "1px 6px" }}>
                    {notifCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "10px 10px 20px" }}>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "10px 12px", borderRadius: 10,
            background: "transparent", border: "none", cursor: "pointer",
            color: "#71717a", font: "500 13px var(--sans, sans-serif)",
            transition: "background 0.15s, color 0.15s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#27272a"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#71717a"; }}
          >
            <LogOut size={16} strokeWidth={2.2} /> Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#18181b", borderTop: "1px solid #27272a",
        display: "grid", gridTemplateColumns: `repeat(${NAV.length}, 1fr)`,
        zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)",
      }} className="lg:hidden">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/waiter" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 3, padding: "10px 0", textDecoration: "none",
              color: active ? "#2E6EF7" : "#71717a", position: "relative",
            }}>
              <Icon size={20} strokeWidth={2.2} />
              <span style={{ font: "600 10px var(--sans, sans-serif)" }}>{label}</span>
              {label === "Alerts" && notifCount > 0 && (
                <span style={{
                  position: "absolute", top: 6, right: "calc(50% - 14px)",
                  background: "#ef4444", color: "#fff", borderRadius: 999,
                  font: "700 9px var(--sans,sans-serif)", padding: "1px 5px", minWidth: 16, textAlign: "center",
                }}>
                  {notifCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
