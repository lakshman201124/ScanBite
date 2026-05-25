-- Phase 4: Billing + Payments migration
-- Run this AFTER the Phase 1 init migration

-- Restaurant: add tax rates and brand color
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#FF4D3D',
  ADD COLUMN IF NOT EXISTS cgst_rate   DECIMAL(4,2) NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS sgst_rate   DECIMAL(4,2) NOT NULL DEFAULT 2.5;

-- Orders: add Razorpay fields and bill_requested flag
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS bill_requested      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS razorpay_order_id   TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Bills: add bill_number, tax rates, notification flags
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS bill_number   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS cgst_rate     DECIMAL(4,2) NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS sgst_rate     DECIMAL(4,2) NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent    BOOLEAN NOT NULL DEFAULT false;

-- Index for razorpay order lookups
CREATE INDEX IF NOT EXISTS orders_razorpay_order_id_idx ON orders(razorpay_order_id);
