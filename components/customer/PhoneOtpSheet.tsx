"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Loader2, User } from "lucide-react";
import { overlayVariants, sheetVariants } from "@/lib/animations";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export function PhoneOtpSheet({ onSuccess, onClose }: Props) {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleSendOtp() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    const cleaned = phone.replace(/\s/g, "");
    if (!cleaned.match(/^\+?[0-9]{10,15}$/)) { setError("Enter a valid phone number."); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, type: "customer" }),
      });
      const data: { success: boolean; error?: string } = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to send OTP.");
      } else {
        setStep("otp");
        setCooldown(RESEND_COOLDOWN);
        setOtp(Array(OTP_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(digits: string[]) {
    const code = digits.join("");
    if (code.length < OTP_LENGTH) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/customer/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\s/g, ""), code, name: name.trim() }),
      });
      const data: { success: boolean; error?: string } = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Invalid OTP. Try again.");
        setOtp(Array(OTP_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        onSuccess();
      }
    } catch {
      setError("Something went wrong.");
      setOtp(Array(OTP_LENGTH).fill(""));
    } finally {
      setVerifying(false);
    }
  }

  function handleOtpInput(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
      const next = Array(OTP_LENGTH).fill("");
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      setError("");
      inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
      if (digits.length === OTP_LENGTH) handleVerify(next);
      return;
    }
    const digit = value.replace(/\D/g, "");
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (next.join("").length === OTP_LENGTH) handleVerify(next);
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }

  return (
    <>
      <motion.div
        variants={overlayVariants} initial="hidden" animate="visible" exit="exit"
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-[rgba(20,19,26,.55)]"
      />
      <motion.div
        variants={sheetVariants} initial="hidden" animate="visible" exit="exit"
        className="fixed bottom-0 left-1/2 z-[61] w-full max-w-[480px] -translate-x-1/2 rounded-t-[28px] bg-[var(--bg)] shadow-[0_-24px_70px_-30px_rgba(20,19,26,.45)] pb-10"
      >
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-[color-mix(in_oklab,var(--ink)_14%,transparent)]" />
        </div>

        <div className="flex items-center justify-between px-5 pb-4">
          <div>
            <h2 className="text-[20px] font-black tracking-tight">
              {step === "details" ? "Who's ordering?" : "Enter the code"}
            </h2>
            <p className="text-[12px] font-semibold text-[var(--muted)] mt-0.5">
              {step === "details" ? "Needed to track your order" : "Sent to your WhatsApp — valid 5 min"}
            </p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--surface-2)] text-[var(--muted)]">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-5">
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-2xl px-4 py-3 mb-4">
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === "details" && (
              <motion.div key="details" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-3">
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
                    placeholder="Your name" autoFocus
                    className="w-full pl-9 pr-4 py-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] text-[14px] font-semibold placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition" />
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-[var(--surface)] border border-[var(--hairline)] rounded-2xl text-[var(--muted)] text-sm font-bold select-none">+91</div>
                  <div className="relative flex-1">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      placeholder="98765 43210"
                      className="w-full pl-9 pr-4 py-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] text-[14px] font-semibold placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition" />
                  </div>
                </div>
                <button onClick={handleSendOtp} disabled={sending || !name.trim() || !phone.trim()}
                  className="w-full h-14 rounded-full bg-[var(--brand)] text-[15px] font-black text-white shadow-[var(--sh-coral)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition">
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send OTP via WhatsApp"}
                </button>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>
                <button onClick={() => { setStep("details"); setError(""); setOtp(Array(OTP_LENGTH).fill("")); }}
                  className="text-xs text-[var(--muted)] hover:text-[var(--ink)] mb-5 transition">
                  ← Change number
                </button>
                {verifying ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-8 h-8 text-[var(--muted)] animate-spin" /></div>
                ) : (
                  <div className="flex gap-2 justify-center mb-6">
                    {otp.map((digit, i) => (
                      <input key={i} ref={(el) => { inputRefs.current[i] = el; }}
                        type="text" inputMode="numeric" maxLength={OTP_LENGTH} value={digit}
                        onChange={(e) => handleOtpInput(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        className="w-12 h-14 bg-[var(--surface)] border-2 border-[var(--hairline)] focus:border-[var(--brand)] text-[var(--ink)] text-xl font-black text-center rounded-2xl outline-none transition" />
                    ))}
                  </div>
                )}
                <div className="text-center">
                  {cooldown > 0
                    ? <p className="text-xs text-[var(--muted)]">Resend in <span className="text-[var(--ink)] font-bold">{cooldown}s</span></p>
                    : <button onClick={handleSendOtp} disabled={sending} className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition underline">{sending ? "Sending…" : "Resend OTP"}</button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
