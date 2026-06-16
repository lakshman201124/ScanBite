-- Scale indexes for production performance
-- Table names use @@map values from schema.prisma (snake_case)

-- Order queries (admin dashboard, billing, analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_status 
  ON "orders" (restaurant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_created 
  ON "orders" (restaurant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_payment 
  ON "orders" (restaurant_id, payment_status);

-- Order items (bill calculation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order 
  ON "order_items" (order_id);

-- Menu queries (customer menu load)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_category_available 
  ON "menu_items" (category_id, is_available, sort_order);

-- Bills (billing dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_restaurant_created 
  ON "bills" (restaurant_id, created_at DESC);

-- Analytics aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_date_total 
  ON "orders" (restaurant_id, created_at, total_amount) 
  WHERE status != 'cancelled';
