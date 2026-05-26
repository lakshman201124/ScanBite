"use client";

interface Props {
  item: { name: string; quantity: number; note?: string };
  checked: boolean;
  onToggle: () => void;
}

export function KDSItemRow({ item, checked, onToggle }: Props) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
        cursor: "pointer", borderBottom: "1px dashed var(--hairline)",
      }}
    >
      {/* Qty badge */}
      <div style={{
        minWidth: 28, height: 28, padding: "0 8px",
        background: checked ? "var(--green)" : "var(--ink)",
        color: "#fff",
        borderRadius: 8, display: "grid", placeItems: "center",
        fontSize: 12, fontWeight: 800, flexShrink: 0,
        transition: "background .15s",
        fontFamily: "var(--sans)",
      }}>
        ×{item.quantity}
      </div>

      {/* Name + note */}
      <div style={{ flex: 1, paddingTop: 3 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700,
          color: checked ? "var(--muted-2)" : "var(--ink)",
          textDecoration: checked ? "line-through" : "none",
          letterSpacing: "-.005em",
          transition: "color .2s",
        }}>
          {item.name}
        </div>
        {item.note && (
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
            {item.note}
          </div>
        )}
      </div>

      {/* Check box */}
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 2,
        border: `1.5px solid ${checked ? "var(--green)" : "var(--hairline)"}`,
        background: checked ? "var(--green)" : "transparent",
        display: "grid", placeItems: "center",
        color: "#fff",
        transition: "background .15s, border-color .15s",
      }}>
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-11" />
          </svg>
        )}
      </div>
    </div>
  );
}
