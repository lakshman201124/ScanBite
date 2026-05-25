import { prisma } from "@/lib/db";
import { redis, CACHE_TTL } from "@/lib/redis";
import { v4 as uuidv4 } from "uuid";
import type { SessionPayload } from "@/types";

const SESSION_DURATION_HOURS = 2;

export async function createCustomerSession(
  restaurantId: string,
  tableId: string
): Promise<string> {
  const sessionToken = uuidv4();
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000
  );

  await prisma.customerSession.create({
    data: {
      restaurant_id: restaurantId,
      table_id: tableId,
      session_token: sessionToken,
      expires_at: expiresAt,
    },
  });

  const payload: SessionPayload = {
    sessionId: sessionToken,
    restaurantId,
    tableId,
    expiresAt: expiresAt.toISOString(),
  };

  await redis.setex(
    `session:${sessionToken}`,
    CACHE_TTL.SESSION,
    JSON.stringify(payload)
  );

  return sessionToken;
}

export async function validateCustomerSession(
  sessionToken: string
): Promise<SessionPayload | null> {
  const cached = await redis.get<SessionPayload>(`session:${sessionToken}`);
  if (cached) {
    if (new Date(cached.expiresAt) < new Date()) {
      await redis.del(`session:${sessionToken}`);
      return null;
    }
    return cached;
  }

  const session = await prisma.customerSession.findUnique({
    where: { session_token: sessionToken },
  });

  if (!session || session.expires_at < new Date()) {
    return null;
  }

  const payload: SessionPayload = {
    sessionId: session.session_token,
    restaurantId: session.restaurant_id,
    tableId: session.table_id,
    expiresAt: session.expires_at.toISOString(),
  };

  const ttlSeconds = Math.floor(
    (session.expires_at.getTime() - Date.now()) / 1000
  );
  if (ttlSeconds > 0) {
    await redis.setex(
      `session:${sessionToken}`,
      ttlSeconds,
      JSON.stringify(payload)
    );
  }

  return payload;
}

export async function invalidateCustomerSession(
  sessionToken: string
): Promise<void> {
  await redis.del(`session:${sessionToken}`);
  await prisma.customerSession.deleteMany({
    where: { session_token: sessionToken },
  });
}
