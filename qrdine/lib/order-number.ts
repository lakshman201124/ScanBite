import { redis } from "@/lib/redis";

export async function generateOrderNumber(restaurantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const key = `order_counter:${restaurantId}:${year}`;

  // INCR is atomic — two concurrent calls always get different numbers
  const seq = await redis.incr(key);

  // Set expiry on first creation: end of year + 1 day buffer
  if (seq === 1) {
    const endOfYear = new Date(year + 1, 0, 2).getTime();
    const ttlSeconds = Math.floor((endOfYear - Date.now()) / 1000);
    await redis.expire(key, ttlSeconds);
  }

  return String(seq).padStart(4, "0");
}
