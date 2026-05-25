-- Migration: add_otp_auth
-- Run this in Supabase SQL Editor → New Query → paste → Run

-- 1. Add phone column to users (nullable, globally unique)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone") WHERE "phone" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");

-- 2. Create customers table (permanent customer identity)
CREATE TABLE IF NOT EXISTS "customers" (
    "id"         TEXT NOT NULL,
    "phone"      TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "customers_phone_key" ON "customers"("phone");
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone");

-- 3. Add customer_id FK to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_id" TEXT;
CREATE INDEX IF NOT EXISTS "orders_customer_id_idx" ON "orders"("customer_id");
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID; -- NOT VALID skips locking existing rows
ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_customer_id_fkey";
