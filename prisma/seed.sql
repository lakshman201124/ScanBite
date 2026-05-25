-- QR Dine Seed Data
-- Run this in Supabase SQL Editor after running migration_init.sql

-- Restaurants
INSERT INTO restaurants (id, name, slug, phone, address, plan, onboarded, is_active, created_at, updated_at)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Spice Garden',  'spice-garden',  '+919876543210', '42 MG Road, Bangalore 560001',         'growth',  true, true, NOW(), NOW()),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Biryani House', 'biryani-house', '+919876543211', '15 Residency Road, Bangalore 560025', 'starter', true, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Users (admins + chefs)
-- Passwords: admin123 | Chef PINs: 1234 (Spice Garden), 5678 (Biryani House)
INSERT INTO users (id, restaurant_id, name, email, password_hash, pin_hash, role, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Priya Sharma', 'admin@spicegarden.com',  '$2b$12$SXDsCz9PDQTtzJlR4J1cu..jy3x9VAKMSYo37zLH7x287AjC52fcy', NULL,                                                                             'admin', true, NOW(), NOW()),
  (gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Rahul Kumar',  'admin@biryanihouse.com', '$2b$12$5uR8LR8KNbAumUt5DkH8K.b0vefnNwBfCBImP.Gv57pBwo/gKoTje', NULL,                                                                             'admin', true, NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Arjun Chef',   'chef@spicegarden.com',  NULL,                                                                             '$2b$12$OXTfTT42jCNTWxZ6SoccTu3luaZ0fcqyIA4ofZLoV94dmhKViv7y2', 'chef',  true, NOW(), NOW()),
  (gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Suresh Chef',  'chef@biryanihouse.com', NULL,                                                                             '$2b$12$TChyPnQ5Id3KUoa4A98fC.aNzFKd8wXRnnLoI.LNLc5XxZZjDL5m',  'chef',  true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Tables (3 per restaurant)
INSERT INTO restaurant_tables (id, restaurant_id, table_number, capacity, qr_token, status, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'T1', 2, gen_random_uuid()::text, 'available', NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'T2', 4, gen_random_uuid()::text, 'available', NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'T3', 6, gen_random_uuid()::text, 'available', NOW(), NOW()),
  (gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'T1', 2, gen_random_uuid()::text, 'available', NOW(), NOW()),
  (gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'T2', 4, gen_random_uuid()::text, 'available', NOW(), NOW()),
  (gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'T3', 6, gen_random_uuid()::text, 'available', NOW(), NOW())
ON CONFLICT (restaurant_id, table_number) DO NOTHING;

-- Menu Categories (Spice Garden)
INSERT INTO menu_categories (id, restaurant_id, name, sort_order, is_active, created_at, updated_at)
VALUES
  ('cat-sg-starters', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Starters',    1, true, NOW(), NOW()),
  ('cat-sg-main',     'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Main Course', 2, true, NOW(), NOW()),
  ('cat-sg-drinks',   'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Beverages',   3, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Menu Items (Spice Garden — Starters)
INSERT INTO menu_items (id, restaurant_id, category_id, name, price, food_type, sort_order, is_available, is_featured, prep_time_minutes, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-starters', 'Paneer Tikka',    280, 'veg',     1, true, true,  15, NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-starters', 'Chicken 65',      320, 'non_veg', 2, true, true,  15, NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-starters', 'Veg Spring Roll', 200, 'veg',     3, true, false, 10, NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-starters', 'Fish Pakora',     350, 'non_veg', 4, true, false, 15, NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-starters', 'Samosa Chaat',    150, 'veg',     5, true, false, 10, NOW(), NOW()),
-- Main Course
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-main', 'Butter Chicken',  380, 'non_veg', 1, true, true,  20, NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-main', 'Dal Makhani',     260, 'veg',     2, true, true,  25, NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-main', 'Palak Paneer',    300, 'veg',     3, true, false, 20, NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-main', 'Chicken Biryani', 420, 'non_veg', 4, true, true,  30, NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-main', 'Veg Biryani',     320, 'veg',     5, true, false, 25, NOW(), NOW()),
-- Beverages
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-drinks', 'Masala Chai',    60,  'veg', 1, true, false, 5,  NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-drinks', 'Fresh Lime Soda', 80, 'veg', 2, true, false, 5,  NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-drinks', 'Mango Lassi',    120, 'veg', 3, true, true,  5,  NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-drinks', 'Cold Coffee',    150, 'veg', 4, true, false, 5,  NOW(), NOW()),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cat-sg-drinks', 'Mineral Water',  30,  'veg', 5, true, false, 1,  NOW(), NOW())
ON CONFLICT DO NOTHING;
