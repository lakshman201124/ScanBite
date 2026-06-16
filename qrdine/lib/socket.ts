import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

if (!process.env.NEXT_PUBLIC_SOCKET_URL && process.env.NODE_ENV === "production") {
  console.error("[socket] NEXT_PUBLIC_SOCKET_URL is not set — falling back to localhost, real-time will not work in production");
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
    });
  }
  return socket;
}

export function connectSocket(auth: Record<string, unknown>): Socket {
  const s = getSocket();
  s.auth = auth;
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}
