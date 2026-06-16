"use client";

import { useRouter } from "next/navigation";

type ActionDef = {
  label: string;
  desc: string;
  path: string;
  isPrimary?: boolean;
  icon: React.ReactNode;
};

const ACTIONS: ActionDef[] = [
  {
    label: "New order",
    desc: "Manual order",
    path: "/dashboard/orders/new",
    isPrimary: true,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    ),
  },
  {
    label: "Kitchen",
    desc: "KDS display",
    path: "/kds",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    label: "Floor view",
    desc: "Table status & QR",
    path: "/dashboard/tables",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h16l-1 4H5z"/><path d="M6 13v7M18 13v7"/>
      </svg>
    ),
  },
  {
    label: "Billing",
    desc: "Generate & print bills",
    path: "/dashboard/billing",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-7"/>
      </svg>
    ),
  },
];

export function DashboardQuickActions() {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 28px",
        borderBottom: "1px solid var(--hairline)",
        background: "var(--surface)",
        overflowX: "auto",
      }}
    >
      <span style={{
        font: "600 10px var(--sans)",
        color: "var(--muted-2)",
        textTransform: "uppercase",
        letterSpacing: ".08em",
        whiteSpace: "nowrap",
        marginRight: 4,
        flexShrink: 0,
      }}>
        Quick actions
      </span>

      <div style={{ width: 1, height: 20, background: "var(--hairline)", flexShrink: 0, marginRight: 4 }} />

      {ACTIONS.map((action) => (
        <button
          key={action.path}
          onClick={() => router.push(action.path)}
          className="qact-btn"
          data-primary={action.isPrimary ? "true" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 14px 7px 9px",
            background: action.isPrimary ? "var(--brand)" : "var(--surface)",
            border: action.isPrimary ? "none" : "1px solid var(--hairline)",
            borderRadius: 9,
            font: "600 12px var(--sans)",
            color: action.isPrimary ? "#fff" : "var(--ink-2)",
            cursor: "pointer",
            boxShadow: action.isPrimary
              ? "0 3px 10px -3px rgba(255,77,61,.38)"
              : "0 1px 2px rgba(20,19,26,.04)",
            letterSpacing: ".005em",
            transition: "transform .14s cubic-bezier(.34,1.56,.64,1), opacity .12s",
            flexShrink: 0,
            outline: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          }}
        >
          <span style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: action.isPrimary ? "rgba(255,255,255,.15)" : "var(--surface-2)",
            display: "grid",
            placeItems: "center",
            color: action.isPrimary ? "#fff" : "var(--muted)",
            flexShrink: 0,
          }}>
            {action.icon}
          </span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.1 }}>
              {action.label}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: action.isPrimary ? "rgba(255,255,255,.65)" : "var(--muted-2)",
              lineHeight: 1.1,
            }}>
              {action.desc}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
