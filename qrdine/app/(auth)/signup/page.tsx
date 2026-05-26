"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Check,
  Database,
  QrCode,
  Palette,
  ChefHat
} from "lucide-react";
import { ButtonWithIcon } from "@/components/ui/button-with-icon";

// Custom Floating Label Input Component
interface FloatingInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  icon: React.ReactNode;
  rightElement?: React.ReactNode;
}

function FloatingInput({
  label,
  type,
  value,
  onChange,
  placeholder = "",
  required = false,
  minLength,
  icon,
  rightElement,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = isFocused || value.length > 0;

  return (
    <div className="relative mb-6">
      {/* Icon Wrapper */}
      <div className="absolute left-0 bottom-3 text-zinc-400 flex items-center justify-center transition-colors duration-200">
        {icon}
      </div>

      {/* Floating Label */}
      <label
        className={`absolute left-7 bottom-3 font-medium transition-all duration-300 pointer-events-none origin-left ${
          isFloating
            ? "transform -translate-y-6 scale-75 text-[var(--brand)] font-bold"
            : "text-zinc-400 text-sm"
        }`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Field Input */}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        minLength={minLength}
        placeholder={isFocused ? placeholder : ""}
        className="w-full pl-7 pr-10 py-2.5 bg-transparent border-b-2 border-zinc-200 focus:border-[var(--brand)] text-zinc-800 text-sm font-semibold outline-none transition-colors duration-300"
      />

      {/* Right Element (e.g., eye toggle) */}
      {rightElement && (
        <div className="absolute right-0 bottom-2.5 flex items-center">
          {rightElement}
        </div>
      )}

      {/* Interactive Bottom Border Glow */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isFocused ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--brand)] origin-center"
      />
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();

  // Form values
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // OTP verification state
  const [otpStep, setOtpStep] = useState<"idle" | "sent" | "verified">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Custom multi-phase animated onboarding loader state
  const [showLoader, setShowLoader] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);

  const loaderSteps = [
    { title: "Creating tenant profile...", icon: <Building2 className="w-5 h-5" /> },
    { title: "Provisioning high-performance database...", icon: <Database className="w-5 h-5" /> },
    { title: "Building custom QR dining routes...", icon: <QrCode className="w-5 h-5" /> },
    { title: "Generating responsive brand tokens...", icon: <Palette className="w-5 h-5" /> },
    { title: "Activating real-time kitchen channels...", icon: <ChefHat className="w-5 h-5" /> }
  ];

  // Increment step loader sequentially to present a beautiful dashboard loading state
  useEffect(() => {
    if (!showLoader) return;
    
    const interval = setInterval(() => {
      setLoaderStep((currentStep) => {
        if (currentStep < loaderSteps.length - 1) {
          return currentStep + 1;
        } else {
          clearInterval(interval);
          // Redirect when animation completes
          setTimeout(() => {
            router.push("/onboarding");
            router.refresh();
          }, 800);
          return currentStep;
        }
      });
    }, 900);

    return () => clearInterval(interval);
  }, [showLoader, router, loaderSteps.length]);

  async function handleSendOtp() {
    if (!phone.match(/^\+?[0-9]{10,15}$/)) {
      setOtpError("Enter a valid phone number first.");
      return;
    }
    setOtpSending(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, type: "admin_signup" }),
      });
      const data: { success: boolean; error?: string } = await res.json();
      if (!res.ok || !data.success) {
        setOtpError(data.error ?? "Failed to send OTP");
      } else {
        setOtpStep("sent");
      }
    } catch {
      setOtpError("Failed to send OTP. Try again.");
    } finally {
      setOtpSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otpStep !== "verified") {
      setError("Please verify your phone number first.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName, email, password, phone, otpCode }),
      });

      const data: { success: boolean; error?: string } = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to create account");
        setLoading(false);
        return;
      }

      // Successful signup — auto sign-in with password
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
      } else {
        setShowLoader(true);
      }
    } catch {
      setError("Something went wrong. Please check details and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[var(--bg)] overflow-x-hidden relative">
      
      {/* Spectacular Animated Loading Splash Screen Overlay */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/98 backdrop-blur-xl text-white"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--brand-deep)_0%,_transparent_65%)] opacity-20 pointer-events-none" />

            <div className="w-full max-w-md px-8 text-center relative z-10">
              {/* Spinning Logo Ring */}
              <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-dashed border-[var(--brand)] opacity-60"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
                  className="absolute -inset-2 rounded-full border border-dashed border-zinc-700 opacity-40"
                />
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.9, 1.05, 0.9] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                  className="w-16 h-16 rounded-2xl bg-[var(--brand)] flex items-center justify-center shadow-[0_0_40px_rgba(255,77,61,0.5)]"
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M4 7h2V5h2v2h2"/><path d="M14 7h2V5h2v2h2"/><path d="M4 12h16"/>
                    <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>
                  </svg>
                </motion.div>
              </div>

              {/* Product Heading */}
              <h2 className="text-3xl font-extrabold tracking-tight mb-2">
                Scan<span className="text-[var(--brand)]">Bite</span>
              </h2>
              <p className="font-[var(--display)] italic text-lg text-zinc-400 mb-10">Preparing your high-converting dining system...</p>

              {/* Loading Steps Progression */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 text-left space-y-4 shadow-xl">
                {loaderSteps.map((step, idx) => {
                  const isActive = idx === loaderStep;
                  const isDone = idx < loaderStep;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0.3, x: -10 }}
                      animate={{ 
                        opacity: isActive ? 1 : isDone ? 0.75 : 0.25,
                        x: isActive ? 0 : 0
                      }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-3.5"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                        isDone 
                          ? "bg-emerald-500/20 text-emerald-400" 
                          : isActive 
                            ? "bg-[var(--brand)] text-white shadow-[0_0_12px_rgba(255,77,61,0.4)] animate-pulse" 
                            : "bg-zinc-800 text-zinc-500"
                      }`}>
                        {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : step.icon}
                      </div>
                      <span className={`text-xs font-bold transition-all duration-300 ${
                        isActive ? "text-white text-sm" : isDone ? "text-zinc-300 line-through decoration-zinc-600" : "text-zinc-500"
                      }`}>
                        {step.title}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Welcome text when almost complete */}
              {loaderStep === loaderSteps.length - 1 && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-emerald-400 font-bold text-xs tracking-wider uppercase"
                >
                  🚀 Welcome! Launching Onboarding On-The-Fly...
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDE PANEL: Stunning Dark Visual Showcase */}
      <div className="hidden lg:flex w-[50%] bg-zinc-950 p-12 flex-col justify-between relative overflow-hidden shrink-0">
        
        {/* Ambient Gradient Highlights */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square rounded-full bg-[radial-gradient(circle,_rgba(255,77,61,0.18)_0%,_transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] aspect-square rounded-full bg-[radial-gradient(circle,_rgba(255,77,61,0.12)_0%,_transparent_70%)] pointer-events-none" />

        {/* Header Branding Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand)] flex items-center justify-center text-white shadow-[0_8px_20px_-4px_rgba(255,77,61,0.4)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h2V5h2v2h2"/><path d="M14 7h2V5h2v2h2"/><path d="M4 12h16"/>
              <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-extrabold text-lg tracking-tight">
              Scan<span className="text-[var(--brand)]">Bite</span>
            </div>
            <div className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Restaurant OS</div>
          </div>
        </div>

        {/* Hero Product Visual Presentation (Mock Customer Menu & Tracking Orbit) */}
        <div className="relative my-auto py-10 flex items-center justify-center z-10">
          
          {/* Simulated Mobile Device Menu Screen */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-[280px] h-[480px] bg-zinc-900 border-4 border-zinc-800 rounded-[38px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col"
          >
            {/* Top Bar Info */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-zinc-800/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Live Menu</span>
              </div>
              <div className="bg-zinc-800 px-2 py-0.5 rounded-full text-[9px] font-bold text-zinc-300">
                Table #04
              </div>
            </div>

            {/* Menu Header inside phone */}
            <div className="p-4">
              <h4 className="font-[var(--display)] italic text-2xl text-white font-normal leading-tight">
                The Spice <span className="text-[var(--brand)]">Garden</span>
              </h4>
              <p className="text-[10px] text-zinc-500 mt-1">Premium Indian Delicacies</p>
            </div>

            {/* Scrollable Food Card Showcase */}
            <div className="flex-1 px-4 overflow-y-auto space-y-3 pb-4">
              {/* Popular Item Card */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3 flex gap-3">
                <div 
                  className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0 bg-zinc-800"
                  style={{ backgroundImage: `url('https://images.unsplash.com/photo-1633945274405-b6c8069047b0?q=80&w=200')` }}
                />
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-[3px] border border-emerald-500 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </span>
                      <h5 className="text-[11px] font-black text-zinc-200 truncate">Signature Biryani</h5>
                    </div>
                    <p className="text-[9px] text-zinc-500 truncate mt-0.5">Slow-cooked fragrant basmati rice</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-extrabold text-[var(--brand)]">Rs 349</span>
                    <button type="button" className="bg-[var(--brand)] text-white text-[9px] font-extrabold px-3 py-1 rounded-lg">
                      ADD
                    </button>
                  </div>
                </div>
              </div>

              {/* Second item inside phone */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3 flex gap-3">
                <div 
                  className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0 bg-zinc-800"
                  style={{ backgroundImage: `url('https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=200')` }}
                />
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-[3px] border border-emerald-500 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </span>
                      <h5 className="text-[11px] font-black text-zinc-200 truncate">Butter Chicken Paneer</h5>
                    </div>
                    <p className="text-[9px] text-zinc-500 truncate mt-0.5">Creamy charcoal-grilled gravy</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-extrabold text-[var(--brand)]">Rs 299</span>
                    <button type="button" className="bg-[var(--brand)] text-white text-[9px] font-extrabold px-3 py-1 rounded-lg">
                      ADD
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom floating cart banner in phone */}
            <div className="mx-3 mb-3 bg-zinc-950 border border-zinc-800 rounded-full p-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 pl-3">
                <span className="w-6 h-6 rounded-full bg-[var(--brand)] flex items-center justify-center text-[10px] font-black text-white">
                  2
                </span>
                <div className="text-left leading-none">
                  <div className="text-[9px] font-bold text-zinc-400">View Bag</div>
                  <div className="text-[10px] font-black text-white">Rs 648</div>
                </div>
              </div>
              <div className="bg-[var(--brand)] text-white text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-1">
                Order <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </motion.div>

          {/* Floating Premium Analytics Card */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="absolute left-[-20px] bottom-[60px] bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-[0_12px_24px_rgba(0,0,0,0.5)] w-[160px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">Revenue</span>
            </div>
            <div className="text-lg font-black text-white leading-none">Rs 48,230</div>
            <div className="text-[9px] font-black text-emerald-400 mt-1 flex items-center gap-0.5">
              +34.2% <span className="text-zinc-500 font-medium">this week</span>
            </div>
          </motion.div>

          {/* Floating Real-Time KDS Notification Popover */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="absolute right-[-20px] top-[80px] bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-3 shadow-[0_12px_24px_rgba(0,0,0,0.5)] w-[160px] text-left"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full">
                KDS Alert
              </span>
              <span className="text-[9px] text-zinc-500 font-bold">2m ago</span>
            </div>
            <h6 className="text-[10px] font-black text-zinc-200">Table #04 Placed Order</h6>
            <p className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Biryani & Butter Paneer prep started.</p>
          </motion.div>
        </div>

        {/* Left Side Footer Branding Slogan */}
        <div className="text-left z-10">
          <p className="text-white text-sm font-semibold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[var(--brand)]" />
            Designed for peak kitchen hospitality.
          </p>
          <p className="text-xs text-zinc-500 max-w-sm">
            Empower your waiters, automate checkout orders, and customize beautiful dining menus on-the-fly.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE PANEL: Clean, Spacious Signup Form */}
      <div className="w-full lg:w-[50%] flex flex-col justify-between p-8 sm:p-12 md:p-16 shrink-0 relative bg-[var(--surface)]">
        
        {/* Small upper header for mobile/tablet */}
        <div className="flex lg:hidden items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h2V5h2v2h2"/><path d="M14 7h2V5h2v2h2"/><path d="M4 12h16"/>
                <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>
              </svg>
            </div>
            <span className="text-zinc-800 font-extrabold text-sm tracking-tight">ScanBite</span>
          </div>
          <Link href="/login" className="text-xs font-black text-[var(--brand)] no-underline">
            Sign In →
          </Link>
        </div>

        {/* Center alignment spacer */}
        <div className="my-auto max-w-[400px] w-full mx-auto">
          
          {/* Welcome Headline */}
          <div className="mb-8">
            <h1 className="text-zinc-900 font-normal leading-[1.1] tracking-tight mb-2 font-[var(--display)] text-[38px] sm:text-[44px]">
              Get your restaurant <em className="italic text-[var(--brand)]">online</em>
            </h1>
            <p className="text-zinc-500 text-sm">
              Launch dynamic QR codes, digital menus, and instant orders. Free to start, cancel anytime.
            </p>
          </div>

          {/* Form Error Message banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200/60 text-red-600 text-xs font-bold rounded-2xl px-4 py-3.5 mb-6 flex items-center gap-2.5"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Registration Form with Floating Inputs */}
          <form onSubmit={handleSubmit} className="space-y-1">
            <FloatingInput
              label="Restaurant name"
              type="text"
              value={restaurantName}
              onChange={setRestaurantName}
              placeholder="e.g. The Grand Biryani"
              required
              icon={<Building2 className="w-4 h-4" />}
            />

            <FloatingInput
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="e.g. you@restaurant.com"
              required
              icon={<Mail className="w-4 h-4" />}
            />

            <FloatingInput
              label="Password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              icon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-zinc-400 hover:text-zinc-600 p-1 outline-none transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Phone + OTP verification */}
            <div className="mb-2">
              <FloatingInput
                label="Phone number"
                type="tel"
                value={phone}
                onChange={(val) => { setPhone(val); setOtpStep("idle"); setOtpCode(""); setOtpError(""); }}
                placeholder="e.g. +91 98765 43210"
                required
                icon={<Phone className="w-4 h-4" />}
                rightElement={
                  otpStep === "verified" ? (
                    <span className="text-emerald-500 text-xs font-black pr-1">Verified</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || !phone}
                      className="text-[var(--brand)] text-xs font-black pr-1 disabled:opacity-40 hover:underline"
                    >
                      {otpSending ? "Sending…" : otpStep === "sent" ? "Resend" : "Send OTP"}
                    </button>
                  )
                }
              />

              {otpError && (
                <p className="text-red-500 text-xs font-semibold mt-1 ml-7">{otpError}</p>
              )}

              {otpStep === "sent" && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3"
                >
                  <FloatingInput
                    label="6-digit OTP"
                    type="text"
                    value={otpCode}
                    onChange={(val) => {
                      const digits = val.replace(/\D/g, "").slice(0, 6);
                      setOtpCode(digits);
                      setOtpError("");
                      // Mark verified locally when 6 digits entered;
                      // actual OTP check happens server-side on form submit
                      if (digits.length === 6) setOtpStep("verified");
                      else setOtpStep("sent");
                    }}
                    placeholder="Enter the code sent to your phone"
                    required
                    icon={<Lock className="w-4 h-4" />}
                  />
                  <p className="text-zinc-400 text-[11px] ml-7 -mt-4">
                    Code sent to {phone}. Valid for 5 minutes.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Terms text */}
            <p className="text-[11px] leading-relaxed text-zinc-400 pb-3">
              By creating an account, you agree to ScanBite&apos;s{" "}
              <a href="#" className="underline text-zinc-500 hover:text-zinc-700">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="underline text-zinc-500 hover:text-zinc-700">Privacy Policy</a>.
            </p>

            {/* Submit Action Button */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <ButtonWithIcon
                type="submit"
                variant="ink"
                loading={loading}
                loadingText="Processing account…"
                fullWidth
              >
                Create Account
              </ButtonWithIcon>
            </motion.div>
          </form>

          {/* Login Anchor */}
          <p className="mt-8 text-center text-xs text-zinc-400">
            Already have a restaurant account?{" "}
            <Link href="/login" className="color-[var(--brand)] text-[var(--brand)] font-extrabold hover:underline no-underline">
              Sign In
            </Link>
          </p>
        </div>

        {/* Footer info in desktop */}
        <div className="hidden lg:flex items-center justify-between text-[11px] text-zinc-400 mt-8 pt-6 border-t border-zinc-100">
          <span>&copy; {new Date().getFullYear()} ScanBite SaaS Inc.</span>
          <div className="space-x-4">
            <a href="#" className="hover:text-zinc-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-600 transition-colors">Support</a>
          </div>
        </div>

      </div>
      
    </div>
  );
}
