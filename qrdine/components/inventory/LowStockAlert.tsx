"use client";
import { useEffect, useState } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StockItem {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

interface Props {
  onHighlight?: (id: string | null) => void;
}

export function LowStockAlert({ onHighlight }: Props) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/inventory')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const low: StockItem[] = json.data.filter(
            (i: StockItem) => i.stock_quantity !== null && i.stock_quantity <= (i.low_stock_threshold || 10)
          );
          setItems(low);
        }
      });
  }, []);

  if (items.length === 0) return null;

  const outOfStock = items.filter((i) => i.stock_quantity <= 0);
  const lowStock   = items.filter((i) => i.stock_quantity > 0);

  function handleClick(id: string) {
    const next = activeId === id ? null : id;
    setActiveId(next);
    onHighlight?.(next);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        borderRadius: "var(--r-3)",
        border: "1.5px solid rgba(242,165,0,.30)",
        background: "linear-gradient(135deg, rgba(255,244,220,.7) 0%, rgba(255,248,243,.6) 100%)",
        overflow: "hidden",
        boxShadow: "0 4px 20px -8px rgba(242,165,0,.25)",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "14px 20px 12px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid rgba(242,165,0,.18)",
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          flexShrink: 0,
          background: "rgba(242,165,0,.15)",
          display: "grid",
          placeItems: "center",
          color: "var(--amber)",
        }}>
          <AlertTriangle size={16} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "700 13px var(--sans)", color: "var(--ink)" }}>
            Stock Alert — Action Required
          </div>
          <div style={{ font: "500 11px var(--sans)", color: "var(--muted)", marginTop: 1 }}>
            {outOfStock.length > 0 && (
              <span style={{ color: "var(--red)" }}>{outOfStock.length} out of stock</span>
            )}
            {outOfStock.length > 0 && lowStock.length > 0 && <span style={{ margin: "0 5px", color: "var(--muted-2)" }}>·</span>}
            {lowStock.length > 0 && `${lowStock.length} running low`}
            {" — click an item to highlight in table"}
          </div>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 999,
          background: "rgba(242,165,0,.12)",
          border: "1px solid rgba(242,165,0,.22)",
        }}>
          <span style={{ font: "800 14px var(--sans)", color: "var(--amber)", fontVariantNumeric: "tabular-nums" }}>
            {items.length}
          </span>
          <span style={{ font: "600 10px var(--sans)", color: "rgba(242,165,0,.7)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            items
          </span>
        </div>
      </div>

      {/* Item chips */}
      <div style={{ padding: "12px 20px 14px", display: "flex", flexWrap: "wrap", gap: 8 }}>
        <AnimatePresence>
          {items.map((item, idx) => {
            const isOut = item.stock_quantity <= 0;
            const isActive = activeId === item.id;

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, delay: idx * 0.04 }}
                onClick={() => handleClick(item.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 12px",
                  borderRadius: "var(--r-pill)",
                  background: isActive
                    ? (isOut ? "var(--red)" : "var(--amber)")
                    : isOut
                    ? "rgba(224,58,48,.10)"
                    : "rgba(255,255,255,.75)",
                  border: `1.5px solid ${isOut ? "rgba(224,58,48,.25)" : "rgba(242,165,0,.30)"}`,
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s, transform 0.12s",
                  outline: "none",
                  boxShadow: isActive ? "0 2px 8px -2px rgba(0,0,0,.2)" : "none",
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >
                <Package
                  size={11}
                  color={isActive ? "#fff" : isOut ? "var(--red)" : "var(--amber)"}
                  strokeWidth={2.5}
                />
                <span style={{
                  font: "600 12px var(--sans)",
                  color: isActive ? "#fff" : isOut ? "var(--red)" : "var(--amber)",
                }}>
                  {item.name}
                </span>
                <span style={{
                  font: "700 10px var(--sans)",
                  color: isActive ? "rgba(255,255,255,.75)" : isOut ? "rgba(224,58,48,.6)" : "rgba(242,165,0,.65)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {isOut ? "out" : `${item.stock_quantity} left`}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
