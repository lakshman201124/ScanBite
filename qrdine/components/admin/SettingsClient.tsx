"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

/* ═══════════════════════ ICONS ═══════════════════════ */
const IcoBuilding = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="16" y2="12"/>
  </svg>
);
const IcoPaint = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10v.5a2 2 0 0 1-4 0V12c0-3.31-2.69-6-6-6s-6 2.69-6 6 2.69 6 6 6h5"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);
const IcoReceipt = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
    <path d="M14 8H8M16 12H8M12 16H8"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoCard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);
const IcoSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IcoCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IcoExternal = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoStar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IcoShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IcoChef = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h2V5h2v2h2"/><path d="M14 7h2V5h2v2h2"/><path d="M4 12h16"/>
    <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>
  </svg>
);
const IcoQR = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3M14 21h3v0"/>
  </svg>
);

/* ═══════════════════════ TYPES ═══════════════════════ */
interface RestaurantSettings {
  name: string;
  address: string | null;
  phone: string | null;
  gstin: string | null;
  logo_url: string | null;
  brand_color: string;
  cgst_rate: number;
  sgst_rate: number;
  plan: "starter" | "growth" | "pro";
  slug: string;
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
  name: z.string().min(2, "At least 2 characters").max(100),
  address: z.string().max(500).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  gstin: z.string().max(20).optional().or(z.literal("")),
});

const brandingSchema = z.object({
  logo_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color (e.g. #FF4D3D)"),
});

const taxSchema = z.object({
  cgst_rate: z.number().min(0, "Min 0").max(50, "Max 50"),
  sgst_rate: z.number().min(0, "Min 0").max(50, "Max 50"),
});

const staffSchema = z.object({
  name: z.string().min(2, "At least 2 characters").max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number"),
  role: z.enum(["chef", "waiter"]),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;
type BrandingForm = z.infer<typeof brandingSchema>;
type TaxForm = z.infer<typeof taxSchema>;
type StaffForm = z.infer<typeof staffSchema>;

/* ═══════════════════════ CONSTANTS ═══════════════════════ */
const TABS = [
  { id: "profile",  label: "Restaurant",   icon: IcoBuilding, sub: "Basic info" },
  { id: "branding", label: "Branding",      icon: IcoPaint,    sub: "Colors & logo" },
  { id: "billing",  label: "Tax & Billing", icon: IcoReceipt,  sub: "GST rates" },
  { id: "staff",    label: "Staff",         icon: IcoUsers,    sub: "Team" },
  { id: "account",  label: "Account",       icon: IcoCard,     sub: "Plan" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BRAND_PRESETS = [
  "#FF4D3D", "#E63B2C", "#1E9E5E", "#2E6EF7", "#D97706",
  "#7C3AED", "#DB2777", "#0F766E", "#059669", "#1D4ED8",
  "#171717", "#64748B",
];

const PLAN_META = {
  starter: { label: "Starter",  color: "var(--muted)",  bg: "var(--surface-2)", items: "Up to 100 menu items",  tables: "Up to 10 tables",  staff: "1 chef account" },
  growth:  { label: "Growth",   color: "var(--blue)",   bg: "#EEF4FF",           items: "Up to 500 menu items", tables: "Up to 50 tables",  staff: "5 staff accounts" },
  pro:     { label: "Pro",      color: "var(--brand)",  bg: "var(--brand-tint)", items: "Unlimited items",      tables: "Unlimited tables", staff: "Unlimited staff" },
};

/* ═══════════════════════ HELPERS ═══════════════════════ */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Request failed");
  return json.data ?? json;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span style={{ font: "500 11px var(--sans)", color: "var(--red)", marginTop: 4, display: "block" }}>
      {msg}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ font: "600 12px var(--sans)", color: "var(--ink-2)", letterSpacing: ".02em", display: "block", marginBottom: 6 }}>
      {children}
    </label>
  );
}

function Input({
  error, style, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      style={{
        width: "100%", padding: "10px 14px",
        background: "var(--bg)",
        border: `1.5px solid ${error ? "var(--red)" : "var(--hairline)"}`,
        borderRadius: "var(--r-1)",
        font: "500 14px var(--sans)", color: "var(--ink)",
        outline: "none", transition: "border-color 0.15s",
        boxSizing: "border-box",
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--brand)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--hairline)"; }}
    />
  );
}

function Textarea({
  error, style, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%", padding: "10px 14px",
        background: "var(--bg)",
        border: `1.5px solid ${error ? "var(--red)" : "var(--hairline)"}`,
        borderRadius: "var(--r-1)",
        font: "500 14px var(--sans)", color: "var(--ink)",
        outline: "none", resize: "vertical", minHeight: 80,
        transition: "border-color 0.15s",
        boxSizing: "border-box",
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--brand)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = error ? "var(--red)" : "var(--hairline)"; }}
    />
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--hairline)",
      borderRadius: "var(--r-3)",
      padding: "28px 32px",
      ...style,
    }}>
      {children}
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
        padding: "10px 20px",
        background: loading ? "var(--muted-2)" : "var(--brand)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--r-pill)",
        font: "700 13px var(--sans)",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: loading ? "none" : "var(--sh-coral)",
        transition: "background 0.15s, box-shadow 0.15s",
      }}
    >
      {loading ? (
        <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
      ) : <IcoSave />}
      {loading ? "Saving…" : label}
    </button>
  );
}

/* ═══════════════════════ SKELETON ═══════════════════════ */
function SettingsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: "var(--surface-2)", borderRadius: "var(--r-2)", height: 56, animation: "shimmer 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );
}

/* ═══════════════════════ PROFILE SECTION ═══════════════════════ */
function ProfileSection({ settings, onSaved }: { settings: RestaurantSettings; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name:    settings.name,
      address: settings.address ?? "",
      phone:   settings.phone ?? "",
      gstin:   settings.gstin ?? "",
    },
  });

  useEffect(() => {
    reset({
      name:    settings.name,
      address: settings.address ?? "",
      phone:   settings.phone ?? "",
      gstin:   settings.gstin ?? "",
    });
  }, [settings, reset]);

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success("Restaurant profile updated");
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SectionCard>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, font: "700 18px var(--sans)", letterSpacing: "-.01em" }}>Restaurant Profile</h2>
          <p style={{ margin: "4px 0 0", font: "500 13px var(--sans)", color: "var(--muted)" }}>
            This information appears on receipts and the customer menu.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <Label>Restaurant Name *</Label>
            <Input {...register("name")} error={!!errors.name} placeholder="e.g. Spice Garden" />
            <FieldError msg={errors.name?.message} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <Label>Address</Label>
            <Textarea
              {...register("address")}
              error={!!errors.address}
              placeholder="Street, City, State, PIN"
            />
            <FieldError msg={errors.address?.message} />
          </div>

          <div>
            <Label>Phone Number</Label>
            <Input {...register("phone")} error={!!errors.phone} placeholder="+91 98765 43210" />
            <FieldError msg={errors.phone?.message} />
          </div>

          <div>
            <Label>GSTIN</Label>
            <Input
              {...register("gstin")}
              error={!!errors.gstin}
              placeholder="22AAAAA0000A1Z5"
              style={{ fontFamily: "var(--mono)", letterSpacing: ".04em" }}
            />
            <FieldError msg={errors.gstin?.message} />
          </div>
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "flex-end" }}>
          <SaveBtn loading={saving} />
        </div>
      </SectionCard>
    </form>
  );
}

/* ═══════════════════════ BRANDING SECTION ═══════════════════════ */
function BrandingSection({ settings, onSaved }: { settings: RestaurantSettings; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [liveColor, setLiveColor] = useState(settings.brand_color ?? "#FF4D3D");
  const colorInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logo_url:    settings.logo_url ?? "",
      brand_color: settings.brand_color ?? "#FF4D3D",
    },
  });

  useEffect(() => {
    reset({
      logo_url:    settings.logo_url ?? "",
      brand_color: settings.brand_color ?? "#FF4D3D",
    });
    setLiveColor(settings.brand_color ?? "#FF4D3D");
  }, [settings, reset]);

  const watchedLogo = watch("logo_url");

  const setColor = (hex: string) => {
    setLiveColor(hex);
    setValue("brand_color", hex, { shouldValidate: true });
  };

  const onSubmit = async (data: BrandingForm) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success("Branding updated");
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* Left: Controls */}
        <SectionCard>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0, font: "700 18px var(--sans)", letterSpacing: "-.01em" }}>Branding</h2>
            <p style={{ margin: "4px 0 0", font: "500 13px var(--sans)", color: "var(--muted)" }}>
              Brand color and logo used on customer-facing menus.
            </p>
          </div>

          {/* Brand Color */}
          <div style={{ marginBottom: 24 }}>
            <Label>Brand Color</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              {/* Color swatch that opens native picker */}
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                style={{
                  width: 44, height: 44, borderRadius: "var(--r-1)",
                  background: liveColor, border: "2px solid var(--hairline)",
                  cursor: "pointer", flexShrink: 0,
                  boxShadow: `0 4px 14px -4px ${liveColor}90`,
                }}
              />
              <input
                type="color"
                ref={colorInputRef}
                value={liveColor}
                onChange={e => setColor(e.target.value)}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
              />
              <div style={{ flex: 1 }}>
                <Input
                  {...register("brand_color")}
                  error={!!errors.brand_color}
                  placeholder="#FF4D3D"
                  style={{ fontFamily: "var(--mono)", letterSpacing: ".06em", textTransform: "uppercase" }}
                  onChange={e => {
                    const val = e.target.value;
                    register("brand_color").onChange(e);
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setLiveColor(val);
                  }}
                />
                <FieldError msg={errors.brand_color?.message} />
              </div>
            </div>

            {/* Preset swatches */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {BRAND_PRESETS.map(hex => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  title={hex}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: hex, border: "none", cursor: "pointer",
                    flexShrink: 0,
                    outline: liveColor.toLowerCase() === hex.toLowerCase() ? `2px solid ${hex}` : "none",
                    outlineOffset: 2,
                    transform: liveColor.toLowerCase() === hex.toLowerCase() ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.12s, outline 0.12s",
                    boxShadow: `0 2px 8px -2px ${hex}70`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <Label>Logo URL</Label>
            <Input
              {...register("logo_url")}
              error={!!errors.logo_url}
              placeholder="https://cdn.example.com/logo.png"
            />
            <FieldError msg={errors.logo_url?.message} />
            <p style={{ font: "500 11px var(--sans)", color: "var(--muted)", marginTop: 6 }}>
              Paste a public image URL. PNG/SVG with transparent background works best.
            </p>
          </div>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "flex-end" }}>
            <SaveBtn loading={saving} />
          </div>
        </SectionCard>

        {/* Right: Live Preview */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--r-3)",
          padding: "20px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <p style={{ margin: 0, font: "700 12px var(--sans)", color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase" }}>Preview</p>

          {/* Simulated menu header */}
          <div style={{
            background: "var(--bg)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-2)",
            overflow: "hidden",
          }}>
            {/* Color accent bar */}
            <div style={{ height: 4, background: liveColor }} />
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                {watchedLogo ? (
                  <img
                    src={watchedLogo}
                    alt="logo"
                    style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", border: "1px solid var(--hairline)" }}
                    onError={e => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: liveColor, color: "#fff",
                    display: "grid", placeItems: "center",
                    font: "800 14px var(--sans)",
                  }}>
                    {settings.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ font: "700 14px var(--sans)", color: "var(--ink)" }}>{settings.name}</div>
                  <div style={{ font: "500 11px var(--sans)", color: "var(--muted)" }}>Table 5</div>
                </div>
              </div>
              {/* Fake item card */}
              <div style={{ background: "var(--surface)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ font: "600 12px var(--sans)", color: "var(--ink)" }}>Paneer Tikka</div>
                  <div style={{ font: "700 13px var(--sans)", color: liveColor, marginTop: 2 }}>₹280</div>
                </div>
                <button
                  type="button"
                  style={{ padding: "5px 12px", background: liveColor, color: "#fff", border: "none", borderRadius: 999, font: "700 11px var(--sans)", cursor: "default" }}
                >
                  ADD
                </button>
              </div>
            </div>
          </div>

          {/* Color chip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            background: "var(--bg)", borderRadius: "var(--r-1)", border: "1px solid var(--hairline)",
          }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: liveColor, flexShrink: 0 }} />
            <div>
              <div style={{ font: "700 12px var(--sans)", color: "var(--ink)" }}>{liveColor.toUpperCase()}</div>
              <div style={{ font: "500 10px var(--sans)", color: "var(--muted)" }}>Brand accent</div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ═══════════════════════ TAX & BILLING SECTION ═══════════════════════ */
function BillingSection({ settings, onSaved }: { settings: RestaurantSettings; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<TaxForm>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      cgst_rate: Number(settings.cgst_rate),
      sgst_rate: Number(settings.sgst_rate),
    },
  });

  useEffect(() => {
    reset({
      cgst_rate: Number(settings.cgst_rate),
      sgst_rate: Number(settings.sgst_rate),
    });
  }, [settings, reset]);

  const cgst = Number(watch("cgst_rate")) || 0;
  const sgst = Number(watch("sgst_rate")) || 0;
  const total = cgst + sgst;

  const onSubmit = async (data: TaxForm) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cgst_rate: data.cgst_rate, sgst_rate: data.sgst_rate }),
      });
      toast.success("Tax rates updated");
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const SAMPLE = 500;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <SectionCard>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0, font: "700 18px var(--sans)", letterSpacing: "-.01em" }}>Tax & Billing</h2>
            <p style={{ margin: "4px 0 0", font: "500 13px var(--sans)", color: "var(--muted)" }}>
              GST rates applied to orders. Used in bills and receipts.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <Label>CGST Rate (%)</Label>
              <Input
                {...register("cgst_rate")}
                type="number"
                step="0.5"
                min="0"
                max="50"
                error={!!errors.cgst_rate}
                placeholder="2.5"
              />
              <FieldError msg={errors.cgst_rate?.message} />
            </div>
            <div>
              <Label>SGST Rate (%)</Label>
              <Input
                {...register("sgst_rate")}
                type="number"
                step="0.5"
                min="0"
                max="50"
                error={!!errors.sgst_rate}
                placeholder="2.5"
              />
              <FieldError msg={errors.sgst_rate?.message} />
            </div>
          </div>

          {/* Tax info */}
          <div style={{
            marginTop: 20, padding: "14px 18px",
            background: "var(--bg)", borderRadius: "var(--r-1)",
            border: "1px solid var(--hairline)",
            font: "500 12px var(--sans)", color: "var(--muted)",
            lineHeight: 1.6,
          }}>
            <strong style={{ color: "var(--ink-2)" }}>Standard GST:</strong> Most restaurants in India use CGST 2.5% + SGST 2.5% (total 5%) for food items.
            Certain categories may attract 12% or 18%. Consult your CA for the correct rates.
          </div>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "flex-end" }}>
            <SaveBtn loading={saving} />
          </div>
        </SectionCard>

        {/* Tax calculator preview */}
        <SectionCard style={{ alignSelf: "start" }}>
          <p style={{ margin: "0 0 16px", font: "700 12px var(--sans)", color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase" }}>Bill Preview</p>
          <div style={{ font: "500 13px var(--sans)" }}>
            {[
              { label: "Subtotal", val: `₹${SAMPLE.toFixed(2)}`, muted: false },
              { label: `CGST @ ${cgst}%`, val: `₹${(SAMPLE * cgst / 100).toFixed(2)}`, muted: true },
              { label: `SGST @ ${sgst}%`, val: `₹${(SAMPLE * sgst / 100).toFixed(2)}`, muted: true },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--hairline-2)", color: row.muted ? "var(--muted)" : "var(--ink-2)" }}>
                <span>{row.label}</span><span>{row.val}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", font: "800 15px var(--sans)", color: "var(--ink)" }}>
              <span>Total</span>
              <span style={{ color: "var(--brand)" }}>₹{(SAMPLE * (1 + total / 100)).toFixed(2)}</span>
            </div>
          </div>
          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: "var(--brand-tint)", borderRadius: "var(--r-1)",
            font: "600 12px var(--sans)", color: "var(--brand)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <IcoReceipt />
            Total tax: <strong>{total.toFixed(2)}%</strong>
          </div>
        </SectionCard>
      </div>
    </form>
  );
}

/* ═══════════════════════ STAFF SECTION ═══════════════════════ */
function StaffSection() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: staff = [], isLoading, error } = useQuery<StaffMember[]>({
    queryKey: ["admin-staff"],
    queryFn: () => apiFetch<StaffMember[]>("/api/admin/staff"),
    staleTime: 30_000,
  });

  const { register, handleSubmit, formState: { errors }, reset: resetForm } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", phone: "", role: "chef", email: "" },
  });

  const handleAdd = async (data: StaffForm) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success(`${data.name} added as ${data.role}`);
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      resetForm();
      setShowAddForm(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add staff");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    setEditingId(member.id);
    try {
      await apiFetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, is_active: !member.is_active }),
      });
      toast.success(member.is_active ? `${member.name} deactivated` : `${member.name} reactivated`);
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setEditingId(null);
    }
  };

  const deactivate = async (id: string) => {
    setEditingId(id);
    try {
      await apiFetch(`/api/admin/staff?id=${id}`, { method: "DELETE" });
      toast.success("Staff member removed");
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setConfirmDelete(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setEditingId(null);
    }
  };

  const activeCount  = staff.filter(s => s.is_active).length;
  const chefCount    = staff.filter(s => s.role === "chef" && s.is_active).length;
  const waiterCount  = staff.filter(s => s.role === "waiter" && s.is_active).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Active Staff",  val: activeCount,  color: "var(--green)",  bg: "var(--green-soft)" },
          { label: "Chefs",         val: chefCount,    color: "var(--brand)",  bg: "var(--brand-tint)" },
          { label: "Waiters",       val: waiterCount,  color: "var(--blue)",   bg: "#EEF4FF" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "var(--surface)", border: "1px solid var(--hairline)",
            borderRadius: "var(--r-2)", padding: "16px 20px",
          }}>
            <div style={{ font: "800 28px var(--sans)", color: stat.color, letterSpacing: "-.02em" }}>{stat.val}</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--muted)", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <SectionCard>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, font: "700 18px var(--sans)", letterSpacing: "-.01em" }}>Staff Management</h2>
            <p style={{ margin: "4px 0 0", font: "500 13px var(--sans)", color: "var(--muted)" }}>
              Manage chefs and waiters. Staff log in with their phone number.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddForm(v => !v); resetForm(); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "9px 18px",
              background: showAddForm ? "var(--surface-2)" : "var(--brand)",
              color: showAddForm ? "var(--ink)" : "#fff",
              border: "none", borderRadius: "var(--r-pill)",
              font: "700 13px var(--sans)", cursor: "pointer",
              boxShadow: showAddForm ? "none" : "var(--sh-coral)",
              transition: "all 0.15s",
            }}
          >
            {showAddForm ? <IcoX /> : <IcoPlus />}
            {showAddForm ? "Cancel" : "Add Staff"}
          </button>
        </div>

        {/* Add Staff Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <form onSubmit={handleSubmit(handleAdd)}>
                <div style={{
                  background: "var(--brand-tint)",
                  border: "1.5px solid rgba(255,77,61,.15)",
                  borderRadius: "var(--r-2)",
                  padding: "20px 22px",
                }}>
                  <p style={{ margin: "0 0 16px", font: "700 13px var(--sans)", color: "var(--brand)" }}>New Staff Member</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 14 }}>
                    <div>
                      <Label>Full Name *</Label>
                      <Input {...register("name")} error={!!errors.name} placeholder="Rajan Kumar" />
                      <FieldError msg={errors.name?.message} />
                    </div>
                    <div>
                      <Label>Phone Number *</Label>
                      <Input {...register("phone")} error={!!errors.phone} placeholder="+91 98765 43210" />
                      <FieldError msg={errors.phone?.message} />
                    </div>
                    <div>
                      <Label>Role *</Label>
                      <select
                        {...register("role")}
                        style={{
                          width: "100%", padding: "10px 14px",
                          background: "var(--bg)", border: "1.5px solid var(--hairline)",
                          borderRadius: "var(--r-1)", font: "500 14px var(--sans)",
                          color: "var(--ink)", outline: "none",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B6A75' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                          backgroundSize: 16,
                        }}
                      >
                        <option value="chef">Chef</option>
                        <option value="waiter">Waiter</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Label>Email (optional)</Label>
                      <Input {...register("email")} error={!!errors.email} placeholder="staff@restaurant.com" />
                      <FieldError msg={errors.email?.message} />
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                    <SaveBtn loading={saving} label="Add to team" />
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Staff List */}
        {isLoading ? (
          <SettingsSkeleton />
        ) : error ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--red)", font: "500 13px var(--sans)" }}>
            Failed to load staff. Please refresh.
          </div>
        ) : staff.length === 0 ? (
          <div style={{
            padding: "48px 20px", textAlign: "center",
            border: "1.5px dashed var(--hairline)", borderRadius: "var(--r-2)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👨‍🍳</div>
            <p style={{ margin: "0 0 6px", font: "700 15px var(--sans)", color: "var(--ink)" }}>No staff added yet</p>
            <p style={{ margin: 0, font: "500 13px var(--sans)", color: "var(--muted)" }}>Add chefs and waiters so they can log in with their phone number.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--hairline)", borderRadius: "var(--r-2)", overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 160px 120px 80px 100px",
              padding: "10px 16px", background: "var(--bg)",
              borderBottom: "1px solid var(--hairline)",
              font: "700 11px var(--sans)", color: "var(--muted)",
              letterSpacing: ".06em", textTransform: "uppercase",
            }}>
              <span>Staff Member</span>
              <span>Phone</span>
              <span>Role</span>
              <span>Status</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>

            {staff.map((member, i) => (
              <div
                key={member.id}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 160px 120px 80px 100px",
                  padding: "14px 16px", alignItems: "center",
                  borderBottom: i < staff.length - 1 ? "1px solid var(--hairline-2)" : "none",
                  background: member.is_active ? "var(--surface)" : "var(--bg)",
                  transition: "background 0.1s",
                  opacity: editingId === member.id ? 0.5 : 1,
                }}
              >
                {/* Name + avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: member.role === "chef" ? "var(--brand-tint)" : "#EEF4FF",
                    color: member.role === "chef" ? "var(--brand)" : "var(--blue)",
                    display: "grid", placeItems: "center",
                    font: "800 13px var(--sans)", flexShrink: 0,
                  }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ font: "600 13px var(--sans)", color: member.is_active ? "var(--ink)" : "var(--muted)" }}>{member.name}</div>
                    <div style={{ font: "500 11px var(--sans)", color: "var(--muted-2)" }}>{member.email}</div>
                  </div>
                </div>

                {/* Phone */}
                <span style={{ font: "500 13px var(--sans)", color: "var(--ink-2)", fontFamily: "var(--mono)" }}>
                  {member.phone ?? "—"}
                </span>

                {/* Role badge */}
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: "var(--r-pill)",
                  font: "700 11px var(--sans)",
                  background: member.role === "chef" ? "var(--brand-tint)" : "#EEF4FF",
                  color: member.role === "chef" ? "var(--brand)" : "var(--blue)",
                  width: "fit-content",
                }}>
                  {member.role === "chef" ? <IcoChef /> : <IcoUsers />}
                  {member.role === "chef" ? "Chef" : "Waiter"}
                </span>

                {/* Status */}
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  font: "600 11px var(--sans)",
                  color: member.is_active ? "var(--green)" : "var(--muted)",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: member.is_active ? "var(--green)" : "var(--muted-2)",
                  }} />
                  {member.is_active ? "Active" : "Off"}
                </span>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => toggleActive(member)}
                    title={member.is_active ? "Deactivate" : "Activate"}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: "var(--bg)", border: "1px solid var(--hairline)",
                      display: "grid", placeItems: "center", cursor: "pointer",
                      color: member.is_active ? "var(--muted)" : "var(--green)",
                    }}
                  >
                    {member.is_active ? <IcoX /> : <IcoCheck />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(member.id)}
                    title="Remove"
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: "var(--bg)", border: "1px solid var(--hairline)",
                      display: "grid", placeItems: "center", cursor: "pointer",
                      color: "var(--red)",
                    }}
                  >
                    <IcoTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Confirm delete overlay */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "rgba(20,19,26,.45)",
              backdropFilter: "blur(4px)", zIndex: 100,
              display: "grid", placeItems: "center",
            }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "var(--surface)", borderRadius: "var(--r-3)",
                padding: "32px 36px", maxWidth: 380, width: "90%",
                boxShadow: "var(--sh-3)",
              }}
            >
              <div style={{ font: "700 17px var(--sans)", marginBottom: 8 }}>Remove staff member?</div>
              <p style={{ font: "500 13px var(--sans)", color: "var(--muted)", margin: "0 0 24px" }}>
                This will deactivate their account. They will no longer be able to log in.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: "var(--r-1)", background: "var(--surface-2)", border: "1px solid var(--hairline)", font: "600 13px var(--sans)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deactivate(confirmDelete)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: "var(--r-1)", background: "var(--red)", color: "#fff", border: "none", font: "700 13px var(--sans)", cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════ ACCOUNT SECTION ═══════════════════════ */
function AccountSection({ settings }: { settings: RestaurantSettings }) {
  const [copied, setCopied] = useState<"url" | "slug" | null>(null);
  const menuUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/m/${settings.slug}`;

  const copyText = async (text: string, key: "url" | "slug") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const plan = settings.plan ?? "starter";
  const meta = PLAN_META[plan];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Plan Card */}
      <SectionCard>
        <h2 style={{ margin: "0 0 20px", font: "700 18px var(--sans)", letterSpacing: "-.01em" }}>Plan & Subscription</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {(["starter", "growth", "pro"] as const).map(p => {
            const m = PLAN_META[p];
            const isActive = plan === p;
            return (
              <div
                key={p}
                style={{
                  padding: "20px 20px",
                  border: isActive ? `2px solid ${m.color}` : "1.5px solid var(--hairline)",
                  borderRadius: "var(--r-2)",
                  background: isActive ? m.bg : "var(--surface)",
                  position: "relative",
                  transition: "all 0.15s",
                }}
              >
                {isActive && (
                  <span style={{
                    position: "absolute", top: -1, right: 12,
                    padding: "2px 8px",
                    background: m.color, color: "#fff",
                    font: "700 10px var(--sans)", letterSpacing: ".06em",
                    borderRadius: "0 0 6px 6px",
                  }}>
                    CURRENT
                  </span>
                )}
                <div style={{ font: "800 15px var(--sans)", color: m.color, marginBottom: 8 }}>{m.label}</div>
                <ul style={{ margin: 0, padding: "0 0 0 14px", font: "500 12px var(--sans)", color: "var(--ink-2)", lineHeight: 1.8 }}>
                  <li>{m.items}</li>
                  <li>{m.tables}</li>
                  <li>{m.staff}</li>
                </ul>
              </div>
            );
          })}
        </div>

        {plan !== "pro" && (
          <div style={{
            padding: "14px 18px",
            background: "linear-gradient(120deg, var(--brand) 0%, #FF7A4D 100%)",
            borderRadius: "var(--r-2)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div>
              <div style={{ font: "700 14px var(--sans)", marginBottom: 2 }}>Upgrade to Pro</div>
              <div style={{ font: "500 12px var(--sans)", opacity: 0.9 }}>Unlock unlimited items, tables, and staff accounts.</div>
            </div>
            <button
              type="button"
              style={{
                padding: "8px 18px", background: "#fff", color: "var(--brand)",
                border: "none", borderRadius: "var(--r-pill)",
                font: "700 12px var(--sans)", cursor: "pointer", flexShrink: 0,
              }}
            >
              Upgrade →
            </button>
          </div>
        )}
      </SectionCard>

      {/* Restaurant Links */}
      <SectionCard>
        <h2 style={{ margin: "0 0 20px", font: "700 18px var(--sans)", letterSpacing: "-.01em" }}>Restaurant Links</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* QR Menu URL */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
            background: "var(--bg)", border: "1px solid var(--hairline)", borderRadius: "var(--r-2)",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "var(--brand-tint)", color: "var(--brand)",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <IcoQR />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "700 12px var(--sans)", color: "var(--ink)", marginBottom: 2 }}>Customer Menu URL</div>
              <div style={{ font: "500 12px var(--mono)", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {menuUrl}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => copyText(menuUrl, "url")}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: copied === "url" ? "var(--green-soft)" : "var(--surface)",
                  border: "1px solid var(--hairline)",
                  display: "grid", placeItems: "center", cursor: "pointer",
                  color: copied === "url" ? "var(--green)" : "var(--muted)",
                }}
                title="Copy URL"
              >
                {copied === "url" ? <IcoCheck /> : <IcoCopy />}
              </button>
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "var(--surface)", border: "1px solid var(--hairline)",
                  display: "grid", placeItems: "center",
                  color: "var(--muted)", textDecoration: "none",
                }}
                title="Open menu"
              >
                <IcoExternal />
              </a>
            </div>
          </div>

          {/* Slug */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
            background: "var(--bg)", border: "1px solid var(--hairline)", borderRadius: "var(--r-2)",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "#EEF4FF", color: "var(--blue)",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <IcoShield />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font: "700 12px var(--sans)", color: "var(--ink)", marginBottom: 2 }}>Restaurant Slug</div>
              <div style={{ font: "500 13px var(--mono)", color: "var(--muted)" }}>/{settings.slug}</div>
            </div>
            <button
              type="button"
              onClick={() => copyText(settings.slug, "slug")}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: copied === "slug" ? "var(--green-soft)" : "var(--surface)",
                border: "1px solid var(--hairline)",
                display: "grid", placeItems: "center", cursor: "pointer",
                color: copied === "slug" ? "var(--green)" : "var(--muted)",
                flexShrink: 0,
              }}
              title="Copy slug"
            >
              {copied === "slug" ? <IcoCheck /> : <IcoCopy />}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard style={{ borderColor: "rgba(224,58,48,.15)" }}>
        <h2 style={{ margin: "0 0 6px", font: "700 18px var(--sans)", color: "var(--red)", letterSpacing: "-.01em" }}>Danger Zone</h2>
        <p style={{ margin: "0 0 20px", font: "500 13px var(--sans)", color: "var(--muted)" }}>
          Irreversible actions. Please be absolutely certain.
        </p>
        <button
          type="button"
          style={{
            padding: "9px 18px",
            background: "transparent",
            color: "var(--red)",
            border: "1.5px solid rgba(224,58,48,.25)",
            borderRadius: "var(--r-1)",
            font: "600 13px var(--sans)", cursor: "pointer",
          }}
          onClick={() => toast.error("Contact support to delete your account.")}
        >
          Delete Restaurant Account
        </button>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export function SettingsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const rawTab = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some(t => t.id === rawTab) ? (rawTab as TabId) : "profile";

  const setTab = (id: TabId) => {
    router.push(`/dashboard/settings?tab=${id}`, { scroll: false });
  };

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<RestaurantSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => apiFetch<RestaurantSettings>("/api/admin/settings"),
    staleTime: 60_000,
  });

  const invalidateSettings = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-color: var(--surface-2); }
          50%  { background-color: #EBE6E0; }
          100% { background-color: var(--surface-2); }
        }
      `}</style>

      <main className="adm-main">
        {/* ── Top Bar ── */}
        <header className="adm-top">
          <div>
            <h1 style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
              Settings
            </h1>
            <div className="adm-top__sub">Restaurant · Branding · Tax · Staff · Account</div>
          </div>
        </header>

        {/* ── Tab Navigation ── */}
        <div style={{
          borderBottom: "1px solid var(--hairline)",
          background: "var(--surface)",
          padding: "0 28px",
          display: "flex",
          gap: 2,
        }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id as TabId)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "12px 16px",
                  background: "none", border: "none", cursor: "pointer",
                  font: "600 13px var(--sans)",
                  color: isActive ? "var(--brand)" : "var(--muted)",
                  position: "relative",
                  transition: "color 0.15s",
                  borderBottom: isActive ? "2px solid var(--brand)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                <Icon />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="adm-body">
          {isLoading ? (
            <SectionCard>
              <SettingsSkeleton />
            </SectionCard>
          ) : error ? (
            <SectionCard>
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ font: "700 15px var(--sans)", color: "var(--red)", marginBottom: 8 }}>Failed to load settings</div>
                <p style={{ font: "500 13px var(--sans)", color: "var(--muted)", margin: "0 0 20px" }}>
                  {error instanceof Error ? error.message : "An error occurred. Please refresh."}
                </p>
                <button
                  type="button"
                  onClick={invalidateSettings}
                  style={{ padding: "8px 18px", background: "var(--brand)", color: "#fff", border: "none", borderRadius: "var(--r-pill)", font: "600 13px var(--sans)", cursor: "pointer" }}
                >
                  Retry
                </button>
              </div>
            </SectionCard>
          ) : settings ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === "profile"  && <ProfileSection  settings={settings} onSaved={invalidateSettings} />}
                {activeTab === "branding" && <BrandingSection settings={settings} onSaved={invalidateSettings} />}
                {activeTab === "billing"  && <BillingSection  settings={settings} onSaved={invalidateSettings} />}
                {activeTab === "staff"    && <StaffSection />}
                {activeTab === "account"  && <AccountSection  settings={settings} />}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </main>
    </>
  );
}
