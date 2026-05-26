-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin', 'chef', 'waiter');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'upi', 'card', 'wallet');

-- CreateEnum
CREATE TYPE "FoodType" AS ENUM ('veg', 'non_veg', 'egg', 'vegan');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('starter', 'growth', 'pro');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('available', 'occupied', 'reserved');

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "phone" TEXT,
    "plan" "PlanType" NOT NULL DEFAULT 'starter',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "pin_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "table_number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" "TableStatus" NOT NULL DEFAULT 'available',
    "qr_token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_sessions" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "image_url" TEXT,
    "food_type" "FoodType" NOT NULL DEFAULT 'veg',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "prep_time_minutes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_customizations" (
    "id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_customizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "payment_method" "PaymentMethod",
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "customizations" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "cgst" DECIMAL(10,2) NOT NULL,
    "sgst" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tip" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "is_printed" BOOLEAN NOT NULL DEFAULT false,
    "invoice_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discount_type" TEXT NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_order" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_uses" INTEGER,
    "uses_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE INDEX "users_restaurant_id_idx" ON "users"("restaurant_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_restaurant_id_key" ON "users"("email", "restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_qr_token_key" ON "restaurant_tables"("qr_token");

-- CreateIndex
CREATE INDEX "restaurant_tables_restaurant_id_idx" ON "restaurant_tables"("restaurant_id");

-- CreateIndex
CREATE INDEX "restaurant_tables_status_idx" ON "restaurant_tables"("status");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_restaurant_id_table_number_key" ON "restaurant_tables"("restaurant_id", "table_number");

-- CreateIndex
CREATE UNIQUE INDEX "customer_sessions_session_token_key" ON "customer_sessions"("session_token");

-- CreateIndex
CREATE INDEX "customer_sessions_restaurant_id_idx" ON "customer_sessions"("restaurant_id");

-- CreateIndex
CREATE INDEX "customer_sessions_session_token_idx" ON "customer_sessions"("session_token");

-- CreateIndex
CREATE INDEX "customer_sessions_expires_at_idx" ON "customer_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "menu_categories_restaurant_id_idx" ON "menu_categories"("restaurant_id");

-- CreateIndex
CREATE INDEX "menu_categories_sort_order_idx" ON "menu_categories"("sort_order");

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_idx" ON "menu_items"("restaurant_id");

-- CreateIndex
CREATE INDEX "menu_items_category_id_idx" ON "menu_items"("category_id");

-- CreateIndex
CREATE INDEX "menu_items_is_available_idx" ON "menu_items"("is_available");

-- CreateIndex
CREATE INDEX "menu_items_is_featured_idx" ON "menu_items"("is_featured");

-- CreateIndex
CREATE INDEX "item_customizations_menu_item_id_idx" ON "item_customizations"("menu_item_id");

-- CreateIndex
CREATE INDEX "item_customizations_restaurant_id_idx" ON "item_customizations"("restaurant_id");

-- CreateIndex
CREATE INDEX "orders_restaurant_id_idx" ON "orders"("restaurant_id");

-- CreateIndex
CREATE INDEX "orders_table_id_idx" ON "orders"("table_id");

-- CreateIndex
CREATE INDEX "orders_session_id_idx" ON "orders"("session_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_payment_status_idx" ON "orders"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_restaurant_id_order_number_key" ON "orders"("restaurant_id", "order_number");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_restaurant_id_idx" ON "order_items"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bills_order_id_key" ON "bills"("order_id");

-- CreateIndex
CREATE INDEX "bills_restaurant_id_idx" ON "bills"("restaurant_id");

-- CreateIndex
CREATE INDEX "loyalty_accounts_restaurant_id_idx" ON "loyalty_accounts"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_restaurant_id_phone_key" ON "loyalty_accounts"("restaurant_id", "phone");

-- CreateIndex
CREATE INDEX "loyalty_transactions_account_id_idx" ON "loyalty_transactions"("account_id");

-- CreateIndex
CREATE INDEX "loyalty_transactions_restaurant_id_idx" ON "loyalty_transactions"("restaurant_id");

-- CreateIndex
CREATE INDEX "coupons_restaurant_id_idx" ON "coupons"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_restaurant_id_code_key" ON "coupons"("restaurant_id", "code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_customizations" ADD CONSTRAINT "item_customizations_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "customer_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

