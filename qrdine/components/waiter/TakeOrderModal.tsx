"use client";

import { useState, useMemo } from "react";
import { X, Plus, Minus, ShoppingBag, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  is_vegetarian?: boolean;
  category: { name: string };
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Props {
  tableId: string;
  tableName: string;
  menuItems: MenuItem[];
  onClose: () => void;
  onPlaced: (orderNumber: string) => void;
}

export function TakeOrderModal({ tableId, tableName, menuItems, onClose, onPlaced }: Props) {
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [notes, setNotes]       = useState("");
  const [search, setSearch]     = useState("");
  const [activeTab, setActive]  = useState<"menu" | "cart">("menu");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const categories = useMemo(() => [...new Set(menuItems.map(i => i.category.name))], [menuItems]);

  const filtered = useMemo(() =>
    menuItems.filter(i =>
      !search || i.name.toLowerCase().includes(search.toLowerCase())
    ),
    [menuItems, search]
  );

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function addItem(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function removeItem(menuItemId: string) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === menuItemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(c => c.menuItemId !== menuItemId);
      return prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }

  function getQty(menuItemId: string) {
    return cart.find(c => c.menuItemId === menuItemId)?.quantity ?? 0;
  }

  async function placeOrder() {
    if (cart.length === 0) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/waiter/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json() as { success: boolean; error?: string; data?: { orderNumber: string } };
      if (!res.ok || !data.success) { setError(data.error ?? "Failed to place order."); return; }
      onPlaced(data.data!.orderNumber);
    } catch { setError("Network error. Try again."); }
    finally { setLoading(false); }
  }

  const grouped = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    for (const item of filtered) {
      (map[item.category.name] ??= []).push(item);
    }
    return map;
  }, [filtered]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.7)" }}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{
          width: "100%", maxHeight: "92vh",
          background: "#18181b", borderRadius: "20px 20px 0 0",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 16px 0", borderBottom: "1px solid #27272a", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h2 style={{ font: "700 16px var(--sans,sans-serif)", color: "#fff", margin: 0 }}>
                Order for {tableName}
              </h2>
              <p style={{ font: "500 11px var(--sans,sans-serif)", color: "#71717a", margin: "2px 0 0" }}>
                {cartCount} items · ₹{cartTotal.toFixed(0)}
              </p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "#27272a", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#fff" }}>
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, marginBottom: 0 }}>
            {(["menu", "cart"] as const).map(tab => (
              <button key={tab} onClick={() => setActive(tab)}
                style={{
                  flex: 1, padding: "8px 0", background: "transparent", border: "none",
                  borderBottom: `2px solid ${activeTab === tab ? "#2E6EF7" : "transparent"}`,
                  color: activeTab === tab ? "#2E6EF7" : "#71717a",
                  font: `${activeTab === tab ? 700 : 500} 13px var(--sans,sans-serif)`,
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                {tab === "menu" ? "Menu" : (
                  <>Cart {cartCount > 0 && <span style={{ background: "#2E6EF7", color: "#fff", borderRadius: 999, padding: "1px 6px", font: "700 10px var(--sans,sans-serif)" }}>{cartCount}</span>}</>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <AnimatePresence mode="wait">

            {activeTab === "menu" && (
              <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Search */}
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#71717a" }} />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search menu…"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "#27272a", border: "1px solid #3f3f46",
                      borderRadius: 10, padding: "9px 12px 9px 30px",
                      color: "#fff", font: "500 13px var(--sans,sans-serif)", outline: "none",
                    }}
                  />
                </div>

                {/* Grouped items */}
                {categories.filter(cat => (grouped[cat]?.length ?? 0) > 0).map(cat => (
                  <div key={cat} style={{ marginBottom: 18 }}>
                    <p style={{ font: "700 11px var(--sans,sans-serif)", color: "#71717a", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{cat}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {grouped[cat]!.map(item => {
                        const qty = getQty(item.id);
                        return (
                          <div key={item.id} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            background: "#27272a", borderRadius: 12, padding: "10px 12px",
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {item.is_vegetarian !== undefined && (
                                  <span style={{ width: 10, height: 10, borderRadius: 2, border: `1.5px solid ${item.is_vegetarian ? "#22c55e" : "#ef4444"}`, display: "inline-block", flexShrink: 0 }}>
                                    <span style={{ display: "block", width: 5, height: 5, borderRadius: "50%", background: item.is_vegetarian ? "#22c55e" : "#ef4444", margin: "1.5px auto" }} />
                                  </span>
                                )}
                                <span style={{ font: "600 13px var(--sans,sans-serif)", color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                              </div>
                              <span style={{ font: "700 12px var(--sans,sans-serif)", color: "#fff", marginTop: 2, display: "block" }}>₹{item.price}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              {qty > 0 && (
                                <>
                                  <button onClick={() => removeItem(item.id)}
                                    style={{ width: 28, height: 28, borderRadius: 8, background: "#3f3f46", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#fff" }}>
                                    <Minus size={12} strokeWidth={2.5} />
                                  </button>
                                  <span style={{ font: "700 14px var(--sans,sans-serif)", color: "#fff", minWidth: 18, textAlign: "center" }}>{qty}</span>
                                </>
                              )}
                              <button onClick={() => addItem(item)}
                                style={{ width: 28, height: 28, borderRadius: 8, background: "#2E6EF7", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#fff" }}>
                                <Plus size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "cart" && (
              <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#52525b" }}>
                    <ShoppingBag size={32} style={{ margin: "0 auto 12px" }} />
                    <p style={{ font: "600 14px var(--sans,sans-serif)" }}>Cart is empty</p>
                    <p style={{ font: "500 12px var(--sans,sans-serif)", marginTop: 4 }}>Add items from the menu</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                      {cart.map(item => (
                        <div key={item.menuItemId} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: "#27272a", borderRadius: 12, padding: "10px 12px",
                        }}>
                          <span style={{ font: "600 13px var(--sans,sans-serif)", color: "#e4e4e7" }}>{item.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => removeItem(item.menuItemId)} style={{ width: 26, height: 26, borderRadius: 7, background: "#3f3f46", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#fff" }}>
                              <Minus size={11} strokeWidth={2.5} />
                            </button>
                            <span style={{ font: "700 14px var(--sans,sans-serif)", color: "#fff", minWidth: 18, textAlign: "center" }}>{item.quantity}</span>
                            <button onClick={() => addItem({ id: item.menuItemId, name: item.name, price: item.price, description: null, category: { name: "" }, is_vegetarian: undefined })} style={{ width: 26, height: 26, borderRadius: 7, background: "#2E6EF7", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#fff" }}>
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                            <span style={{ font: "700 12px var(--sans,sans-serif)", color: "#fff", minWidth: 44, textAlign: "right" }}>₹{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Kitchen notes (optional)…"
                      rows={2}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        background: "#27272a", border: "1px solid #3f3f46",
                        borderRadius: 10, padding: "9px 12px",
                        color: "#fff", font: "500 12px var(--sans,sans-serif)",
                        outline: "none", resize: "none", marginBottom: 14,
                      }}
                    />

                    {error && <p style={{ color: "#ef4444", font: "500 12px var(--sans,sans-serif)", marginBottom: 10 }}>{error}</p>}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "12px 14px", background: "#27272a", borderRadius: 12 }}>
                      <span style={{ font: "600 13px var(--sans,sans-serif)", color: "#a1a1aa" }}>Total ({cartCount} items)</span>
                      <span style={{ font: "800 18px var(--sans,sans-serif)", color: "#fff" }}>₹{cartTotal.toFixed(0)}</span>
                    </div>

                    <button
                      onClick={placeOrder}
                      disabled={loading || cart.length === 0}
                      style={{
                        width: "100%", height: 48, borderRadius: 12,
                        background: loading ? "#27272a" : "#2E6EF7",
                        color: "#fff", border: "none", cursor: "pointer",
                        font: "700 14px var(--sans,sans-serif)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {loading ? <><Loader2 size={16} className="animate-spin" /> Placing order…</> : <>Place Order · ₹{cartTotal.toFixed(0)}</>}
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
