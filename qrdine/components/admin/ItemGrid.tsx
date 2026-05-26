"use client";

import { Crown, Pencil, Trash2, Utensils } from "lucide-react";

import type { MenuItem } from "@/types";

// Left-border accent color per food type
const FOOD_TYPE_META: Record<string, { border: string; dotBg: string; dotBorder: string; label: string }> = {
  veg:     { border: "var(--green)", dotBg: "var(--green)", dotBorder: "var(--green)", label: "Veg" },
  non_veg: { border: "#C8462F", dotBg: "#C8462F", dotBorder: "#C8462F", label: "Non-veg" },
  egg:     { border: "#E0A82E", dotBg: "#E0A82E", dotBorder: "#E0A82E", label: "Egg" },
  vegan:   { border: "var(--green)", dotBg: "transparent", dotBorder: "var(--green)", label: "Vegan" },
};

interface Props {
  items: MenuItem[];
  loading: boolean;
  onEdit: (item: MenuItem) => void;
  onToggleAvailable: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

function VegDot({ type }: { type: string }) {
  const meta = FOOD_TYPE_META[type] ?? FOOD_TYPE_META.veg;

  return (
    <span
      style={{
        display: "inline-grid",
        height: 14,
        width: 14,
        flexShrink: 0,
        placeItems: "center",
        borderRadius: 3,
        border: `1.5px solid ${meta.dotBorder}`,
      }}
    >
      <span
        style={{
          height: 7,
          width: 7,
          borderRadius: "50%",
          background: meta.dotBg,
        }}
      />
    </span>
  );
}

function ToggleSwitch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      style={{
        position: "relative",
        width: 42,
        height: 24,
        borderRadius: 999,
        border: "none",
        background: on ? "var(--green)" : "var(--surface-2)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.22s cubic-bezier(0.4,0,0.2,1)",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 4,
          left: on ? 22 : 4,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(20,19,26,0.18)",
          transition: "left 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </button>
  );
}

function ItemSkeleton() {
  return (
    <div
      style={{
        overflow: "hidden",
        borderRadius: 22,
        border: "1px solid var(--hairline)",
        background: "var(--surface)",
        borderLeft: "3px solid var(--surface-2)",
      }}
    >
      <div style={{ height: 144, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ padding: 16 }}>
        <div style={{ height: 16, width: "66%", borderRadius: 999, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ marginTop: 12, height: 12, width: "50%", borderRadius: 999, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ marginTop: 20, height: 32, width: "100%", borderRadius: 999, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

export function ItemGrid({ items, loading, onEdit, onToggleAvailable, onDelete }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <ItemSkeleton key={item} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          borderRadius: 28,
          border: "1px dashed var(--hairline)",
          background: "var(--surface)",
          padding: "64px 24px",
          textAlign: "center",
          boxShadow: "var(--sh-1)",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            display: "grid",
            height: 56,
            width: 56,
            placeItems: "center",
            borderRadius: 16,
            background: "var(--brand-soft)",
            color: "var(--brand-deep)",
          }}
        >
          <Utensils size={25} strokeWidth={2.4} />
        </div>
        <p style={{ marginTop: 20, fontSize: 16, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--sans)" }}>
          No items yet
        </p>
        <p
          style={{
            margin: "8px auto 0",
            maxWidth: 380,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.6,
            color: "var(--muted)",
            fontFamily: "var(--sans)",
          }}
        >
          Select a category and add the first dish. It will appear in the same order customers see it.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .item-card-actions { opacity: 0; transition: opacity 0.18s ease; }
        .item-card:hover .item-card-actions { opacity: 1; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => {
          const meta = FOOD_TYPE_META[item.food_type] ?? FOOD_TYPE_META.veg;

          return (
            <article
              key={item.id}
              className="item-card"
              style={{
                overflow: "hidden",
                borderRadius: 22,
                border: "1px solid var(--hairline)",
                borderLeft: `3px solid ${meta.border}`,
                background: "var(--surface)",
                boxShadow: "var(--sh-1)",
                opacity: item.is_available ? 1 : 0.62,
                transition: "transform 0.18s cubic-bezier(0.4,0,0.2,1), box-shadow 0.18s cubic-bezier(0.4,0,0.2,1), opacity 0.18s",
                position: "relative",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--sh-2)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--sh-1)";
              }}
            >
              {/* Image area */}
              <div style={{ position: "relative", height: 144, background: "var(--surface-2)" }}>
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt=""
                    style={{ height: "100%", width: "100%", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ display: "grid", height: "100%", placeItems: "center", color: "var(--muted)" }}>
                    <Utensils size={28} />
                  </div>
                )}

                {/* Gradient overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(20,19,26,0.32) 0%, transparent 60%)",
                    pointerEvents: "none",
                  }}
                />

                {/* Bestseller crown */}
                {item.is_featured ? (
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      borderRadius: 999,
                      background: "#FFE9A3",
                      padding: "4px 10px",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#8a5b00",
                    }}
                  >
                    <Crown size={10} strokeWidth={2.4} />
                    Best
                  </span>
                ) : null}

                {/* Category badge — top right */}
                {(item as MenuItem & { category?: { id: string; name: string } }).category && (
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      top: 10,
                      display: "inline-block",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.88)",
                      padding: "3px 9px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: "var(--ink-2)",
                      letterSpacing: "0.02em",
                      backdropFilter: "blur(4px)",
                      maxWidth: 100,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(item as MenuItem & { category: { id: string; name: string } }).category.name}
                  </span>
                )}

                {/* Hidden overlay */}
                {!item.is_available ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(20,19,26,0.52)",
                    }}
                  >
                    <span
                      style={{
                        borderRadius: 999,
                        background: "var(--ink)",
                        padding: "6px 14px",
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--surface)",
                      }}
                    >
                      Hidden
                    </span>
                  </div>
                ) : null}

                {/* Hover edit/delete overlay */}
                <div
                  className="item-card-actions"
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    style={{
                      height: 30,
                      width: 30,
                      borderRadius: 8,
                      border: "none",
                      background: "rgba(255,255,255,0.9)",
                      color: "var(--ink)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 2px 8px rgba(20,19,26,0.18)",
                    }}
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil size={12} strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    style={{
                      height: 30,
                      width: 30,
                      borderRadius: 8,
                      border: "none",
                      background: "rgba(224,58,48,0.9)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 2px 8px rgba(224,58,48,0.32)",
                    }}
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <VegDot type={item.food_type} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 900,
                        lineHeight: 1.35,
                        color: "var(--ink)",
                        fontFamily: "var(--sans)",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {item.name}
                    </h3>
                    {item.description ? (
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 11.5,
                          fontWeight: 500,
                          lineHeight: 1.5,
                          color: "var(--muted)",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Price + toggle row */}
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 900,
                      color: "var(--brand)",
                      letterSpacing: "-0.02em",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    ₹{Number(item.price).toFixed(0)}
                  </span>

                  <ToggleSwitch
                    on={item.is_available}
                    onToggle={() => onToggleAvailable(item)}
                    label={item.is_available ? `Hide ${item.name}` : `Show ${item.name}`}
                  />
                </div>
              </div>

              {/* Footer edit/delete strip (always visible, smaller) */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  borderTop: "1px solid var(--hairline)",
                  background: "var(--bg)",
                  padding: "10px 14px",
                }}
              >
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  style={{
                    flex: 1,
                    height: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    borderRadius: 10,
                    border: "1px solid var(--hairline)",
                    background: "var(--surface)",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "var(--ink-2)",
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                    transition: "background 0.14s, color 0.14s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
                  }}
                >
                  <Pencil size={12} strokeWidth={2.4} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  style={{
                    height: 36,
                    width: 36,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 10,
                    border: "1px solid rgba(224,58,48,0.18)",
                    background: "rgba(224,58,48,0.08)",
                    color: "var(--red)",
                    cursor: "pointer",
                    transition: "background 0.14s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(224,58,48,0.16)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(224,58,48,0.08)";
                  }}
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
