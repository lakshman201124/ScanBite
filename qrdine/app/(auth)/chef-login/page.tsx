"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChefHat, UtensilsCrossed, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PIN_LEN = 6;
const RESEND_COOLDOWN = 30;
type Role = "chef" | "waiter";
type Step = "phone" | "otp" | "signup" | "pin" | "success";

const ROLE_CFG: Record<Role, { label: string; desc: string; icon: React.ReactNode; accent: string }> = {
  chef:   { label: "Chef",   desc: "Kitchen & order preparation",  icon: <ChefHat size={18} />,         accent: "#FF4D3D" },
  waiter: { label: "Waiter", desc: "Table service & order taking",  icon: <UtensilsCrossed size={18} />, accent: "#2E6EF7" },
};

function PinBoxes({
  value, onChange, onComplete, disabled, mask,
}: {
  value: string[]; onChange: (v: string[]) => void; onComplete: (v: string[]) => void;
  disabled?: boolean; mask?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, raw: string) {
    if (raw.length > 1) {
      const digits = raw.replace(/\D/g, "").slice(0, PIN_LEN).split("");
      const next = Array(PIN_LEN).fill("") as string[];
      digits.forEach((d, j) => { next[j] = d; });
      onChange(next);
      refs.current[Math.min(digits.length, PIN_LEN - 1)]?.focus();
      if (digits.length === PIN_LEN) onComplete(next);
      return;
    }
    const d = raw.replace(/\D/g, "");
    const next = [...value]; next[i] = d; onChange(next);
    if (d && i < PIN_LEN - 1) refs.current[i + 1]?.focus();
    if (next.join("").length === PIN_LEN) onComplete(next);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  }

  return (
    <div className="flex gap-2 justify-center">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type={mask ? "password" : "text"}
          inputMode="numeric"
          maxLength={PIN_LEN}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-11 h-14 bg-zinc-800 border-2 border-zinc-700 focus:border-white text-white text-xl font-black text-center rounded-xl outline-none transition disabled:opacity-40"
        />
      ))}
    </div>
  );
}

export default function StaffLoginPage() {
  const router = useRouter();

  const [step, setStep]          = useState<Step>("phone");
  const [phone, setPhone]        = useState("");
  const [otp, setOtp]            = useState<string[]>(Array(PIN_LEN).fill(""));
  const [otpCode, setOtpCode]    = useState(""); // verified code carried into signup
  const [pin, setPin]            = useState<string[]>(Array(PIN_LEN).fill(""));
  const [confirmPin, setConfirm] = useState<string[]>(Array(PIN_LEN).fill(""));
  const [role, setRole]          = useState<Role>("waiter");
  const [name, setName]          = useState("");
  const [slug, setSlug]          = useState("");
  const [returnName, setReturn]  = useState("");
  const [returnRole, setRetRole] = useState<Role>("waiter");
  const [destRole, setDestRole]  = useState<Role>("waiter");
  const [error, setError]        = useState("");
  const [loading, setLoading]    = useState(false);
  const [sending, setSending]    = useState(false);
  const [cooldown, setCooldown]  = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const cleaned = () => phone.replace(/\s/g, "");

  // ── Step 1: check phone ──────────────────────────────────────────
  async function handlePhoneContinue() {
    const p = cleaned();
    if (!p.match(/^\+?[0-9]{10,15}$/)) { setError("Enter a valid phone number."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/auth/check-staff", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p }),
      });
      const data: { success: boolean; data?: { registered: boolean; name: string; role: string } } = await res.json();
      if (!res.ok || !data.success) { setError("Could not verify phone. Try again."); return; }
      if (data.data?.registered) {
        setReturn(data.data.name ?? "");
        setRetRole((data.data.role as Role) ?? "waiter");
        setPin(Array(PIN_LEN).fill(""));
        setStep("pin");
      } else {
        // New user — send OTP first
        await sendOtp(p);
      }
    } catch { setError("Network error. Try again."); }
    finally { setLoading(false); }
  }

  // ── Send OTP ─────────────────────────────────────────────────────
  async function sendOtp(p?: string) {
    const target = p ?? cleaned();
    setSending(true); setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: target, type: "staff_signup" }),
      });
      const data: { success: boolean; error?: string } = await res.json();
      if (!res.ok || !data.success) { setError(data.error ?? "Failed to send OTP."); }
      else {
        setOtp(Array(PIN_LEN).fill(""));
        setStep("otp");
        setCooldown(RESEND_COOLDOWN);
      }
    } catch { setError("Network error. Try again."); }
    finally { setSending(false); }
  }

  // ── Step 2 (new user): verify OTP → proceed to signup form ───────
  async function handleOtpComplete(digits: string[]) {
    const code = digits.join("");
    if (code.length < PIN_LEN) return;
    setOtpCode(code);
    // Carry the code into the signup step; backend will re-verify on submit
    setPin(Array(PIN_LEN).fill(""));
    setConfirm(Array(PIN_LEN).fill(""));
    setStep("signup");
  }

  // ── Step 3 (new user): create account ────────────────────────────
  async function handleSignup() {
    setError("");
    if (!name.trim() || name.trim().length < 2) { setError("Enter your full name (min 2 chars)."); return; }
    if (!slug.trim()) { setError("Enter the restaurant code from your manager."); return; }
    const p = pin.join(""); const c = confirmPin.join("");
    if (p.length < PIN_LEN) { setError("Set a 6-digit PIN."); return; }
    if (p !== c) { setError("PINs do not match. Try again."); setConfirm(Array(PIN_LEN).fill("")); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/staff-signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), phone: cleaned(), role,
          restaurantSlug: slug.trim().toLowerCase(),
          code: otpCode, pin: p,
        }),
      });
      const data: { success: boolean; error?: string; data?: { role: string } } = await res.json();
      if (!res.ok || !data.success) { setError(data.error ?? "Signup failed. Try again."); }
      else {
        setDestRole((data.data?.role as Role) ?? role);
        setStep("success");
        setTimeout(() => { router.push("/waiter/orders"); router.refresh(); }, 1400);
      }
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  }

  // ── Step 2 (returning user): PIN login ───────────────────────────
  async function handlePinLogin(digits: string[]) {
    const code = digits.join("");
    if (code.length < PIN_LEN) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/chef-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned(), pin: code }),
      });
      const data: { success: boolean; error?: string; data?: { role: string } } = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Incorrect PIN."); setPin(Array(PIN_LEN).fill(""));
      } else {
        setDestRole((data.data?.role as Role) ?? "waiter");
        setStep("success");
        setTimeout(() => { router.push("/waiter/orders"); router.refresh(); }, 1400);
      }
    } catch { setError("Something went wrong."); setPin(Array(PIN_LEN).fill("")); }
    finally { setLoading(false); }
  }

  const roleCfg = ROLE_CFG[role];
  const retCfg  = ROLE_CFG[returnRole];

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-zinc-950">
      <div className="w-full max-w-[420px]">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4D3D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h2V5h2v2h2"/><path d="M14 7h2V5h2v2h2"/><path d="M4 12h16"/>
                <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Staff Portal</h1>
              <p className="text-xs text-zinc-400">ScanBite · Chef &amp; Waiter login</p>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ── phone ── */}
            {step === "phone" && (
              <motion.div key="phone" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <h2 className="text-base font-semibold text-white mb-1">Enter your phone</h2>
                <p className="text-zinc-400 text-sm mb-5">New here? We&apos;ll verify your number first.</p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
                <div className="flex gap-2 mb-5">
                  <div className="flex items-center px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 text-sm font-bold select-none">+91</div>
                  <input type="tel" value={phone} autoFocus
                    onChange={(e) => { setPhone(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handlePhoneContinue()}
                    placeholder="98765 43210"
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 transition"
                  />
                </div>
                <button onClick={handlePhoneContinue} disabled={loading || sending || !phone.trim()}
                  className="w-full h-12 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-black rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading || sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : "Continue →"}
                </button>
              </motion.div>
            )}

            {/* ── otp (new user) ── */}
            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
                <button onClick={() => { setStep("phone"); setError(""); setOtp(Array(PIN_LEN).fill("")); }}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition">
                  <ArrowLeft size={12} /> {cleaned()}
                </button>
                <h2 className="text-base font-semibold text-white mb-1">Verify your number</h2>
                <p className="text-zinc-400 text-sm mb-5">
                  OTP sent to <span className="text-zinc-200 font-semibold">{cleaned()}</span> via WhatsApp. Valid 5 min.
                </p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4 text-center">{error}</div>}
                <div className="mb-5">
                  <PinBoxes value={otp} onChange={setOtp} onComplete={handleOtpComplete} mask={false} />
                </div>
                <div className="text-center">
                  {cooldown > 0
                    ? <p className="text-xs text-zinc-500">Resend in <span className="text-zinc-300 font-bold">{cooldown}s</span></p>
                    : <button onClick={() => sendOtp()} disabled={sending} className="text-xs text-zinc-400 hover:text-white transition underline">
                        {sending ? "Sending…" : "Resend OTP"}
                      </button>
                  }
                </div>
              </motion.div>
            )}

            {/* ── signup (new user, after OTP) ── */}
            {step === "signup" && (
              <motion.div key="signup" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
                <button onClick={() => { setStep("otp"); setError(""); }}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition">
                  <ArrowLeft size={12} /> Back
                </button>
                <h2 className="text-base font-semibold text-white mb-1">Create your account</h2>
                <p className="text-zinc-400 text-sm mb-5">Number verified. Set up your profile once.</p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

                {/* Role */}
                <div className="mb-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2">I am a</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["chef", "waiter"] as Role[]).map((r) => {
                      const cfg = ROLE_CFG[r]; const active = role === r;
                      return (
                        <button key={r} type="button" onClick={() => setRole(r)}
                          style={{ borderColor: active ? cfg.accent : undefined, background: active ? cfg.accent + "18" : undefined }}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${active ? "border-current" : "border-zinc-700 hover:border-zinc-500"}`}>
                          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: active ? cfg.accent + "30" : "#27272a", color: active ? cfg.accent : "#71717a" }}>
                            {cfg.icon}
                          </span>
                          <div>
                            <div className="text-sm font-bold" style={{ color: active ? cfg.accent : "#e4e4e7" }}>{cfg.label}</div>
                            <div className="text-xs text-zinc-500">{cfg.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
                <div className="mb-3">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Your name</label>
                  <input type="text" value={name} autoFocus
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 transition" />
                </div>

                {/* Restaurant code */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Restaurant code</label>
                  <input type="text" value={slug}
                    onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/\s/g, "-")); setError(""); }}
                    placeholder="e.g. spicy-bistro"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-500 transition" />
                  <p className="text-xs text-zinc-600 mt-1">Ask your manager for this code.</p>
                </div>

                {/* Set PIN */}
                <div className="mb-3">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Set your 6-digit PIN</label>
                  <PinBoxes value={pin} onChange={(v) => { setPin(v); setError(""); }} onComplete={() => {}} mask />
                </div>

                {/* Confirm PIN */}
                <div className="mb-6">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Confirm PIN</label>
                  <PinBoxes value={confirmPin} onChange={(v) => { setConfirm(v); setError(""); }} onComplete={() => {}} mask />
                </div>

                <button onClick={handleSignup} disabled={loading}
                  style={{ background: loading ? undefined : roleCfg.accent }}
                  className="w-full h-12 text-white text-sm font-black rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 disabled:bg-zinc-700">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : "Create Account"}
                </button>
              </motion.div>
            )}

            {/* ── pin (returning user) ── */}
            {step === "pin" && (
              <motion.div key="pin" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
                <button onClick={() => { setStep("phone"); setError(""); setPin(Array(PIN_LEN).fill("")); }}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition">
                  <ArrowLeft size={12} /> {cleaned()}
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: retCfg.accent + "22", color: retCfg.accent }}>
                    {retCfg.icon}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{returnName || "Welcome back"}</p>
                    <p className="text-xs font-semibold capitalize" style={{ color: retCfg.accent }}>{returnRole}</p>
                  </div>
                </div>
                <h2 className="text-base font-semibold text-white mb-1">Enter your PIN</h2>
                <p className="text-zinc-400 text-sm mb-5">6-digit PIN you set during sign up</p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4 text-center">{error}</div>}
                {loading
                  ? <div className="flex justify-center py-6"><Loader2 className="w-7 h-7 text-zinc-400 animate-spin" /></div>
                  : <div className="mb-5"><PinBoxes value={pin} onChange={setPin} onComplete={handlePinLogin} mask /></div>
                }
                <p className="text-center text-xs text-zinc-600 mt-2">Forgot PIN? Ask your restaurant admin to reset it.</p>
              </motion.div>
            )}

            {/* ── success ── */}
            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="text-center py-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: ROLE_CFG[destRole].accent + "22" }}>
                  <CheckCircle2 size={32} style={{ color: ROLE_CFG[destRole].accent }} />
                </motion.div>
                <h2 className="text-lg font-black text-white mb-1">You&apos;re in!</h2>
                <p className="text-zinc-500 text-xs flex items-center justify-center gap-2 mt-4">
                  <Loader2 size={12} className="animate-spin" /> Opening Staff Portal…
                </p>
              </motion.div>
            )}

          </AnimatePresence>

          {(step === "phone" || step === "signup") && (
            <div className="mt-8 text-center">
              <Link href="/login" className="text-xs text-zinc-600 hover:text-zinc-400 transition">Admin login →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
