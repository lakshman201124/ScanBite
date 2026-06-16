import { NextRequest, NextResponse } from "next/server";
import { rateLimiters, checkRateLimit } from "@/lib/rate-limit";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Enforcement layer (Rebuild Spec Part C).
 *
 * A thin edge middleware that turns the six well-designed limiters in
 * `lib/rate-limit.ts` into protection that is ON BY DEFAULT for the seams that
 * matter, instead of opt-in-and-mostly-forgotten.
 *
 * Design rules honoured here:
 *  - Fail-OPEN: a Redis outage must never stop paying customers from ordering.
 *    `checkRateLimit` already returns success on Redis error; we additionally
 *    log a WARN so an outage is visible, not silent.
 *  - Free-tier frugal: the matcher only runs on `/api/*` (never static assets
 *    or `_next`), and unclassified routes consume ZERO Redis commands.
 *  - No DB / no body parsing in middleware (Edge runtime). The identifier is the
 *    client IP — a robust, evasion-resistant bucket that needs no auth decode.
 *  - Auth is NOT moved here. Handlers keep their own `requirePrincipal` checks;
 *    this layer only throttles. (x-principal re-auth is deferred — out of C4 DoD.)
 */

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Pick the limiter for a route, or null to skip (no Redis spend). */
function pickLimiter(pathname: string, method: string): { limiter: Ratelimit; klass: string } | null {
  // Payment webhook (kept even though online pay is dormant in v1).
  if (pathname === "/api/payments/webhook") {
    return { limiter: rateLimiters.webhook, klass: "webhook" };
  }

  // Order creation — only the write paths, never the status/poll GETs.
  if (method === "POST") {
    if (
      pathname === "/api/customer/orders" ||
      pathname === "/api/admin/orders/manual" ||
      pathname === "/api/waiter/orders"
    ) {
      return { limiter: rateLimiters.orderCreate, klass: "orderCreate" };
    }
  }

  // Auth — account-creation & credential entry points (IP layer; some routes
  // also self-limit per-restaurant inside the handler).
  if (
    pathname === "/api/auth/signup" ||
    pathname === "/api/auth/otp/send" ||
    pathname === "/api/auth/staff/login" ||
    pathname === "/api/auth/staff/setup"
  ) {
    return { limiter: rateLimiters.auth, klass: "auth" };
  }

  // Public, unauthenticated read surfaces — coarse anti-scrape limit.
  if (pathname.startsWith("/api/public/") || pathname === "/api/session/create") {
    return { limiter: rateLimiters.menuApi, klass: "menuApi" };
  }

  // All authenticated tenant APIs.
  if (
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/menu/") ||
    pathname.startsWith("/api/tables") ||
    pathname.startsWith("/api/waiter/")
  ) {
    return { limiter: rateLimiters.adminApi, klass: "adminApi" };
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const picked = pickLimiter(pathname, req.method);
  if (!picked) return NextResponse.next();

  const ip = clientIp(req);
  const { success, remaining, reset } = await checkRateLimit(picked.limiter, ip);

  // `remaining === -1` is the sentinel for a fail-open (Redis down). Make it loud.
  if (remaining === -1) {
    console.warn(
      `[middleware] rate-limit fail-open (Redis unreachable) klass=${picked.klass} path=${pathname}`
    );
  }

  if (!success) {
    const retryAfter = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 60;
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down and try again.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return NextResponse.next();
}

export const config = {
  // Only the API surface. Static assets, _next, and pages never reach Redis.
  matcher: ["/api/:path*"],
};
