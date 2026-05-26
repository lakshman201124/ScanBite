"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Home",    href: "/dashboard",           icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg> },
  { label: "Menu",    href: "/dashboard/menu",      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg> },
  { label: "Orders",  href: "/dashboard/orders",    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3"/><path d="M9 8h6M9 12h6M9 16h4"/></svg> },
  { label: "Tables",  href: "/dashboard/tables",    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/></svg> },
  { label: "Settings",href: "/dashboard/settings",  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
      background: "var(--ink)", margin: "0 14px 14px",
      borderRadius: 999, padding: 8,
      display: "flex", alignItems: "center", gap: 4,
      boxShadow: "0 18px 40px -14px rgba(20,33,26,.45)",
    }}
    className="lg:hidden"
    >
      {NAV.map((n) => {
        const on = isActive(n.href);
        return (
          <Link key={n.href} href={n.href} style={{ flex: on ? 1.4 : 1, textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "11px 10px", borderRadius: 999,
              background: on ? "var(--accent)" : "transparent",
              color: on ? "#fff" : "rgba(255,255,255,.45)",
              fontFamily: "var(--sans)", fontWeight: 600, fontSize: 12,
              whiteSpace: "nowrap",
            }}>
              {n.icon}
              {on && <span>{n.label}</span>}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
