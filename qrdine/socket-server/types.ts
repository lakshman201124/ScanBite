export interface SocketAuthPayload {
  userId?: string;
  restaurantId: string;
  role: "admin" | "chef" | "customer";
  tableId?: string;
  orderId?: string;
}

export interface OrderCreatedPayload {
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  tableId: string;
  tableName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  notes: string | null;
  createdAt: string;
}

export interface OrderStatusPayload {
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  tableId: string;
  status: string;
  updatedBy: string;
  updatedAt: string;
  cancellationReason?: string;
}

export interface OrderItemStatusPayload {
  orderItemId: string;
  orderId: string;
  restaurantId: string;
  status: "pending" | "ready";
}

export interface BillRequestedPayload {
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  tableId: string;
  tableName: string;
}

export interface BillGeneratedPayload {
  orderId: string;
  billId: string;
  billNumber: string;
  restaurantId: string;
  total: number;
}

export interface PaymentConfirmedPayload {
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  tableId: string;
  paymentId: string;
  amount: number;
}

export interface ServerToClientEvents {
  "order:created": (data: OrderCreatedPayload) => void;
  "order:updated": (data: OrderStatusPayload) => void;
  "order:item_ready": (data: OrderItemStatusPayload) => void;
  "bill:requested": (data: BillRequestedPayload) => void;
  "bill:generated": (data: BillGeneratedPayload) => void;
  "payment:confirmed": (data: PaymentConfirmedPayload) => void;
}

export interface ClientToServerEvents {
  "order:new": (data: OrderCreatedPayload) => void;
  "order:status": (data: OrderStatusPayload) => void;
  "order:item_status": (data: OrderItemStatusPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export type SocketData = SocketAuthPayload;
