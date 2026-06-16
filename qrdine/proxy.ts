import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { NextAuthRequest } from "next-auth";
import { getAuthSecretKey } from "@/lib/secret";
import { rateLimiters, checkRateLimit } from "@/lib/rate-limit";
import { Ratelimit } from "@upstash/ratelimit";

const { auth } = NextAuth(authConfig);
const CHEF_SECRET = getAuthSecretKey();

async function verifyChefJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, CHEF_SECRET);
    return payload;
  } catch {
    return null;
  }
}

function clientIp(req: NextAuthRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function pickLimiter(pathname: string, method: string): { limiter: Ratelimit; klass: string } | null {
  if (pathname === "/api/payments/webhook") {
    return { limiter: rateLimiters.webhook, klass: "webhook" };
  }
  if (method === "POST") {
    if (
      pathname === "/api/customer/orders" ||
      pathname === "/api/admin/orders/manual" ||
      pathname === "/api/waiter/orders"
    ) {
      return { limiter: rateLimiters.orderCreate, klass: "orderCreate" };
    }
  }
  if (
    pathname === "/api/auth/signup" ||
    pathname === "/api/auth/otp/send" ||
    pathname === "/api/auth/staff/login" ||
    pathname === "/api/auth/staff/setup"
  ) {
    return { limiter: rateLimiters.auth, klass: "auth" };
  }
  if (pathname.startsWith("/api/public/") || pathname === "/api/session/create") {
    return { limiter: rateLimiters.menuApi, klass: "menuApi" };
  }
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

export const proxy = auth(async function proxy(req: NextAuthRequest) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ── Rate limiting ────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/") && pathname !== "/api/health") {
    const picked = pickLimiter(pathname, req.method);
    if (picked) {
      const ip = clientIp(req);
      const { success, remaining, reset } = await checkRateLimit(picked.limiter, ip);
      if (remaining === -1) {
        console.warn(`[proxy] rate-limit fail-open klass=${picked.klass} path=${pathname}`);
      }
      if (!success) {
        const retryAfter = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 60;
        return NextResponse.json(
          { success: false, error: "Too many requests. Please slow down and try again.", code: "RATE_LIMITED" },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }
    }
  }

  // NextAuth handles its own routes — never intercept them
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // ── Admin dashboard + /api/admin ─────────────────────────────────────────
  if (
    pathname.startsWith("/dashboard") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/api/admin")
  ) {
    if (!session?.user?.restaurantId) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
    const role = session.user.role as string;
    if (role !== "admin" && role !== "super_admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/kds", req.url));
    }
    const response = NextResponse.next();
    response.headers.set("x-restaurant-id", session.user.restaurantId);
    response.headers.set("x-user-id", session.user.id ?? "");
    response.headers.set("x-user-role", role);
    return response;
  }

  // ── /kds/* and /api/chef/* — require chef/staff role ────────────────────
  if (pathname.startsWith("/kds") || pathname.startsWith("/api/chef")) {
    const staffToken = req.cookies.get("chef_token")?.value;
    if (staffToken) {
      const payload = await verifyChefJWT(staffToken);
      if (payload?.restaurantId) {
        if ((payload.role as string) === "waiter") {
          return NextResponse.redirect(new URL("/waiter", req.url));
        }
        const response = NextResponse.next();
        response.headers.set("x-restaurant-id", payload.restaurantId as string);
        response.headers.set("x-user-id", (payload.sub as string) ?? "");
        response.headers.set("x-user-role", (payload.role as string) ?? "chef");
        return response;
      }
    }
    if (session?.user?.restaurantId && (session.user.role === "admin" || session.user.role === "super_admin")) {
      const response = NextResponse.next();
      response.headers.set("x-restaurant-id", session.user.restaurantId);
      response.headers.set("x-user-id", session.user.id ?? "");
      response.headers.set("x-user-role", session.user.role as string);
      return response;
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/staff-login", req.url));
  }

  // ── /waiter/* and /api/waiter/* — require waiter role ───────────────────
  if (pathname.startsWith("/waiter") || pathname.startsWith("/api/waiter")) {
    const staffToken = req.cookies.get("chef_token")?.value;
    if (staffToken) {
      const payload = await verifyChefJWT(staffToken);
      if (payload?.restaurantId) {
        if ((payload.role as string) === "chef") {
          return NextResponse.redirect(new URL("/kds", req.url));
        }
        const response = NextResponse.next();
        response.headers.set("x-restaurant-id", payload.restaurantId as string);
        response.headers.set("x-user-id", (payload.sub as string) ?? "");
        response.headers.set("x-user-role", (payload.role as string) ?? "waiter");
        return response;
      }
    }
    if (session?.user?.restaurantId && (session.user.role === "admin" || session.user.role === "super_admin")) {
      const response = NextResponse.next();
      response.headers.set("x-restaurant-id", session.user.restaurantId);
      response.headers.set("x-user-id", session.user.id ?? "");
      response.headers.set("x-user-role", session.user.role as string);
      return response;
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/staff-login", req.url));
  }

  // ── Redirect authenticated users away from auth pages ───────────────────
  if (pathname === "/login" || pathname === "/signup") {
    if (session?.user?.restaurantId) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (pathname === "/staff-login" || pathname === "/chef-login") {
    const staffToken = req.cookies.get("chef_token")?.value;
    if (staffToken) {
      const payload = await verifyChefJWT(staffToken);
      if (payload?.role) {
        const dest = (payload.role as string) === "waiter" ? "/waiter" : "/kds";
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }
    if (session?.user?.restaurantId) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/kds/:path*",
    "/waiter/:path*",
    "/login",
    "/signup",
    "/staff-login",
    "/chef-login",
    "/api/:path*",
  ],
};
