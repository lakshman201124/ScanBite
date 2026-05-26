"use client";

/**
 * ButtonWithIcon — inspired by brandassets/button.html (luma-style)
 *
 * The icon sits in a circular "ball" pinned to the right edge.
 * On hover the ball slides to the left while padding shifts,
 * and the icon rotates 45°. Same 500ms spring transition throughout.
 *
 * Variants
 *   brand  — coral background  (login, cart CTAs)
 *   ink    — charcoal          (signup, primary actions)
 *   dark   — zinc-700          (chef-login, dark surfaces)
 */

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ButtonWithIconProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon placed inside the sliding ball (default: ArrowUpRight) */
  icon?: React.ReactNode;
  /** Color variant — maps to brand tokens */
  variant?: "brand" | "ink" | "dark";
  /** Shows a spinner in the ball and disables the button */
  loading?: boolean;
  /** Text shown while loading */
  loadingText?: string;
  /** Stretches to container width */
  fullWidth?: boolean;
}

const VARIANTS = {
  brand: {
    bg: "var(--brand)",
    disabledBg: "var(--muted)",
    shadow: "var(--sh-brand)",
    ballBg: "#ffffff",
    ballColor: "var(--brand)",
  },
  ink: {
    bg: "var(--ink)",
    disabledBg: "#d1d5db",
    shadow: "0 12px 30px -8px rgba(20,19,26,0.35)",
    ballBg: "#ffffff",
    ballColor: "var(--ink)",
  },
  dark: {
    bg: "#3f3f46",           /* zinc-700 */
    disabledBg: "#27272a",   /* zinc-800 */
    shadow: "none",
    ballBg: "#ffffff",
    ballColor: "#3f3f46",
  },
} as const;

/* Spinner SVG for loading state */
function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export function ButtonWithIcon({
  children,
  icon,
  variant = "ink",
  loading = false,
  loadingText,
  fullWidth = false,
  disabled,
  className = "",
  style,
  ...props
}: ButtonWithIconProps) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];

  return (
    <Button
      {...props}
      disabled={isDisabled}
      className={[
        /* exact structure from button.html */
        "relative text-sm font-bold rounded-full h-12 p-1 ps-6 pe-14",
        "group transition-all duration-500 overflow-hidden cursor-pointer",
        "hover:ps-14 hover:pe-6",
        "flex items-center",
        fullWidth ? "w-full justify-start" : "w-fit",
        isDisabled ? "cursor-not-allowed opacity-75" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: isDisabled ? v.disabledBg : v.bg,
        color: "#ffffff",
        border: 0,
        fontFamily: "var(--sans)",
        boxShadow: isDisabled ? "none" : v.shadow,
        ...style,
      }}
    >
      {/* Label — z-10 so it stays above ball during slide */}
      <span className="relative z-10 transition-all duration-500">
        {loading ? (loadingText ?? "Loading…") : children}
      </span>

      {/* Sliding icon ball */}
      <div
        className={[
          "absolute right-1 w-10 h-10 rounded-full",
          "flex items-center justify-center",
          "transition-all duration-500",
          "group-hover:right-[calc(100%-44px)]",
          loading ? "" : "group-hover:rotate-45",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          background: v.ballBg,
          color: v.ballColor,
        }}
      >
        {loading ? <Spinner /> : (icon ?? <ArrowUpRight size={16} />)}
      </div>
    </Button>
  );
}
