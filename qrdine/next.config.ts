import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    // Socket server origin is env-driven so changing the host never silently
    // breaks real-time. Defaults to localhost for local dev.
    const socketOrigin =
      process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/^http/, "ws") ??
      "ws://localhost:3001";

    const securityHeaders = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), bluetooth=(self)",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          // 'unsafe-eval' removed — Next.js does not require it in production.
          // 'unsafe-inline' kept for now; nonce-based approach is a v2 hardening.
          "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https://res.cloudinary.com",
          `connect-src 'self' https://*.upstash.io ${socketOrigin} https://lumberjack.razorpay.com`,
          "frame-src https://api.razorpay.com",
        ].join("; "),
      },
    ];

    return [
      // ─── Static assets: immutable, 1 year ─────────────────────────────────
      // Next.js fingerprints these files — they never change at the same URL.
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },

      // ─── Public static files (favicon, images, fonts) ─────────────────────
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
      {
        source: "/(.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf))",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },

      // ─── Public menu API: short TTL with stale-while-revalidate ───────────
      // Redis already caches for 5 min; HTTP layer adds CDN/browser caching.
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=60" },
          { key: "Vary", value: "Accept-Encoding" },
        ],
      },

      // ─── Health check endpoint ─────────────────────────────────────────────
      {
        source: "/api/health",
        headers: [
          { key: "Cache-Control", value: "public, max-age=30, stale-while-revalidate=10" },
        ],
      },

      // ─── Auth endpoints: never cache ──────────────────────────────────────
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "Pragma", value: "no-cache" },
        ],
      },

      // ─── Auth pages: no-store so credentials never land in cache ──────────
      {
        source: "/(login|signup|staff-login)",
        headers: [
          { key: "Cache-Control", value: "no-store, private" },
        ],
      },

      // ─── Admin API routes: private, always fresh ──────────────────────────
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, must-revalidate" },
        ],
      },

      // ─── Admin & KDS pages: private, revalidate on each visit ─────────────
      {
        source: "/(dashboard|kds|onboarding)/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, must-revalidate" },
        ],
      },

      // ─── Global: security headers on all routes ───────────────────────────
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          ...securityHeaders,
        ],
      },
      {
        // Admin menu preview embeds customer routes in a same-origin iframe
        source: "/m/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // All Sentry event traffic is proxied through /monitoring (same-origin),
  // so CSP connect-src does not need *.sentry.io.
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: true },
  disableLogger: true,
  automaticVercelMonitors: false,
});
