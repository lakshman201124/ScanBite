import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasourceUrl: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.includes("?")
        ? `${process.env.DATABASE_URL}&connection_timeout=10&pool_timeout=10&connection_limit=50&pgbouncer=true`
        : `${process.env.DATABASE_URL}?connection_timeout=10&pool_timeout=10&connection_limit=50&pgbouncer=true`
      : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
