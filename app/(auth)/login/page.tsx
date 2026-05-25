"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ButtonWithIcon } from "@/components/ui/button-with-icon";

const inp: React.CSSProperties = {
  display: "block", width: "100%", padding: "12px 14px",
  border: "1px solid var(--hairline)", borderRadius: 12,
  fontSize: 14, fontFamily: "var(--sans)",
  background: "var(--bg)", color: "var(--ink)",
  outline: "none", boxSizing: "border-box", marginTop: 6,
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Invalid email or password. Try admin@spicegarden.com / admin123");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-[var(--bg)]">
      <div className="w-full max-w-[420px]">
        <div style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 24, padding: 32, boxShadow: "var(--sh-3)" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand)", display: "grid", placeItems: "center", color: "#fff", boxShadow: "var(--sh-brand)", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h2V5h2v2h2"/><path d="M14 7h2V5h2v2h2"/><path d="M4 12h16"/>
                <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-.01em", color: "var(--ink)" }}>
                Scan<span style={{ color: "var(--accent)" }}>Bite</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Restaurant Dashboard</div>
            </div>
          </div>

          <h2 style={{ margin: "0 0 4px", fontFamily: "var(--display)", fontWeight: 400, fontSize: 28, letterSpacing: "-.01em", color: "var(--ink)" }}>
            Welcome <em style={{ fontStyle: "italic", color: "var(--accent)" }}>back</em>
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--muted)" }}>Sign in to your restaurant account</p>

          {error && (
            <div style={{ background: "rgba(200,70,47,.08)", border: "1px solid rgba(200,70,47,.2)", color: "var(--red)", fontSize: 13, borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", letterSpacing: ".02em" }}>Email address</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@restaurant.com" required style={inp} />
            </label>

            <label style={{ display: "block", marginBottom: 24 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", letterSpacing: ".02em" }}>Password</span>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ ...inp, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, cursor: "pointer", color: "var(--muted)", padding: 0, marginTop: 3 }}>
                  {showPw
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </label>

            <ButtonWithIcon
              type="submit"
              variant="brand"
              loading={loading}
              loadingText="Signing in…"
              fullWidth
            >
              Sign in
            </ButtonWithIcon>
          </form>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            New restaurant?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>Create account</Link>
          </p>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <Link href="/chef-login" style={{ fontSize: 12, color: "var(--muted-2)", textDecoration: "none" }}>Chef / Kitchen login →</Link>
          </div>

          {/* Dev hint */}
          <div style={{ marginTop: 20, padding: "12px 14px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--hairline)" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 6 }}>Demo credentials</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)", fontFamily: "var(--mono)" }}>admin@spicegarden.com</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>password: admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
