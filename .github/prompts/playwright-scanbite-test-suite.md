---
mode: agent
description: "Comprehensively test the ScanBite QR dining platform — all three user roles (Customer, Admin, Chef), all API endpoints, UI flows, state machines, security boundaries, and real-time events. Generate a structured test report."
tools: ['changes', 'search/codebase', 'edit/editFiles', 'fetch', 'openSimpleBrowser', 'problems', 'runCommands', 'runTasks', 'runTests', 'search', 'search/searchResults', 'runCommands/terminalLastCommand', 'runCommands/terminalSelection', 'testFailure', 'microsoft/playwright-mcp/*']
model: 'claude-sonnet-4-6'
---

# ScanBite — Playwright Test Suite Agent Instructions

## Role
You are a QA engineer with full access to the ScanBite codebase (Next.js 16, React 19, PostgreSQL via Prisma, Socket.IO, Razorpay). Your job is to use the Microsoft Playwright MCP server to navigate, interact, assert, and document test outcomes across every functional unit of the platform.

## Before Testing
1. Read `PRODUCT_SPEC.md` to understand expected API outcomes and DB state changes.
2. Read `DESIGN_SPEC.md` to understand visual contracts, token names, and animation rules.
3. Read `qrdine/playwright.config.ts` for the six test project profiles and device viewports.
4. Read `qrdine/tests/fixtures/auth.fixtures.ts` and `qrdine/tests/helpers/api.helpers.ts` — reuse these helpers wherever possible.
5. Confirm the dev server is running on `http://localhost:3000`. If not, run `cd qrdine && npm run dev` in a terminal and wait until "Ready" appears.

---

## Testing Scope — Test Every Unit Listed Below

### 1. Authentication Flows

#### 1a. Admin Signup — Phone OTP + Password (`POST /api/auth/otp/send`, `POST /api/auth/signup`)
- Navigate to `http://localhost:3000/signup`
- Fill restaurant name, email, password, phone number
- Click "Send OTP" → `POST /api/auth/otp/send { phone, type: "admin_signup" }` → assert SMS sent (check Twilio or dev console log)
- Enter 6-digit OTP in the verification boxes → "Create Account" button becomes available
- Submit → `POST /api/auth/signup` with `{ restaurantName, email, password, phone, otpCode }` → expect `201`
- Assert: redirect to `/onboarding` after auto-sign-in
- Assert: DB `User` row has `phone` set and `password_hash` set; `pin_hash` is null
- **Wrong OTP**: Enter incorrect 6-digit code → `401` response, error message shown
- **Expired OTP** (wait > 5 min): Submit → `401`, "OTP expired" message
- **Rate limit**: Send OTP 4+ times from same phone in 1 hour → `429` on 4th attempt
- **Duplicate phone**: Try signup with a phone already registered → `409` conflict
- **Duplicate email**: Use existing email → `409` conflict

#### 1b. Admin Login — Email + Password (unchanged)
- Navigate to `http://localhost:3000/login`
- **Happy path**: Valid email + password → redirect to `/dashboard`
- **Wrong password**: Submit → `401 Unauthorized` toast, stay on login
- **Unknown email**: Submit → `401`, generic message (must NOT reveal whether email exists)
- Assert: session JWT cookie is `httpOnly`, `SameSite=Lax`, not visible to JS

#### 1c. Chef Login — Phone OTP (`POST /api/auth/otp/send`, `POST /api/auth/chef-login`)
- Navigate to `http://localhost:3000/chef-login`
- **Step 1**: Enter phone number registered to an active chef → click "Send OTP"
  - Assert: OTP SMS sent, page transitions to OTP boxes
  - Assert: no restaurant slug field exists anywhere on this page
- **Step 2**: Enter 6-digit OTP in the digit boxes
  - Assert: auto-submits on 6th digit (no separate button needed)
  - Assert: redirect to `/kds` on success
  - Assert: `chef_token` cookie is `httpOnly`, expires in 8 hours
- **Wrong OTP**: Assert error message, boxes reset, focus returns to first box
- **Paste OTP**: Paste 6-digit string → auto-fills all boxes and submits
- **Resend**: Wait 30s countdown → resend link appears → new OTP sent, boxes reset
- **Unknown phone**: Phone not in any chef account → `404` "No active kitchen account"
- **Inactive chef**: Phone belongs to deactivated chef → `404` (account not found as active)
- **Max attempts** (3 wrong codes): 3rd wrong attempt deletes OTP key → next attempt gets "OTP expired"

#### 1d. QR Customer Session (`GET /api/session/create?token=<qr_token>`)
- Simulate QR scan by navigating to `http://localhost:3000/m/<slug>?token=<valid_qr_token>`
- Assert: `customer_session` cookie set (httpOnly), session expires in 2 hours
- **Expired/invalid token**: Navigate with bad token → expect `400` error page
- **Already-occupied table**: Validate session reuse or fresh session creation

---

### 2. Admin Onboarding Flow

- After signup, land on `/onboarding`
- Fill: restaurant address, GSTIN, CGST rate (%), SGST rate (%), logo upload
- Submit → `POST /api/admin/onboarding`
- Assert: `Restaurant.onboarded = true`, redirect to `/dashboard`
- **Skip attempt**: Navigate directly to `/dashboard` before onboarding → expect redirect back to `/onboarding`

---

### 3. Customer QR Menu Flow

#### 3a. Menu Loading (`GET /api/public/menu/[slug]`)
- Navigate to `http://localhost:3000/m/<slug>`
- Assert: page loads categories as horizontal scrollable chips
- Assert: menu items render as 2-column grid cards with image, name, price, veg/non-veg badge
- Assert: Redis cache is used — second load must return `X-Cache: HIT` header (check Network tab)
- **Empty menu**: Restaurant with no categories → show empty state, not a blank page

#### 3b. Search Bar
- Type a partial item name in the search bar
- Assert: menu grid filters in real-time (client-side), non-matching items hidden
- Clear search → all items restored
- Search with gibberish → empty results message shown

#### 3c. Food Detail Sheet & Customizations
- Tap a food card → bottom sheet slides up
- If item has customizations (e.g., "Size"): assert radio/checkbox options visible
- Select a required customization, tap "Add to Cart" → item appears in cart with correct price delta applied
- Attempt "Add" without selecting a required customization → validation error, no cart add

#### 3d. Cart Drawer
- Open cart → items list with quantity controls (+ / −)
- Increase quantity → subtotal updates
- Decrease to 0 → item removed from cart
- Assert: cart persists on page refresh (Zustand persist or localStorage)
- Assert: cart is scoped to this table session (cannot share across sessions)

#### 3e. Customer Identity Gate — Phone OTP (`POST /api/auth/otp/send`, `POST /api/customer/identity`)
- Add items to cart, click "Place order" button in CartDrawer
- **New customer** (no cookies): Assert PhoneOtpSheet slides up
  - Step 1: Enter name + phone → click "Send OTP" → SMS sent
  - Step 2: Enter 6-digit OTP → auto-submits on 6th digit
  - Assert: `customer_id` cookie set (httpOnly, 30 days), `customer_name` + `customer_phone` cookies set (readable by JS)
  - Assert: redirect to `/m/<slug>/checkout` after identity confirmed
  - Assert: `Customer` row upserted in DB with correct phone + name
- **Returning customer** (cookies present): Assert "Ordering as [name]?" banner shown in CartDrawer
  - Assert: clicking "Place order" goes directly to checkout — no OTP sheet
  - Assert: "Not you?" button clears cookies and shows OTP sheet again
- **Wrong OTP**: Enter incorrect code → error shown, boxes reset
- **Customer data storage**: After OTP verification, `Customer` row persists across sessions (same phone = same customer, order history linked)

#### 3f. Checkout & Payment (`POST /api/payments/create-order`, `POST /api/payments/verify`)
- Proceed to checkout from cart
- Assert: item list, subtotal, CGST, SGST, total shown with correct arithmetic
- Initiate payment → Razorpay modal opens
- **Price tamper test**: Manually alter the `amount` field in DevTools before submit → backend must reject with `400` (server-side price re-calculation must be enforced)
- **Signature forgery**: Send `POST /api/payments/verify` with a fabricated `razorpay_signature` → expect `400` rejection
- Successful payment (use Razorpay test card `4111 1111 1111 1111`) → webhook fires → order status becomes `paid`, bill is created

#### 3f. Order Tracking Screen
- After order placed, redirect to `/m/<slug>/<orderId>`
- Assert: yellow hero section with order number visible
- Assert: order status journey steps (Placed → Confirmed → Preparing → Ready → Served)
- Socket.IO update: when chef changes order status on KDS → customer screen updates without page refresh (verify via Socket.IO room `order:<orderId>`)
- Assert: timer/countdown visible and ticking

#### 3g. Bill Request & Split
- On tracking screen, tap "Request Bill"
- Assert: `POST /api/customer/orders/[id]/bill` succeeds, `bill_requested = true` on order
- Assert: admin dashboard shows notification for bill request
- Split bill: `POST /api/customer/bills/split` with `{ total, numPeople }` → response contains `per_person` amount (pure calculation, no DB write)

---

### 4. Admin Dashboard

#### 4a. Dashboard Home (`/dashboard`)
- Navigate to `http://localhost:3000/dashboard`
- Assert: 4 KPI cards visible — Today's Revenue, Total Orders, Active Tables, Low Stock Alerts
- Assert: KPI values match `GET /api/admin/analytics` response
- Assert: recent orders table with semantic status pills (colour-coded, no emoji)
- Assert: Quick Actions pills visible (New Order, Add Item, etc.)
- Assert: no loading spinners remain after data fetch

#### 4b. Analytics Page (`/dashboard/analytics`)
- Assert: date range picker defaults to "Today"
- Change range to "Last 7 Days" → chart updates, KPIs recalculate
- Assert: revenue chart (Recharts LineChart) renders with correct axis labels
- Assert: Popular Items section shows top 5 items with quantities
- Assert: Orders Breakdown by payment method shows correct distribution

#### 4c. Menu Manager (`/dashboard/menu`)

**Categories:**
- Create a new category → `POST /api/menu/categories` → category appears in list
- Edit category name → `PATCH /api/menu/categories/[id]` → name updates in UI
- Toggle category `is_active` → customer menu hides/shows the category (verify via `/api/public/menu/[slug]`)
- Drag to reorder categories → `sort_order` updates in DB
- Delete category with items → expect confirmation modal warning about orphaned items

**Menu Items:**
- Create new item: fill name, price, description, upload image, select category, set veg/non-veg badge
- `POST /api/menu/items` → item appears in grid
- Toggle `is_available` → item hides from customer menu in real time
- Toggle `is_featured` → item appears in featured section on customer menu
- Edit price → `PATCH /api/menu/items/[id]` → price updates; existing order snapshots must NOT change (verify via `OrderItem.item_price`)
- Delete item → removed from grid and customer menu
- **Customizations**: Add a customization group (e.g., "Size": Small +0, Large +50) → verify it appears on customer FoodDetailSheet

#### 4d. Tables Manager (`/dashboard/tables`)
- Create a table (table number, capacity) → `POST /api/tables` → appears on floor heatmap
- Assert: floor heatmap renders tables in a 5-column grid with status colour coding (available=green, occupied=amber)
- Regenerate QR code → `PATCH /api/tables/[id]` → new `qr_token`, old token invalidated
- Download QR code → PNG/SVG file downloaded
- Delete table → confirmation modal, then `DELETE /api/tables/[id]`
- Assert: occupied table shows customer count badge

#### 4e. Orders Management (`/dashboard/orders`)
- Assert: orders table with columns: Order #, Table, Items, Total, Status, Time
- Filter by status (Pending, Preparing, Ready, Served, Cancelled) → list filters correctly
- Admin status override: change any order status via dropdown → `PATCH /api/admin/orders/[id]/status`
- **Invalid transition**: Attempt to move `served` → `pending` → expect `400` rejection
- **Cancellation with reason**: Cancel a `preparing` order → assert reason modal appears, reason saved
- Manual order (`POST /api/admin/orders/manual`): open New Order builder, select table, add items, submit → order created without QR session

#### 4f. Billing (`/dashboard/billing`)
- Assert: bills list with bill number, date, amount, payment method, download icon
- Open bill detail modal → assert subtotal, CGST, SGST, total match formula: `subtotal × (1 + cgst_rate + sgst_rate)`
- Download invoice PDF → file downloads (check `Content-Type: application/pdf`)
- Send invoice via email → `POST /api/admin/bills/[id]/send` → Resend API called (check network log)
- Assert: Daily Summary card shows correct totals for the day

#### 4g. Inventory (`/dashboard/inventory`)
- Assert: inventory table shows item name, current stock, low-stock threshold, status badge
- Adjust stock: `PATCH /api/admin/inventory` → stock quantity updates in table
- **Low stock alert**: Set quantity below threshold → item appears in dashboard KPI "Low Stock Alerts"
- **Out of stock**: Set quantity to 0 → item auto-marked `is_available = false` on customer menu

#### 4h. Staff Management (via Settings or Staff panel)
- Create chef: provide name + phone number (no PIN) → `POST /api/admin/staff` with `role=chef`
- Assert: `User` row created with `phone` set, `pin_hash` is null
- Assert: chef can log in via phone OTP at `/chef-login` with the registered number
- **Duplicate phone**: Add second chef with same phone → `400` conflict error
- Deactivate staff → `PATCH /api/admin/staff` with `{ is_active: false }` → chef OTP login returns `404` (account not found as active)
- Delete staff → `DELETE /api/admin/staff/[id]` → chef phone no longer recognized at `/chef-login`

#### 4i. Settings (`/dashboard/settings`)
- Update restaurant name → `PATCH /api/admin/settings`
- Update CGST/SGST rates → assert future bills use new rates, old bills unchanged
- Update brand colour → assert customer menu `--brand` CSS var updates
- Upload new logo → Cloudinary upload, logo URL saved, appears in customer TopBar

#### 4j. CSV Export
- `POST /api/admin/export` with `type=orders` → CSV file download
- `POST /api/admin/export` with `type=bills` → CSV download
- Assert: CSV columns match documented schema (Order #, Date, Table, Items, Total, Status)

---

### 5. Chef Kitchen Display System (KDS)

- Login as chef → navigate to `http://localhost:3000/kds`
- Assert: full-screen 3-column grid, no admin sidebar
- Assert: only `confirmed` and `preparing` orders appear (not `pending`, `served`, `cancelled`)
- Assert: each OrderCard shows table number, item list, and elapsed timer
- **Timer colour urgency**: Assert timer is green < 5min, amber 5-10min, red > 10min
- **Confirm order**: Click "Confirm" → `PATCH /api/chef/orders/[id]/status` with `status=confirmed` → card moves column
- **Mark Preparing**: Click "Preparing" → status updates, Socket.IO broadcasts to admin dashboard
- **Mark Ready**: Click "Ready" → card moves to ready column, customer tracking screen updates
- **Serve**: Admin marks as Served → card disappears from KDS (test via admin API override)
- Assert: new orders appear via Socket.IO without page refresh (room `restaurant:<id>:kitchen`)
- Assert: order cancellation removes card from KDS in real time

---

### 6. Real-Time Socket.IO Events

For each event below, trigger the action in one browser tab and assert the effect appears in a second tab without refresh:

| Event | Trigger | Expected Effect |
|---|---|---|
| `order:created` | Customer places order | Admin dashboard orders table prepends new row; KDS shows new card |
| `order:updated` | Chef changes status | Customer tracking screen status pill animates to new state |
| `order:cancelled` | Admin cancels order | KDS card disappears; customer tracking shows "Cancelled" |
| `bill:requested` | Customer taps "Request Bill" | Admin dashboard shows notification badge |
| `table:updated` | Table status changes | Admin floor heatmap updates colour without refresh |

---

### 7. Security Tests

#### 7a. Multi-Tenant Isolation
- Restaurant A admin attempts to read Restaurant B's data:
  - `GET /api/admin/analytics` with Restaurant B's `restaurant_id` in query → `403 Forbidden`
  - `GET /api/admin/orders` → only returns Restaurant A's orders (no cross-tenant leak)
  - `PATCH /api/menu/items/[restaurantB_item_id]` → `403` or `404`
- Customer with Restaurant A session attempts to order from Restaurant B's menu slug → `404` or `403`

#### 7b. Authentication Guards
- Unauthenticated user navigates to `/dashboard` → redirect to `/login`
- Unauthenticated user calls `GET /api/admin/analytics` → `401 Unauthorized`
- Chef JWT used on admin-only endpoint `POST /api/admin/orders/manual` → `403 Forbidden`
- Admin JWT used on chef-only endpoint `PATCH /api/chef/orders/[id]/status` → should succeed (admin has higher privilege, confirm per spec)
- Expired JWT (manually set expiry in past) → `401`

#### 7c. Input Validation & Injection
- XSS in restaurant name: submit `<script>alert(1)</script>` as restaurant name → assert it is stored encoded and renders safely, no script execution
- SQL injection in menu item name: submit `'; DROP TABLE "MenuItem"; --` → Prisma parameterised queries must prevent execution
- Price tampering: `POST /api/customer/orders` with `price=0.01` for a ₹500 item → server must re-calculate price from DB, reject or correct
- Negative quantity in cart: `POST /api/customer/orders` with `quantity=-1` → `400` validation error
- Oversized payload: send 10MB body to any POST endpoint → `413` or timeout, not server crash

#### 7d. Payment Security
- Replay attack: resend a valid `POST /api/payments/verify` twice (idempotency) → second call must be idempotent (not double-create bill)
- Razorpay webhook with wrong signature → `400`, no order state change, `AuditLog` entry written

---

### 8. Design Compliance (Visual Regression)

For each page, take a full-page screenshot and assert these visual rules per `DESIGN_SPEC.md`:

- **Brand colour `#FF4D3D`** used for primary CTAs (Add to Cart, Pay Now, Confirm)
- **Never default Tailwind indigo/blue** as primary colour anywhere on the page
- **No `transition-all`** in computed styles on animated elements
- **No emoji** in buttons, table cells, navigation labels, or status pills
- **Typography**: Display headings use Instrument Serif, body uses Plus Jakarta Sans
- **KDS Timer** uses JetBrains Mono font
- **Shadows**: Cards must have colour-tinted multi-stop shadows, not flat `shadow-md`
- **Status pills**: Colour-coded only via design tokens (`--green`, `--amber`, `--red`) — no hardcoded hex
- **Mobile menu** (`/m/<slug>`): Test on 393×852 (Pixel 7) viewport — no horizontal overflow, all tap targets ≥ 44px

---

### 9. API Contract Tests (Direct HTTP via Playwright `request`)

Run these as direct API assertions without UI navigation:

| Method | Endpoint | Input | Expected Status | Expected Body |
|---|---|---|---|---|
| POST | `/api/auth/signup` | valid payload | 201 | `{ slug, userId }` |
| POST | `/api/auth/signup` | duplicate email | 409 | `{ error: "EMAIL_EXISTS" }` |
| POST | `/api/auth/chef-login` | valid PIN | 200 | `{ token }` |
| POST | `/api/auth/chef-login` | wrong PIN | 401 | `{ error }` |
| GET | `/api/public/menu/[slug]` | valid slug | 200 | `{ categories: [...] }` |
| GET | `/api/public/menu/unknown-slug` | - | 404 | `{ error }` |
| POST | `/api/customer/orders` | valid cart | 201 | `{ orderId, orderNumber }` |
| POST | `/api/customer/orders` | tampered price | 400 | `{ error: "PRICE_MISMATCH" }` |
| PATCH | `/api/chef/orders/[id]/status` | `{ status: "preparing" }` | 200 | `{ order }` |
| PATCH | `/api/chef/orders/[id]/status` | invalid transition | 400 | `{ error }` |
| GET | `/api/admin/analytics` | no auth | 401 | `{ error }` |
| GET | `/api/health` | - | 200 | `{ db: "ok", redis: "ok" }` |

---

### 10. Edge Cases & Regression Checks

- **Concurrent orders**: Two customers at the same table place orders simultaneously → both succeed, no data corruption
- **Stock race condition**: Two customers try to order the last unit of a limited-stock item → exactly one succeeds, the other gets `OUT_OF_STOCK` error
- **Session expiry**: Use a session cookie older than 2 hours → `401`, redirect to expired-session page, not a crash
- **Menu cache invalidation**: Admin updates an item price → within 5 minutes (Redis TTL), customer menu must show new price
- **Disconnected Socket**: Close Socket.IO connection, perform order action, reconnect → events should either replay or be fetched on reconnect
- **Large menu**: Restaurant with 50+ items across 10 categories → all load within 3 seconds (check Performance timeline)

---

## Reporting Format

After completing all tests, generate a report file at `manual-tests/scanbite-test-report-<YYYY-MM-DD>.md` with this structure:

```
# ScanBite Test Report — <date>

## Summary
- Total scenarios tested: N
- Passed: N
- Failed: N
- Warnings (design/UX): N

---

## Results by Section

### 1. Authentication
**Scenario:** [Brief description]
**Steps Taken:** [Ordered list]
**Outcome:** PASS | FAIL | WARNING
**Evidence:** [URL, screenshot path, response body snippet]
**Issues Found:** [Describe bug, unexpected behaviour, or accessibility concern]

... (repeat for each scenario)

---

## Critical Failures
[List only P0 bugs — security issues, data corruption, payment errors, crashes]

## Design Violations
[List token/typography/animation rule violations with screenshot references]

## Recommendations
[Ordered by severity: Critical → High → Medium → Low]
```

## Final Steps
1. Save all screenshots to `manual-tests/screenshots/` with descriptive filenames.
2. Link each screenshot path in the relevant test result section.
3. Close all browser contexts opened during testing.
4. If any critical failure (security bypass, payment fraud, data corruption) is found, prepend a **CRITICAL** banner at the top of the report.
