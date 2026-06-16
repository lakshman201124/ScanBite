import type { Socket, Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from "./types";
import { emitOrderUpdated } from "./rooms";

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerEventHandlers(io: IO, socket: Sock): void {
  const { role, restaurantId } = socket.data;

  // order:status — admin or chef updates status
  socket.on("order:status", (data) => {
    if (data.restaurantId !== restaurantId) return;
    if (role !== "admin" && role !== "chef") return;
    emitOrderUpdated(io, data);
  });

  // order:item_status — chef marks individual item ready
  socket.on("order:item_status", (data) => {
    if (data.restaurantId !== restaurantId) return;
    if (role !== "chef" && role !== "admin") return;
    io.to(`restaurant:${restaurantId}:orders`).emit("order:item_ready", data);
    io.to(`order:${data.orderId}`).emit("order:item_ready", data);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected ${socket.id} (${role}) — ${reason}`);
  });
}
