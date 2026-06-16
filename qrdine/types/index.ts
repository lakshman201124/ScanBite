export type {
  SocketAuthPayload,
  OrderCreatedPayload,
  OrderStatusPayload,
  OrderItemStatusPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketEmitType,
  SocketRedisMessage,
} from "./socket";

export type UserRole = "admin" | "chef" | "waiter" | "super_admin";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type PaymentMethod = "cash" | "upi" | "card" | "wallet";
export type FoodType = "veg" | "non_veg" | "egg" | "vegan";
export type TableStatus = "available" | "occupied" | "reserved";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  brand_color: string | null;
  cgst_rate: number;
  sgst_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  restaurant_id: string;
  name: string;
  email: string;
  role: UserRole;
  pin_hash: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  status: TableStatus;
  qr_token: string;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  food_type: FoodType;
  is_available: boolean;
  is_featured: boolean;
  prep_time_minutes: number | null;
  sort_order: number;
  created_at: string;
}

export interface ItemCustomization {
  id: string;
  menu_item_id: string;
  restaurant_id: string;
  name: string;
  options: CustomizationOption[];
  is_required: boolean;
  created_at: string;
}

export interface CustomizationOption {
  id: string;
  label: string;
  price_delta: number;
}

export interface CustomerSession {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  notes: string | null;
  bill_requested: boolean;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  bill?: Bill;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  restaurant_id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  customizations: Record<string, string> | null;
  created_at: string;
}

export interface Bill {
  id: string;
  order_id: string;
  restaurant_id: string;
  bill_number: string | null;
  subtotal: number;
  cgst_rate: number;
  sgst_rate: number;
  cgst: number;
  sgst: number;
  discount: number;
  tip: number;
  total: number;
  is_printed: boolean;
  invoice_url: string | null;
  whatsapp_sent: boolean;
  email_sent: boolean;
  created_at: string;
}

export interface SessionPayload {
  sessionId: string;
  restaurantId: string;
  tableId: string;
  expiresAt: string;
}

export interface AdminJWTPayload {
  userId: string;
  restaurantId: string;
  role: UserRole;
  name: string;
  email: string;
}
