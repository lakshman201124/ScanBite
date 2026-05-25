"use client";

import { useRouter } from "next/navigation";

type ActionDef = {
  label: string;
  desc: string;
  path: string;
  gradient: string;
  iconBg: string;
  shadow: string;
  color: string;
  iconColor: string;
  isPrimary?: boolean;
  icon: React.ReactNode;
};

const ACTIONS: ActionDef[] = [
  {
    label: "New order",
    desc: "Take manual order",
    path: "/dashboard/orders/new",
    gradient: "linear-gradient(135deg, #FF4D3D 0%, #FF6B4A 100%)",
    iconBg: "rgba(255,255,255,.18)",
    shadow: "0 8px 24px -8px rgba(255,77,61,.55), 0 2px 8px -2px rgba(255,77,61,.30)",
    color: "#fff",
    iconColor: "#fff",
    isPrimary: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    ),
  },
  {
    label: "Kitchen",
    desc: "Open KDS display",
    path: "/kds",
    gradient: "linear-gradient(135deg, #14131A 0%, #2A2933 100%)",
    iconBg: "rgba(255,255,255,.10)",
    shadow: "0 6px 18px -6px rgba(20,19,26,.45)",
    color: "#fff",
    iconColor: "#fff",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    label: "Floor view",
    desc: "Table status & QR",
    path: "/dashboard/tables",
    gradient: "linear-gradient(135deg, #E2F5EC 0%, #C1EDD6 100%)",
    iconBg: "rgba(30,158,94,.18)",
    shadow: "0 4px 14px -6px rgba(30,158,94,.28)",
    color: "#1E7A4A",
    iconColor: "#1E9E5E",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h16l-1 4H5z"/><path d="M6 13v7M18 13v7"/>
      </svg>
    ),
  },
  {
    label: "Billing",
    desc: "Generate & print bills",
    path: "/dashboard/billing",
    gradient: "linear-gradient(135deg, #FFF4DC 0%, #FFE399 100%)",
    iconBg: "rgba(242,165,0,.20)",
    shadow: "0 4px 14px -6px rgba(242,165,0,.35)",
    color: "#8a5b00",
    iconColor: "#B07900",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    label: "Analytics",
    desc: "Revenue & insights",
    path: "/dashboard/analytics",
    gradient: "linear-gradient(135deg, #EEF3FF 0%, #D8E5FF 100%)",
    iconBg: "rgba(46,110,247,.18)",
    shadow: "0 4px 14px -6px rgba(46,110,247,.25)",
    color: "#1a4bbf",
    iconColor: "#2E6EF7",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-7"/>
      </svg>
    ),
  },
];

export function DashboardQuickActions() {
  const router = useRouter();

  return (
    <div
      className="qact-row"
      style={{
        display: "flex",
        gap: 10,
        padding: "14px 28px",
        borderBottom: "1px solid var(--hairline)",
        background: "var(--surface)",
        overflowX: "auto",
      }}
    >
      {ACTIONS.map((action) => (
        <button
          key={action.path}
          onClick={() => router.push(action.path)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: action.isPrimary ? "10px 20px 10px 14px" : "9px 18px 9px 13px",
            background: action.gradient,
            border: 0,
            borderRadius: 999,
            font: "700 12px var(--sans)",
            color: action.color,
            cursor: "pointer",
            boxShadow: action.shadow,
            letterSpacing: ".01em",
            transition: "transform .16s cubic-bezier(.34,1.56,.64,1), box-shadow .16s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.02)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0) scale(1)";
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.02)";
          }}
        >
          {/* Icon pill */}
          <span style={{
            width: 26, height: 26,
            borderRadius: 8,
            background: action.iconBg,
            display: "grid", placeItems: "center",
            color: action.iconColor,
            flexShrink: 0,
          }}>
            {action.icon}
          </span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>
              {action.label}
            </span>
            <span style={{ fontSize: 10, fontWeight: 500, opacity: .7, lineHeight: 1.1 }}>
              {action.desc}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
