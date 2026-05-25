"use client";

import { useState } from "react";
import type { MenuCategory } from "@/types";

interface Props {
  category: MenuCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryFormModal({ category, onClose, onSaved }: Props) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        category ? `/api/menu/categories/${category.id}` : "/api/menu/categories",
        {
          method: category ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
        }
      );
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,33,26,.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div style={{ background: "var(--surface)", borderRadius: 24, padding: 28, width: 400, boxShadow: "var(--sh-3)", fontFamily: "var(--sans)" }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, letterSpacing: "-.01em", color: "var(--ink)" }}>
          {category ? "Edit category" : "New category"}
        </h2>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", letterSpacing: ".02em" }}>Name *</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Starters, Main Course, Beverages"
              required
              style={{ display: "block", width: "100%", marginTop: 6, padding: "12px 14px", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 14, fontFamily: "var(--sans)", background: "var(--bg)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", letterSpacing: ".02em" }}>Description</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional short description"
              style={{ display: "block", width: "100%", marginTop: 6, padding: "12px 14px", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 14, fontFamily: "var(--sans)", background: "var(--bg)", color: "var(--ink)", outline: "none", resize: "none", boxSizing: "border-box" }}
            />
          </label>

          {error && <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--surface)", color: "var(--ink-2)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--sans)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: 0, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--sans)", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : category ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
