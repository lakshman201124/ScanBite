"use client";

import { Bell } from "lucide-react";
import { WaiterOrderCard } from "./WaiterOrderCard";
import type { WaiterOrder } from "./WaiterOrderCard";

interface Props {
  orders: WaiterOrder[];
  onMarkServed: (orderId: string) => Promise<void>;
}

export function ReadyToServeList({ orders, onMarkServed }: Props) {
  const ready = orders.filter(o => o.status === "ready");

  if (ready.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "#52525b" }}>
        <Bell size={24} style={{ margin: "0 auto 8px" }} />
        <p style={{ font: "500 13px var(--sans, sans-serif)" }}>No orders ready to serve</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ready.map(order => (
        <WaiterOrderCard
          key={order.id}
          order={order}
          onMarkServed={onMarkServed}
        />
      ))}
    </div>
  );
}
