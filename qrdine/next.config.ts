import type { NextConfig } from "next";

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
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
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
        source: "/(login|signup|chef-login)",
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

export default nextConfig;
