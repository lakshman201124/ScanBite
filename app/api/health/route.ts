import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = { db: "error", redis: "error" };
  let allOk = true;

  // DB ping
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    allOk = false;
  }

  // Redis ping
  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    allOk = false;
  }

  const status = allOk ? 200 : 503;
  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", ...checks, timestamp: new Date().toISOString() },
    { status }
  );
}
