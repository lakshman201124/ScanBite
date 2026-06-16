import * as Sentry from "@sentry/node";

// Sentry must be initialised before any other imports that may throw.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "production",
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Strip PII: never log user identifiers in error payloads.
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    return event;
  },
});

import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { jwtVerify, type JWTPayload } from "jose";

const REQUIRED_ENV = ["REDIS_URL", "AUTH_SECRET"] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    const err = new Error(`[socket-server] Missing required env: ${key}`);
    Sentry.captureException(err);
    throw err;
  }
}

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET!);
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");

interface VerifiedPayload extends JWTPayload {
  restaurantId: string;
  role: "admin" | "chef" | "waiter" | "customer";
  tableId?: string;
}

async function verifyToken(token: string): Promise<VerifiedPayload | null> {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET);
    const p = payload as VerifiedPayload;
    if (!p.restaurantId || !p.role) return null;
    return p;
  } catch {
    return null;
  }
}

async function main() {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (e: Error) => {
    console.error("[socket-server] Redis pub error:", e.message);
    Sentry.captureException(e, { tags: { component: "redis-pub" } });
  });
  subClient.on("error", (e: Error) => {
    console.error("[socket-server] Redis sub error:", e.message);
    Sentry.captureException(e, { tags: { component: "redis-sub" } });
  });

  await Promise.all([pubClient.connect(), subClient.connect()]);

  const httpServer = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
    adapter: createAdapter(pubClient, subClient),
  });

  // Auth middleware — verify JWT on every connection; rooms are derived from
  // the verified token payload only, never from client-supplied data.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("No token"));

    const payload = await verifyToken(token);
    if (!payload) return next(new Error("Invalid token"));

    socket.data.restaurantId = payload.restaurantId;
    socket.data.role = payload.role;
    socket.data.tableId = payload.tableId;
    next();
  });

  io.on("connection", (socket) => {
    const { restaurantId, role, tableId } = socket.data as {
      restaurantId: string;
      role: string;
      tableId?: string;
    };

    // Join the restaurant room (admin / chef / waiter see all orders for their restaurant).
    void socket.join(`restaurant:${restaurantId}`);

    // Waiter also joins the waiter sub-room for targeted events.
    if (role === "waiter") {
      void socket.join(`restaurant:${restaurantId}:waiter`);
    }

    // Customer joins their specific table room.
    if (role === "customer" && tableId) {
      void socket.join(`restaurant:${restaurantId}:table:${tableId}`);
    }

    socket.on("disconnect", () => {
      console.log(`[socket-server] ${role} disconnected restaurant=${restaurantId}`);
    });
  });

  // Forward events published to Redis by the Next.js app into Socket.IO rooms.
  const eventSubscriber = pubClient.duplicate();
  await eventSubscriber.connect();
  await eventSubscriber.subscribe("socket_events", (raw) => {
    try {
      const event = JSON.parse(raw) as {
        type: string;
        data: { restaurantId: string; tableId?: string; [key: string]: unknown };
      };
      const { restaurantId } = event.data;

      // Route to the correct room based on event type.
      if (event.type.startsWith("table:") && event.data.tableId) {
        io.to(`restaurant:${restaurantId}:table:${event.data.tableId}`).emit(event.type, event.data);
      } else {
        io.to(`restaurant:${restaurantId}`).emit(event.type, event.data);
      }
    } catch (e) {
      console.error("[socket-server] Failed to parse event:", e);
      Sentry.captureException(e, { tags: { component: "event-router" } });
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`[socket-server] Listening on :${PORT}`);
  });
}

main().catch((err: Error) => {
  console.error("[socket-server] Fatal startup error:", err);
  Sentry.captureException(err);
  // Flush pending Sentry events before exit so the error is not lost.
  void Sentry.close(2000).then(() => process.exit(1));
});
