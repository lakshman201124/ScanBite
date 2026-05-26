"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { QueryProvider } from "@/components/providers/QueryProvider";

/* ═══════════════════════ TYPES ═══════════════════════ */
interface Restaurant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  brand_color: string | null;
  address: string | null;
  logo_url: string | null;
  gstin: string | null;
  cgst_rate: number | string | null;
  sgst_rate: number | string | null;
  plan: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "chef" | "waiter";
  is_active: boolean;
  created_at: string;
}

/* ═══════════════════════ SCHEMAS ═══════════════════════ */
const profileSchema = z.object({
  name:    z.string().min(2, "At least 2 characters").max(100),
  address: z.string().max(500).optional().or(z.literal("")),
  phone:   z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone").optional().or(z.literal("")),
  gstin:   z.string().max(20).optional().or(z.literal("")),
  logo_url: z.string().url("Invalid URL").optional().or(z.literal("")),
});

const brandSchema = z.object({
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex (e.g. var(--brand))"),
  logo_url:    z.string().url("Invalid URL").optional().or(z.literal("")),
});

const taxSchema = z.object({
  gstin:     z.string().max(20).optional().or(z.literal("")),
  cgst_rate: z.number().min(0).max(50),
  sgst_rate: z.number().min(0).max(50),
});

const staffSchema = z.object({
  name:  z.string().min(2, "At least 2 characters").max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone"),
  role:  z.enum(["chef", "waiter"]),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;
type BrandForm   = z.infer<typeof brandSchema>;
type TaxForm     = z.infer<typeof taxSchema>;
type StaffForm   = z.infer<typeof staffSchema>;

/* ═══════════════════════ CONSTANTS ═══════════════════════ */
const TABS = [
  { id: "profile",  label: "Restaurant",     ico: "" },
  { id: "branding", label: "Branding",        ico: "" },
  { id: "tax",      label: "Tax & Billing",   ico: "" },
  { id: "staff",    label: "Staff",           ico: "" },
  { id: "printer",  label: "Hardware",        ico: "️" },
  { id: "plan",     label: "Plan",            ico: "⭐" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BRAND_PRESETS = [
  "var(--brand)", "#E63B2C", "var(--green)", "#2E6EF7", "#D97706",
  "var(--brand)", "#DB2777", "#0F766E", "#059669", "#0284C7",
  "#171717", "#64748B",
];

/* ═══════════════════════ API HELPER ═══════════════════════ */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Request failed");
  return (json.data ?? json) as T;
}

/* ═══════════════════════ SMALL SHARED COMPONENTS ═══════════════════════ */
function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span style={{ font: "500 11px var(--sans)", color: "var(--red)", marginTop: 4, display: "block" }}>{msg}</span>;
}

function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", font: "600 11.5px var(--sans)", color: "var(--ink-2)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 6 }}>
      {children}{required && <span style={{ color: "var(--brand)", marginLeft: 3 }}>*</span>}
    </label>
  );
}

function Inp({ error, style, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      style={{
        width: "100%", padding: "10px 14px", boxSizing: "border-box",
        background: "var(--bg)", color: "var(--ink)",
        border: `1.5px solid ${error ? "var(--red)" : "var(--hairline)"}`,
        borderRadius: 10, font: "500 13.5px var(--sans)",
        outline: "none", transition: "border-color .15s, box-shadow .15s",
        ...style,
      }}
      onFocus={e  => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--brand)"; e.currentTarget.style.boxShadow = error ? "0 0 0 3px rgba(224,58,48,.12)" : "0 0 0 3px rgba(255,77,61,.12)"; }}
      onBlur={e   => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--hairline)"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function Textarea({ error, style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%", padding: "10px 14px", boxSizing: "border-box",
        background: "var(--bg)", color: "var(--ink)",
        border: `1.5px solid ${error ? "var(--red)" : "var(--hairline)"}`,
        borderRadius: 10, font: "500 13.5px var(--sans)",
        outline: "none", resize: "vertical", minHeight: 88,
        transition: "border-color .15s, box-shadow .15s",
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--brand)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,77,61,.12)"; }}
      onBlur={e  => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--hairline)"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 20, padding: "24px 28px", boxShadow: "var(--sh-1)", ...style }}>
      {children}
    </div>
  );
}

function CardHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ margin: 0, font: "700 16px var(--sans)", letterSpacing: "-.01em", color: "var(--ink)" }}>{title}</h2>
      {sub && <p style={{ margin: "3px 0 0", font: "500 12px var(--sans)", color: "var(--muted)" }}>{sub}</p>}
    </div>
  );
}

function SaveBtn({ loading, label = "Save changes" }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "10px 22px", borderRadius: 999,
        background: loading ? "var(--muted-2)" : "var(--brand)",
        color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer",
        font: "700 12.5px var(--sans)", letterSpacing: ".02em",
        boxShadow: loading ? "none" : "0 8px 24px -8px rgba(255,77,61,.55)",
        transition: "background .15s, box-shadow .15s",
      }}
    >
      {loading
        ? <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "sbSpin .7s linear infinite" }} />
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      }
      {loading ? "Saving…" : label}
    </button>
  );
}

/* ═══════════════════════ TAB: PROFILE ═══════════════════════ */
function ProfileTab({ restaurant, onSaved }: { restaurant: Restaurant; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name:     restaurant.name ?? "",
      address:  restaurant.address ?? "",
      phone:    restaurant.phone ?? "",
      gstin:    restaurant.gstin ?? "",
      logo_url: restaurant.logo_url ?? "",
    },
  });

  useEffect(() => {
    reset({ name: restaurant.name ?? "", address: restaurant.address ?? "", phone: restaurant.phone ?? "", gstin: restaurant.gstin ?? "", logo_url: restaurant.logo_url ?? "" });
  }, [restaurant, reset]);

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success("Profile saved");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHead title="Restaurant Profile" sub="Appears on customer menus and receipts." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <Lbl required>Restaurant Name</Lbl>
            <Inp {...register("name")} error={!!errors.name} placeholder="e.g. Spice Garden" />
            <Err msg={errors.name?.message} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Lbl>Address</Lbl>
            <Textarea {...register("address")} error={!!errors.address} placeholder="Street, Area, City, State, PIN" />
            <Err msg={errors.address?.message} />
          </div>
          <div>
            <Lbl>Phone Number</Lbl>
            <Inp {...register("phone")} error={!!errors.phone} placeholder="+91 98765 43210" />
            <Err msg={errors.phone?.message} />
          </div>
          <div>
            <Lbl>GSTIN</Lbl>
            <Inp {...register("gstin")} error={!!errors.gstin} placeholder="22AAAAA0000A1Z5"
              style={{ fontFamily: "var(--mono)", letterSpacing: ".04em" }}
              onChange={e => { e.target.value = e.target.value.toUpperCase(); register("gstin").onChange(e); }}
            />
            <Err msg={errors.gstin?.message} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Lbl>Logo URL</Lbl>
            <Inp {...register("logo_url")} error={!!errors.logo_url} placeholder="https://cdn.example.com/logo.png" />
            <Err msg={errors.logo_url?.message} />
          </div>
        </div>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--hairline-2)", display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn loading={saving} />
        </div>
      </Card>
    </form>
  );
}

/* ═══════════════════════ TAB: BRANDING ═══════════════════════ */
function BrandingTab({ restaurant, onSaved }: { restaurant: Restaurant; onSaved: () => void }) {
  const [saving, setSaving]     = useState(false);
  const [liveColor, setLiveColor] = useState(restaurant.brand_color ?? "var(--brand)");
  const colorRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
    defaultValues: { brand_color: restaurant.brand_color ?? "var(--brand)", logo_url: restaurant.logo_url ?? "" },
  });

  useEffect(() => {
    const c = restaurant.brand_color ?? "var(--brand)";
    reset({ brand_color: c, logo_url: restaurant.logo_url ?? "" });
    setLiveColor(c);
  }, [restaurant, reset]);

  const logoUrl = watch("logo_url");

  const setColor = (hex: string) => { setLiveColor(hex); setValue("brand_color", hex, { shouldValidate: true }); };

  const onSubmit = async (data: BrandForm) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success("Branding updated");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        <Card>
          <CardHead title="Brand Identity" sub="Color and logo used on all customer-facing menus." />

          {/* Color picker row */}
          <div style={{ marginBottom: 22 }}>
            <Lbl required>Brand Color</Lbl>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <button type="button" onClick={() => colorRef.current?.click()} style={{
                width: 46, height: 46, borderRadius: 12, flexShrink: 0, cursor: "pointer",
                background: liveColor, border: "2px solid var(--hairline)",
                boxShadow: `0 4px 14px -4px ${liveColor}90`, transition: "box-shadow .15s",
              }} />
              <input type="color" ref={colorRef} value={liveColor} onChange={e => setColor(e.target.value)}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }} />
              <div style={{ flex: 1 }}>
                <Inp
                  {...register("brand_color")}
                  error={!!errors.brand_color}
                  placeholder="var(--brand)"
                  style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".06em" }}
                  onChange={e => {
                    const v = e.target.value;
                    register("brand_color").onChange(e);
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) setColor(v);
                  }}
                />
                <Err msg={errors.brand_color?.message} />
              </div>
            </div>
            {/* Preset swatches */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {BRAND_PRESETS.map(hex => (
                <button key={hex} type="button" onClick={() => setColor(hex)} title={hex}
                  style={{
                    width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
                    background: hex, flexShrink: 0,
                    outline: liveColor.toLowerCase() === hex.toLowerCase() ? `2.5px solid ${hex}` : "none",
                    outlineOffset: 2,
                    transform: liveColor.toLowerCase() === hex.toLowerCase() ? "scale(1.18)" : "scale(1)",
                    transition: "transform .12s, outline .12s",
                    boxShadow: `0 2px 8px -2px ${hex}80`,
                  }} />
              ))}
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <Lbl>Logo URL</Lbl>
            <Inp {...register("logo_url")} error={!!errors.logo_url} placeholder="https://cdn.example.com/logo.png" />
            <Err msg={errors.logo_url?.message} />
            <p style={{ font: "500 11px var(--sans)", color: "var(--muted)", marginTop: 5 }}>PNG/SVG with transparent background. Used in the customer menu header.</p>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--hairline-2)", display: "flex", justifyContent: "flex-end" }}>
            <SaveBtn loading={saving} />
          </div>
        </Card>

        {/* Live Preview */}
        <Card style={{ padding: "20px 20px" }}>
          <p style={{ margin: "0 0 14px", font: "700 10px var(--sans)", color: "var(--muted)", letterSpacing: ".12em", textTransform: "uppercase" }}>Live Preview</p>
          <div style={{ background: "var(--bg)", border: "1px solid var(--hairline)", borderRadius: 14, overflow: "hidden" }}>
            {/* accent bar */}
            <div style={{ height: 3, background: `linear-gradient(90deg, ${liveColor} 0%, ${liveColor}99 100%)` }} />
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" onError={e => { e.currentTarget.style.display = "none"; }}
                    style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", border: "1px solid var(--hairline)" }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: liveColor, color: "#fff", display: "grid", placeItems: "center", font: "800 13px var(--sans)", flexShrink: 0 }}>
                    {restaurant.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ font: "700 13px var(--sans)", color: "var(--ink)" }}>{restaurant.name}</div>
                  <div style={{ font: "500 10px var(--sans)", color: "var(--muted)" }}>Table 4</div>
                </div>
              </div>
              <div style={{ background: "var(--surface)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ font: "600 12px var(--sans)", color: "var(--ink)" }}>Paneer Tikka</div>
                  <div style={{ font: "700 12px var(--sans)", color: liveColor, marginTop: 2 }}>₹280</div>
                </div>
                <span style={{ padding: "5px 12px", background: liveColor, color: "#fff", borderRadius: 999, font: "700 10px var(--sans)" }}>ADD</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--hairline)" }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: liveColor, flexShrink: 0 }} />
            <div>
              <div style={{ font: "700 11px var(--sans)" }}>{liveColor.toUpperCase()}</div>
              <div style={{ font: "500 10px var(--sans)", color: "var(--muted)" }}>Brand accent</div>
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}

/* ═══════════════════════ TAB: TAX ═══════════════════════ */
function TaxTab({ restaurant, onSaved }: { restaurant: Restaurant; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<TaxForm>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      gstin:     restaurant.gstin ?? "",
      cgst_rate: Number(restaurant.cgst_rate ?? 2.5),
      sgst_rate: Number(restaurant.sgst_rate ?? 2.5),
    },
  });

  useEffect(() => {
    reset({ gstin: restaurant.gstin ?? "", cgst_rate: Number(restaurant.cgst_rate ?? 2.5), sgst_rate: Number(restaurant.sgst_rate ?? 2.5) });
  }, [restaurant, reset]);

  const cgst  = Number(watch("cgst_rate")) || 0;
  const sgst  = Number(watch("sgst_rate")) || 0;
  const total = cgst + sgst;
  const SAMPLE = 500;

  const onSubmit = async (data: TaxForm) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gstin: data.gstin, cgst_rate: data.cgst_rate, sgst_rate: data.sgst_rate }) });
      toast.success("Tax settings saved");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
        <Card>
          <CardHead title="Tax & Billing" sub="GST rates applied to all orders and printed on bills." />
          <div style={{ marginBottom: 20 }}>
            <Lbl>GSTIN</Lbl>
            <Inp {...register("gstin")} error={!!errors.gstin} placeholder="22AAAAA0000A1Z5"
              style={{ fontFamily: "var(--mono)", letterSpacing: ".04em" }}
              onChange={e => { e.target.value = e.target.value.toUpperCase(); register("gstin").onChange(e); }}
            />
            <Err msg={errors.gstin?.message} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <Lbl>CGST Rate (%)</Lbl>
              <Inp {...register("cgst_rate", { valueAsNumber: true })} type="number" step="0.5" min="0" max="50" error={!!errors.cgst_rate} placeholder="2.5" />
              <Err msg={errors.cgst_rate?.message} />
            </div>
            <div>
              <Lbl>SGST Rate (%)</Lbl>
              <Inp {...register("sgst_rate", { valueAsNumber: true })} type="number" step="0.5" min="0" max="50" error={!!errors.sgst_rate} placeholder="2.5" />
              <Err msg={errors.sgst_rate?.message} />
            </div>
          </div>
          <div style={{ padding: "12px 14px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--hairline)", font: "500 12px var(--sans)", color: "var(--muted)", lineHeight: 1.6, marginBottom: 8 }}>
            <strong style={{ color: "var(--ink-2)" }}>Standard:</strong> Most dine-in restaurants use CGST 2.5% + SGST 2.5% = 5% total. Consult your CA for correct rates.
          </div>
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--hairline-2)", display: "flex", justifyContent: "flex-end" }}>
            <SaveBtn loading={saving} label="Save tax settings" />
          </div>
        </Card>

        {/* Bill preview */}
        <Card style={{ padding: "20px 22px" }}>
          <p style={{ margin: "0 0 16px", font: "700 10px var(--sans)", color: "var(--muted)", letterSpacing: ".12em", textTransform: "uppercase" }}>Bill Preview</p>
          <div style={{ font: "500 13px var(--sans)" }}>
            {([
              { l: "Subtotal",        v: `₹${SAMPLE.toFixed(2)}`,                  muted: false },
              { l: `CGST @ ${cgst}%`, v: `₹${(SAMPLE * cgst / 100).toFixed(2)}`,   muted: true },
              { l: `SGST @ ${sgst}%`, v: `₹${(SAMPLE * sgst / 100).toFixed(2)}`,   muted: true },
            ] as const).map(r => (
              <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--hairline-2)", color: r.muted ? "var(--muted)" : "var(--ink-2)" }}>
                <span>{r.l}</span><span>{r.v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", font: "800 14px var(--sans)" }}>
              <span style={{ color: "var(--ink)" }}>Total</span>
              <span style={{ color: "var(--brand)" }}>₹{(SAMPLE * (1 + total / 100)).toFixed(2)}</span>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: "9px 12px", background: "var(--brand-tint)", borderRadius: 10, font: "600 12px var(--sans)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Combined GST</span>
            <strong>{total.toFixed(2)}%</strong>
          </div>
        </Card>
      </div>
    </form>
  );
}

/* ═══════════════════════ TAB: STAFF ═══════════════════════ */
function StaffTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]       = useState(false);
  const [saving,   setSaving]         = useState(false);
  const [editId,   setEditId]         = useState<string | null>(null);
  const [deleteId, setDeleteId]       = useState<string | null>(null);

  const { data: staff = [], isLoading, error } = useQuery<StaffMember[]>({
    queryKey: ["settings-staff"],
    queryFn: () => apiFetch<StaffMember[]>("/api/admin/staff"),
    staleTime: 30_000,
  });

  const { register, handleSubmit, formState: { errors }, reset: resetForm } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", phone: "", role: "chef", email: "" },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["settings-staff"] });

  const addStaff = async (data: StaffForm) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success(`${data.name} added`);
      invalidate(); resetForm(); setShowForm(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (member: StaffMember) => {
    setEditId(member.id);
    try {
      await apiFetch("/api/admin/staff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id, is_active: !member.is_active }) });
      toast.success(member.is_active ? `${member.name} deactivated` : `${member.name} activated`);
      invalidate();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setEditId(null); }
  };

  const removeStaff = async (id: string) => {
    setEditId(id);
    try {
      await apiFetch(`/api/admin/staff?id=${id}`, { method: "DELETE" });
      toast.success("Removed");
      invalidate(); setDeleteId(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setEditId(null); }
  };

  const active  = staff.filter(s => s.is_active).length;
  const chefs   = staff.filter(s => s.role === "chef" && s.is_active).length;
  const waiters = staff.filter(s => s.role === "waiter" && s.is_active).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { l: "Active",  n: active,  c: "var(--green)",  bg: "var(--green-soft)" },
          { l: "Chefs",   n: chefs,   c: "var(--brand)",  bg: "var(--brand-tint)" },
          { l: "Waiters", n: waiters, c: "var(--blue)",   bg: "#EEF4FF" },
        ].map(s => (
          <div key={s.l} style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 16, padding: "16px 20px" }}>
            <div style={{ font: "800 26px var(--sans)", color: s.c, letterSpacing: "-.03em" }}>{s.n}</div>
            <div style={{ font: "500 11.5px var(--sans)", color: "var(--muted)", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <Card>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <CardHead title="Staff Management" sub="Chefs and waiters log in with their phone number." />
          <button type="button" onClick={() => { setShowForm(v => !v); resetForm(); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 999, border: "none", cursor: "pointer",
              font: "700 12px var(--sans)",
              background: showForm ? "var(--surface-2)" : "var(--brand)",
              color: showForm ? "var(--ink)" : "#fff",
              boxShadow: showForm ? "none" : "0 6px 20px -6px rgba(255,77,61,.55)",
              transition: "all .15s",
            }}
          >
            {showForm
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            }
            {showForm ? "Cancel" : "Add Staff"}
          </button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .22, ease: [0.16,1,0.3,1] }} style={{ overflow: "hidden" }}>
              <form onSubmit={handleSubmit(addStaff)}>
                <div style={{ background: "var(--brand-tint)", border: "1.5px solid rgba(255,77,61,.15)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
                  <p style={{ margin: "0 0 14px", font: "700 12px var(--sans)", color: "var(--brand)" }}>New Staff Member</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px", gap: 12 }}>
                    <div><Lbl required>Full Name</Lbl><Inp {...register("name")} error={!!errors.name} placeholder="Rajan Kumar" /><Err msg={errors.name?.message} /></div>
                    <div><Lbl required>Phone</Lbl><Inp {...register("phone")} error={!!errors.phone} placeholder="+91 98765 43210" /><Err msg={errors.phone?.message} /></div>
                    <div>
                      <Lbl required>Role</Lbl>
                      <select {...register("role")} style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", border: "1.5px solid var(--hairline)", borderRadius: 10, font: "500 13px var(--sans)", color: "var(--ink)", outline: "none", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B6A75' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: 14 }}>
                        <option value="chef">Chef</option>
                        <option value="waiter">Waiter</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}><Lbl>Email (optional)</Lbl><Inp {...register("email")} error={!!errors.email} placeholder="staff@restaurant.com" /><Err msg={errors.email?.message} /></div>
                  </div>
                  <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                    <SaveBtn loading={saving} label="Add to team" />
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Staff list */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 52, borderRadius: 10, background: "var(--surface-2)", animation: "sbShimmer 1.5s ease-in-out infinite" }} />)}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "32px 0", font: "500 13px var(--sans)", color: "var(--red)" }}>Failed to load staff. Refresh to try again.</div>
        ) : staff.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", border: "1.5px dashed var(--hairline)", borderRadius: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>‍</div>
            <p style={{ margin: "0 0 4px", font: "700 14px var(--sans)" }}>No staff yet</p>
            <p style={{ margin: 0, font: "500 12px var(--sans)", color: "var(--muted)" }}>Add chefs and waiters above.</p>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--hairline)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 110px 70px 90px", padding: "9px 16px", background: "var(--bg)", borderBottom: "1px solid var(--hairline)", font: "700 10px var(--sans)", color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>
              <span>Member</span><span>Phone</span><span>Role</span><span>Status</span><span style={{ textAlign: "right" }}>Actions</span>
            </div>
            {staff.map((m, i) => (
              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 150px 110px 70px 90px", padding: "13px 16px", alignItems: "center", borderBottom: i < staff.length - 1 ? "1px solid var(--hairline-2)" : "none", background: m.is_active ? "var(--surface)" : "var(--bg)", opacity: editId === m.id ? .5 : 1, transition: "opacity .15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.role === "chef" ? "var(--brand-tint)" : "#EEF4FF", color: m.role === "chef" ? "var(--brand)" : "var(--blue)", display: "grid", placeItems: "center", font: "800 12px var(--sans)", flexShrink: 0 }}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ font: "600 13px var(--sans)", color: m.is_active ? "var(--ink)" : "var(--muted)" }}>{m.name}</div>
                    {m.email && !m.email.endsWith("@staff.scanbite.app") && <div style={{ font: "500 10.5px var(--sans)", color: "var(--muted-2)" }}>{m.email}</div>}
                  </div>
                </div>
                <span style={{ font: "500 12px var(--mono)", color: "var(--muted)" }}>{m.phone ?? "—"}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, width: "fit-content", font: "700 10px var(--sans)", background: m.role === "chef" ? "var(--brand-tint)" : "#EEF4FF", color: m.role === "chef" ? "var(--brand)" : "var(--blue)" }}>
                  {m.role === "chef" ? "Chef" : "Waiter"}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, font: "600 11px var(--sans)", color: m.is_active ? "var(--green)" : "var(--muted)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.is_active ? "var(--green)" : "var(--muted-2)", flexShrink: 0 }} />
                  {m.is_active ? "On" : "Off"}
                </span>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                  <button type="button" onClick={() => toggleActive(m)} title={m.is_active ? "Deactivate" : "Activate"}
                    style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg)", border: "1px solid var(--hairline)", display: "grid", placeItems: "center", cursor: "pointer", color: m.is_active ? "var(--muted)" : "var(--green)" }}>
                    {m.is_active
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    }
                  </button>
                  <button type="button" onClick={() => setDeleteId(m.id)} title="Remove"
                    style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg)", border: "1px solid var(--hairline)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--red)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Confirm remove overlay */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(20,19,26,.45)", backdropFilter: "blur(4px)", zIndex: 100, display: "grid", placeItems: "center" }}
            onClick={() => setDeleteId(null)}
          >
            <motion.div initial={{ scale: .92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .92, y: 12 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "var(--surface)", borderRadius: 20, padding: "28px 32px", maxWidth: 360, width: "90%", boxShadow: "var(--sh-3)" }}
            >
              <div style={{ font: "700 16px var(--sans)", marginBottom: 8 }}>Remove staff member?</div>
              <p style={{ font: "500 13px var(--sans)", color: "var(--muted)", margin: "0 0 22px", lineHeight: 1.6 }}>Their account will be deactivated and they will lose login access immediately.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--hairline)", font: "600 12px var(--sans)", cursor: "pointer" }}>Cancel</button>
                <button type="button" onClick={() => removeStaff(deleteId)} style={{ flex: 1, padding: "10px 0", borderRadius: 999, background: "var(--red)", color: "#fff", border: "none", font: "700 12px var(--sans)", cursor: "pointer" }}>Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════ TAB: PRINTER ═══════════════════════ */
function PrinterTab() {
  const [paired,    setPaired]    = useState<string | null>(null);
  const [scanning,  setScanning]  = useState(false);
  const [found,     setFound]     = useState<string[]>([]);
  const [printing,  setPrinting]  = useState(false);

  useEffect(() => { const s = localStorage.getItem("paired_printer"); if (s) setPaired(s); }, []);

  const scan = () => {
    setScanning(true); setFound([]);
    setTimeout(() => { setFound(["TVS RP-3200", "Epson TM-T88VI", "Rugtek RP-80"]); setScanning(false); }, 1800);
  };
  const pair   = (p: string) => { setPaired(p); localStorage.setItem("paired_printer", p); setFound([]); toast.success(`Paired: ${p}`); };
  const forget = () => { setPaired(null); localStorage.removeItem("paired_printer"); toast.success("Printer removed"); };
  const testPrint = () => { setPrinting(true); setTimeout(() => { setPrinting(false); toast.success("Test receipt printed"); }, 1500); };

  return (
    <Card>
      <CardHead title="Hardware Printers" sub="Pair Bluetooth or network thermal printers for KOT and receipts." />
      {paired ? (
        <div>
          <div style={{ padding: "18px 20px", border: "1.5px solid rgba(30,158,94,.2)", borderRadius: 14, background: "rgba(30,158,94,.03)", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <p style={{ margin: "0 0 4px", font: "700 10px var(--sans)", color: "var(--green)", textTransform: "uppercase", letterSpacing: ".1em" }}>Paired Printer</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 0 3px rgba(30,158,94,.2)", display: "inline-block" }} />
                  <span style={{ font: "700 14px var(--sans)" }}>{paired}</span>
                </div>
              </div>
              <button type="button" onClick={forget} style={{ padding: "6px 14px", borderRadius: 999, background: "none", border: "1px solid rgba(224,58,48,.25)", color: "var(--red)", font: "600 12px var(--sans)", cursor: "pointer" }}>Forget</button>
            </div>
            <button type="button" onClick={testPrint} disabled={printing}
              style={{ width: "100%", padding: "11px 0", borderRadius: 999, background: "var(--ink)", color: "#fff", border: "none", font: "700 12px var(--sans)", cursor: printing ? "not-allowed" : "pointer", opacity: printing ? .6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              {printing && <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "sbSpin .7s linear infinite" }} />}
              {printing ? "Printing…" : "Print Test KOT"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ border: "2px dashed var(--hairline)", borderRadius: 14, padding: "40px 20px", textAlign: "center", marginBottom: 14 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 12px" }}>
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <p style={{ margin: "0 0 4px", font: "600 14px var(--sans)" }}>No printer paired</p>
            <p style={{ margin: "0 0 18px", font: "500 12px var(--sans)", color: "var(--muted)" }}>Pair a Bluetooth receipt printer for KOT printing.</p>
            <button type="button" onClick={scan} disabled={scanning}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 22px", borderRadius: 999, background: "var(--ink)", color: "#fff", border: "none", font: "700 12px var(--sans)", cursor: scanning ? "not-allowed" : "pointer", opacity: scanning ? .7 : 1 }}>
              {scanning && <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "sbSpin .7s linear infinite" }} />}
              {scanning ? "Scanning…" : "Scan for Printers"}
            </button>
          </div>
          <AnimatePresence>
            {found.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                style={{ border: "1px solid var(--hairline)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "9px 16px", background: "var(--bg)", borderBottom: "1px solid var(--hairline)", font: "700 10px var(--sans)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>Discovered</div>
                {found.map((p, i) => (
                  <div key={p} onClick={() => pair(p)} style={{ padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: i < found.length - 1 ? "1px solid var(--hairline-2)" : "none", font: "600 13px var(--sans)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span>{p}</span>
                    <span style={{ font: "700 10px var(--sans)", color: "var(--brand)", textTransform: "uppercase", letterSpacing: ".06em" }}>Pair</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════ TAB: PLAN ═══════════════════════ */
function PlanTab({ restaurant, onSaved }: { restaurant: Restaurant; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const upgradePlan = async (plan: string) => {
    if (restaurant.plan === plan) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      toast.success(`Upgraded to ${plan}`);
      onSaved(); setPending(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const plans = [
    { id: "starter", label: "Starter",  price: "Free",      sub: "Forever",         color: "var(--muted)",  features: ["5 Tables", "30 Menu Items", "Basic Analytics"], missing: ["Staff Accounts", "WhatsApp Bills", "Priority Support"] },
    { id: "growth",  label: "Growth",   price: "₹999",      sub: "/month",          color: "var(--blue)",   features: ["20 Tables", "200 Menu Items", "Staff Accounts", "WhatsApp Bills"], missing: ["Unlimited Tables", "Dynamic Modules"] },
    { id: "pro",     label: "Pro",      price: "₹2,499",    sub: "/month",          color: "var(--brand)",  features: ["Unlimited Tables", "Unlimited Items", "All Features", "Priority Support", "365-day Analytics"], missing: [] },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {plans.map(p => {
          const isCurrent = restaurant.plan === p.id;
          return (
            <div key={p.id} style={{ background: "var(--surface)", border: `1.5px solid ${isCurrent ? p.color : "var(--hairline)"}`, borderRadius: 18, padding: "20px 20px 20px", position: "relative", transition: "box-shadow .15s", boxShadow: isCurrent ? `0 8px 28px -10px ${p.color}60` : "none" }}>
              {isCurrent && <span style={{ position: "absolute", top: -1, right: 14, padding: "2px 9px", background: p.color, color: "#fff", font: "700 9px var(--sans)", letterSpacing: ".06em", borderRadius: "0 0 7px 7px" }}>CURRENT</span>}
              <div style={{ font: "800 13px var(--sans)", color: p.color, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{p.label}</div>
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 400, color: "var(--ink)" }}>{p.price}</span>
                <span style={{ font: "500 12px var(--sans)", color: "var(--muted)", marginLeft: 4 }}>{p.sub}</span>
              </div>
              <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 7, font: "500 12px var(--sans)", color: "var(--ink-2)" }}>
                    <span style={{ width: 16, height: 16, borderRadius: 5, background: "var(--green-soft)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.5 1.5L6.5 2" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    {f}
                  </li>
                ))}
                {p.missing.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 7, font: "500 12px var(--sans)", color: "var(--muted-2)" }}>
                    <span style={{ width: 16, height: 16, borderRadius: 5, background: "var(--surface-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2l4 4M6 2L2 6" stroke="var(--muted-2)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && (
                <button type="button" onClick={() => setPending(p.id)}
                  style={{ width: "100%", padding: "10px 0", borderRadius: 999, background: p.id === "pro" ? "var(--brand)" : "var(--ink)", color: "#fff", border: "none", font: "700 12px var(--sans)", cursor: "pointer", boxShadow: p.id === "pro" ? "var(--sh-coral)" : "none" }}>
                  Choose {p.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* QR Menu link card */}
      <Card>
        <CardHead title="Restaurant Links" sub="Share with customers or embed in QR codes." />
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--bg)", border: "1px solid var(--hairline)", borderRadius: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand-tint)", color: "var(--brand)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3M14 21h3v0"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "700 12px var(--sans)", color: "var(--ink)", marginBottom: 2 }}>Customer Menu URL</div>
            <div style={{ font: "500 12px var(--mono)", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {typeof window !== "undefined" ? window.location.origin : "https://scanbite.app"}/m/{restaurant.slug}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/m/${restaurant.slug}`); toast.success("Copied!"); }}
              style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--hairline)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <a href={`/m/${restaurant.slug}`} target="_blank" rel="noopener noreferrer"
              style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--hairline)", display: "grid", placeItems: "center", color: "var(--muted)", textDecoration: "none" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <div style={{ border: "1.5px solid rgba(224,58,48,.2)", borderRadius: 20, padding: "22px 26px", background: "rgba(224,58,48,.02)" }}>
        <h3 style={{ margin: "0 0 6px", font: "700 14px var(--sans)", color: "var(--red)" }}>Danger Zone</h3>
        <p style={{ margin: "0 0 16px", font: "500 12px var(--sans)", color: "var(--muted)", lineHeight: 1.6 }}>Permanent, irreversible actions. Contact support to proceed.</p>
        <button type="button" onClick={() => toast.error("Contact support to delete your account.")}
          style={{ padding: "9px 18px", borderRadius: 999, background: "none", color: "var(--red)", border: "1.5px solid rgba(224,58,48,.3)", font: "600 12px var(--sans)", cursor: "pointer" }}>
          Delete Restaurant Account
        </button>
      </div>

      {/* Confirm upgrade modal */}
      <AnimatePresence>
        {pending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(20,19,26,.45)", backdropFilter: "blur(4px)", zIndex: 100, display: "grid", placeItems: "center" }}
            onClick={() => setPending(null)}>
            <motion.div initial={{ scale: .92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .92, y: 12 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "var(--surface)", borderRadius: 20, padding: "28px 32px", maxWidth: 360, width: "90%", boxShadow: "var(--sh-3)" }}>
              <div style={{ font: "700 16px var(--sans)", marginBottom: 8 }}>Upgrade to {pending?.toUpperCase()}?</div>
              <p style={{ font: "500 13px var(--sans)", color: "var(--muted)", margin: "0 0 22px", lineHeight: 1.6 }}>This will change your active plan. Billing updates take effect immediately.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setPending(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--hairline)", font: "600 12px var(--sans)", cursor: "pointer" }}>Cancel</button>
                <button type="button" onClick={() => upgradePlan(pending!)} disabled={saving}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 999, background: "var(--brand)", color: "#fff", border: "none", font: "700 12px var(--sans)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .6 : 1 }}>
                  {saving ? "…" : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════ MAIN INNER COMPONENT ═══════════════════════ */
function SettingsFormInner({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(TABS.some(t => t.id === raw) ? (raw as TabId) : "profile");

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    router.push(`/dashboard/settings?tab=${id}`, { scroll: false });
  };

  const refreshPage = () => router.refresh();

  // Keep local restaurant state updated after saves
  const [current, setCurrent] = useState(restaurant);
  useEffect(() => { setCurrent(restaurant); }, [restaurant]);

  const onSaved = () => {
    refreshPage();
  };

  return (
    <>
      <style>{`
        @keyframes sbSpin    { to { transform: rotate(360deg); } }
        @keyframes sbShimmer { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>

      {/* ── Tab navigation ── */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid var(--hairline)",
        marginBottom: 24,
        overflowX: "auto",
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => handleTabChange(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "11px 18px", background: "none", border: "none", cursor: "pointer",
                font: "600 13px var(--sans)",
                color: active ? "var(--brand)" : "var(--muted)",
                borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent",
                marginBottom: -1, whiteSpace: "nowrap",
                transition: "color .15s",
              }}>
              <span style={{ fontSize: 13 }}>{tab.ico}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .18, ease: [0.16, 1, 0.3, 1] }}>
          {activeTab === "profile"  && <ProfileTab  restaurant={current} onSaved={onSaved} />}
          {activeTab === "branding" && <BrandingTab  restaurant={current} onSaved={onSaved} />}
          {activeTab === "tax"      && <TaxTab       restaurant={current} onSaved={onSaved} />}
          {activeTab === "staff"    && <StaffTab />}
          {activeTab === "printer"  && <PrinterTab />}
          {activeTab === "plan"     && <PlanTab      restaurant={current} onSaved={onSaved} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════ EXPORT (with QueryProvider) ═══════════════════════ */
export default function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  return (
    <QueryProvider>
      <SettingsFormInner restaurant={restaurant} />
    </QueryProvider>
  );
}
