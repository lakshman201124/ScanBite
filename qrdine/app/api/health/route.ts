import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  const checks: Record<string, { status: string; latency_ms?: number }> = {};

  // Database check with latency
  const dbStart = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latency_ms: Math.round(performance.now() - dbStart) };
  } catch {
    checks.database = { status: "error", latency_ms: Math.round(performance.now() - dbStart) };
  }

  // Redis check with latency
  const redisStart = performance.now();
  try {
    await redis.ping();
    checks.redis = { status: "ok", latency_ms: Math.round(performance.now() - redisStart) };
  } catch {
    checks.redis = { status: "error", latency_ms: Math.round(performance.now() - redisStart) };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
