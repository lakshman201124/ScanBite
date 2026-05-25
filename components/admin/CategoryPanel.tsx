"use client";

import { Edit3, Plus, Utensils } from "lucide-react";

import type { MenuCategory } from "@/types";

interface Props {
  categories: (MenuCategory & { _count: { items: number } })[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onEdit: (cat: MenuCategory) => void;
  highlight?: boolean;
}

function CountBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      style={{
        flexShrink: 0,
        borderRadius: 999,
        padding: "2px 9px",
        fontSize: 11,
        fontWeight: 800,
        background: active ? "rgba(255,77,61,0.18)" : "var(--bg)",
        color: active ? "var(--brand)" : "var(--muted)",
      }}
    >
      {count}
    </span>
  );
}

export function CategoryPanel({ categories, loading, selectedId, onSelect, onAdd, onEdit, highlight }: Props) {
  const allCount = categories.reduce((sum, category) => sum + category._count.items, 0);

  return (
    <aside
      style={{
        borderRadius: 24,
        border: highlight ? "1.5px solid rgba(242,165,0,0.55)" : "1px solid var(--hairline)",
        background: "var(--surface)",
        padding: 16,
        boxShadow: highlight ? "0 0 0 4px rgba(242,165,0,0.10), var(--sh-1)" : "var(--sh-1)",
        transition: "border-color 0.25s, box-shadow 0.25s",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
      className="lg:sticky lg:top-5"
    >
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, letterSpacing: "-0.01em", color: "var(--ink)" }}>
            Categories
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
            {categories.length} sections
          </p>
        </div>
      </div>

      {/* All items row */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        style={{
          marginBottom: 6,
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          borderRadius: 14,
          padding: "9px 12px",
          textAlign: "left",
          fontSize: 13,
          fontWeight: 800,
          fontFamily: "var(--sans)",
          cursor: "pointer",
          border: selectedId === null ? "1.5px solid var(--brand)" : "1.5px solid transparent",
          background: selectedId === null ? "var(--brand-soft)" : "var(--bg)",
          color: selectedId === null ? "var(--brand-deep)" : "var(--ink-2)",
          borderLeft: selectedId === null ? "3px solid var(--brand)" : "3px solid transparent",
          transition: "background 0.18s, color 0.18s, border-color 0.18s",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Utensils size={14} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>All items</span>
        </span>
        <CountBadge count={allCount} active={selectedId === null} />
      </button>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              style={{ height: 40, borderRadius: 14, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite" }}
            />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div
          style={{
            borderRadius: 14,
            border: "1px dashed var(--hairline)",
            background: "var(--bg)",
            padding: "28px 16px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>No categories yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {categories.map((category) => {
            const active = selectedId === category.id;

            return (
              <div key={category.id} style={{ position: "relative" }} className="group">
                <button
                  type="button"
                  onClick={() => onSelect(category.id)}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderRadius: 14,
                    padding: "9px 12px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: active ? 800 : 700,
                    fontFamily: "var(--sans)",
                    cursor: "pointer",
                    border: active ? "1.5px solid rgba(255,77,61,0.25)" : "1.5px solid transparent",
                    background: active ? "rgba(255,77,61,0.06)" : "transparent",
                    color: active ? "var(--brand-deep)" : "var(--ink-2)",
                    borderLeft: active ? "3px solid var(--brand)" : "3px solid transparent",
                    transition: "background 0.18s, color 0.18s, border-color 0.18s",
                    paddingLeft: active ? 10 : 12,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" }}>
                    {!category.is_active ? (
                      <span
                        style={{
                          flexShrink: 0,
                          borderRadius: 6,
                          background: "rgba(242,165,0,0.14)",
                          padding: "2px 6px",
                          fontSize: 9,
                          fontWeight: 900,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#9a6000",
                        }}
                      >
                        Off
                      </span>
                    ) : null}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {category.name}
                    </span>
                  </span>
                  <CountBadge count={category._count.items} active={active} />
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(category);
                  }}
                  className="absolute right-10 top-1/2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--ink)] opacity-70 group-hover:grid"
                  aria-label={`Edit ${category.name}`}
                >
                  <Edit3 size={12} strokeWidth={2.4} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-width Add Category button at the bottom */}
      <button
        type="button"
        onClick={onAdd}
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          height: 42,
          borderRadius: 999,
          border: "none",
          background: "var(--brand)",
          color: "var(--surface)",
          boxShadow: "var(--sh-coral)",
          fontSize: 13,
          fontWeight: 800,
          fontFamily: "var(--sans)",
          cursor: "pointer",
          transition: "opacity 0.18s, transform 0.18s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        }}
        aria-label="Add category"
      >
        <Plus size={15} strokeWidth={2.8} />
        Add Category
      </button>
    </aside>
  );
}
