"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface WaiterSocketEvents {
  onOrderReady?: (orderId: string, tableName: string, orderNumber: string) => void;
  onOrderCreated?: (orderId: string, tableName: string) => void;
  onBillRequested?: (orderId: string, tableName: string) => void;
  onOrderUpdated?: (orderId: string, status: string) => void;
}

export function useWaiterSocket(restaurantId: string, events: WaiterSocketEvents) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: { restaurantId, role: "waiter" },
    });

    socketRef.current = socket;

    socket.emit("join:restaurant", restaurantId);

    socket.on("order:updated", (data: { orderId: string; status: string; tableName?: string; orderNumber?: string }) => {
      events.onOrderUpdated?.(data.orderId, data.status);
      if (data.status === "ready") {
        events.onOrderReady?.(data.orderId, data.tableName ?? "", data.orderNumber ?? "");
      }
    });

    socket.on("order:created", (data: { orderId: string; tableName?: string }) => {
      events.onOrderCreated?.(data.orderId, data.tableName ?? "");
    });

    socket.on("bill:requested", (data: { orderId: string; tableName?: string }) => {
      events.onBillRequested?.(data.orderId, data.tableName ?? "");
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  return socketRef;
}
