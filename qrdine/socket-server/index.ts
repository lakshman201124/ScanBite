import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { authenticateSocket } from "./auth";
import { joinRoomsForSocket } from "./rooms";
import { registerEventHandlers } from "./events";
import { startMetricsLogging } from "./metrics";
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, OrderCreatedPayload, OrderStatusPayload, BillRequestedPayload, BillGeneratedPayload, PaymentConfirmedPayload } from "./types";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const NEXT_ORIGIN = process.env.NEXT_PUBLIC_NEXTJS_URL ?? "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      connections: io.engine.clientsCount,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: [NEXT_ORIGIN, "http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 30000,       // Reduced from 60000 — detect dead connections faster
  pingInterval: 15000,      // Reduced from 25000 — more responsive
  maxHttpBufferSize: 1e6,   // 1MB max message — prevent memory abuse
  perMessageDeflate: false, // Disable compression — saves CPU, messages are small JSON
  httpCompression: false,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
});

// Redis adapter for horizontal scaling
async function setupRedisAdapter() {
  try {
    const redisUrl = REDIS_URL;

    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => console.warn("[redis] pub error:", err.message));
    subClient.on("error", (err) => console.warn("[redis] sub error:", err.message));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    // Subscribe to internal pub/sub channel for server-side order events
    await subClient.subscribe("socket_events", (message) => {
      try {
        const event = JSON.parse(message) as {
          type: "order:created" | "order:updated" | "bill:requested" | "bill:generated" | "payment:confirmed";
          data: OrderCreatedPayload | OrderStatusPayload | BillRequestedPayload | BillGeneratedPayload | PaymentConfirmedPayload;
        };

        if (event.type === "order:created") {
          const data = event.data as OrderCreatedPayload;
          io.to(`restaurant:${data.restaurantId}:orders`).emit("order:created", data);
          io.to(`restaurant:${data.restaurantId}:kitchen`).emit("order:created", data);
          io.to(`table:${data.tableId}`).emit("order:created", data);
        } else if (event.type === "order:updated") {
          const data = event.data as OrderStatusPayload;
          io.to(`restaurant:${data.restaurantId}:orders`).emit("order:updated", data);
          io.to(`restaurant:${data.restaurantId}:kitchen`).emit("order:updated", data);
          io.to(`table:${data.tableId}`).emit("order:updated", data);
          io.to(`order:${data.orderId}`).emit("order:updated", data);
        } else if (event.type === "bill:requested") {
          const data = event.data as BillRequestedPayload;
          // Admin dashboard needs to show the bill request notification
          io.to(`restaurant:${data.restaurantId}:orders`).emit("bill:requested", data);
        } else if (event.type === "bill:generated") {
          const data = event.data as BillGeneratedPayload;
          // Notify admin and the specific order room (customer tracking screen)
          io.to(`restaurant:${data.restaurantId}:orders`).emit("bill:generated", data);
          io.to(`order:${data.orderId}`).emit("bill:generated", data);
        } else if (event.type === "payment:confirmed") {
          const data = event.data as PaymentConfirmedPayload;
          // Notify admin orders room, kitchen, table and per-order room
          io.to(`restaurant:${data.restaurantId}:orders`).emit("payment:confirmed", data);
          io.to(`restaurant:${data.restaurantId}:kitchen`).emit("payment:confirmed", data);
          io.to(`table:${data.tableId}`).emit("payment:confirmed", data);
          io.to(`order:${data.orderId}`).emit("payment:confirmed", data);
        }
      } catch (e) {
        console.error("[socket_events] parse error:", e);
      }
    });

    console.log("[redis] adapter connected");
  } catch (err) {
    console.warn("[redis] adapter failed, running without Redis adapter:", (err as Error).message);
    // Continue without adapter — single-instance mode
  }
}

// Auth middleware
io.use(async (socket, next) => {
  const payload = await authenticateSocket(socket);
  if (!payload) {
    return next(new Error("Authentication failed"));
  }
  Object.assign(socket.data, payload);
  next();
});

// Connection handler
io.on("connection", (socket) => {
  const { role, restaurantId } = socket.data;
  console.log(`[socket] connected ${socket.id} role=${role} restaurant=${restaurantId}`);

  joinRoomsForSocket(socket);
  registerEventHandlers(io, socket);
});

setupRedisAdapter().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`[socket-server] listening on port ${PORT}`);
    startMetricsLogging(io);
  });
});
