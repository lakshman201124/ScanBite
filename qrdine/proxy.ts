import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { NextAuthRequest } from "next-auth";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const { auth } = NextAuth(authConfig);

const CHEF_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-secret"
);

async function verifyChefJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, CHEF_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Ratelimiter for OTP Send: 5 requests per 10 minutes
const otpRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "ratelimit:otp",
});

// Ratelimiter for Customer Orders: 5 requests per 10 seconds
const orderRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
  analytics: true,
  prefix: "ratelimit:orders",
});

export const proxy = auth(async function proxy(req: NextAuthRequest) {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const ip = (req as any).ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // 1. Rate limiting for OTP send API (Must run before general auth bypass)
  if (pathname === "/api/auth/otp/send") {
    // Check if test bypass is active and we want to skip rate limits for testing
    if (
      process.env.TEST_OTP_BYPASS === "true" &&
      process.env.NODE_ENV !== "production"
    ) {
      return NextResponse.next();
    }

    try {
      const { success, limit, reset, remaining } = await otpRatelimit.limit(ip);
      if (!success) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: "Too many OTP requests. Please try again later.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          }
        );
      }

      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Limit", limit.toString());
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set("X-RateLimit-Reset", reset.toString());
      return response;
    } catch (error) {
      console.error("[Proxy] OTP rate limiting error:", error);
      // Fail open: let requests pass if Redis/RateLimiter is down
      return NextResponse.next();
    }
  }

  // 2. Rate limiting for Customer Orders API
  if (pathname === "/api/customer/orders") {
    // Check if test bypass is active to avoid rate-limiting E2E tests
    if (
      process.env.TEST_OTP_BYPASS === "true" &&
      process.env.NODE_ENV !== "production"
    ) {
      return NextResponse.next();
    }

    try {
      const { success, limit, reset, remaining } = await orderRatelimit.limit(ip);
      if (!success) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: "Too many requests. Please slow down.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          }
        );
      }

      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Limit", limit.toString());
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set("X-RateLimit-Reset", reset.toString());
      return response;
    } catch (error) {
      console.error("[Proxy] Order rate limiting error:", error);
      // Fail open to avoid blocking legitimate orders
      return NextResponse.next();
    }
  }

  // NextAuth handles its own routes — never intercept them
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Admin dashboard + /api/admin
  if (
    pathname.startsWith("/dashboard") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/api/admin")
  ) {
    if (!session?.user?.restaurantId) {
      // API routes → 401 JSON; page routes → redirect
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

  // Chef KDS + Waiter Staff panel + /api/chef
  if (pathname.startsWith("/kds") || pathname.startsWith("/staff") || pathname.startsWith("/api/chef")) {
    const chefToken = req.cookies.get("chef_token")?.value;
    if (!chefToken) {
      // API routes → 401 JSON; page routes → redirect
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/chef-login", req.url));
    }
    const payload = await verifyChefJWT(chefToken);
    if (!payload?.restaurantId) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
      }
      const res = NextResponse.redirect(new URL("/chef-login", req.url));
      res.cookies.delete("chef_token");
      return res;
    }
    const response = NextResponse.next();
    response.headers.set("x-restaurant-id", payload.restaurantId as string);
    response.headers.set("x-user-role", (payload.role as string) ?? "chef");
    return response;
  }

  // Redirect authenticated users away from auth pages
  if (pathname === "/login" || pathname === "/signup") {
    if (session?.user?.restaurantId) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (pathname === "/chef-login") {
    const chefToken = req.cookies.get("chef_token")?.value;
    if (chefToken) {
      const payload = await verifyChefJWT(chefToken);
      if (payload?.role) {
        const dest = payload.role === "waiter" ? "/staff" : "/kds";
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/kds/:path*",
    "/staff/:path*",
    "/login",
    "/signup",
    "/chef-login",
    "/api/admin/:path*",
    "/api/chef/:path*",
    "/api/auth/otp/send",
    "/api/customer/orders",
  ],
};
