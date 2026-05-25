import { createClient } from "redis";

let publishClient: ReturnType<typeof createClient> | null = null;

async function getPublishClient() {
  if (publishClient?.isReady) return publishClient;

  const url = process.env.REDIS_URL || "redis://localhost:6379";

  publishClient = createClient({ url });
  publishClient.on("error", (e) => console.warn("[socket-emitter] redis error:", e.message));
  await publishClient.connect();
  return publishClient;
}

import type { SocketRedisMessage } from "@/types/socket";

export function emitSocketEvent(event: SocketRedisMessage): void {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 1500)
  );
  Promise.race([
    getPublishClient().then(client => client.publish("socket_events", JSON.stringify(event))),
    timeout,
  ]).catch(e => console.warn("[socket-emitter] failed to publish:", (e as Error).message));
}
