"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const A = {
  logo: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h2V5h2v2h2"/><path d="M14 7h2V5h2v2h2"/><path d="M4 12h16"/><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/></svg>,
  orders: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>,
  table:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16l-1 4H5z"/><path d="M6 13v7M18 13v7"/></svg>,
  menu:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>,
  qr:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3M20 14v3"/></svg>,
  logout: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const NAV = [
  { id: "orders", label: "Orders", ico: A.orders, href: "/waiter/orders" },
  { id: "menu",   label: "Menu",   ico: A.menu,   href: "/waiter/menu"   },
  { id: "tables", label: "Tables", ico: A.table,  href: "/waiter/tables" },
  { id: "qr",     label: "QR",     ico: A.qr,     href: "/waiter/qr"    },
];

export function WaiterSidebar({
  userName = "Staff",
  userRole = "waiter",
}: {
  userName?: string;
  userRole?: "chef" | "waiter";
}) {
  const pathname = usePathname();
  const router   = useRouter();

  const active = (href: string) => pathname.startsWith(href);

  const handleLogout = () => {
    document.cookie = "chef_token=; path=/; max-age=0";
    router.push("/staff-login");
    router.refresh();
  };

  const roleLabel = userRole === "chef" ? "Chef Panel" : "Waiter Panel";
  const avatarBg  = userRole === "chef" ? "FF4D3D" : "2E6EF7";

  return (
    <aside className="adm-side" style={{ width: 240, height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 40 }}>
      <div className="adm-logo">
        <div className="adm-logo__mark">{A.logo}</div>
        <div>
          <div className="adm-logo__name">Scan<span>Bite</span></div>
          <div style={{ font: "500 10px var(--sans)", color: "var(--muted)" }}>{roleLabel}</div>
        </div>
      </div>

      <div className="adm-nav-label">Service</div>
      {NAV.map((n) => (
        <Link key={n.id} href={n.href} style={{ textDecoration: "none" }}>
          <div className={"adm-nav" + (active(n.href) ? " is-active" : "")}>
            {n.ico}<span>{n.label}</span>
          </div>
        </Link>
      ))}

      <div
        className="adm-user"
        style={{ cursor: "pointer", marginTop: "auto" }}
        onClick={handleLogout}
      >
        <div
          className="adm-user__avatar"
          style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=${avatarBg}&color=fff)` }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="adm-user__name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userName.split(" ")[0]}
          </div>
          <div className="adm-user__role">Sign Out</div>
        </div>
        {A.logout}
      </div>
    </aside>
  );
}
