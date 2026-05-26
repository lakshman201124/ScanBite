"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const A = {
  logo: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h2V5h2v2h2"/><path d="M14 7h2V5h2v2h2"/><path d="M4 12h16"/><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/></svg>,
  dash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  orders: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>,
  menu: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
  kds: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M7 21h10M12 17v4"/></svg>,
  qr: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3M14 21h3v0"/></svg>,
  table: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16l-1 4H5z"/><path d="M6 13v7M18 13v7"/></svg>,
  billing: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-7"/></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  cog: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.6.25 1 .84 1 1.51H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

export function Sidebar({ userName = "Admin", userEmail = "" }: {
  restaurantSlug?: string;
  userName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const [confirming, setConfirming] = useState(false);

  const active = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const main = [
    { id: 'dash',   label: 'Dashboard',  ico: A.dash, href: "/dashboard" },
    { id: 'orders', label: 'Orders',     ico: A.orders, href: "/dashboard/orders" },
    { id: 'kds',    label: 'Kitchen (KDS)', ico: A.kds, href: "/kds" },
    { id: 'menu',   label: 'Menu',       ico: A.menu, href: "/dashboard/menu" },
  ];
  
  const ops = [
    { id: 'tables',    label: 'Tables & QR', ico: A.qr,      href: "/dashboard/tables" },
    { id: 'inventory', label: 'Inventory',   ico: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>, href: "/dashboard/inventory" },
    { id: 'billing',   label: 'Billing',     ico: A.billing, href: "/dashboard/billing" },
    { id: 'analytics', label: 'Analytics',   ico: A.chart,   href: "/dashboard/analytics" },
    { id: 'staff',     label: 'Staff',       ico: A.users,   href: "/dashboard/settings?tab=staff" },
    { id: 'settings',  label: 'Settings',    ico: A.cog,     href: "/dashboard/settings" },
  ];

  return (
    <aside className="adm-side" style={{ width: 240, height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 40 }}>
      <div className="adm-logo">
        <div className="adm-logo__mark">{A.logo}</div>
        <div>
          <div className="adm-logo__name">Scan<span>Bite</span></div>
          <div style={{ font: '500 10px var(--sans)', color: 'var(--muted)' }}>Restaurant OS</div>
        </div>
      </div>

      <div className="adm-nav-label">Operate</div>
      {main.map((n) => (
        <Link key={n.id} href={n.href} style={{ textDecoration: 'none' }}>
          <div className={'adm-nav' + (active(n.href) ? ' is-active' : '')}>
            {n.ico}<span>{n.label}</span>
          </div>
        </Link>
      ))}

      <div className="adm-nav-label">Manage</div>
      {ops.map((n) => (
        <Link key={n.id} href={n.href} style={{ textDecoration: 'none' }}>
          <div className={'adm-nav' + (active(n.href) ? ' is-active' : '')}>
            {n.ico}<span>{n.label}</span>
          </div>
        </Link>
      ))}

      {confirming ? (
        <div className="adm-user" style={{ flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="adm-user__avatar" style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF4D3D&color=fff)` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="adm-user__name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName.split(" ")[0]}</div>
              <div className="adm-user__role" style={{ color: '#e53e3e' }}>Signing out…</div>
            </div>
          </div>
          <div style={{ font: '600 11px var(--sans)', color: 'var(--muted)', textAlign: 'center', letterSpacing: '.02em' }}>
            Are you sure you want to sign out?
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setConfirming(false)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                font: '600 12px var(--sans)', color: 'var(--ink-2)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8,
                background: '#e53e3e', border: 'none',
                font: '700 12px var(--sans)', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <div
          className="adm-user"
          style={{ cursor: 'pointer' }}
          onClick={() => setConfirming(true)}
        >
          <div className="adm-user__avatar" style={{ backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF4D3D&color=fff)` }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="adm-user__name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName.split(" ")[0]}</div>
            <div className="adm-user__role">{userEmail || "Admin"}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)', flexShrink: 0 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </div>
      )}
    </aside>
  );
}
