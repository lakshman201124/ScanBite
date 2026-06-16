import { createClient } from "redis";
import type { SocketRedisMessage } from "@/types/socket";

let publishClient: ReturnType<typeof createClient> | null = null;
let connectionPromise: Promise<void> | null = null;

async function getPublishClient(): Promise<ReturnType<typeof createClient>> {
  if (publishClient?.isReady) return publishClient;

  // If a connection attempt is already in progress, wait for it
  if (connectionPromise) {
    await connectionPromise;
    if (publishClient?.isReady) return publishClient;
  }

  publishClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
      reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 30_000),
      connectTimeout: 5000,
    },
  });

  publishClient.on("error", (e) => console.warn("[socket-emitter] redis error:", e.message));
  publishClient.on("reconnecting", () => console.warn("[socket-emitter] Redis reconnecting..."));
  publishClient.on("ready", () => console.log("[socket-emitter] Redis connected and ready"));

  connectionPromise = publishClient
    .connect()
    .then(() => { connectionPromise = null; })
    .catch((err: Error) => {
      console.error("[socket-emitter] Redis connection failed:", err.message);
      publishClient = null;
      connectionPromise = null;
      throw err;
    });

  await connectionPromise;
  return publishClient!;
}

export function emitSocketEvent(event: SocketRedisMessage): void {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 1500)
  );
  Promise.race([
    getPublishClient().then((client) => client.publish("socket_events", JSON.stringify(event))),
    timeout,
  ]).catch((e: Error) => {
    if (e.message === "timeout") {
      console.error(`[socket-emitter] publish timed out for "${event.type}" — real-time update may be lost`);
    } else {
      console.error(`[socket-emitter] failed to publish "${event.type}":`, e.message);
    }
    // Reset so the next call creates a fresh connection
    publishClient = null;
    connectionPromise = null;
  });
}
