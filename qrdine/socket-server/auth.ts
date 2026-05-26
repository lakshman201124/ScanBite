import { jwtVerify } from "jose";
import type { Socket } from "socket.io";
import type { SocketAuthPayload, ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from "./types";

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-dev-secret-change-in-prod");

export async function authenticateSocket(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): Promise<SocketAuthPayload | null> {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    const role = socket.handshake.auth?.role as string | undefined;
    const restaurantId = socket.handshake.auth?.restaurantId as string | undefined;
    const tableId = socket.handshake.auth?.tableId as string | undefined;
    const orderId = socket.handshake.auth?.orderId as string | undefined;

    // Customer: no JWT, uses restaurantId + tableId from handshake
    if (role === "customer") {
      if (!restaurantId || !tableId) return null;
      return { role: "customer", restaurantId, tableId, orderId };
    }

    // Admin / Chef: validate JWT
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);

    const jwtRestaurantId = payload.restaurantId as string | undefined;
    const jwtRole = payload.role as string | undefined;
    const jwtUserId = payload.sub ?? (payload.userId as string | undefined);

    if (!jwtRestaurantId || !jwtRole || !jwtUserId) return null;
    if (!["admin", "chef", "super_admin"].includes(jwtRole)) return null;

    return {
      userId: jwtUserId,
      restaurantId: jwtRestaurantId,
      role: (jwtRole === "super_admin" ? "admin" : jwtRole) as "admin" | "chef",
    };
  } catch {
    return null;
  }
}
