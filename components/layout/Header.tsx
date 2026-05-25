"use client";

interface HeaderProps {
  restaurantName: string;
  adminName: string;
}

export function Header({ restaurantName, adminName }: HeaderProps) {
  const initial = adminName.charAt(0).toUpperCase();

  return (
    <header style={{
      height: 64, background: "var(--surface)", borderBottom: "1px solid var(--hairline)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px", position: "sticky", top: 0, zIndex: 20,
      fontFamily: "var(--sans)",
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.01em", color: "var(--ink)", lineHeight: 1.1 }}>
          {restaurantName}
        </h1>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
          Admin Dashboard
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Bell */}
        <button style={{
          width: 38, height: 38, borderRadius: 10,
          background: "var(--bg)", border: "1px solid var(--hairline)",
          display: "grid", placeItems: "center", cursor: "pointer",
          position: "relative",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          <span style={{
            position: "absolute", top: 8, right: 9,
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--accent)", border: "2px solid var(--bg)",
          }} />
        </button>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "6px 12px 6px 6px", background: "var(--bg)",
          border: "1px solid var(--hairline)", borderRadius: 12,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--brand)", color: "#fff",
            display: "grid", placeItems: "center",
            fontSize: 12, fontWeight: 800,
          }}>
            {initial}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {adminName}
          </span>
        </div>
      </div>
    </header>
  );
}
