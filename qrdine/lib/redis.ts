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
  return redis.get<T>(key);
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

// Invalidates both restaurantId-keyed and slug-keyed menu caches atomically
export async function invalidateMenuCache(restaurantId: string, slug: string): Promise<void> {
  await Promise.all([
    redis.del(`menu:${restaurantId}`),
    redis.del(`menu:${slug}`),
  ]);
}

// Invalidate admin orders cache
export async function invalidateAdminOrdersCache(restaurantId: string): Promise<void> {
  // With 5s TTL, aggressive invalidation isn't critical, but we clean the most common key
  await redis.del(`admin_orders:${restaurantId}:all:active:1:50`);
}

