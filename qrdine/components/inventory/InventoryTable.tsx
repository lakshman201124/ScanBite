"use client";
import { useState, useEffect, CSSProperties } from 'react';
import { Save, Check, Package, RefreshCw } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  stock_quantity: number | null;
  low_stock_threshold: number;
  category?: { name: string };
}

interface Props {
  highlightId?: string | null;
}

const inputStyle: CSSProperties = {
  width: 80,
  textAlign: "right",
  border: "1px solid var(--hairline)",
  borderRadius: 9,
  padding: "5px 8px",
  font: "600 13px var(--sans)",
  color: "var(--ink)",
  background: "var(--bg)",
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

function StockLevelBar({ item }: { item: InventoryItem }) {
  if (item.stock_quantity === null) return null;

  const threshold = item.low_stock_threshold || 10;
  const maxStock = Math.max(threshold * 4, item.stock_quantity, 1);
  const pct = Math.min((item.stock_quantity / maxStock) * 100, 100);

  const isOut  = item.stock_quantity <= 0;
  const isLow  = !isOut && item.stock_quantity <= threshold;

  const barColor = isOut
    ? "linear-gradient(90deg, var(--red) 0%, #FF5A50 100%)"
    : isLow
    ? "linear-gradient(90deg, var(--amber) 0%, #FFB733 100%)"
    : "linear-gradient(90deg, var(--green) 0%, #28C070 100%)";

  return (
    <div style={{ width: 72, marginTop: 6 }}>
      <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: barColor,
          borderRadius: 999,
          transition: "width 0.5s cubic-bezier(.22,1,.36,1)",
        }} />
      </div>
    </div>
  );
}

function StatusBadge({ item }: { item: InventoryItem }) {
  const isTracking = item.stock_quantity !== null;
  const isOut  = isTracking && item.stock_quantity! <= 0;
  const isLow  = isTracking && !isOut && item.stock_quantity! <= (item.low_stock_threshold || 10);

  if (!isTracking) return (
    <span style={{ padding: "3px 9px", borderRadius: 999, font: "600 10px var(--sans)", background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--hairline)", textTransform: "uppercase", letterSpacing: ".04em" }}>
      Unlimited
    </span>
  );
  if (isOut) return (
    <span style={{ padding: "3px 9px", borderRadius: 999, font: "600 10px var(--sans)", background: "rgba(224,58,48,.08)", color: "var(--red)", border: "1px solid rgba(224,58,48,.2)", textTransform: "uppercase", letterSpacing: ".04em" }}>
      Out of Stock
    </span>
  );
  if (isLow) return (
    <span style={{ padding: "3px 9px", borderRadius: 999, font: "600 10px var(--sans)", background: "var(--amber-soft)", color: "var(--amber)", border: "1px solid rgba(242,165,0,.3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
      Low Stock
    </span>
  );
  return (
    <span style={{ padding: "3px 9px", borderRadius: 999, font: "600 10px var(--sans)", background: "var(--green-soft)", color: "var(--green)", border: "1px solid rgba(30,158,94,.2)", textTransform: "uppercase", letterSpacing: ".04em" }}>
      In Stock
    </span>
  );
}

function RowSkeleton() {
  return (
    <tr>
      {[180, 90, 110, 70, 70, 70, 80].map((w, i) => (
        <td key={i} style={{ padding: "14px 20px" }}>
          <div style={{ height: 12, width: w, background: "var(--surface-2)", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
        </td>
      ))}
    </tr>
  );
}

export function InventoryTable({ highlightId }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restocking, setRestocking] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/inventory')
      .then((r) => r.json())
      .then((json) => { if (json.success) setItems(json.data); })
      .finally(() => setLoading(false));
  }, []);

  // Scroll to highlighted row
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`inv-row-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId]);

  const handleStockChange = (id: string, val: string) =>
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, stock_quantity: val === "" ? null : parseInt(val) } : item));

  const handleThresholdChange = (id: string, val: string) =>
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, low_stock_threshold: parseInt(val) || 10 } : item));

  const handlePriceChange = (id: string, val: string) =>
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, price: parseFloat(val) || 0 } : item));

  const handleRestock = async (id: string) => {
    setRestocking(id);
    const item = items.find(i => i.id === id);
    if (!item) { setRestocking(null); return; }
    const newQty = (item.low_stock_threshold || 10) * 5;
    setItems((prev) => prev.map(i => i.id === id ? { ...i, stock_quantity: newQty } : i));
    await fetch('/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id, stock_quantity: newQty, low_stock_threshold: item.low_stock_threshold, price: item.price }] }),
    });
    setRestocking(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id,
            stock_quantity: i.stock_quantity,
            low_stock_threshold: i.low_stock_threshold || 10,
            price: i.price,
          })),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const COLS = ["Item", "Category", "Status", "Price (₹)", "Stock Qty", "Alert At", "Restock"];

  return (
    <div style={{
      borderRadius: "var(--r-3)",
      border: "1px solid var(--hairline)",
      background: "var(--surface)",
      overflow: "hidden",
      boxShadow: "var(--sh-2)",
    }}>
      {/* Table header bar */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--hairline)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 2,
      }}>
        <div>
          <div style={{ font: "700 15px var(--sans)", color: "var(--ink)" }}>Manage Inventory</div>
          <div style={{ font: "500 11px var(--sans)", color: "var(--muted)", marginTop: 2 }}>
            Edit prices and stock levels inline, then save
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            borderRadius: 999,
            background: saved ? "var(--green)" : "var(--brand)",
            color: "#fff",
            border: "none",
            font: "700 12px var(--sans)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            boxShadow: saved
              ? "0 4px 16px -4px rgba(30,158,94,.45)"
              : "var(--sh-coral)",
            transition: "background 0.2s, box-shadow 0.2s",
            letterSpacing: ".02em",
          }}
        >
          {saved ? <Check size={13} /> : saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--hairline)" }}>
              {COLS.map((h) => (
                <th key={h} style={{
                  padding: "10px 20px",
                  font: "600 10px var(--sans)",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  textAlign: (h === "Item" || h === "Category") ? "left" : "right",
                  whiteSpace: "nowrap",
                  background: "var(--surface)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => <RowSkeleton key={i} />)
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "56px 20px", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--surface-2)", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "var(--muted-2)" }}>
                    <Package size={22} strokeWidth={1.5} />
                  </div>
                  <p style={{ font: "600 14px var(--sans)", color: "var(--ink)", margin: 0 }}>No items yet</p>
                  <p style={{ font: "500 12px var(--sans)", color: "var(--muted)", margin: "4px 0 0" }}>
                    Go to Menu to add items first.
                  </p>
                </td>
              </tr>
            ) : items.map((item, idx) => {
              const isLowOrOut = item.stock_quantity !== null && item.stock_quantity <= (item.low_stock_threshold || 10);
              const isHighlighted = highlightId === item.id;
              const isEven = idx % 2 === 0;

              return (
                  <tr
                    key={item.id}
                    id={`inv-row-${item.id}`}
                    style={{
                      borderLeft: isLowOrOut ? "3px solid rgba(224,58,48,.35)" : "3px solid transparent",
                      borderBottom: idx < items.length - 1 ? "1px solid rgba(20,19,26,.045)" : "none",
                      background: isHighlighted
                        ? "rgba(255,77,61,0.06)"
                        : isEven ? "var(--surface)" : "var(--bg)",
                      transition: "background 0.18s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isHighlighted ? "rgba(255,77,61,0.06)" : isEven ? "var(--surface)" : "var(--bg)")}
                  >
                    {/* Item name */}
                    <td style={{ padding: "13px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          background: isLowOrOut ? "rgba(224,58,48,.08)" : "var(--brand-soft)",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}>
                          <Package
                            size={13}
                            color={isLowOrOut ? "var(--red)" : "var(--brand)"}
                            strokeWidth={2.2}
                          />
                        </span>
                        <span style={{ font: "600 13px var(--sans)", color: "var(--ink)" }}>{item.name}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: "13px 20px", font: "500 12px var(--sans)", color: "var(--muted)" }}>
                      {item.category?.name || "—"}
                    </td>

                    {/* Status + bar */}
                    <td style={{ padding: "13px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <StatusBadge item={item} />
                        <StockLevelBar item={item} />
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ padding: "13px 20px", textAlign: "right" }}>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price || 0}
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,77,61,.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "var(--hairline)"; e.target.style.boxShadow = "none"; }}
                      />
                    </td>

                    {/* Stock qty */}
                    <td style={{ padding: "13px 20px", textAlign: "right" }}>
                      <input
                        type="number"
                        placeholder="∞"
                        value={item.stock_quantity === null ? "" : item.stock_quantity}
                        onChange={(e) => handleStockChange(item.id, e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,77,61,.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "var(--hairline)"; e.target.style.boxShadow = "none"; }}
                      />
                    </td>

                    {/* Alert threshold */}
                    <td style={{ padding: "13px 20px", textAlign: "right" }}>
                      <input
                        type="number"
                        value={item.low_stock_threshold || 10}
                        onChange={(e) => handleThresholdChange(item.id, e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,77,61,.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "var(--hairline)"; e.target.style.boxShadow = "none"; }}
                      />
                    </td>

                    {/* Restock */}
                    <td style={{ padding: "13px 20px", textAlign: "right" }}>
                      {isLowOrOut && (
                        <button
                          onClick={() => handleRestock(item.id)}
                          disabled={restocking === item.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "5px 12px",
                            borderRadius: 999,
                            background: "var(--brand)",
                            color: "#fff",
                            border: "none",
                            font: "700 10px var(--sans)",
                            cursor: restocking === item.id ? "not-allowed" : "pointer",
                            opacity: restocking === item.id ? 0.6 : 1,
                            boxShadow: "0 4px 12px -4px rgba(255,77,61,.4)",
                            letterSpacing: ".04em",
                            textTransform: "uppercase",
                            transition: "opacity 0.15s, transform 0.12s",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => { if (restocking !== item.id) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                        >
                          {restocking === item.id
                            ? <RefreshCw size={9} style={{ animation: "spin 1s linear infinite" }} />
                            : <Package size={9} />}
                          Restock
                        </button>
                      )}
                    </td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
