"use client";

import { Component } from "@/components/ui/luma-spin";

interface ScanBiteLoaderProps {
  /** true = gray-100 shadow for dark (KDS/chef) backgrounds */
  dark?: boolean;
  /** Optional label shown below the spinner */
  label?: string;
}

export function ScanBiteLoader({ dark = false, label }: ScanBiteLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label ?? "Loading…"}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 16 }}
    >
      {/* pass the right shadow color; inline style bypasses Tailwind v4 shadow-color quirks */}
      <Component shadowColor={dark ? "#f3f4f6" : "#1f2937"} />

      {label && (
        <span
          style={{
            font: "600 12px var(--sans)",
            color: dark ? "rgba(255,255,255,.45)" : "var(--muted)",
            letterSpacing: ".04em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      )}

      <span className="sr-only">{label ?? "Loading…"}</span>
    </div>
  );
}

interface FullPageLoaderProps extends ScanBiteLoaderProps {
  theme?: "admin" | "dark" | "customer";
}

export function FullPageLoader({ theme = "admin", ...props }: FullPageLoaderProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: theme === "dark" ? "#09090b" : "var(--bg)",
      }}
    >
      <ScanBiteLoader dark={theme === "dark"} {...props} />
    </div>
  );
}
