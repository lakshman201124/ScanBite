"use client";

import { useEffect, useRef, useState } from "react";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

export type SocketStatus = "connected" | "connecting" | "disconnected" | "offline";

export function useSocket(auth: Record<string, unknown> | null): {
  socket: Socket | null;
  status: SocketStatus;
} {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!auth) return;

    const s = connectSocket(auth);
    socketRef.current = s;
    setSocket(s);
    setStatus(s.connected ? "connected" : "connecting");

    function onConnect()          { setStatus("connected"); }
    function onDisconnect()       { setStatus("disconnected"); }
    function onConnectError()     { setStatus("disconnected"); }
    function onReconnectAttempt() { setStatus("connecting"); }
    function onReconnectFailed()  { setStatus("offline"); }

    s.on("connect",            onConnect);
    s.on("disconnect",         onDisconnect);
    s.on("connect_error",      onConnectError);
    s.io.on("reconnect_attempt", onReconnectAttempt);
    s.io.on("reconnect_failed",  onReconnectFailed);

    return () => {
      s.off("connect",            onConnect);
      s.off("disconnect",         onDisconnect);
      s.off("connect_error",      onConnectError);
      s.io.off("reconnect_attempt", onReconnectAttempt);
      s.io.off("reconnect_failed",  onReconnectFailed);
      setSocket(null);
    };
  }, [JSON.stringify(auth)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => { disconnectSocket(); };
  }, []);

  return { socket, status };
}
