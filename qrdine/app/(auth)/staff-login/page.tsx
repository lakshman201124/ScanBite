"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChefHat, UtensilsCrossed, Loader2, CheckCircle2,
  ArrowLeft, Building2, Delete, KeyRound, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PIN_LEN = 6;
type Role = "chef" | "waiter";
type StaffLite = { id: string; name: string; role: Role };
type Step = "restaurant" | "pick" | "pin" | "setupCode" | "setupPin" | "success";

const ROLE_CFG: Record<Role, { label: string; icon: React.ReactNode; accent: string }> = {
  chef:   { label: "Chef",   icon: <ChefHat size={18} />,         accent: "#FF4D3D" },
  waiter: { label: "Waiter", icon: <UtensilsCrossed size={18} />, accent: "#2E6EF7" },
};

function PinBoxes({
  value, onChange, onComplete, disabled, autoFocus,
}: {
  value: string[]; onChange: (v: string[]) => void; onComplete?: (v: string[]) => void;
  disabled?: boolean; autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, raw: string) {
    if (raw.length > 1) {
      const digits = raw.replace(/\D/g, "").slice(0, PIN_LEN).split("");
      const next = Array(PIN_LEN).fill("") as string[];
      digits.forEach((d, j) => { next[j] = d; });
      onChange(next);
      refs.current[Math.min(digits.length, PIN_LEN - 1)]?.focus();
      if (digits.length === PIN_LEN) onComplete?.(next);
      return;
    }
    const d = raw.replace(/\D/g, "");
    const next = [...value]; next[i] = d; onChange(next);
    if (d && i < PIN_LEN - 1) refs.current[i + 1]?.focus();
    if (next.join("").length === PIN_LEN) onComplete?.(next);
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
          type="password"
          inputMode="numeric"
          maxLength={PIN_LEN}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-11 h-14 bg-zinc-800 border-2 border-zinc-700 focus:border-white text-white text-xl font-black text-center rounded-xl outline-none transition disabled:opacity-40"
        />
      ))}
    </div>
  );
}

function NumPad({ onPress }: { onPress: (k: string) => void }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
  return (
    <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
      {keys.map((k, i) => k === "" ? <div key={i} /> : (
        <button
          key={i}
          type="button"
          onClick={() => onPress(k)}
          className={`h-14 rounded-xl font-black text-lg transition active:scale-95 ${
            k === "del"
              ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-300 flex items-center justify-center"
              : "bg-zinc-800 hover:bg-zinc-700 text-white"
          }`}
        >
          {k === "del" ? <Delete size={18} /> : k}
        </button>
      ))}
    </div>
  );
}

export default function StaffLoginPage() {
  const router = useRouter();

  const [step, setStep]         = useState<Step>("restaurant");
  const [code, setCode]         = useState("");
  const [restaurantId, setRId]  = useState("");
  const [restaurantName, setRN] = useState("");
  const [staffList, setStaffList] = useState<StaffLite[]>([]);
  const [selected, setSelected] = useState<StaffLite | null>(null);
  const [pin, setPin]           = useState<string[]>(Array(PIN_LEN).fill(""));
  // setup
  const [setupCode, setSetupCode] = useState("");
  const [newPin, setNewPin]       = useState<string[]>(Array(PIN_LEN).fill(""));
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(PIN_LEN).fill(""));
  const [destRole, setDestRole] = useState<Role>("waiter");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // ── Step 1: verify restaurant code → fetch staff list ───────────
  async function handleRestaurantCode() {
    if (!code.trim()) { setError("Enter your restaurant code."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/staff/verify-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json() as {
        success: boolean; error?: string;
        data?: { restaurantId: string; restaurantName: string };
      };
      if (!res.ok || !data.success) { setError(data.error ?? "Restaurant not found."); return; }
      const rid = data.data!.restaurantId;
      setRId(rid);
      setRN(data.data!.restaurantName);
      await loadStaff(rid);
      setStep("pick");
    } catch { setError("Network error. Try again."); }
    finally { setLoading(false); }
  }

  async function loadStaff(rid: string) {
    try {
      const res = await fetch("/api/auth/staff/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: rid }),
      });
      const data = await res.json() as { success: boolean; data?: { staff: StaffLite[] } };
      setStaffList(data.success ? (data.data?.staff ?? []) : []);
    } catch { setStaffList([]); }
  }

  // ── Login: pick name → PIN ──────────────────────────────────────
  function pickStaff(s: StaffLite) {
    setSelected(s);
    setPin(Array(PIN_LEN).fill(""));
    setError("");
    setStep("pin");
  }

  function handlePinKey(k: string) {
    setError("");
    setPin(prev => {
      if (k === "del") {
        const idx = [...prev].reverse().findIndex(d => d !== "");
        if (idx === -1) return prev;
        const next = [...prev]; next[PIN_LEN - 1 - idx] = ""; return next;
      }
      const firstEmpty = prev.findIndex(d => d === "");
      if (firstEmpty === -1) return prev;
      const next = [...prev]; next[firstEmpty] = k;
      if (next.every(d => d !== "")) void handlePinLogin(next);
      return next;
    });
  }

  async function handlePinLogin(digits: string[]) {
    const pinCode = digits.join("");
    if (pinCode.length < PIN_LEN || !selected) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, userId: selected.id, pin: pinCode }),
      });
      const data = await res.json() as { success: boolean; error?: string; data?: { role: Role } };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Incorrect PIN.");
        setPin(Array(PIN_LEN).fill(""));
      } else {
        finishSuccess(data.data?.role ?? selected.role);
      }
    } catch { setError("Something went wrong."); setPin(Array(PIN_LEN).fill("")); }
    finally { setLoading(false); }
  }

  // ── Setup: code → set PIN twice ─────────────────────────────────
  async function handleSetupSubmit() {
    const p1 = newPin.join("");
    const p2 = confirmPin.join("");
    if (p1.length < PIN_LEN) { setError("Choose a 6-digit PIN."); return; }
    if (p1 !== p2) { setError("PINs don't match."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/staff/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, code: setupCode.trim().toUpperCase(), pin: p1 }),
      });
      const data = await res.json() as { success: boolean; error?: string; data?: { role: Role } };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Setup failed.");
      } else {
        finishSuccess(data.data?.role ?? "waiter");
      }
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  function finishSuccess(role: Role) {
    setDestRole(role);
    setStep("success");
    const dest = role === "chef" ? "/kds" : "/waiter";
    setTimeout(() => { router.push(dest); router.refresh(); }, 1400);
  }

  const roleCfg = selected ? ROLE_CFG[selected.role] : ROLE_CFG.waiter;

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
              <p className="text-xs text-zinc-400">
                {restaurantName
                  ? <span className="text-zinc-200 font-semibold">{restaurantName}</span>
                  : "ScanBite · Chef & Waiter login"}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ── Step 1: restaurant code ── */}
            {step === "restaurant" && (
              <motion.div key="restaurant" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={16} className="text-zinc-400" />
                  <h2 className="text-base font-semibold text-white">Restaurant code</h2>
                </div>
                <p className="text-zinc-400 text-sm mb-5">Ask your manager for the restaurant code.</p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
                <input
                  type="text"
                  value={code}
                  autoFocus
                  maxLength={12}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleRestaurantCode()}
                  placeholder="e.g. DEMO01"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-zinc-500 transition mb-5"
                />
                <button
                  onClick={handleRestaurantCode}
                  disabled={loading || !code.trim()}
                  className="w-full h-12 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-black rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : "Continue →"}
                </button>
              </motion.div>
            )}

            {/* ── Login: pick your name ── */}
            {step === "pick" && (
              <motion.div key="pick" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
                <button onClick={() => { setStep("restaurant"); setError(""); }} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition">
                  <ArrowLeft size={12} /> {restaurantName}
                </button>
                <h2 className="text-base font-semibold text-white mb-1">Who&apos;s logging in?</h2>
                <p className="text-zinc-400 text-sm mb-5">Tap your name, then enter your PIN.</p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

                {staffList.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-sm">
                    No staff have set up yet.<br />First time? Use your setup code below.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mb-5 max-h-[280px] overflow-y-auto">
                    {staffList.map(s => {
                      const cfg = ROLE_CFG[s.role];
                      return (
                        <button
                          key={s.id}
                          onClick={() => pickStaff(s)}
                          className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl px-4 py-3 text-left transition active:scale-[0.99]"
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: cfg.accent + "22", color: cfg.accent }}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">{s.name}</p>
                            <p className="text-xs font-semibold capitalize" style={{ color: cfg.accent }}>{cfg.label}</p>
                          </div>
                          <ChevronRight size={16} className="text-zinc-500" />
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={() => { setStep("setupCode"); setError(""); setSetupCode(""); }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-xl py-3 transition"
                >
                  <KeyRound size={15} /> First time? Set up with a code
                </button>
              </motion.div>
            )}

            {/* ── Login: PIN ── */}
            {step === "pin" && selected && (
              <motion.div key="pin" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
                <button onClick={() => { setStep("pick"); setError(""); setPin(Array(PIN_LEN).fill("")); }} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition">
                  <ArrowLeft size={12} /> Back
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: roleCfg.accent + "22", color: roleCfg.accent }}>
                    {roleCfg.icon}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{selected.name}</p>
                    <p className="text-xs font-semibold capitalize" style={{ color: roleCfg.accent }}>{selected.role}</p>
                  </div>
                </div>
                <h2 className="text-base font-semibold text-white mb-1">Enter your PIN</h2>
                <p className="text-zinc-400 text-sm mb-4">6-digit PIN</p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4 text-center">{error}</div>}
                {loading
                  ? <div className="flex justify-center py-6"><Loader2 className="w-7 h-7 text-zinc-400 animate-spin" /></div>
                  : (
                    <>
                      <div className="mb-5"><PinBoxes value={pin} onChange={setPin} onComplete={handlePinLogin} disabled={loading} /></div>
                      <NumPad onPress={handlePinKey} />
                    </>
                  )
                }
                <p className="text-center text-xs text-zinc-600 mt-4">Forgot PIN? Ask your admin to reset it.</p>
              </motion.div>
            )}

            {/* ── Setup: enter code ── */}
            {step === "setupCode" && (
              <motion.div key="setupCode" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
                <button onClick={() => { setStep("pick"); setError(""); }} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition">
                  <ArrowLeft size={12} /> Back to login
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound size={16} className="text-zinc-400" />
                  <h2 className="text-base font-semibold text-white">Your setup code</h2>
                </div>
                <p className="text-zinc-400 text-sm mb-5">Enter the one-time code your admin gave you.</p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
                <input
                  type="text"
                  value={setupCode}
                  autoFocus
                  maxLength={12}
                  onChange={e => { setSetupCode(e.target.value.toUpperCase()); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && setupCode.trim() && (setStep("setupPin"), setError(""), setNewPin(Array(PIN_LEN).fill("")), setConfirmPin(Array(PIN_LEN).fill("")))}
                  placeholder="8-character code"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-zinc-500 transition mb-5"
                />
                <button
                  onClick={() => { if (!setupCode.trim()) { setError("Enter your setup code."); return; } setStep("setupPin"); setError(""); setNewPin(Array(PIN_LEN).fill("")); setConfirmPin(Array(PIN_LEN).fill("")); }}
                  disabled={!setupCode.trim()}
                  className="w-full h-12 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-black rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Continue →
                </button>
              </motion.div>
            )}

            {/* ── Setup: choose PIN ── */}
            {step === "setupPin" && (
              <motion.div key="setupPin" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
                <button onClick={() => { setStep("setupCode"); setError(""); }} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition">
                  <ArrowLeft size={12} /> Back
                </button>
                <h2 className="text-base font-semibold text-white mb-1">Create your PIN</h2>
                <p className="text-zinc-400 text-sm mb-5">Pick a 6-digit PIN only you know. You&apos;ll use it to log in.</p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4 text-center">{error}</div>}
                {loading
                  ? <div className="flex justify-center py-6"><Loader2 className="w-7 h-7 text-zinc-400 animate-spin" /></div>
                  : (
                    <>
                      <p className="text-xs text-zinc-500 mb-2">New PIN</p>
                      <div className="mb-4"><PinBoxes value={newPin} onChange={setNewPin} autoFocus /></div>
                      <p className="text-xs text-zinc-500 mb-2">Confirm PIN</p>
                      <div className="mb-5"><PinBoxes value={confirmPin} onChange={setConfirmPin} /></div>
                      <button
                        onClick={handleSetupSubmit}
                        disabled={newPin.join("").length < PIN_LEN || confirmPin.join("").length < PIN_LEN}
                        className="w-full h-12 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-black rounded-xl transition disabled:opacity-40"
                      >
                        Set PIN &amp; continue
                      </button>
                    </>
                  )
                }
              </motion.div>
            )}

            {/* ── Success ── */}
            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="text-center py-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: ROLE_CFG[destRole].accent + "22" }}>
                  <CheckCircle2 size={32} style={{ color: ROLE_CFG[destRole].accent }} />
                </motion.div>
                <h2 className="text-lg font-black text-white mb-1">You&apos;re in!</h2>
                <p className="text-zinc-500 text-xs flex items-center justify-center gap-2 mt-4">
                  <Loader2 size={12} className="animate-spin" /> Opening {destRole === "chef" ? "Kitchen" : "Waiter"} Portal…
                </p>
              </motion.div>
            )}

          </AnimatePresence>

          {step === "restaurant" && (
            <div className="mt-8 text-center">
              <Link href="/login" className="text-xs text-zinc-600 hover:text-zinc-400 transition">Admin login →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
