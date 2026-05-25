import type { Socket, Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from "./types";

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function joinRoomsForSocket(socket: Sock): void {
  const { role, restaurantId, tableId, orderId } = socket.data;

  if (role === "admin") {
    socket.join(`restaurant:${restaurantId}`);
    socket.join(`restaurant:${restaurantId}:orders`);
    console.log(`[rooms] admin joined restaurant:${restaurantId}:orders`);
  } else if (role === "chef") {
    socket.join(`restaurant:${restaurantId}`);
    socket.join(`restaurant:${restaurantId}:kitchen`);
    console.log(`[rooms] chef joined restaurant:${restaurantId}:kitchen`);
  } else if (role === "customer") {
    if (tableId) socket.join(`table:${tableId}`);
    if (orderId) socket.join(`order:${orderId}`);
    console.log(`[rooms] customer joined table:${tableId} order:${orderId}`);
  }
}

export function emitOrderCreated(io: IO, payload: ServerToClientEvents["order:created"] extends (data: infer D) => void ? D : never): void {
  const { restaurantId, tableId } = payload;
  io.to(`restaurant:${restaurantId}:orders`).emit("order:created", payload);
  io.to(`restaurant:${restaurantId}:kitchen`).emit("order:created", payload);
  io.to(`table:${tableId}`).emit("order:created", payload);
}

export function emitOrderUpdated(io: IO, payload: ServerToClientEvents["order:updated"] extends (data: infer D) => void ? D : never): void {
  const { restaurantId, tableId, orderId } = payload;
  io.to(`restaurant:${restaurantId}:orders`).emit("order:updated", payload);
  io.to(`restaurant:${restaurantId}:kitchen`).emit("order:updated", payload);
  io.to(`table:${tableId}`).emit("order:updated", payload);
  io.to(`order:${orderId}`).emit("order:updated", payload);
}
