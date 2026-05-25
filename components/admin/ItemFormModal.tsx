"use client";

import { useState, useEffect, useRef } from "react";
import type { MenuItem } from "@/types";

interface CustomizationOption { id: string; label: string; price_delta: number }
interface CustomizationGroup {
  tempId: string;
  name: string;
  group_type: "single" | "multi" | "required";
  is_required: boolean;
  options: CustomizationOption[];
}

interface Props {
  item: MenuItem | null;
  categoryId: string;
  onClose: () => void;
  onSaved: () => void;
}

const FOOD_TYPES = [
  { value: "veg",     label: "Veg",     color: "#1E9E5E" },
  { value: "non_veg", label: "Non-veg", color: "#C8462F" },
  { value: "egg",     label: "Egg",     color: "#E0A82E" },
  { value: "vegan",   label: "Vegan",   color: "#1E9E5E" },
];

function newGroup(): CustomizationGroup {
  return { tempId: Math.random().toString(36).slice(2), name: "", group_type: "single", is_required: false, options: [{ id: "opt1", label: "", price_delta: 0 }] };
}

function useImageUpload(onUrl: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setUploadError("Images only"); return; }
    if (file.size > 8 * 1024 * 1024) { setUploadError("Max 8 MB"); return; }
    setUploadError(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      onUrl(data.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return { uploading, uploadError, ref, handleFile };
}

export function ItemFormModal({ item, categoryId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item ? String(Number(item.price)) : "",
    food_type: item?.food_type ?? "veg",
    is_available: item?.is_available ?? true,
    is_featured: item?.is_featured ?? false,
    prep_time_minutes: item?.prep_time_minutes ? String(item.prep_time_minutes) : "",
    image_url: item?.image_url ?? "",
  });
  const [customizations, setCustomizations] = useState<CustomizationGroup[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { uploading, uploadError, ref: fileRef, handleFile } = useImageUpload(
    (url) => set("image_url", url)
  );

  // Load existing customizations when editing
  useEffect(() => {
    if (!item?.id) return;
    fetch(`/api/menu/items/${item.id}/customizations`)
      .then(r => r.json())
      .then(r => {
        if (r.data?.length) {
          setCustomizations(r.data.map((c: { id: string; name: string; options: CustomizationOption[]; is_required: boolean }) => ({
            tempId: c.id,
            name: c.name,
            group_type: (c.is_required ? "required" : "single") as "single" | "multi" | "required",
            is_required: c.is_required,
            options: c.options,
          })));
          setShowCustom(true);
        }
      })
      .catch(() => {});
  }, [item?.id]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const addGroup = () => setCustomizations(c => [...c, newGroup()]);
  const removeGroup = (tempId: string) => setCustomizations(c => c.filter(g => g.tempId !== tempId));
  const updateGroup = (tempId: string, patch: Partial<CustomizationGroup>) =>
    setCustomizations(c => c.map(g => g.tempId === tempId ? { ...g, ...patch } : g));

  const addOption = (tempId: string) =>
    setCustomizations(c => c.map(g => g.tempId === tempId
      ? { ...g, options: [...g.options, { id: `opt${Date.now()}`, label: "", price_delta: 0 }] }
      : g));
  const removeOption = (tempId: string, optId: string) =>
    setCustomizations(c => c.map(g => g.tempId === tempId
      ? { ...g, options: g.options.filter(o => o.id !== optId) }
      : g));
  const updateOption = (tempId: string, optId: string, patch: Partial<CustomizationOption>) =>
    setCustomizations(c => c.map(g => g.tempId === tempId
      ? { ...g, options: g.options.map(o => o.id === optId ? { ...o, ...patch } : o) }
      : g));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    setSaving(true); setError("");
    try {
      const rawPrice = parseFloat(form.price);
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Math.round(rawPrice * 100) / 100,
        food_type: form.food_type,
        is_available: form.is_available,
        is_featured: form.is_featured,
        prep_time_minutes: form.prep_time_minutes ? parseInt(form.prep_time_minutes) : null,
        image_url: form.image_url.trim() || undefined,
        ...(!item && { category_id: categoryId }),
      };
      const res = await fetch(
        item ? `/api/menu/items/${item.id}` : "/api/menu/items",
        { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!res.ok) {
        const d = await res.json() as { error?: string; fields?: Record<string, string[]> };
        const fieldMsg = d.fields ? Object.entries(d.fields).map(([f, msgs]) => `${f}: ${msgs[0]}`).join("; ") : "";
        throw new Error(fieldMsg || d.error || "Failed to save item");
      }
      const saved = await res.json();
      const itemId = item?.id ?? saved.data?.id;

      // Save customizations
      if (itemId && customizations.length > 0) {
        const valid = customizations.filter(g => g.name.trim() && g.options.some(o => o.label.trim()));
        if (valid.length > 0) {
          await fetch(`/api/menu/items/${itemId}/customizations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customizations: valid.map(g => ({
                name: g.name,
                group_type: g.group_type,
                is_required: g.is_required,
                options: g.options.filter(o => o.label.trim()).map(o => ({ id: o.id, label: o.label, price_delta: Number(o.price_delta) || 0 })),
              })),
            }),
          });
        }
      } else if (itemId && item && customizations.length === 0) {
        // Clear all customizations
        await fetch(`/api/menu/items/${itemId}/customizations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customizations: [] }),
        });
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    display: "block", width: "100%", marginTop: 6,
    padding: "11px 14px", border: "1px solid var(--hairline)", borderRadius: 12,
    fontSize: 14, fontFamily: "var(--sans)", background: "var(--bg)", color: "var(--ink)",
    outline: "none", boxSizing: "border-box", ...style,
  });

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,33,26,.4)", backdropFilter: "blur(4px)", overflowY: "auto", padding: "20px 0" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--surface)", borderRadius: 24, padding: 28, width: 520, boxShadow: "var(--sh-3)", fontFamily: "var(--sans)", margin: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, letterSpacing: "-.01em", color: "var(--ink)" }}>
          {item ? "Edit item" : "New item"}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>Item name *</span>
            <input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. Paneer Tikka" style={inp()} />
          </label>

          {/* Price */}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>Price (₹) *</span>
            <input type="number" min="0" step="0.5" value={form.price} onChange={e => set("price", e.target.value)} required placeholder="280" style={inp()} />
          </label>

          {/* Food type */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>Food type</span>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {FOOD_TYPES.map(ft => (
                <button key={ft.value} type="button" onClick={() => set("food_type", ft.value)}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1.5px solid ${form.food_type === ft.value ? ft.color : "var(--hairline)"}`, background: form.food_type === ft.value ? `${ft.color}15` : "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: 700, color: form.food_type === ft.value ? ft.color : "var(--muted)", fontFamily: "var(--sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: ft.color, display: "inline-block" }} />
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>Description</span>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Short description for customers" style={{ ...inp(), resize: "none" }} />
          </label>

          {/* Prep time */}
          <div style={{ marginBottom: 14 }}>
            <label>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>Prep time (min)</span>
              <input type="number" min="1" max="180" value={form.prep_time_minutes} onChange={e => set("prep_time_minutes", e.target.value)} placeholder="15" style={inp()} />
            </label>
          </div>

          {/* Image upload */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 8 }}>
              Photo
            </span>

            {/* Preview / drop zone */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              style={{
                border: `2px dashed ${form.image_url ? "var(--hairline)" : "var(--brand)"}`,
                borderRadius: 16, overflow: "hidden",
                background: form.image_url ? "transparent" : "var(--brand-tint)",
                minHeight: 120, position: "relative",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={() => !form.image_url && fileRef.current?.click()}
            >
              {form.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.image_url}
                    alt="preview"
                    style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                  />
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); set("image_url", ""); }}
                    style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%", background: "rgba(20,19,26,.7)", border: 0, color: "#fff", cursor: "pointer", fontSize: 16, display: "grid", placeItems: "center" }}
                    title="Remove photo"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                    style={{ position: "absolute", bottom: 8, right: 8, padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,.92)", border: 0, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--sans)", display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Replace
                  </button>
                </>
              ) : uploading ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <div style={{ width: 28, height: 28, border: "3px solid var(--brand-soft)", borderTopColor: "var(--brand)", borderRadius: "50%", margin: "0 auto 10px", animation: "spin .7s linear infinite" }} />
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Uploading…</p>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : (
                <div style={{ padding: "20px 16px", textAlign: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--brand-soft)", display: "grid", placeItems: "center", margin: "0 auto 10px", color: "var(--brand)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>Upload photo</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>Drag & drop or click · JPG, PNG, WebP · max 8 MB</p>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />

            {/* Fallback URL input */}
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>or paste URL</span>
              <input
                value={form.image_url}
                onChange={e => set("image_url", e.target.value)}
                placeholder="https://..."
                style={{ ...inp({ marginTop: 0, fontSize: 12, padding: "8px 12px" }) }}
              />
            </div>

            {uploadError && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--red)", fontWeight: 600 }}>{uploadError}</p>
            )}
          </div>

          {/* Toggles */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            {[{ key: "is_available", label: "Available" }, { key: "is_featured", label: "⭐ Bestseller" }].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
                <button type="button" onClick={() => set(key, !(form as Record<string, unknown>)[key])}
                  style={{ width: 36, height: 20, borderRadius: 999, background: (form as Record<string, unknown>)[key] ? "var(--brand)" : "var(--surface-2)", border: 0, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s" }}
                >
                  <span style={{ position: "absolute", top: 3, left: (form as Record<string, unknown>)[key] ? 19 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "var(--sh-1)", transition: "left .2s" }} />
                </button>
                {label}
              </label>
            ))}
          </div>

          {/* ── Customizations section ───────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <button type="button" onClick={() => setShowCustom(v => !v)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--hairline)", borderRadius: 12, cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 700, fontSize: 13, color: "var(--ink)" }}
            >
              <span>Customizations {customizations.length > 0 && <span style={{ color: "var(--accent)" }}>({customizations.length} groups)</span>}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showCustom ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6"/></svg>
            </button>

            {showCustom && (
              <div style={{ marginTop: 12, padding: "14px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--hairline)" }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted)" }}>
                  Add option groups (Spice Level, Add-ons, Size…). Customers choose before adding to cart.
                </p>

                {customizations.map((group, gi) => (
                  <div key={group.tempId} style={{ background: "var(--surface)", borderRadius: 12, padding: 14, marginBottom: 12, border: "1px solid var(--hairline)" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <input value={group.name} onChange={e => updateGroup(group.tempId, { name: e.target.value })} placeholder={`Group name (e.g. Spice Level)`}
                        style={{ flex: 1, padding: "9px 12px", border: "1px solid var(--hairline)", borderRadius: 10, fontSize: 13, fontFamily: "var(--sans)", background: "var(--bg)", color: "var(--ink)", outline: "none" }} />
                      <select value={group.group_type} onChange={e => updateGroup(group.tempId, { group_type: e.target.value as "single" | "multi" | "required", is_required: e.target.value === "required" })}
                        style={{ padding: "9px 12px", border: "1px solid var(--hairline)", borderRadius: 10, fontSize: 12, fontFamily: "var(--sans)", background: "var(--bg)", color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                        <option value="single">Single choice</option>
                        <option value="multi">Multi choice</option>
                        <option value="required">Required</option>
                      </select>
                      <button type="button" onClick={() => removeGroup(group.tempId)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(200,70,47,.2)", background: "rgba(200,70,47,.06)", color: "var(--red)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
                      </button>
                    </div>

                    {group.options.map((opt, oi) => (
                      <div key={opt.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <input value={opt.label} onChange={e => updateOption(group.tempId, opt.id, { label: e.target.value })} placeholder={`Option ${oi + 1} (e.g. Mild)`}
                          style={{ flex: 2, padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 12, fontFamily: "var(--sans)", background: "var(--bg)", color: "var(--ink)", outline: "none" }} />
                        <input type="number" min="0" step="0.5" value={opt.price_delta || ""} onChange={e => updateOption(group.tempId, opt.id, { price_delta: parseFloat(e.target.value) || 0 })} placeholder="₹0"
                          style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 12, fontFamily: "var(--sans)", background: "var(--bg)", color: "var(--ink)", outline: "none" }} />
                        {group.options.length > 1 && (
                          <button type="button" onClick={() => removeOption(group.tempId, opt.id)}
                            style={{ width: 28, borderRadius: 6, border: "1px solid var(--hairline)", background: "var(--surface-2)", color: "var(--muted)", cursor: "pointer", fontSize: 14 }}>×</button>
                        )}
                      </div>
                    ))}

                    <button type="button" onClick={() => addOption(group.tempId)}
                      style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", background: "none", border: 0, cursor: "pointer", padding: "4px 0", fontFamily: "var(--sans)" }}>
                      + Add option
                    </button>
                    {gi < customizations.length - 1 && <div style={{ marginTop: 8 }} />}
                  </div>
                ))}

                <button type="button" onClick={addGroup}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px dashed var(--brand)", background: "var(--brand-tint)", color: "var(--brand)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--sans)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  Add group
                </button>
              </div>
            )}
          </div>

          {error && <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--surface)", color: "var(--ink-2)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--sans)" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1.5, padding: "12px 0", borderRadius: 12, border: 0, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--sans)", boxShadow: "var(--sh-brand)", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : item ? "Save changes" : "Add to menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
