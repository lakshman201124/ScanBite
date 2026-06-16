import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const CACHE_TTL = {
  MENU: 5 * 60,
  SESSION: 2 * 60 * 60,
  RATE_LIMIT: 60,
  ORDER: 30 * 60,
  RESTAURANT: 60 * 60,
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key);
  } catch {
    console.warn(`[redis] cacheGet miss (Redis down) key=${key}`);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    console.warn(`[redis] cacheSet skipped (Redis down) key=${key}`);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    console.warn(`[redis] cacheDel skipped (Redis down) key=${key}`);
  }
}

export async function invalidateMenuCache(restaurantId: string, slug: string): Promise<void> {
  try {
    await Promise.all([
      redis.del(`menu:${restaurantId}`),
      redis.del(`menu:${slug}`),
    ]);
  } catch {
    console.warn(`[redis] invalidateMenuCache skipped (Redis down) restaurantId=${restaurantId}`);
  }
}

export async function invalidateAdminOrdersCache(restaurantId: string): Promise<void> {
  try {
    await redis.del(`admin_orders:${restaurantId}:all:active:1:50`);
  } catch {
    console.warn(`[redis] invalidateAdminOrdersCache skipped (Redis down) restaurantId=${restaurantId}`);
  }
}

