# ScanBite — Product Specification & Function Outcome Bible

> Source of truth for what every API endpoint, component, and utility function **must do**, what **DB state it must produce**, and what the **user-visible outcome** is. Written from the architecture master guide + full codebase read.

---

## Table of Contents

1. [Auth & Session Functions](#1-auth--session-functions)
2. [Customer Journey Functions](#2-customer-journey-functions)
3. [Order Lifecycle Functions](#3-order-lifecycle-functions)
4. [Chef / KDS Functions](#4-chef--kds-functions)
5. [Admin Dashboard Functions](#5-admin-dashboard-functions)
6. [Menu Management Functions](#6-menu-management-functions)
7. [Table Management Functions](#7-table-management-functions)
8. [Billing & Invoice Functions](#8-billing--invoice-functions)
9. [Payment Functions](#9-payment-functions)
10. [Analytics Functions](#10-analytics-functions)
11. [Inventory Functions](#11-inventory-functions)
12. [Staff Management Functions](#12-staff-management-functions)
13. [Notification Functions](#13-notification-functions)
14. [Real-Time Socket Functions](#14-real-time-socket-functions)
15. [Cache Functions](#15-cache-functions)
16. [Utility & Security Functions](#16-utility--security-functions)

---

## 1. Auth & Session Functions

### `POST /api/auth/signup`
**What it does**: Creates a new restaurant owner account (super-admin) and their restaurant entity in a single atomic operation.

**Input**: `{ name, email, password, restaurantName }`

**DB Writes**:
- `INSERT INTO restaurants` → slug auto-generated from `restaurantName` (kebab-case, unique suffix if collision)
- `INSERT INTO users` → role = `admin`, `password_hash` = bcryptjs hash (cost 12), linked to the new `restaurant_id`

**Expected Outcome**: User can immediately log in. Restaurant shows in admin dashboard. Plan defaults to `free`.

**Failure Cases**:
- Email already exists → HTTP 409 "Email already registered"
- Slug collision → auto-append numeric suffix until unique
- Validation fail (weak password, missing fields) → HTTP 422 with field-level errors

---

### `POST /api/auth/chef-login`
**What it does**: Authenticates kitchen/waiter staff using numeric PIN (no email required).

**Input**: `{ restaurantId, pin, role }`

**DB Reads**: `SELECT * FROM users WHERE restaurant_id = ? AND role IN ('chef','waiter') AND is_active = true`

**DB Writes**: None — read-only auth.

**Expected Outcome**: Returns a signed JWT with `{ userId, restaurantId, role }` payload. Chef browser stores this in localStorage. JWT TTL = 8 hours.

**Failure Cases**:
- Wrong PIN → HTTP 401 "Invalid credentials"
- Inactive staff account → HTTP 403 "Account disabled"
- Role mismatch → HTTP 403

---

### `GET/POST /api/auth/[...nextauth]`
**What it does**: NextAuth v5 credentials provider endpoint. Admin email+password login.

**Input (POST)**: `{ email, password }`

**DB Reads**: `SELECT * FROM users WHERE email = ? AND is_active = true`

**Session Enrichment**: JWT callback attaches `restaurantId`, `role`, `plan`, `onboarded` flag.

**Expected Outcome**: Sets NextAuth `session` cookie (30-day JWT). Admin is redirected to `/dashboard` if `onboarded = true`, else to `/onboarding`.

**Failure Cases**:
- Bcrypt mismatch → "Invalid credentials"
- `is_active = false` → "Account suspended"

---

### `GET /api/session/create?slug=&t=`
**What it does**: The QR code scan entry point. Validates the table's QR token and creates an ephemeral customer session.

**Input**: URL params `slug` (restaurant slug) + `t` (table `qr_token` UUID)

**DB Reads**:
- `SELECT * FROM restaurants WHERE slug = ?`
- `SELECT * FROM restaurant_tables WHERE qr_token = ? AND restaurant_id = ?`

**DB Writes**:
- `INSERT INTO customer_sessions { restaurant_id, table_id, session_token (UUID), expires_at = now + 2h }`

**Cache Writes**: `SET session:{session_token} { restaurantId, tableId } EX 7200`

**Expected Outcome**: HTTP-only cookie `session_token` set on response. Customer redirected to `/m/{slug}`. Table status does NOT change here (only changes when an order is placed).

**Failure Cases**:
- Unknown slug → HTTP 404 "Restaurant not found"
- Invalid `qr_token` → HTTP 404 "Table not found"
- Expired/tampered token → HTTP 400

---

### `POST /api/admin/onboarding`
**What it does**: Links restaurant details after initial signup during the onboarding wizard.

**Input**: `{ address, phone, gstin, cgst_rate, sgst_rate, logo_url, brand_color }`

**DB Writes**: `UPDATE restaurants SET ..., onboarded = true WHERE id = ?`

**Expected Outcome**: Admin is no longer redirected to `/onboarding` on next login. Dashboard fully unlocked.

---

## 2. Customer Journey Functions

### `GET /api/public/menu/[slug]`
**What it does**: Returns full menu (categories + items + customizations) for the customer-facing QR menu page.

**Cache Read**: `GET menu:{restaurantId}` from Redis first. If hit → return immediately (sub-5ms).

**DB Read (on cache miss)**:
```sql
SELECT categories with items and customizations
WHERE restaurant_id = ? AND is_active = true
ORDER BY categories.sort_order, items.sort_order
```

**Cache Write**: `SET menu:{restaurantId} {payload} EX 300` (5-minute TTL)

**Expected Outcome**: Full JSON menu with nested structure. Used by customer UI to render the animated menu page. Cached response must include `brand_color`, restaurant name, logo_url for theming.

**No Auth Required** — completely public.

---

### `POST /api/customer/orders`
**What it does**: The most critical customer endpoint. Validates cart, checks stock, creates the order with full price snapshotting.

**Input**: `{ items: [{ menuItemId, quantity, customizations, price }], notes }`

**Auth**: Session cookie (resolved to `restaurantId`, `tableId`, `sessionId`)

**Server-Side Validation** (NEVER trust client prices):
1. For each `menuItemId`: fetch current `price` and `is_available` from DB
2. Compare item prices — reject if client-sent price differs (prevents price tampering)
3. Check `stock_quantity >= quantity` for each item
4. Validate customization options exist on the item

**DB Transaction** (atomic):
```sql
BEGIN;
  INSERT INTO orders { restaurant_id, table_id, session_id, order_number, status='pending', payment_status='unpaid' }
  
  FOR EACH item:
    INSERT INTO order_items { order_id, menu_item_id, item_name (snapshot), item_price (snapshot), quantity, customizations (JSON snapshot) }
    UPDATE menu_items SET stock_quantity = stock_quantity - quantity
    IF stock_quantity - quantity <= 0: UPDATE menu_items SET is_available = false
COMMIT;
```

**Cache Invalidation**: `DEL menu:{restaurantId}` (stock changed, must invalidate)

**Redis Pub/Sub**: `PUBLISH socket_events { type: "order:created", data: { orderId, restaurantId, tableId, items, orderNumber } }`

**Expected Outcome**: HTTP 201 with `{ orderId, orderNumber, estimatedTime }`. Customer sees order confirmation screen. KDS and Admin dashboard get live notification within 500ms.

**Failure Cases**:
- `is_available = false` for any item → HTTP 409 "Item no longer available: {name}"
- Insufficient stock → HTTP 409 "Only {n} left in stock"
- Price mismatch → HTTP 422 "Price mismatch detected"
- Session expired → HTTP 401

---

### `GET /api/customer/orders`
**What it does**: Returns all orders placed in the current customer session.

**Auth**: Session cookie → resolves `sessionId`

**DB Read**: `SELECT orders + order_items WHERE session_id = ? ORDER BY created_at DESC`

**Expected Outcome**: List of orders with their items, statuses, and bill_requested flag. Used to show customer their order history on the menu page.

---

### `GET /api/customer/orders/[id]/status`
**What it does**: Live status polling endpoint for the customer order tracker page.

**DB Read**: `SELECT status, payment_status, items FROM orders WHERE id = ? AND session_id = ?`

**Expected Outcome**: `{ status, payment_status, estimatedMinutes, items }`. Customer's order tracker screen polls or uses Socket.IO room for updates.

---

### `POST /api/customer/orders/[id]/bill`
**What it does**: Customer requests the bill. Sets a flag that alerts the admin dashboard.

**DB Write**: `UPDATE orders SET bill_requested = true WHERE id = ? AND session_id = ?`

**Redis Pub/Sub**: `PUBLISH socket_events { type: "order:updated", data: { orderId, bill_requested: true } }`

**Expected Outcome**: Admin dashboard shows a "Bill Requested" badge on the order card. Customer sees "Bill requested, staff will assist you."

---

### `POST /api/customer/bills/split`
**What it does**: Calculates how to split a bill among a group (no DB write — pure calculation).

**Input**: `{ orderId, splitCount, method: 'equal' | 'custom', customAmounts? }`

**Expected Outcome**: Returns an array of per-person amounts. Used by the split-bill UI sheet. No DB state changed.

---

## 3. Order Lifecycle Functions

### Order Status State Machine

Valid transitions only:
```
pending → confirmed → preparing → ready → served
pending → cancelled (Admin only)
confirmed → cancelled (Admin only)
preparing → cancelled (Admin only — requires reason)
```

Any attempt to skip states or go backwards → HTTP 409 "Invalid status transition"

### `PATCH /api/chef/orders/[id]/status`
**What it does**: Chef advances an order through the preparation workflow.

**Auth**: JWT (role = `chef` or `admin`)

**Input**: `{ status: 'confirmed' | 'preparing' | 'ready' }`

**Validation**: Enforces state machine — `confirmed` can only come after `pending`, etc.

**DB Write**: `UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ? AND restaurant_id = ?`

**Redis Pub/Sub**: `PUBLISH socket_events { type: "order:updated", data: { orderId, status, restaurantId, tableId } }`

**Expected Outcome**:
- **confirmed**: Order card changes to blue on KDS. Admin dashboard order card updates.
- **preparing**: KDS starts preparation timer. Customer screen shows "Chef is cooking your food".
- **ready**: KDS card goes green. Customer notified "Your order is ready!". Bell sound on admin.

---

### `PATCH /api/admin/orders/[id]/status`
**What it does**: Admin override — can advance OR cancel any order.

**Auth**: JWT (role = `admin`)

**Additional Power**: Can set `status = 'cancelled'` with `cancellation_reason`.

**DB Write**: `UPDATE orders SET status = ?, cancellation_reason = ? WHERE id = ?`

**Redis Pub/Sub**: Same as chef endpoint but always targets all 3 rooms.

**Expected Outcome**: Full control. Admin can cancel mid-preparation (stock NOT restored automatically — manual inventory adjustment needed).

---

## 4. Chef / KDS Functions

### KDS Page (`/kds`)
**What it does**: Real-time kitchen display. Shows all active orders for the restaurant.

**Initial Data Load**: `GET /api/chef/orders` → all `pending`, `confirmed`, `preparing` orders

**Socket.IO**: Joins room `restaurant:{restaurantId}:kitchen`

**Listens For**:
- `order:created` → Insert new card at top, play sound
- `order:updated` → Update card status/timer in place
- `order:cancelled` → Remove card with animation

**Expected Outcome**: Full-screen grid of order cards, auto-refreshing without page reload. Each card shows: table number, order number, items with customizations, time since order placed. Status badge changes color as chef taps status buttons.

---

## 5. Admin Dashboard Functions

### `GET /api/admin/analytics`
**What it does**: Returns all KPI data for the dashboard home page.

**Auth**: JWT Admin

**DB Reads** (all scoped to `restaurant_id`):
- Today's revenue: `SUM(bills.total) WHERE created_at >= today_start`
- Order count by status (for donut chart)
- Hourly revenue for last 24h (for line chart)
- Top 5 selling items: `GROUP BY menu_item_id ORDER BY SUM(quantity) DESC LIMIT 5`
- Active tables count
- Low-stock items: `WHERE stock_quantity <= low_stock_threshold`

**Cache**: Results cached in Redis for 60 seconds to avoid repeated heavy aggregation.

**Expected Outcome**: Dashboard renders live KPIs. Revenue numbers update within 1 minute of a new bill being created.

---

### `GET /api/admin/settings`
**What it does**: Fetches restaurant configuration for the settings page.

**DB Read**: `SELECT * FROM restaurants WHERE id = ?`

**Expected Outcome**: Returns `{ name, logo_url, brand_color, cgst_rate, sgst_rate, address, phone, gstin, plan }`

---

### `PATCH /api/admin/settings`
**What it does**: Updates restaurant branding and tax configuration.

**Input**: `{ logo_url?, brand_color?, cgst_rate?, sgst_rate?, name? }`

**DB Write**: `UPDATE restaurants SET ... WHERE id = ?`

**Cache Invalidation**: `DEL restaurant:{slug}` and `DEL menu:{restaurantId}` (brand_color is in menu payload)

**Expected Outcome**: Customer-facing menu immediately reflects new brand color/logo after cache expires (max 5 minutes).

---

### `POST /api/admin/orders/manual`
**What it does**: Waiter creates an order on behalf of a table (offline / at-counter ordering).

**Auth**: JWT (admin or waiter role)

**Input**: `{ tableId, items: [...], notes?, paymentMethod? }`

**DB Transaction**: Same as `POST /api/customer/orders` — creates Order + OrderItems atomically.

**Expected Outcome**: Order appears on KDS immediately. Table marked as occupied. Can be used when customer doesn't scan QR.

---

## 6. Menu Management Functions

### `GET /api/menu/categories`
**What it does**: Returns all categories for the admin menu builder.

**DB Read**: `SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY sort_order ASC`

**Expected Outcome**: Array of categories with item count. Admin can drag to reorder.

---

### `POST /api/menu/categories`
**What it does**: Creates a new menu category.

**Input**: `{ name, is_active? }`

**DB Write**: `INSERT INTO menu_categories { name, restaurant_id, sort_order = max + 1, is_active = true }`

**Cache Invalidation**: `DEL menu:{restaurantId}`

**Expected Outcome**: New category appears in menu builder and on customer menu (if `is_active = true`).

---

### `PATCH /api/menu/categories/[id]`
**What it does**: Renames, toggles visibility, or reorders a category.

**Input**: `{ name?, is_active?, sort_order? }`

**DB Write**: `UPDATE menu_categories SET ... WHERE id = ? AND restaurant_id = ?`

**Cache Invalidation**: `DEL menu:{restaurantId}`

---

### `DELETE /api/menu/categories/[id]`
**What it does**: Deletes a category. **Cascade**: All menu items in this category are also deleted (Prisma `onDelete: Cascade`).

**Pre-condition Check**: Warn admin if category has active orders referencing its items (order_items point to menu_item_id not category).

**DB Write**: `DELETE FROM menu_categories WHERE id = ? AND restaurant_id = ?`

**Cache Invalidation**: `DEL menu:{restaurantId}`

---

### `POST /api/menu/items`
**What it does**: Creates a new menu item.

**Input**: `{ name, description, price, category_id, food_type, image_url?, stock_quantity?, low_stock_threshold?, is_featured? }`

**DB Write**: `INSERT INTO menu_items { ...all fields, restaurant_id, is_available = true }`

**Cache Invalidation**: `DEL menu:{restaurantId}`

---

### `PATCH /api/menu/items/[id]`
**What it does**: Updates an existing menu item — pricing, availability, description, or photo.

**DB Write**: `UPDATE menu_items SET ... WHERE id = ? AND restaurant_id = ?`

**Cache Invalidation**: `DEL menu:{restaurantId}`

**Expected Outcome**: Changes visible on customer menu within 5 minutes (cache TTL). Toggle `is_available` to instantly hide/show item from customer view.

---

### `GET/POST/DELETE /api/menu/items/[id]/customizations`
**What it does**: Manages item add-ons and size variants.

**POST Input**: `{ name, options: [{ label, price_delta }], is_required }`

Example: `{ name: "Size", options: [{ label: "Regular", price_delta: 0 }, { label: "Large", price_delta: 50 }], is_required: true }`

**DB Write**: `INSERT INTO item_customizations { menu_item_id, restaurant_id, name, options (JSON), is_required }`

**Expected Outcome**: Customer sees customization options when tapping an item. Required customizations must be selected before adding to cart.

---

## 7. Table Management Functions

### `GET /api/tables`
**What it does**: Returns all tables for the restaurant.

**DB Read**: `SELECT * FROM restaurant_tables WHERE restaurant_id = ? ORDER BY table_number ASC`

**Expected Outcome**: Table list with status (`available`, `occupied`, `reserved`), capacity, and QR token. Admin can see which tables are active.

---

### `POST /api/tables`
**What it does**: Creates a new dining table.

**Input**: `{ table_number, capacity }`

**DB Write**: `INSERT INTO restaurant_tables { restaurant_id, table_number, capacity, status = 'available', qr_token = UUID() }`

**Expected Outcome**: New table appears in table management grid. QR code can be generated from the `qr_token`.

---

### `PATCH /api/tables/[id]`
**What it does**: Edits table details or regenerates its QR code.

**Input**: `{ table_number?, capacity?, status?, regenerate_qr? }`

**DB Write**: 
- Normal update: `UPDATE restaurant_tables SET ... WHERE id = ? AND restaurant_id = ?`
- Regenerate QR: `UPDATE restaurant_tables SET qr_token = UUID() WHERE id = ?` — **This invalidates all existing printed QR codes for this table**.

---

### `DELETE /api/tables/[id]`
**What it does**: Removes a table permanently.

**Pre-condition**: Should not delete a table with `status = 'occupied'` — admin must confirm override.

**DB Write**: `DELETE FROM restaurant_tables WHERE id = ? AND restaurant_id = ?`

**Cascade**: `customer_sessions` linked to this table are also deleted.

---

## 8. Billing & Invoice Functions

### `GET /api/admin/bills`
**What it does**: Paginated list of all bills for the restaurant.

**Query Params**: `page`, `limit`, `date_from`, `date_to`, `search` (by bill_number)

**DB Read**: `SELECT bills + orders + order_items WHERE restaurant_id = ? ... ORDER BY created_at DESC`

---

### `GET /api/admin/bills/[id]`
**What it does**: Returns full bill detail including line items, taxes, and payment info.

---

### `GET /api/admin/bills/[id]/invoice`
**What it does**: Generates and returns a PDF invoice.

**Process**:
1. Fetch bill + order + restaurant data from DB
2. Generate PDF via PDFKit with brand colors, logo, GST breakdown, itemized charges
3. Upload PDF to Cloudinary → get URL
4. `UPDATE bills SET invoice_url = ? WHERE id = ?`
5. Return PDF URL (or redirect to it)

**Expected Outcome**: Admin can download/print the bill. Cloudinary stores the PDF permanently at a stable URL.

---

### `POST /api/admin/bills/[id]/send`
**What it does**: Re-sends the bill to customer via WhatsApp and Email.

**Process**:
1. Fetch bill + customer contact info from session
2. Call Resend API → email with PDF attachment
3. Call Twilio WhatsApp API → message with invoice link

**Expected Outcome**: Customer receives WhatsApp message + email within 30 seconds.

---

### Bill Creation (inside Webhook)
**Triggered by**: Razorpay webhook `payment.captured` OR Admin manually marking cash payment as paid.

**DB Transaction**:
```sql
BEGIN;
  INSERT INTO bills { order_id, restaurant_id, bill_number (e.g. BILL-2025-0042), 
                      subtotal, cgst = subtotal * cgst_rate/100, 
                      sgst = subtotal * sgst_rate/100, 
                      discount, total = subtotal + cgst + sgst - discount }
  UPDATE orders SET payment_status = 'paid', payment_method = ?
  UPDATE restaurant_tables SET status = 'available' WHERE id = order.table_id
COMMIT;
```

**Expected Outcome**: Table freed, bill record created, invoice PDF generated async, notifications sent.

---

## 9. Payment Functions

### `POST /api/payments/create-order`
**What it does**: Initiates an online payment. Recalculates the amount server-side from DB to prevent tampering.

**Auth**: Session cookie

**Input**: `{ orderId }`

**Process**:
1. Fetch order + order_items from DB (never trust client-sent amount)
2. Calculate total = sum of `item_price * quantity` + tax from restaurant config
3. Call Razorpay `orders.create({ amount: totalInPaise, currency: 'INR' })`
4. `UPDATE orders SET razorpay_order_id = ? WHERE id = ?`

**Expected Outcome**: Returns `{ razorpay_order_id, amount, key }` for the frontend Razorpay Checkout modal.

---

### `POST /api/payments/verify`
**What it does**: Verifies the client-side Razorpay signature immediately after payment modal closes.

**Input**: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`

**Verification**: `HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)` must match `razorpay_signature`.

**DB Write**: `UPDATE orders SET payment_status = 'verifying' WHERE razorpay_order_id = ?`

**Note**: This is an optimistic update. The definitive confirmation comes from the webhook.

---

### `POST /api/payments/webhook`
**What it does**: Razorpay's server-to-server payment confirmation. This is the authoritative payment event.

**Security**: Validates `x-razorpay-signature` header using HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`.

**On `payment.captured`**:
1. Find `order` by `razorpay_order_id`
2. Execute full Bill Creation transaction (see section 8)
3. Generate PDF invoice
4. Send notifications (email + WhatsApp)
5. Publish `order:updated` socket event

**Expected Outcome**: Even if the client disconnects after payment, the webhook ensures the payment is recorded, the table is freed, and the bill is created. Idempotent — safe to receive twice.

**Failure / Fraud**: Invalid signature → `INSERT INTO audit_logs { event: 'webhook_fraud_attempt', ... }` → HTTP 400.

---

## 10. Analytics Functions

### `GET /api/admin/analytics`

| Metric | Query | Expected Use |
|---|---|---|
| Today's Revenue | `SUM(bills.total) WHERE DATE(created_at) = today` | KPI card |
| Total Orders Today | `COUNT(orders) WHERE DATE(created_at) = today` | KPI card |
| Average Order Value | revenue / orders | KPI card |
| Active Tables | `COUNT(tables) WHERE status = 'occupied'` | KPI card |
| Hourly Revenue (24h) | `GROUP BY HOUR(created_at)` on bills | Line chart |
| Order Status Breakdown | `GROUP BY status` on orders | Donut chart |
| Top Items | `GROUP BY menu_item_id ORDER BY SUM(quantity) DESC LIMIT 5` | Leaderboard |
| Low Stock Items | `WHERE stock_quantity <= low_stock_threshold` | Alert list |

---

### `POST /api/admin/export/orders`
**What it does**: Exports filtered orders as CSV download.

**Expected Outcome**: CSV file with columns: Order Number, Table, Date, Status, Items, Total, Payment Method.

---

## 11. Inventory Functions

### `GET /api/admin/inventory`
**What it does**: Returns all menu items with stock data.

**DB Read**: `SELECT id, name, stock_quantity, low_stock_threshold, is_available FROM menu_items WHERE restaurant_id = ?`

**Expected Outcome**: Inventory table showing current stock with visual warning for items at or below threshold.

---

### `PATCH /api/admin/inventory`
**What it does**: Admin manually adjusts stock quantities (e.g., after restocking).

**Input**: `{ items: [{ id, stock_quantity, is_available? }] }`

**DB Write** (for each item): `UPDATE menu_items SET stock_quantity = ?, is_available = ? WHERE id = ? AND restaurant_id = ?`

**Cache Invalidation**: `DEL menu:{restaurantId}`

**Expected Outcome**: Items that were hidden due to 0 stock can be re-activated. Customer menu reflects updated availability after cache clears.

---

## 12. Staff Management Functions

### `GET /api/admin/staff`
**What it does**: Returns all staff for the restaurant (not including the admin themselves).

**DB Read**: `SELECT id, name, email, role, is_active, created_at FROM users WHERE restaurant_id = ? AND role != 'admin' ORDER BY name`

---

### `POST /api/admin/staff`
**What it does**: Creates a new chef or waiter account.

**Input**: `{ name, email, role, pin (4-6 digit numeric) }`

**DB Write**: `INSERT INTO users { restaurant_id, name, email, role, pin_hash = bcrypt(pin), is_active = true }`

**Expected Outcome**: Staff can immediately log in at `/chef-login` using their PIN.

---

### `DELETE /api/admin/staff/[id]`
**What it does**: Deactivates a staff account (soft-delete — sets `is_active = false`, not a hard delete).

**DB Write**: `UPDATE users SET is_active = false WHERE id = ? AND restaurant_id = ?`

**Expected Outcome**: Staff can no longer log in. Historical orders they handled are preserved.

---

## 13. Notification Functions

### Email via Resend (`lib/notifications/email.ts`)
**Triggered by**: Bill creation, manual re-send from admin.

**Input**: `{ to, subject, billDetails, pdfUrl }`

**Expected Outcome**: Transactional email sent within 5 seconds with itemized bill and PDF attachment.

---

### WhatsApp via Twilio (`lib/notifications/whatsapp.ts`)
**Triggered by**: Bill creation, manual re-send from admin.

**Input**: `{ to (phone number), restaurantName, orderTotal, invoiceUrl }`

**Expected Outcome**: Customer receives WhatsApp message: "Your bill from {restaurant}: ₹{total}. View invoice: {url}"

---

## 14. Real-Time Socket Functions

### Socket.IO Room Model

| Room | Who Joins | Events Received |
|---|---|---|
| `restaurant:{id}:orders` | Admin | `order:created`, `order:updated`, `order:cancelled` |
| `restaurant:{id}:kitchen` | Chef | `order:created`, `order:updated` |
| `table:{tableId}` | Customer | `order:updated` (status changes) |
| `order:{orderId}` | Customer | `order:updated` (per-order tracking) |

### Event Payloads

**`order:created`**:
```json
{
  "type": "order:created",
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD-2025-0042",
    "restaurantId": "uuid",
    "tableId": "uuid",
    "tableNumber": "T-5",
    "items": [{ "name": "Paneer Tikka", "quantity": 2, "customizations": [...] }],
    "createdAt": "ISO8601"
  }
}
```

**`order:updated`**:
```json
{
  "type": "order:updated",
  "data": {
    "orderId": "uuid",
    "status": "preparing",
    "payment_status": "paid",
    "bill_requested": false
  }
}
```

---

## 15. Cache Functions

### Redis Cache Keys

| Key Pattern | Value | TTL | Invalidated By |
|---|---|---|---|
| `menu:{restaurantId}` | Full menu JSON | 300s (5 min) | Any menu/item/category write |
| `session:{token}` | `{ restaurantId, tableId }` | 7200s (2h) | Checkout completion |
| `restaurant:{slug}` | Restaurant branding config | 3600s (1h) | Settings update |
| `analytics:{restaurantId}:today` | Analytics KPIs | 60s | Any bill creation |

### Cache Miss Behavior
Every cache read must fall through to DB on miss and re-populate. No stale reads — always `GET → null → DB query → SET`.

---

## 16. Utility & Security Functions

### `tenantScope(restaurantId)` — `lib/tenant.ts`
**What it does**: Injects `restaurant_id` into every Prisma `where` clause.

**Expected Behavior**: If `restaurantId` is undefined/null → throws `CRITICAL: Missing restaurant_id — tenant isolation breach`. This is intentionally hard-fail — no silent data leakage.

---

### `lib/api-response.ts`
Standardizes all API responses:
- `success(data, status = 200)` → `{ success: true, data }`
- `error(message, status = 400)` → `{ success: false, error: message }`
- `validationError(zodError)` → `{ success: false, errors: { field: message } }`

---

### Plan Gate (`lib/plan_gate.ts`)
Enforces subscription limits per plan tier:

| Feature | Free | Pro | Enterprise |
|---|---|---|---|
| Menu Items | 30 | 200 | Unlimited |
| Tables | 10 | 50 | Unlimited |
| Staff Accounts | 3 | 20 | Unlimited |
| Analytics History | 7 days | 90 days | Unlimited |
| WhatsApp Notifications | ✗ | ✓ | ✓ |
| PDF Invoices | ✗ | ✓ | ✓ |

---

### `POST /api/upload`
**What it does**: Returns a Cloudinary signed upload preset for client-side direct upload.

**Expected Behavior**: Admin frontend uploads images directly to Cloudinary (not through Next.js server). Server only signs the upload preset.

**Expected Outcome**: Image is uploaded to `scanbite/{restaurantId}/` folder in Cloudinary. URL returned and stored in `menu_items.image_url`.

---

### `GET /api/health`
**What it does**: Health check for uptime monitoring.

**Checks**:
1. Prisma DB connection (select 1)
2. Redis ping

**Expected Outcome**: `{ status: "healthy", db: "ok", redis: "ok", timestamp }` — HTTP 200.
If any check fails → HTTP 503 with failing component identified.

---

*Last updated: 2026-05-21 — Generated from full codebase analysis*
