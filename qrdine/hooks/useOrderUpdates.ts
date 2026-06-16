"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./useSocket";

export interface LiveOrder {
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  tableId: string;
  tableName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  notes: string | null;
  status: string;
  payment_status?: "unpaid" | "paid" | "refunded";
  createdAt: string;
  updatedAt: string;
  cancellationReason?: string;
}

type Mode = "admin" | "chef" | "customer";

interface UseOrderUpdatesOptions {
  mode: Mode;
  restaurantId?: string;
  tableId?: string;
  orderId?: string;
  token?: string;
  initialOrders?: LiveOrder[];
}

export function useOrderUpdates(opts: UseOrderUpdatesOptions) {
  const { mode, restaurantId, tableId, orderId, token, initialOrders = [] } = opts;

  const auth = restaurantId
    ? mode === "customer"
      ? { role: "customer", restaurantId, tableId, orderId }
      : { role: mode, restaurantId, token }
    : null;

  const { socket, status } = useSocket(auth);
  const [orders, setOrders] = useState<LiveOrder[]>(initialOrders);

  const upsertOrder = useCallback((updated: Partial<LiveOrder> & { orderId: string }) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.orderId === updated.orderId);
      if (idx === -1) {
        return [{ ...updated } as LiveOrder, ...prev];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...updated };
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    function onOrderCreated(data: {
      orderId: string; orderNumber: string; restaurantId: string;
      tableId: string; tableName: string; items: Array<{ name: string; quantity: number; price: number }>;
      notes: string | null; createdAt: string;
    }) {
      upsertOrder({ ...data, status: "pending", updatedAt: data.createdAt });
    }

    function onOrderUpdated(data: {
      orderId: string; orderNumber: string; restaurantId: string;
      tableId: string; status: string; updatedAt: string; cancellationReason?: string;
    }) {
      upsertOrder({ ...data });
    }

    socket.on("order:created", onOrderCreated);
    socket.on("order:updated", onOrderUpdated);

    return () => {
      socket.off("order:created", onOrderCreated);
      socket.off("order:updated", onOrderUpdated);
    };
  }, [socket, upsertOrder]);

  return { orders, setOrders, status };
}
