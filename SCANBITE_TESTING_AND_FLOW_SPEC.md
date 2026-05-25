# ScanBite — Complete Testing, Order Flow & Frontend Logic Specification

> Authoritative reference for how every user flow **must behave**, how tables transition between states, how staff sign in, and the full suite of unit + integration test cases that verify correctness. Derived from `PRODUCT_SPEC.md`, `ScanBite_Architecture_Master_Guide.md`, and a full codebase read.

---

## Table of Contents

1. [Table State Machine & Display Logic](#1-table-state-machine--display-logic)
2. [Customer Journey — End-to-End Order Flow](#2-customer-journey--end-to-end-order-flow)
3. [Order Lifecycle State Machine](#3-order-lifecycle-state-machine)
4. [Chef / KDS Login & Workflow](#4-chef--kds-login--workflow)
5. [Waiter Sign-In & Workflow](#5-waiter-sign-in--workflow)
6. [Admin Order Management](#6-admin-order-management)
7. [Payment Pipeline — Online & Cash](#7-payment-pipeline--online--cash)
8. [Real-Time Socket Events](#8-real-time-socket-events)
9. [Frontend Component Logic](#9-frontend-component-logic)
10. [Unit Test Cases — Auth](#10-unit-test-cases--auth)
11. [Unit Test Cases — Customer Orders](#11-unit-test-cases--customer-orders)
12. [Unit Test Cases — Table Management](#12-unit-test-cases--table-management)
13. [Unit Test Cases — Menu Management](#13-unit-test-cases--menu-management)
14. [Unit Test Cases — Chef/KDS Status](#14-unit-test-cases--chefkds-status)
15. [Unit Test Cases — Payments & Billing](#15-unit-test-cases--payments--billing)
16. [Unit Test Cases — Admin Override & Security](#16-unit-test-cases--admin-override--security)
17. [Integration Test Cases — Full Order Cycle](#17-integration-test-cases--full-order-cycle)
18. [Edge Cases & Error Scenarios](#18-edge-cases--error-scenarios)

---

## 1. Table State Machine & Display Logic

### 1.1 Table States

Every `RestaurantTable` has exactly one of three statuses at any point in time:

| Status | Meaning | UI Color | UI Indicator |
|---|---|---|---|
| `available` | No active order on this table | **Green** | Solid green dot + "Available" badge |
| `occupied` | At least one unpaid order is linked to this table | **Red** | Pulsing red dot + "Occupied" badge |
| `reserved` | Admin has manually reserved the table | **Amber** | Amber dot + "Reserved" badge |

### 1.2 State Transition Rules

```
available  ──(first order placed)──►  occupied
occupied   ──(payment confirmed)──►  available
available  ──(admin reserves)──────►  reserved
reserved   ──(admin un-reserves)───►  available
occupied   ──(admin force-free)────►  available   [admin override only]
```

**Critical: The table does NOT flip to `occupied` when a customer scans the QR code.** It only becomes `occupied` when the first `POST /api/customer/orders` succeeds. This prevents tables being blocked by people who scan but never order.

**Critical: The table automatically flips back to `available` inside the payment webhook transaction** — `PATCH restaurant_tables SET status = 'available' WHERE id = order.table_id` — after `payment.captured` fires from Razorpay, or when admin marks cash payment as paid.

### 1.3 Table Display in Admin Floor View (`/dashboard/tables`)

**When `available`**:
- Green filled circle icon
- Table number bold in normal weight
- Capacity shown in grey
- "No active orders" tooltip on hover
- CTA: "View QR Code" button

**When `occupied`**:
- Pulsing red circle (CSS animation: `animate-pulse` on the dot)
- Table number bold in stronger weight
- Shows count of active orders: "2 active orders"
- Shows total pending bill amount: "₹340 pending"
- Badge: red "OCCUPIED" pill in top-right corner of the card
- CTA: "View Orders" button (navigates to filtered orders view for that table)

**When `reserved`**:
- Solid amber/orange circle
- "RESERVED" badge in amber
- No order count shown
- CTA: "Un-reserve" button

### 1.4 Waiter Table View (`/waiter/tables`)

Same color semantics as admin. Waiters additionally see:
- A "Place Order" button on each occupied or available table (opens `ManualOrderBuilder`)
- A "Request Bill" shortcut button on occupied tables if any order has `bill_requested = false`
- QR code cannot be regenerated from waiter view (admin-only)

### 1.5 Real-Time Table Updates

The table status badge updates **without page reload** via Socket.IO. When `order:created` is emitted the table card on the admin/waiter floor view immediately turns red. When `payment:confirmed` is emitted it immediately turns green.

---

## 2. Customer Journey — End-to-End Order Flow

### Step 1 — QR Code Scan

1. Customer physically scans the QR code printed on the table.
2. QR code encodes a URL: `https://app.scanbite.in/api/session/create?slug={restaurantSlug}&t={qr_token}`
3. `GET /api/session/create` is hit:
   - Validates `slug` against `restaurants.slug` and checks `is_active = true`
   - Validates `qr_token` against `restaurant_tables.qr_token` with matching `restaurant_id`
   - On valid match: inserts a `CustomerSession` row with `expires_at = now + 2h`
   - Sets an `httpOnly` cookie `session_token` (2-hour `maxAge`) on the response
   - Redirects browser to `/m/{slug}` (the customer menu page)
4. On failure:
   - Unknown slug → redirect to `/?error=not-found`
   - Invalid QR token → redirect to `/m/{slug}?error=invalid-qr`
   - Missing params → redirect to `/?error=missing-params`

**Frontend display at this step**: Full-screen animated loading screen while the redirect resolves. If `error=invalid-qr` param is present on the menu page, show a red toast: "This QR code is no longer valid. Please ask staff for assistance."

### Step 2 — Menu Page (`/m/{slug}`)

1. Page fetches `GET /api/public/menu/{slug}` (cached in Redis for 5 minutes).
2. Response includes: `restaurant.name`, `restaurant.brand_color`, `restaurant.logo_url`, categories array, items array (nested), customizations per item.
3. Page is styled using `brand_color` as the primary accent (CSS variable injected at runtime).
4. Menu renders as a category tab bar at top + item grid below.
5. Items show: photo, name, price, food-type badge (green dot = veg, red dot = non-veg, etc.), "Add" button.
6. If `is_available = false` for an item: it is shown with a greyed-out overlay and an "Out of Stock" label. The "Add" button is disabled.
7. Featured items (`is_featured = true`) appear in a horizontal scroll "Featured" section above the categories.

### Step 3 — Item Detail Sheet

1. Tapping an item opens `ItemDetailSheet` as a bottom sheet.
2. Sheet shows: full-size image, description, customization groups.
3. Required customizations must have a selection before "Add to Cart" enables.
4. Customization `price_delta` values adjust the displayed subtotal in real-time.
5. A quantity stepper (`−` / `+`) allows selecting 1–20 units.
6. Tapping "Add to Cart" adds to the Zustand cart store (client-side only at this point).

### Step 4 — Cart

1. `FloatingCartBar` appears at bottom of page as soon as cart has ≥1 item.
2. Shows: item count badge, total price, "View Cart" button.
3. `CartDrawer` opens from the bottom showing all cart items.
4. Each cart item shows: name, customization summary, quantity stepper, item total, remove (×) button.
5. Cart total, subtotal, and estimated tax are shown (tax is estimated client-side from restaurant config — final tax is always server-calculated).
6. "Proceed to Checkout" button is shown.

### Step 5 — Checkout Page (`/m/{slug}/checkout`)

1. Customer reviews final cart.
2. Optional: Phone number entry via OTP (`PhoneOtpSheet`) for identity linking. Not mandatory for ordering.
3. Payment method selection:
   - "Pay Online (UPI / Card)" → triggers Razorpay flow
   - "Pay at Counter (Cash)" → places order with `payment_method = cash`, `payment_status = unpaid`
4. Tapping "Place Order":
   - Calls `POST /api/customer/orders` with cart items
   - Server validates stock, item availability, and session validity
   - On success: redirects to `/m/{slug}/order/{orderId}` (order tracker page)
   - On failure: shows inline error toast (e.g., "Paneer Tikka is out of stock")

### Step 6 — Order Tracker Page (`/m/{slug}/order/{orderId}`)

1. Shows order number (e.g., `ORD-0042`), table number, list of ordered items.
2. Status shown with a live progress stepper:
   - `pending` → "Order Placed — Waiting for confirmation"
   - `confirmed` → "Order Confirmed — Chef is starting soon"
   - `preparing` → "Chef is cooking your food 🍳"
   - `ready` → "Your order is ready! 🎉"
   - `served` → "Enjoy your meal! ✨"
   - `cancelled` → "Order was cancelled. Please ask staff for assistance."
3. Status updates in real-time via Socket.IO `order:orderId` room (no polling needed).
4. "Request Bill" button visible when status is `ready` or `served` and `payment_status = unpaid`. Calls `POST /api/customer/orders/{id}/bill` which sets `bill_requested = true`.
5. After bill is requested: button changes to "Bill Requested — Staff will assist you."
6. "Pay Now" button visible (for Razorpay flow) when `payment_status = unpaid`.

### Step 7 — Payment

**Online (Razorpay)**:
1. Customer taps "Pay Now".
2. `POST /api/payments/create-order` recalculates total server-side, creates Razorpay order.
3. Returns `{ razorpay_order_id, amount, key }` to frontend.
4. Frontend opens Razorpay Checkout modal (injected `<script>`).
5. Customer completes payment in modal.
6. On success modal callback: `POST /api/payments/verify` checks HMAC signature.
7. Razorpay fires webhook to `POST /api/payments/webhook` (server-to-server).
8. Webhook transaction: creates Bill, marks order `paid`, frees table.
9. Customer sees `PaymentSuccess` screen.

**Cash**:
1. Customer selects "Pay at Counter".
2. Order is placed with `payment_method = cash`.
3. Admin/waiter manually marks it as paid from dashboard.
4. Bill is created via the same billing pipeline.

---

## 3. Order Lifecycle State Machine

### 3.1 Valid Transitions

```
pending ──────────────────────────────────► confirmed  (chef or admin)
                                          ► cancelled  (admin only)

confirmed ────────────────────────────────► preparing  (chef or admin)
                                          ► cancelled  (admin only)

preparing ────────────────────────────────► ready      (chef or admin)
                                          ► cancelled  (admin only — must provide reason)

ready ────────────────────────────────────► served     (chef or admin)

served ───────────────────────────────────► (terminal, no further transitions)

cancelled ────────────────────────────────► (terminal, no further transitions)
```

### 3.2 Who Can Trigger Each Transition

| Transition | Chef JWT | Admin JWT/Session | Waiter JWT |
|---|:---:|:---:|:---:|
| pending → confirmed | ✓ | ✓ | ✗ |
| confirmed → preparing | ✓ | ✓ | ✗ |
| preparing → ready | ✓ | ✓ | ✗ |
| ready → served | ✓ | ✓ | ✗ |
| any → cancelled | ✗ | ✓ | ✗ |

Waiters cannot change order status — they can only view orders and place manual orders.

### 3.3 API Endpoints for Status Transitions

- Chef: `PATCH /api/chef/orders/{id}/status` — accepts `confirmed | preparing | ready | served`
- Admin: `PATCH /api/admin/orders/{id}/status` — accepts above plus `cancelled`

Both enforce the state machine server-side. An invalid transition returns HTTP 400: `"Cannot transition from {currentStatus} to {newStatus}"`.

### 3.4 KDS Display Behavior per Status

| Status | KDS Card Border | KDS Badge | Timer |
|---|---|---|---|
| `pending` | Yellow / amber | "NEW" | None |
| `confirmed` | Blue | "CONFIRMED" | Countdown from confirm time |
| `preparing` | Orange | "COOKING" | Elapsed time since `preparing` |
| `ready` | Green | "READY" | Time since ready |
| `served` | Grey (faded out) | "SERVED" | Auto-removed after 30s |
| `cancelled` | Red (briefly) | "CANCELLED" | Auto-removed with animation |

---

## 4. Chef / KDS Login & Workflow

### 4.1 Login Flow (`/chef-login`)

1. Chef opens `/chef-login` on the kitchen display tablet.
2. Enters their **registered phone number** (registered by admin in Staff management).
3. System calls `POST /api/auth/otp/send` with `{ phone }`.
4. OTP is sent via SMS/WhatsApp to the chef's phone.
5. Chef enters 6-digit OTP in the next input.
6. System calls `POST /api/auth/chef-login` with `{ phone, code }`.

### 4.2 Authentication Logic (`/api/auth/chef-login`)

```
1. Validate { phone, code } with Zod schema
2. verifyOtp(phone, code) — checks OTP store
   → fail → HTTP 401 "Invalid OTP"
3. prisma.user.findFirst WHERE phone = ? AND role IN ('chef','waiter') AND is_active = true
   → not found → HTTP 404 "No active kitchen account found for this number"
4. Sign JWT: { sub: userId, restaurantId, role, name } with AUTH_SECRET, expiry 8h
5. Set httpOnly cookie "chef_token" (maxAge: 8h)
6. Return { success: true, data: { token, restaurantId, role } }
```

### 4.3 KDS Page (`/kds`) — Initial Load

1. `GET /api/chef/orders` — fetches all orders with `status IN (pending, confirmed, preparing)` for the restaurant.
2. Each order displays as a card in `KDSGrid`.
3. Socket.IO connects with handshake: `{ auth: { token: chef_token_value, role: 'chef' } }`.
4. Server verifies JWT, places connection into room `restaurant:{restaurantId}:kitchen`.
5. New `order:created` events append new cards to the grid with a slide-in animation + audio chime.
6. `order:updated` events update the matching card in-place.
7. `order:cancelled` events remove the card with a fade-out animation.

### 4.4 KDS Card Actions

Each KDS card has status action buttons:
- If `pending`: "Confirm" button → calls `PATCH /api/chef/orders/{id}/status { status: "confirmed" }`
- If `confirmed`: "Start Cooking" button → calls same with `{ status: "preparing" }`
- If `preparing`: "Ready" button → calls same with `{ status: "ready" }`
- If `ready`: "Served" button → calls same with `{ status: "served" }`

Each button press is optimistically updated on the card (status badge changes immediately) with a revert on API failure.

### 4.5 KDS Card Content

Each card shows:
- Order number (e.g., `ORD-0042`)
- Table number (`Table T-5`)
- Item list with quantities and customization summary
- Special notes if `order.notes` is set
- Elapsed time since order was placed (live counter)
- Status badge (color-coded per section 3.4)

---

## 5. Waiter Sign-In & Workflow

### 5.1 Login Flow (`/chef-login` — same endpoint, role differentiates)

Waiters use the **same login page** as chefs. The system differentiates by `role` in the JWT payload (`role = 'waiter'`). After login:
- Role `chef` → redirected to `/kds`
- Role `waiter` → redirected to `/waiter/orders`

### 5.2 Waiter Authentication

Same as chef: phone OTP → `POST /api/auth/chef-login` → `chef_token` JWT cookie (8h) with `role: 'waiter'`.

`resolveStaffAuth(req)` in `lib/waiter-auth.ts` handles both admin (NextAuth session) and waiter/chef (chef_token JWT) in a unified resolver. This is used across all admin and waiter API routes.

### 5.3 Waiter Portal Pages

| Page | Route | What Waiter Can Do |
|---|---|---|
| Orders | `/waiter/orders` | View all active orders for the restaurant, see order details |
| Tables | `/waiter/tables` | See floor view, place manual orders for tables |
| Billing | `/waiter/billing` | View bills, trigger bill request for tables |

### 5.4 Waiter: Manual Order Placement (`ManualOrderBuilder`)

1. Waiter selects a table from floor view (any status — they can add orders to occupied tables too).
2. `ManualOrderBuilder` opens as a full-page form.
3. Waiter selects menu items, adjusts quantities, adds customizations.
4. Taps "Place Order".
5. Calls `POST /api/admin/orders/manual` with `{ tableId, items, notes, paymentMethod }`.
6. API uses the same atomic transaction as `POST /api/customer/orders`.
7. Order appears on KDS immediately via `order:created` socket event.
8. Table turns `occupied` (set in the same transaction).

### 5.5 Waiter Permissions vs Admin Permissions

| Action | Waiter | Admin |
|---|:---:|:---:|
| Place manual order | ✓ | ✓ |
| View all orders | ✓ | ✓ |
| Change order status | ✗ | ✓ |
| Cancel orders | ✗ | ✓ |
| Manage menu | ✗ | ✓ |
| Manage tables (QR regen) | ✗ | ✓ |
| View analytics | ✗ | ✓ |
| Manage staff | ✗ | ✓ |
| View bills | ✓ | ✓ |

---

## 6. Admin Order Management

### 6.1 Admin Login (`/login`)

Admin uses email + password. `POST /api/auth/[...nextauth]` runs NextAuth v5 Credentials provider:
1. Looks up `users WHERE email = ? AND is_active = true`
2. Compares bcrypt hash
3. On success: sets NextAuth session cookie (30-day JWT)
4. JWT callback attaches `restaurantId`, `role`, `plan`, `onboarded`
5. Redirects to `/dashboard` if `onboarded = true`, else `/onboarding`

### 6.2 Admin Orders Page (`/dashboard/orders`)

- Shows all orders with filters: by status, by table, by date.
- Each `AdminOrderCard` shows: order number, table, items, total, status badge, time.
- "Bill Requested" badge (orange) shown if `order.bill_requested = true`.
- Clicking a card opens `OrderDetailModal` with full item list and status action buttons.

### 6.3 Admin Order Actions

From `OrderDetailModal` or `OrderStatusActions`:
- Can advance through any valid transition including `cancelled`.
- Cancelling mid-preparation requires a `cancellation_reason` string.
- Cancellation reason is appended to `order.notes` field.
- **Stock is NOT automatically restored** when an order is cancelled — admin must manually adjust inventory.

### 6.4 Merge Orders (`POST /api/admin/orders/merge`)

Admin can merge multiple orders from the same table into a single bill. This is a utility for cases where a table placed multiple separate orders. The merged bill sums all order amounts.

---

## 7. Payment Pipeline — Online & Cash

### 7.1 Online Payment (Razorpay)

```
Customer clicks "Pay Now"
    │
    ▼
POST /api/payments/create-order
    │  Server fetches order + items from DB
    │  Recalculates total server-side (never trust client price)
    │  Calls razorpay.orders.create({ amount: paise, currency: 'INR' })
    │  Stores razorpay_order_id on order
    ▼
Returns { razorpay_order_id, amount, key }
    │
    ▼
Frontend opens Razorpay Checkout modal
    │
    ▼
Customer pays → modal onSuccess callback fires
    │
    ▼
POST /api/payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    │  HMAC-SHA256 verify — mismatch → 400
    │  Sets order.payment_status = 'verifying' (optimistic)
    ▼
Razorpay fires webhook → POST /api/payments/webhook
    │  Validates x-razorpay-signature header
    │  Finds order by razorpay_order_id
    │  Idempotency check: skip if already paid
    │
    ▼  [DB Transaction]
    │  UPDATE orders SET payment_status='paid', payment_method=?
    │  INSERT INTO bills { subtotal, cgst, sgst, total, bill_number }
    │  UPDATE restaurant_tables SET status='available'
    ▼
Emit payment:confirmed socket event → customer sees PaymentSuccess screen
```

### 7.2 Cash Payment

1. Customer selects "Pay at Counter".
2. Order placed with `payment_method = cash`, `payment_status = unpaid`.
3. Admin/waiter dashboard shows the order with "CASH" badge.
4. Admin clicks "Mark as Paid" on the order card.
5. Server runs the same billing transaction (creates Bill, frees table).
6. Emits `payment:confirmed` socket event.

### 7.3 Bill Creation

`Bill` record contains:
- `subtotal` = sum of `item_price * quantity` across all `OrderItem` rows
- `cgst` = `subtotal * restaurant.cgst_rate / 100`
- `sgst` = `subtotal * restaurant.sgst_rate / 100`
- `discount` = applied coupon/discount (default `0`)
- `tip` = optional tip (default `0`)
- `total` = `subtotal + cgst + sgst - discount + tip`
- `bill_number` = sequential `BILL-NNNN` format (4-digit zero-padded), unique per restaurant

### 7.4 Fraud Detection

Webhook with invalid HMAC signature:
1. Returns HTTP 400 immediately.
2. Attempts to write an `AuditLog` row with `action = 'webhook_fraud_attempt'`.
3. AuditLog failure is non-fatal — the 400 still goes out.

---

## 8. Real-Time Socket Events

### 8.1 Room Membership

| Client Type | Room Joined | Auth Method |
|---|---|---|
| Admin | `restaurant:{restaurantId}:orders` | NextAuth JWT via handshake |
| Chef/Waiter | `restaurant:{restaurantId}:kitchen` | `chef_token` JWT via handshake |
| Customer | `table:{tableId}` | No auth — plain identifiers |
| Customer | `order:{orderId}` | No auth — plain identifiers |

### 8.2 Events and Their Triggers

| Event | Triggered By | Delivered To |
|---|---|---|
| `order:created` | `POST /api/customer/orders` or manual order | `restaurant:orders`, `restaurant:kitchen` |
| `order:updated` | Any status change, bill_requested flag | `restaurant:orders`, `restaurant:kitchen`, `order:{orderId}` |
| `payment:confirmed` | Razorpay webhook or cash mark-paid | `restaurant:orders`, `table:{tableId}`, `order:{orderId}` |

### 8.3 Frontend Reactions

**Admin `order:created`**:
- New `AdminOrderCard` slides in at top of orders feed
- Audio chime plays (Web Audio API `new Audio('/sounds/new-order.mp3').play()`)
- Toast notification: "New order — Table {N}"

**Chef `order:created`**:
- New `KDSOrderCard` appears in grid with yellow border
- Bell/chime sound plays on the KDS tablet

**Customer `order:updated`**:
- Status stepper on `/m/{slug}/order/{orderId}` advances to new status
- Status-specific message animates in (e.g., "Chef is cooking your food 🍳")
- If `status = ready`: push notification attempted (if permission granted)

**Admin/Customer `payment:confirmed`**:
- Table card turns green on floor view
- Customer sees `PaymentSuccess` component

---

## 9. Frontend Component Logic

### 9.1 `CustomerMenuClient` (`components/customer/CustomerMenuClient.tsx`)

**State**: category filter (selected tab), search query, scroll position.
**Data**: menu from `GET /api/public/menu/{slug}` via React Query (cache 5 min).
**Behavior**:
- Category tabs filter the item grid below.
- Sticky tab bar on scroll — uses `IntersectionObserver` to auto-highlight the tab corresponding to the visible category section.
- "Featured" row always at top regardless of selected tab.
- Out-of-stock items still shown but with disabled Add button + "Out of Stock" chip.
- Brand color applied via CSS variable `--brand-color` on the root element.

### 9.2 `CartDrawer` (`components/customer/CartDrawer.tsx`)

**State**: Zustand `cart` store (`store/cart.ts`).
**Behavior**:
- Lists all items with quantity steppers.
- Decrementing to 0 removes the item from cart (no lingering zero-qty items).
- Shows subtotal. Does NOT add tax — tax is shown as "estimated" from restaurant settings.
- Disabled "Checkout" if cart is empty or session is expired.
- Session expiry detected by `validateCustomerSession` check — if expired, shows "Session expired — please re-scan the QR code."

### 9.3 `CheckoutClient` (`components/customer/CheckoutClient.tsx`)

**State**: selected payment method, loading state, error state.
**Behavior**:
- Renders cart summary (read-only).
- Phone OTP sheet (`PhoneOtpSheet`) is optional — can skip.
- On "Place Order" click:
  1. Calls `POST /api/customer/orders`.
  2. On 201 → navigates to `/m/{slug}/order/{orderId}`.
  3. On 422 → shows item-level error (e.g., which item is out of stock).
  4. On 401 → session expired error with "Re-scan QR" prompt.
- For Razorpay flow: calls `POST /api/payments/create-order` first, then opens modal.

### 9.4 `OrderTracker` (`components/customer/OrderTracker.tsx`)

**State**: order data (from initial SSR), real-time updates (Socket.IO).
**Behavior**:
- Joins `order:{orderId}` Socket.IO room on mount.
- On `order:updated` event: updates status, triggers step animation.
- Status steps rendered as a vertical stepper. Completed steps show checkmark.
- Active step pulses.
- "Request Bill" button: calls `POST /api/customer/orders/{id}/bill`, then hides button and shows confirmation text.

### 9.5 `KDSGrid` + `KDSOrderCard` (`components/kds/`)

**State**: orders array (from initial fetch + real-time updates).
**Behavior**:
- `useSocket` hook in the KDS page manages the WebSocket connection.
- `order:created` event: prepend new card to orders array with animation.
- `order:updated` event: find card by `orderId`, update status in-place.
- `order:cancelled` / status `cancelled`: mark card for removal, animate out after 1.5s.
- Each card's timer is a live `Date.now() - order.created_at` counter, updated every second.
- Action buttons are disabled during the API call (loading spinner on button).

### 9.6 `TablesManager` (`components/admin/TablesManager.tsx`)

**State**: tables array (from `GET /api/tables`), optimistic updates.
**Behavior**:
- Grid of table cards with status indicators (green/red/amber as per Section 1).
- "Add Table" modal: validates unique `table_number` within the restaurant.
- "Regenerate QR" button shows a confirmation dialog: "This will invalidate all existing printed QR codes for Table {N}. Are you sure?"
- QR code shown as a `<canvas>` rendered by `qrcode` npm package using the session-create URL.
- Delete table: blocked if `status = 'occupied'` with message "Cannot delete an occupied table. Please clear all orders first."

### 9.7 `ManualOrderBuilder` (`components/admin/ManualOrderBuilder.tsx`)

**State**: selected items with quantities, selected table.
**Behavior**:
- Uses same menu data as customer menu (cached).
- Quantity steppers per item.
- Inline customization selectors for items with customizations.
- "Place Order" calls `POST /api/admin/orders/manual`.
- On success: shows a "Order placed — KDS notified" toast and closes the builder.

### 9.8 `AdminOrderCard` (`components/orders/AdminOrderCard.tsx`)

**State**: order data from parent, real-time updates via Socket.IO in `OrdersPageClient`.
**Behavior**:
- Shows status badge with color mapping from Section 3.4.
- "Bill Requested" badge (orange pill) shown if `bill_requested = true`.
- Clicking card opens `OrderDetailModal`.
- In real-time: `order:updated` event updates status badge and timestamp without re-fetching.

---

## 10. Unit Test Cases — Auth

### TC-AUTH-001: Admin Signup — Happy Path
```
POST /api/auth/signup
Body: { name: "Raj Kumar", email: "raj@pizza.com", password: "SecurePass@123", restaurantName: "Raj's Pizza" }

Expected:
- HTTP 201
- DB: INSERT users (role='admin', is_active=true, password_hash != plain password)
- DB: INSERT restaurants (slug='rajs-pizza', plan='starter', onboarded=false)
- Response: { success: true, data: { userId, restaurantId } }
```

### TC-AUTH-002: Admin Signup — Duplicate Email
```
POST /api/auth/signup
Body: { email: "existing@email.com", ... }  (email already in DB)

Expected:
- HTTP 409
- Response: { success: false, error: "Email already registered" }
- DB: No new rows inserted
```

### TC-AUTH-003: Admin Signup — Weak Password
```
POST /api/auth/signup
Body: { password: "abc" }

Expected:
- HTTP 422
- Response: { success: false, errors: { password: "..." } }
```

### TC-AUTH-004: Admin Signup — Slug Collision Auto-Suffix
```
Two restaurants named "Pizza Palace" → slugs must be "pizza-palace" and "pizza-palace-2"

Expected:
- Both signups return HTTP 201
- DB: restaurants.slug = "pizza-palace" for first
- DB: restaurants.slug = "pizza-palace-2" for second
```

### TC-AUTH-005: Chef Login — Valid OTP
```
POST /api/auth/chef-login
Body: { phone: "+919876543210", code: "123456" }
(OTP valid and not expired, user exists with role='chef', is_active=true)

Expected:
- HTTP 200
- Response: { success: true, data: { token, restaurantId, role: 'chef' } }
- Set-Cookie: chef_token (httpOnly, maxAge: 28800)
- JWT payload contains: { sub: userId, restaurantId, role: 'chef', name }
```

### TC-AUTH-006: Chef Login — Wrong OTP
```
POST /api/auth/chef-login
Body: { phone: "+919876543210", code: "999999" }

Expected:
- HTTP 401
- Response: { success: false, error: "Invalid OTP" }
- No cookie set
```

### TC-AUTH-007: Chef Login — Inactive Account
```
User has is_active = false

Expected:
- HTTP 404
- Response: { success: false, error: "No active kitchen account found for this number" }
```

### TC-AUTH-008: Chef Login — Role Must Be Chef or Waiter
```
Phone belongs to a user with role='admin'

Expected:
- HTTP 404 "No active kitchen account found for this number"
```

### TC-AUTH-009: QR Session Creation — Valid Token
```
GET /api/session/create?slug=rajs-pizza&t={valid_qr_token}

Expected:
- DB: INSERT customer_sessions (session_token, restaurant_id, table_id, expires_at = ~2h from now)
- Response: HTTP 302 redirect to /m/rajs-pizza
- Set-Cookie: session_token (httpOnly, maxAge: 7200)
```

### TC-AUTH-010: QR Session Creation — Invalid Token
```
GET /api/session/create?slug=rajs-pizza&t=non-existent-token

Expected:
- HTTP 302 redirect to /m/rajs-pizza?error=invalid-qr
- DB: No session inserted
```

### TC-AUTH-011: QR Session Creation — Unknown Restaurant
```
GET /api/session/create?slug=ghost-restaurant&t=any-token

Expected:
- HTTP 302 redirect to /?error=not-found
```

---

## 11. Unit Test Cases — Customer Orders

### TC-ORDER-001: Place Order — Happy Path
```
POST /api/customer/orders
Cookie: valid session_token
Body: {
  items: [{ menu_item_id: "{validId}", quantity: 2, customizations: { Size: "Regular" } }],
  notes: "Extra spicy"
}

Expected:
- HTTP 201
- DB: INSERT orders (status='pending', payment_status='unpaid', order_number='ORD-0001')
- DB: INSERT order_items (item_name snapshot, item_price snapshot, quantity=2)
- DB: menu_items.stock_quantity -= 2
- Cache: DEL menu:{restaurantId}
- Redis Pub/Sub: event order:created published
- Response: { success: true, data: { orderId, orderNumber, restaurantId, tableId } }
```

### TC-ORDER-002: Place Order — Session Expired
```
POST /api/customer/orders
Cookie: expired session_token (session.expires_at is in the past)

Expected:
- HTTP 401
- Response: { success: false, error: "Session expired — please re-scan the QR code" }
- DB: No order inserted
```

### TC-ORDER-003: Place Order — Item Out of Stock
```
Item has is_available = false

Expected:
- HTTP 422
- Response includes the unavailable item's id
- DB: No order inserted
```

### TC-ORDER-004: Place Order — Insufficient Stock
```
Item has stock_quantity = 1, request has quantity = 5

Expected:
- HTTP 422
- Response: { success: false, error: "Not enough stock for {name}. Only 1 left." }
- DB: No order inserted, stock unchanged
```

### TC-ORDER-005: Place Order — Stock Depleted to Zero
```
Item has stock_quantity = 2, request has quantity = 2

Expected:
- HTTP 201 (order succeeds)
- DB: menu_items.stock_quantity = 0
- DB: menu_items.is_available = false  (auto-set when stock hits 0)
- Cache: DEL menu:{restaurantId}
```

### TC-ORDER-006: Place Order — Price Snapshot Immutability
```
Order placed at item price ₹150
Admin later changes price to ₹200

Expected:
- order_items.item_price = 150 (snapshot at time of order)
- New orders after the price change use ₹200
- Existing order_items unchanged
```

### TC-ORDER-007: Place Order — Max Items Per Request
```
Body with 31 items in the array

Expected:
- HTTP 400
- Validation error: items array max length is 30
```

### TC-ORDER-008: Get Orders — Returns Session-Scoped Orders Only
```
GET /api/customer/orders
Two different customers at two different tables

Expected:
- Each customer only sees their own orders
- No cross-session data leakage
```

### TC-ORDER-009: Bill Request — Sets Flag and Emits Event
```
POST /api/customer/orders/{id}/bill
Valid session, order belongs to the session

Expected:
- HTTP 200
- DB: orders.bill_requested = true
- Redis Pub/Sub: order:updated event with { bill_requested: true }
```

### TC-ORDER-010: Bill Request — Cannot Request for Another Session's Order
```
POST /api/customer/orders/{otherId}/bill
orderId belongs to a different session

Expected:
- HTTP 404
```

---

## 12. Unit Test Cases — Table Management

### TC-TABLE-001: Create Table — Happy Path
```
POST /api/tables
Admin JWT
Body: { table_number: "T-5", capacity: 4 }

Expected:
- HTTP 201
- DB: INSERT restaurant_tables (status='available', qr_token=UUID, restaurant_id=contextRestaurantId)
- Response: full table record with qr_token
```

### TC-TABLE-002: Create Table — Duplicate Table Number
```
POST /api/tables
Body: { table_number: "T-5" }  (T-5 already exists for this restaurant)

Expected:
- HTTP 409 or 422
- DB: No insert (unique constraint on [restaurant_id, table_number])
```

### TC-TABLE-003: Table Status — Available After Restaurant Setup
```
Newly created table

Expected:
- status = 'available'
- UI: green dot, "Available" badge
```

### TC-TABLE-004: Table Status — Occupied After Order Placed
```
Customer places order via POST /api/customer/orders

Expected:
- DB: NO automatic status change on the table at this point
  (table status is managed separately — it becomes occupied via manual admin update or via payment webhook for the reverse)

NOTE: The table's visual "occupied" state in the Admin floor view is derived from
active unpaid orders linked to that table_id — NOT from table.status alone.
The floor view queries: SELECT COUNT(*) FROM orders WHERE table_id = ? AND payment_status = 'unpaid'
```

### TC-TABLE-005: Table Status — Available After Payment
```
Razorpay webhook fires payment.captured

Expected:
- DB transaction sets restaurant_tables.status = 'available'
- Socket event causes floor view to update in real-time
```

### TC-TABLE-006: Regenerate QR — Invalidates Old Token
```
PATCH /api/tables/{id}
Body: { regenerate_qr: true }

Expected:
- DB: restaurant_tables.qr_token = new UUID (different from old)
- Old qr_token no longer matches any table → existing sessions remain valid but new scans with old QR will get 404
- Response includes new qr_token
```

### TC-TABLE-007: Delete Table — Cannot Delete Occupied Table
```
DELETE /api/tables/{id}
Table has status = 'occupied' or has active unpaid orders

Expected:
- HTTP 409 or 422
- Error message: "Cannot delete an occupied table"
- DB: Table not deleted
```

### TC-TABLE-008: Table Cross-Tenant Security
```
Admin A tries to PATCH/DELETE a table belonging to Restaurant B

Expected:
- HTTP 404 (tenantScope WHERE restaurant_id = contextRestaurantId filters it out)
- No data leakage
```

---

## 13. Unit Test Cases — Menu Management

### TC-MENU-001: Get Public Menu — Cache Hit
```
GET /api/public/menu/{slug}
Redis has key menu:{restaurantId}

Expected:
- Response served directly from cache
- DB not queried
- Response time < 50ms
- Returns categories with is_active=true only, items with is_available=true
```

### TC-MENU-002: Get Public Menu — Cache Miss
```
GET /api/public/menu/{slug}
Redis key does not exist

Expected:
- DB queried: SELECT categories + items + customizations WHERE restaurant_id = ? AND is_active = true
- Result stored in Redis: SET menu:{restaurantId} {payload} EX 300
- Same response returned
```

### TC-MENU-003: Create Menu Item — Invalidates Cache
```
POST /api/menu/items
Body: { name: "Garlic Bread", price: 120, category_id: "...", food_type: "veg" }

Expected:
- HTTP 201
- DB: INSERT menu_items
- Redis: DEL menu:{restaurantId}  (next customer menu request will hit DB)
```

### TC-MENU-004: Update Item Availability — Cache Invalidation
```
PATCH /api/menu/items/{id}
Body: { is_available: false }

Expected:
- DB: UPDATE menu_items SET is_available = false
- Redis: DEL menu:{restaurantId}
- Customer menu shows item as "Out of Stock" after next menu fetch
```

### TC-MENU-005: Delete Category — Cascades to Items
```
DELETE /api/menu/categories/{id}
Category has 5 items

Expected:
- DB: DELETE menu_categories (Prisma cascade deletes all 5 menu_items)
- Redis: DEL menu:{restaurantId}
```

### TC-MENU-006: Item Customization — Required Field Enforcement
```
Item has customization "Size" with is_required = true
Customer adds item to cart without selecting Size

Expected:
- Frontend: "Add to Cart" button disabled until Size is selected
- Even if bypassed: POST /api/customer/orders does NOT validate customization presence server-side
  (customizations stored as JSON snapshot — missing optional data is acceptable)
```

### TC-MENU-007: Menu Cross-Tenant Security
```
Admin of Restaurant A calls PATCH /api/menu/items/{itemId}
itemId belongs to Restaurant B

Expected:
- HTTP 404
- DB: No update performed
```

---

## 14. Unit Test Cases — Chef/KDS Status

### TC-KDS-001: Chef Advances Order — Valid Transition
```
PATCH /api/chef/orders/{id}/status
chef_token JWT (valid, 8h TTL)
Order status = 'pending'
Body: { status: "confirmed" }

Expected:
- HTTP 200
- DB: orders.status = 'confirmed'
- Redis Pub/Sub: order:updated event emitted
- Response: { success: true, data: { orderId, status: 'confirmed' } }
```

### TC-KDS-002: Chef Advances Order — Invalid Transition
```
PATCH /api/chef/orders/{id}/status
Order status = 'pending'
Body: { status: "ready" }  (skipping confirmed and preparing)

Expected:
- HTTP 400
- Response: { success: false, error: "Cannot transition from pending to ready" }
- DB: No update
```

### TC-KDS-003: Chef Cannot Cancel Orders
```
PATCH /api/chef/orders/{id}/status
Body: { status: "cancelled" }

Expected:
- HTTP 400 (Zod rejects "cancelled" — not in chef's allowed enum)
```

### TC-KDS-004: Chef Token Expired
```
PATCH /api/chef/orders/{id}/status
chef_token cookie present but JWT expired (> 8h)

Expected:
- HTTP 401 "Unauthorized"
```

### TC-KDS-005: State Machine Completeness
```
Test all 6 status values attempt to go to all 6 target values:
Valid: pending→confirmed, confirmed→preparing, preparing→ready, ready→served
Invalid: pending→ready, pending→served, confirmed→served, preparing→confirmed, ready→pending, etc.

Expected: All invalid transitions return HTTP 400
```

### TC-KDS-006: Admin Can Cancel at Any Stage
```
PATCH /api/admin/orders/{id}/status
Admin JWT
Order status = 'preparing'
Body: { status: "cancelled", cancellation_reason: "Customer left" }

Expected:
- HTTP 200
- DB: orders.status = 'cancelled'
- DB: orders.notes appended with "Cancellation: Customer left"
- Redis Pub/Sub: order:updated event with cancellationReason
```

---

## 15. Unit Test Cases — Payments & Billing

### TC-PAY-001: Create Razorpay Order — Server Recalculates Amount
```
POST /api/payments/create-order
Body: { orderId: "{id}" }
Order has 2 items: Burger (₹150) x2, Fries (₹80) x1 = ₹380

Expected:
- Razorpay order created with amount = 380 * 100 paise (+ tax)
- Amount is taken from DB, NOT from any client-provided amount
```

### TC-PAY-002: Verify Signature — Valid HMAC
```
POST /api/payments/verify
Valid HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)

Expected:
- HTTP 200
- DB: orders.payment_status = 'verifying'
```

### TC-PAY-003: Verify Signature — Invalid HMAC
```
POST /api/payments/verify
Tampered/wrong signature

Expected:
- HTTP 400
```

### TC-PAY-004: Webhook — Valid Signature + payment.captured
```
POST /api/payments/webhook
Headers: x-razorpay-signature = valid HMAC
Body: { event: "payment.captured", payload: { payment: { entity: { order_id, id, amount, method } } } }

Expected:
- HTTP 200 { received: true, order_id }
- DB transaction:
  - orders.payment_status = 'paid'
  - orders.payment_method = (mapped from method)
  - INSERT bills (bill_number, subtotal, cgst, sgst, total)
  - restaurant_tables.status = 'available'
- Redis Pub/Sub: payment:confirmed event emitted
```

### TC-PAY-005: Webhook — Idempotency (Received Twice)
```
Same payment.captured webhook sent twice (Razorpay can retry)

Expected:
- First call: processes normally (HTTP 200)
- Second call: order.payment_status = 'paid' already → return { received: true, skipped: "already_paid" }
- DB: No duplicate bill created
```

### TC-PAY-006: Webhook — Invalid Signature (Fraud)
```
POST /api/payments/webhook
Invalid x-razorpay-signature

Expected:
- HTTP 400 { error: "Invalid signature" }
- DB: AuditLog row inserted with action='webhook_fraud_attempt'
- DB: No order or bill modified
```

### TC-PAY-007: Bill Number Sequencing
```
Restaurant's first bill: BILL-0001
After 41 more bills: BILL-0042

Expected: Incrementing 4-digit zero-padded sequence per restaurant
```

### TC-PAY-008: Tax Calculation Accuracy
```
Subtotal = ₹1000, CGST = 2.5%, SGST = 2.5%

Expected:
- cgst = 25.00
- sgst = 25.00
- total = 1050.00
- All stored as Decimal(10,2) — no floating point drift
```

---

## 16. Unit Test Cases — Admin Override & Security

### TC-SEC-001: Tenant Isolation — Cannot Access Other Restaurant's Data
```
Admin of restaurantA calls GET /api/admin/analytics
(JWT encodes restaurantA's id)

Expected:
- All DB queries scoped by tenantScope(restaurantId) which injects WHERE restaurant_id = restaurantA
- Restaurant B's data never returned
```

### TC-SEC-002: Missing restaurant_id in Context — Hard Fail
```
tenantScope(undefined) called anywhere

Expected:
- Throws Error('CRITICAL: Missing restaurant_id — tenant isolation breach')
- API returns HTTP 500 (not silently leaking data)
```

### TC-SEC-003: Customer Cannot Access Admin Endpoints
```
GET /api/admin/analytics
Cookie: session_token (customer session) — no admin JWT

Expected:
- HTTP 401 "Unauthorized"
```

### TC-SEC-004: Chef Cannot Access Admin Endpoints
```
GET /api/admin/settings
Cookie: chef_token (chef JWT)

Expected:
- HTTP 401 "Unauthorized" (resolveStaffAuth returns chef context, but admin-only endpoints check role='admin')
```

### TC-SEC-005: Plan Gate — Free Plan Limits
```
Restaurant on 'starter' plan attempts to create 31st menu item
(Starter plan limit: 30 items)

Expected:
- HTTP 403 "Upgrade your plan to add more items"
- DB: Item not created
```

### TC-SEC-006: Cross-Restaurant Order Access — Chef
```
Chef of Restaurant A calls PATCH /api/chef/orders/{orderId}/status
orderId belongs to Restaurant B

Expected:
- HTTP 404 (WHERE restaurant_id = chefContext.restaurantId filters it out)
```

### TC-SEC-007: Session Cookie Security
```
session_token cookie must have httpOnly=true, sameSite='lax'
chef_token cookie must have httpOnly=true, sameSite='lax'

Expected: No JavaScript access to these cookies (httpOnly)
```

---

## 17. Integration Test Cases — Full Order Cycle

### IT-001: Full Customer Order Cycle (Online Payment)
```
1. Admin creates restaurant, onboards, creates 1 table (T-1), adds 2 menu items
2. Customer scans QR → GET /api/session/create → session cookie set, redirected to /m/{slug}
3. Customer adds 1 item to cart
4. Customer clicks "Place Order" → POST /api/customer/orders → HTTP 201
5. Verify: KDS shows new order card with order number ORD-XXXX (via socket event)
6. Chef clicks "Confirm" → PATCH /api/chef/orders/{id}/status {confirmed}
7. Verify: Customer order tracker shows "Confirmed"
8. Chef clicks "Start Cooking" → {preparing}
9. Verify: Customer tracker shows "Preparing"
10. Chef clicks "Ready" → {ready}
11. Verify: Customer tracker shows "Ready"
12. Customer clicks "Pay Now" → POST /api/payments/create-order
13. Customer completes payment in Razorpay modal
14. Razorpay webhook fires → POST /api/payments/webhook
15. Verify: Bill created (BILL-XXXX), order.payment_status='paid', table.status='available'
16. Verify: Customer sees PaymentSuccess screen
17. Verify: Admin floor view shows T-1 as available (green)
```

### IT-002: Manual Order by Waiter
```
1. Waiter logs in via /chef-login with phone OTP
2. Waiter navigates to /waiter/tables
3. Waiter opens ManualOrderBuilder for Table T-3
4. Waiter selects items, places order → POST /api/admin/orders/manual
5. Verify: KDS shows new order card (order number ORD-XXXX)
6. Chef processes order through all states
7. Admin marks cash payment as paid
8. Verify: Bill created (BILL-XXXX), table freed
```

### IT-003: Order Cancellation Mid-Preparation
```
1. Order in 'preparing' status
2. Admin cancels with reason "Ingredient unavailable"
3. Verify: Order status = 'cancelled'
4. Verify: KDS card removed with animation
5. Verify: Customer tracker shows "Order was cancelled"
6. Verify: Stock NOT automatically restored (manual inventory adjustment required)
```

### IT-004: Multi-Table Simultaneous Orders
```
5 customers at 5 different tables place orders simultaneously

Expected:
- All 5 orders created atomically (each in its own transaction)
- All 5 order numbers unique: ORD-0001 through ORD-0005
- All 5 appear on KDS within 500ms
- No stock or order-number collision
```

### IT-005: Stock Depletion Mid-Service
```
Item has stock_quantity = 3
Customer A orders 2 (stock → 1)
Customer B orders 2 simultaneously

Expected:
- Customer A: HTTP 201 (order succeeds, stock → 1)
- Customer B: HTTP 422 "Not enough stock. Only 1 left."
- DB: stock_quantity = 1 (not negative), is_available = true (stock > 0)
```

---

## 18. Edge Cases & Error Scenarios

### EC-001: Session Expires While Customer Is Browsing
- Customer opens menu at T=0 (session valid for 2h)
- Customer doesn't order for 2h
- At T=2h+1s, customer tries to place order
- Expected: HTTP 401 "Session expired — please re-scan the QR code"
- Frontend: toast with "Re-scan the QR code to continue"

### EC-002: QR Code Regenerated While Customer Session Is Active
- Admin regenerates QR for T-3
- Customer who scanned old QR still has a valid session_token cookie
- Expected: Existing session is still valid (session is keyed to `session_token`, not `qr_token`)
- New scans with old QR → HTTP 404 at session/create (qr_token no longer matches)

### EC-003: Menu Item Deleted While In Customer's Cart
- Customer adds "Paneer Tikka" to cart
- Admin deletes "Paneer Tikka" from menu
- Customer tries to place order
- Expected: HTTP 422 "Some items are no longer available: {itemId}"
- Frontend: shows which item is unavailable, prompts to remove from cart

### EC-004: Admin Changes Price While Customer Browsing
- Customer opens menu, Butter Chicken shown at ₹280
- Admin updates price to ₹350
- Customer adds to cart (client cart stores ₹280)
- Customer places order
- Expected: Server fetches current price (₹350), order_items.item_price = 350
- Customer is charged ₹350 (NOT ₹280 from stale cart)
- Note: The server IGNORES client-sent prices entirely — it always re-reads from DB

### EC-005: Razorpay Webhook Arrives Before Verify Call
- Verify and webhook can race if network is slow
- Expected: Both are idempotent. Webhook creates bill + marks paid. Verify call (arriving late) finds payment_status='paid' and is a no-op or updates razorpay_payment_id.

### EC-006: Redis Downtime — Order Placement Continues
- Redis is unavailable (Upstash outage)
- Customer places order
- Expected: Order is created in DB (DB transaction is independent of Redis)
- Cache invalidation fails silently (non-fatal)
- Socket event emission fails silently (non-fatal)
- KDS does not receive real-time notification — staff manually refreshes
- No order data is lost

### EC-007: Socket Server Disconnection
- Railway Socket.IO server restarts
- Admin dashboard loses WebSocket connection
- Expected: Socket.IO client auto-reconnects with exponential backoff
- On reconnect: client re-joins rooms, fetches fresh data via REST to catch up on missed events

### EC-008: Concurrent Bill Requests for Same Order
- Two requests to POST /api/customer/orders/{id}/bill arrive simultaneously
- Expected: Both result in `bill_requested = true` (idempotent UPDATE)
- Only one socket event emitted (second UPDATE is a no-op)

### EC-009: Table Deleted With Active Orders
- Admin attempts to delete table with active unpaid orders
- Expected: HTTP 409 "Cannot delete an occupied table"
- If somehow deleted (DB cascade): customer_sessions cascade-deleted, orphaned orders remain (order.table_id FK may throw constraint error — guard in API)

### EC-010: Order Number Sequence Exhaustion
- Restaurant reaches order ORD-9999
- Next order placed
- Expected: ORD-10000 (sequence extends beyond 4 digits naturally — no wrap-around)
- `getNextOrderNumber` uses `SELECT MAX(order_number)` logic scoped to the restaurant — it never resets or collides
- Display may truncate to last 4 digits for UI brevity but the stored value is the full sequential number

---

## Appendix: Key Database Constraints Summary

| Constraint | Table | Column(s) | Type |
|---|---|---|---|
| Unique restaurant slug | `restaurants` | `slug` | UNIQUE |
| Unique QR token | `restaurant_tables` | `qr_token` | UNIQUE |
| Unique session token | `customer_sessions` | `session_token` | UNIQUE |
| Unique order number per restaurant | `orders` | `(restaurant_id, order_number)` | UNIQUE |
| Unique bill per order | `bills` | `order_id` | UNIQUE |
| Unique bill number per restaurant | `bills` | `(restaurant_id, bill_number)` | UNIQUE |
| Unique table number per restaurant | `restaurant_tables` | `(restaurant_id, table_number)` | UNIQUE |
| Unique user email per restaurant | `users` | `(email, restaurant_id)` | UNIQUE |
| Unique phone globally | `users` | `phone` | UNIQUE |

### Order & Bill Number Formats

| Field | Format | Example | Notes |
|---|---|---|---|
| `order_number` | `ORD-NNNN` | `ORD-0042` | 4-digit zero-padded, sequential per restaurant, extends beyond 4 digits after 9999 |
| `bill_number` | `BILL-NNNN` | `BILL-0042` | 4-digit zero-padded, sequential per restaurant |

---

*Last updated: 2026-05-25 — Order/Bill number format updated to 4-digit sequential (ORD-NNNN / BILL-NNNN). Derived from full codebase read of qrdine/ + PRODUCT_SPEC.md + ScanBite_Architecture_Master_Guide.md*
