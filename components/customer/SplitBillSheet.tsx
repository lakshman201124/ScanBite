"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
}

interface Props {
  orderId: string;
  total: number;
  items: OrderItem[];
  onClose: () => void;
}

type SplitMode = "equal" | "by_item" | "custom";

interface SplitResult {
  person: number;
  amount: number;
  items: string[] | null;
}

export function SplitBillSheet({ orderId, total, items, onClose }: Props) {
  const [mode, setMode] = useState<SplitMode>("equal");
  const [people, setPeople] = useState(2);
  const [customAmounts, setCustomAmounts] = useState<number[]>([0, 0]);
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SplitResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function calculateSplit() {
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = { order_id: orderId, mode };
      if (mode === "equal") body.people = people;
      if (mode === "by_item") {
        const byPerson: Record<number, string[]> = {};
        for (const [itemId, personIdx] of Object.entries(assignments)) {
          if (!byPerson[personIdx]) byPerson[personIdx] = [];
          byPerson[personIdx].push(itemId);
        }
        body.assignments = Object.entries(byPerson).map(([idx, item_ids]) => ({
          person_index: parseInt(idx),
          item_ids,
        }));
      }
      if (mode === "custom") body.custom_amounts = customAmounts;

      const res = await fetch("/api/customer/bills/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Calculation failed");
      setResult(data.data.splits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate split");
    } finally {
      setLoading(false);
    }
  }

  const TABS: Array<{ id: SplitMode; label: string }> = [
    { id: "equal", label: "Equal" },
    { id: "by_item", label: "By Item" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          style={{ background: "var(--bg)", borderRadius: "24px 24px 0 0", padding: "28px 20px 48px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--hairline)", margin: "0 auto 24px" }} />
          <h2 style={{ margin: "0 0 4px", font: "800 20px var(--sans)", color: "var(--ink)", letterSpacing: "-.01em" }}>Split Bill</h2>
          <p style={{ margin: "0 0 20px", font: "500 13px var(--sans)", color: "var(--muted)" }}>Total: ₹{total.toFixed(2)}</p>

          {/* Mode tabs */}
          <div style={{ display: "flex", background: "var(--surface)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setMode(t.id); setResult(null); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: 0, font: "600 13px var(--sans)", cursor: "pointer", background: mode === t.id ? "var(--bg)" : "transparent", color: mode === t.id ? "var(--ink)" : "var(--muted)", boxShadow: mode === t.id ? "0 1px 6px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Equal split */}
          {mode === "equal" && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ font: "600 12px var(--sans)", color: "var(--muted)", display: "block", marginBottom: 8 }}>Number of people</label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button onClick={() => setPeople(Math.max(2, people - 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--hairline)", background: "var(--surface)", font: "700 18px var(--sans)", cursor: "pointer", color: "var(--ink)" }}>−</button>
                <span style={{ font: "800 24px var(--sans)", color: "var(--ink)", minWidth: 32, textAlign: "center" }}>{people}</span>
                <button onClick={() => setPeople(Math.min(20, people + 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--hairline)", background: "var(--surface)", font: "700 18px var(--sans)", cursor: "pointer", color: "var(--ink)" }}>+</button>
                <span style={{ font: "500 13px var(--sans)", color: "var(--muted)", marginLeft: 8 }}>≈ ₹{(total / people).toFixed(2)} each</span>
              </div>
            </div>
          )}

          {/* By item */}
          {mode === "by_item" && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ font: "600 12px var(--sans)", color: "var(--muted)", margin: "0 0 10px" }}>Assign each item to a person</p>
              {items.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface)", borderRadius: 12, marginBottom: 8 }}>
                  <div>
                    <div style={{ font: "600 13px var(--sans)", color: "var(--ink)" }}>{item.item_name} × {item.quantity}</div>
                    <div style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>₹{(Number(item.item_price) * item.quantity).toFixed(2)}</div>
                  </div>
                  <select
                    value={assignments[item.id] ?? ""}
                    onChange={(e) => setAssignments({ ...assignments, [item.id]: parseInt(e.target.value) })}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--hairline)", font: "13px var(--sans)", background: "var(--bg)", color: "var(--ink)" }}
                  >
                    <option value="">Unassigned</option>
                    {Array.from({ length: 6 }, (_, i) => (
                      <option key={i} value={i}>Person {i + 1}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Custom */}
          {mode === "custom" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ font: "600 12px var(--sans)", color: "var(--muted)" }}>Custom amounts</span>
                <span style={{ font: "600 12px var(--sans)", color: customAmounts.reduce((s, a) => s + a, 0) !== total ? "var(--red)" : "var(--green)" }}>
                  Sum: ₹{customAmounts.reduce((s, a) => s + a, 0).toFixed(2)} / ₹{total.toFixed(2)}
                </span>
              </div>
              {customAmounts.map((amt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ font: "600 13px var(--sans)", color: "var(--ink-2)", minWidth: 64 }}>Person {i + 1}</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "8px 12px" }}>
                    <span style={{ font: "600 13px var(--sans)", color: "var(--muted)", marginRight: 4 }}>₹</span>
                    <input
                      type="number"
                      value={amt}
                      onChange={(e) => {
                        const newAmts = [...customAmounts];
                        newAmts[i] = parseFloat(e.target.value) || 0;
                        setCustomAmounts(newAmts);
                      }}
                      style={{ flex: 1, border: 0, outline: "none", font: "600 14px var(--sans)", background: "transparent", color: "var(--ink)" }}
                    />
                  </div>
                  {customAmounts.length > 2 && (
                    <button onClick={() => setCustomAmounts(customAmounts.filter((_, j) => j !== i))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--surface)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--red)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setCustomAmounts([...customAmounts, 0])} style={{ padding: "8px 16px", borderRadius: 10, border: "1px dashed var(--hairline)", background: "transparent", font: "600 13px var(--sans)", color: "var(--muted)", cursor: "pointer" }}>
                + Add person
              </button>
            </div>
          )}

          {error && <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--red)" }}>{error}</p>}

          {/* Calculate button */}
          {!result && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={calculateSplit}
              disabled={loading}
              style={{ width: "100%", padding: "14px 0", borderRadius: 999, background: "var(--brand)", color: "#fff", border: 0, font: "700 15px var(--sans)", cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Calculating…" : "Calculate Split"}
            </motion.button>
          )}

          {/* Results */}
          {result && (
            <div>
              <h3 style={{ margin: "0 0 12px", font: "700 14px var(--sans)", color: "var(--ink)" }}>Split breakdown</h3>
              {result.map((split) => (
                <div key={split.person} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface)", borderRadius: 12, marginBottom: 8 }}>
                  <div>
                    <div style={{ font: "700 14px var(--sans)", color: "var(--ink)" }}>Person {split.person}</div>
                    {split.items && <div style={{ font: "500 11px var(--sans)", color: "var(--muted)", marginTop: 2 }}>{split.items.join(", ")}</div>}
                  </div>
                  <span style={{ font: "800 16px var(--sans)", color: "var(--brand)" }}>₹{split.amount.toFixed(2)}</span>
                </div>
              ))}
              <button onClick={() => setResult(null)} style={{ marginTop: 12, width: "100%", padding: "12px 0", borderRadius: 999, background: "var(--surface)", border: "1.5px solid var(--hairline)", font: "600 14px var(--sans)", color: "var(--ink-2)", cursor: "pointer" }}>
                Recalculate
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
