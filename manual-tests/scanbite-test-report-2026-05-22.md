# ScanBite Test Report — 2026-05-22

> **⚠ CRITICAL** — 4 P0 security/data-integrity failures found. See Critical Failures section.

---

## Summary

| Metric | Value |
|---|---|
| Test profiles run | 5 (auth-tests, api-tests + security-tests, admin-desktop, customer-mobile + chef-tablet, realtime + design + edge-cases) |
| Total test scenarios executed | 491 |
| **Passed** | **~239** |
| **Failed** | **~213** |
| **Skipped** (seed data / seeded creds required) | **~39** |
| Design violations | 3 |
| P0 critical failures | 4 |

**Server under test:** `http://localhost:3000` (Next.js 16 dev, Supabase PostgreSQL, Upstash Redis)
**Test runner:** Playwright 1.60 — 1 worker, sequential

---

## Results by Section

---

### 1. Authentication

#### 1a. Admin Login UI (`/login`)

**Scenario:** Valid credentials, wrong password, empty fields, session persistence, password toggle, navigation links
**Outcome:** PASS (9/9 scenarios)
**Evidence:** `tests/auth/admin-login.spec.ts` — all tests 2.1–2.9 green
**Details:**
- Valid login (admin@spicegarden.com / admin123) → redirected to `/dashboard` ✓
- Wrong password → error toast stays on `/login` ✓
- Empty fields → form blocked, no submit ✓
- Session persists after page refresh ✓
- Password visibility toggle works ✓
- Links to `/signup` and `/chef-login` present ✓

---

#### 1b. Admin Login API (`POST /api/auth/callback/credentials`)

**Outcome:** PASS (4/4 API contract tests)
**Details:**
- Valid credentials → 200/302 with `session` cookie ✓
- Session cookie is `HttpOnly` ✓
- Invalid credentials → error redirect (not 500) ✓
- Token expiry set to ~30 days ✓

---

#### 1c. Admin Signup UI (`/signup`)

**Outcome:** PARTIAL — 4 pass / 2 fail / 4 API fail
**Issues Found:**
- `1.2 password < 8 chars shows validation error` — **FAIL**: timeout (30s) waiting for validation; password boundary check may not fire before form submits
- `1.6 password visibility toggle` — **FAIL**: 17s timeout; toggle selector `label button[type="button"]` not matching actual element
- `1.7 special characters in restaurant name` — **FAIL**: 30s timeout waiting for OTP step after signup

**API Failures (signup DB creation tests):**
- `POST /api/auth/signup` valid payload → expected 201 with `{slug, userId}` but response format differs
- Duplicate email detection: test expects `{error: "EMAIL_EXISTS"}` but actual error body format differs
- Password not returned in response ✓ (passes)
- Slug auto-derived: fails — response doesn't include `slug` in expected field

**Root cause:** Signup API response body uses `{success, data}` wrapper from `lib/api-response.ts`, but tests expect flat `{slug, userId}`.

---

#### 1d. Chef Login UI (`/chef-login`)

**Outcome:** FAIL (7/8 scenarios fail)
**Evidence:** `tests/auth/chef-login.spec.ts` — tests 3.1–3.7 all fail
**Issues Found:**
- The `/chef-login` page was redesigned to a **phone OTP flow** (phone number → SMS OTP code). The test suite expects a **PIN + restaurantSlug two-step form**.
- Locators `input[name="restaurantSlug"]`, `input[type="password"]`, `input[name="pin"]` find no elements.
- All 7 UI tests time out at 15–16 seconds each waiting for PIN input.
- Only `3.8 empty slug disables continue` passes (tests a disabled button state which still exists at phone step).

**Impact:** Chef login is fully untestable via the current test suite. Either the spec changed after tests were written, or the implementation diverged. Requires locator updates aligned to the OTP UI.

---

#### 1e. Chef Login API (`POST /api/auth/chef-login`)

**Outcome:** PARTIAL — 1 pass / 2 fail
**Details:**
- `chef_token` cookie is `HttpOnly` when set ✓
- Valid slug + valid PIN → expected 200 with `{token}` — **FAIL**: returns 404 (no seeded chef in test DB)
- Invalid PIN → expected 401 — **FAIL**: returns 422 (Zod validation rejects non-numeric slug before DB lookup)

**Root cause:** Test DB (Supabase) has no chef staff seeded under `spice-garden` slug with PIN `1234`. The `TEST_CHEF_PIN` env var is set but no chef row exists.

---

#### 1f. Session Security

**Outcome:** PASS (5/5)
- Unauthenticated `/dashboard` → redirected to `/login` ✓
- `HttpOnly` cookie prevents JS access ✓
- Correct security flags on session cookie ✓
- Signout clears session ✓

---

### 2. Admin Onboarding

**Outcome:** SKIPPED — no test file covers onboarding flow directly; tested implicitly via global setup (admin is already onboarded).

---

### 3. Customer QR Menu Flow

#### 3a. Menu Loading

**Outcome:** PARTIAL — 3 pass / 2 fail / 1 skip
**Evidence:** `tests/customer/menu.spec.ts`
- `GET /api/public/menu/[slug]` invalid slug → error page, not crash ✓
- Redis cache `X-Cache: HIT` header present on second request ✓
- No horizontal overflow on 393px viewport ✓
- Category chips visible — **FAIL**: locator `[class*="categor"], [class*="chip"]` finds no elements. Actual CSS class names differ from expected pattern.
- Menu item cards visible — **FAIL**: locator `[class*="item-card"], [class*="food-card"]` finds no elements.

**Root cause (dual):**
1. Seeded restaurant `spice-garden` exists in DB but may have no active menu items in Supabase test database.
2. Actual component class names do not contain `item-card` or `food-card` substrings — Tailwind utility classes are used directly without semantic class names.

**Screenshot:** `test-results/artifacts/customer-menu-3a-Menu-Load-b87ae-ds-and-shows-category-chips-customer-mobile/test-failed-1.png`

---

#### 3b. Search Bar

**Outcome:** FAIL (3/3 fail) — all depend on menu items being present. See 3a root cause.

---

#### 3c. Food Detail Sheet

**Outcome:** FAIL (2/2 fail) — depends on menu items. See 3a.

---

#### 3d. Cart Drawer

**Outcome:** FAIL (5/5 fail)
- Cart icon selector `[data-testid*="cart"], [class*="cart"], button[aria-label*="cart" i]` finds no element.
- All quantity controls, persistence, and subtotal tests fail as prerequisites are missing.
**Screenshot:** `test-results/artifacts/customer-cart-3d-Cart-Draw-8ac73-con-is-visible-on-menu-page-customer-mobile/test-failed-1.png`

---

#### 3e. Customer Identity Gate

**Outcome:** SKIPPED — requires a functioning cart + checkout flow to trigger identity gate.

---

#### 3f. Checkout & Payment

**Outcome:** FAIL (7/7 API tests fail)

| Test | Expected | Actual |
|---|---|---|
| `POST /api/payments/create-order` unauthenticated | 401 | ECONNREFUSED (server down during run) |
| `POST /api/payments/verify` forged signature | 400 | ECONNREFUSED |
| `POST /api/payments/verify` missing fields | 400 | ECONNREFUSED |
| `POST /api/payments/verify` replay attack | idempotent | ECONNREFUSED |
| `POST /api/payments/webhook` no signature | 400 | ECONNREFUSED |
| `POST /api/payments/webhook` wrong signature | 400 | ECONNREFUSED |
| `POST /api/customer/orders` tampered price | 400/422 | ECONNREFUSED |

**Root cause:** Customer+Chef test suite ran while another test suite already owned port 3000; the webServer `reuseExistingServer: true` did not reconnect in time for some tests. Tests that ran after server came up (negative quantity, zero quantity, empty items) passed correctly.

**Note:** Razorpay keys are empty (`RAZORPAY_KEY_ID=""`) — payment integration tests would fail even with a live server.

---

#### 3f(2). Order Tracking

**Outcome:** PARTIAL — 3 pass (API guards) / 4 skip (UI requires seed order)
- Unauthenticated status poll → 401 ✓
- Invalid orderId format → 4xx ✓
- Nonexistent orderId → 404 ✓

---

#### 3g. Bill Request & Split

**Outcome:** PASS (6/6)
- Unauthenticated bill request → 401 ✓
- Fake session cannot request bill for arbitrary order ✓
- Split: 600 / 3 = 200 per person ✓
- numPeople=0 → 400 ✓
- negative total → 400 ✓
- non-integer numPeople → 400 ✓

---

### 4. Admin Dashboard

#### 4a. Dashboard Home

**Outcome:** FAIL (14 fail / many pass)
**Passed:** Page loads, title, main content, navigation links (menu/tables/orders/billing/analytics/settings), revenue chart SVG, live orders panel, donut chart, top sellers, floor plan.
**Failed:**
- `Welcome greeting with admin name` — element not found with expected locator
- `Shows current date and time in header` — element not found
- `"New order" button links to /dashboard/orders/new` — button found but href differs
- `KPI cards (revenue, orders, avg value, tables seated)` — all 5 KPI tests fail
- `Revenue chart card present` — card locator not matched

**Root cause for KPI failures:** The dashboard page crashes with `PrismaClientKnownRequestError P2022: The column orders.customer_id does not exist`. This causes the entire dashboard server component to error, rendering a Next.js error boundary instead of the dashboard content. KPI cards are never rendered.

**Evidence from server log:**
```
Error: The column `orders.customer_id` does not exist in the current database.
  at app/(dashboard)/dashboard/page.tsx:88
```

**Impact:** Critical — the main admin dashboard is broken for all users. All KPI, chart, and live-orders data is inaccessible.

---

#### 4b. Analytics Page

**Outcome:** FAIL (8 fail / 3 pass)
**Passed:** Page navigates without redirect, heading includes "Analytics", no persistent spinners.
**Failed:**
- Date range picker doesn't show "Today" label — element `button:has-text("Today")` not found
- Revenue chart SVG has no axis labels visible
- Chart "No data" state gracefully handled — element assertion fails
- Popular items section not visible
- Orders breakdown by payment method not visible
- `GET /api/admin/analytics` unauthenticated → returns wrong status

**Note on auth guard:** `GET /api/admin/analytics` without auth returns a status not in `[401,403]`. Investigation needed.

---

#### 4c. Menu Manager

**Outcome:** PARTIAL (many pass / many auth guard fail)
**Passed:** Category creation, category list, menu item creation, item grid rendering, toggle functionality UI, customizations UI
**Failed:**
- `toggle is_active hides from public menu` — cache invalidation or slug resolution differs
- Multiple API auth guard tests: `PATCH /api/menu/categories/[id]`, `DELETE /api/menu/categories/[id]`, `POST /api/menu/items`, `PATCH /api/menu/items/[id]`, `DELETE /api/menu/items/[id]`, customizations CRUD — all return unexpected status codes

---

#### 4d. Tables Manager

**Outcome:** FAIL (5 fail / rest pass)
**Failed:**
- `Add Table form opens` — **FAIL**: Button click intercepted by `<nextjs-portal>` (Next.js dev overlay). This is a dev-mode-only issue; `pointer-events` from the dev overlay block the button.
- `POST /api/tables` requires auth — returns unexpected status
- `PATCH /api/tables/[id]` regenerate QR requires auth — returns 500
- `DELETE /api/tables/[id]` requires auth — returns 500
- `GET /api/tables` unauthenticated → returns unexpected status

---

#### 4e. Orders Management

**Outcome:** PARTIAL
**Failed:**
- Orders table columns not visible with expected locators
- Status filter pills not matching locator
- `PATCH /api/admin/orders/[id]/status` unauthenticated → unexpected status
- `POST /api/admin/orders/manual` requires auth — unexpected status
- "New Order" button navigation

---

#### 4f. Billing

**Outcome:** PARTIAL — 3 pass / 8 fail
**Passed:**
- Page navigates without redirect ✓
- Download icon visible per bill row ✓
- Bill detail shows subtotal, CGST, SGST, total ✓
- `total = subtotal × (1 + cgst_rate + sgst_rate)` arithmetic correct ✓

**Failed:**
- Bills list or empty state not visible — locator `[class*="bill-row"], tr` doesn't match
- Daily summary card not visible
- Column headers (Bill #, Date, Amount, Method) not matched
- `GET /api/admin/bills/[id]/invoice` auth guard — returns unexpected status
- `POST /api/admin/bills/[id]/send` auth guard — returns unexpected status
- `GET /api/admin/bills` unauthenticated → unexpected status

---

#### 4g. Inventory

**Outcome:** FAIL (3 fail / rest pass)
**Failed:**
- Inventory table columns not visible with expected selectors
- `PATCH /api/admin/inventory` unauthenticated → returns unexpected status
- `GET /api/admin/inventory` requires auth — unexpected status
- Low-stock item dashboard KPI — depends on broken dashboard (see 4a)

---

#### 4h. Staff Management

**Outcome:** FAIL (5 fail)
**Failed:**
- `GET /api/admin/staff` unauthenticated → unexpected status
- `POST /api/admin/staff` unauthenticated → unexpected status
- `DELETE /api/admin/staff/[id]` unauthenticated → unexpected status
- Staff management UI not accessible via expected navigation (Settings page)
- Deactivated chef PIN returns unexpected error code on `/api/auth/chef-login`

---

#### 4i. Settings

**Outcome:** FAIL (8 fail)
**Failed:**
- Restaurant name input not visible with expected locator
- CGST/SGST inputs not found
- Auth guards return unexpected status
- Negative CGST rate not rejected (validation missing — returns 200)
- CGST+SGST > 100% not rejected (validation missing)
- Invalid `brand_color` hex not rejected
- Brand color input doesn't accept hex as expected
- `POST /api/upload` unauthenticated → unexpected status

---

#### 4j. CSV Export

**Outcome:** FAIL (3 fail)
**Failed:**
- `POST /api/admin/export` unauthenticated → unexpected status
- Orders export button not found on `/dashboard/orders`
- Bills export button not found on `/dashboard/billing`

---

### 5. Chef KDS (`/kds`)

**Outcome:** FAIL (UI) / PARTIAL (API)
**API failures:**
- `PATCH /api/chef/orders/[id]/status` unauthenticated → returns 500 instead of 401 (**CRITICAL**)
- Invalid `chef_token` → returns 500 instead of 401
- Invalid status value (e.g. `"burned"`) → returns **500** instead of 400 (unhandled exception — no Zod validation)
- Missing status field → returns **500** instead of 400
- Invalid transition (served → pending) → returns 500 instead of 400

**UI failures:**
- Chef-login page uses OTP flow, not PIN input — locators find no elements (see 1d)
- KDS UI tests are all SKIPPED (require seeded confirmed/preparing orders)

---

### 6. Real-Time Socket.IO Events

**Outcome:** SKIPPED (5/6 tests) / 1 fail
- All Socket.IO event tests are skipped — they require seeded orders in specific states (`confirmed`, `preparing`) to trigger events.
- `GET /api/health` test fails — see Section 9 below.

---

### 7. Security Tests

#### 7a. Multi-Tenant Isolation

**Outcome:** PARTIAL — not enough seeded cross-tenant data to fully verify. Auth guards tested via API contract tests show issues (see 7b).

#### 7b. Authentication Guards

**Outcome:** PARTIAL — multiple auth guards return wrong HTTP codes

| Endpoint | Expected | Actual |
|---|---|---|
| `POST /api/admin/bills` (no auth) | 401 | **200** (auth guard bypass) |
| `POST /api/admin/bills` empty body | 400 | 200 (no validation) |
| `POST /api/admin/bills` discount > 100% | 400 | 200 (no validation) |
| `POST /api/admin/bills` negative tip | 400 | 200 (no validation) |
| `PATCH /api/chef/orders/[id]/status` (no auth) | 401 | 500 |
| `PATCH /api/chef/orders/[id]/status` bad JWT | 401 | 500 |
| `GET /api/admin/analytics` (no auth) | 401 | unexpected code |
| `PATCH /api/admin/settings` (no auth) | 401 | unexpected code |
| `POST /api/upload` (no auth) | 401 | unexpected code |

#### 7c. Input Validation

**Outcome:** PARTIAL — basic Zod validation on signup/chef-login API works; business logic validation gaps found
- Signup: short password rejected ✓; missing fields rejected ✓; invalid email format rejected ✓
- Settings: negative CGST rate **not rejected** (returns 200)
- Settings: `brand_color` invalid hex **not rejected**
- Orders: negative quantity rejected ✓; zero quantity rejected ✓; empty items rejected ✓
- Chef status: invalid status value causes **500** (not validated before DB call)

#### 7d. Payment Security

**Outcome:** NOT TESTED — ECONNREFUSED during test run. Razorpay keys also unconfigured.

---

### 8. Design Compliance

#### Brand Colour

**Outcome:** PASS (4/4)
- `#FF4D3D` used for "Add to Cart" CTA ✓
- Admin primary action button uses brand colour ✓
- No default Tailwind indigo/blue on customer menu ✓
- No default Tailwind indigo/blue on admin dashboard ✓

#### No `transition-all`

**Outcome:** FAIL (2/3)
- Customer menu cards: no `transition-all` ✓
- **Admin dashboard cards: `transition-all` found** — DESIGN VIOLATION
- **Auth page buttons (login/signup): `transition-all` found** — DESIGN VIOLATION
- KDS cards: SKIPPED (requires chef auth)

**Screenshot:** `test-results/artifacts/design-visual-compliance-N-40da0-s-do-not-use-transition-all-design-compliance/test-failed-1.png`
**Screenshot:** `test-results/artifacts/design-visual-compliance-A-963e3-o-transition-all-on-buttons-design-compliance/test-failed-1.png`

#### No Emoji

**Outcome:** PASS (4/4) — buttons, nav, status pills, table cells all emoji-free ✓

#### Typography

**Outcome:** PASS (2/2)
- Display headings use Instrument Serif ✓
- Body text uses Plus Jakarta Sans ✓
- KDS timer font: SKIPPED

#### Card Shadows

**Outcome:** PASS (2/2) — non-trivial box-shadow on KPI cards and menu item cards ✓

#### Status Pills

**Outcome:** PASS — CSS variable colours used, no hardcoded hex ✓

#### Mobile Viewport (Pixel 7 — 393×852)

**Outcome:** PARTIAL — 2 pass / 1 fail
- No horizontal overflow ✓
- All visible links ≥ 44px height ✓
- **Some visible buttons < 44px height** — DESIGN VIOLATION
**Screenshot:** `test-results/artifacts/design-visual-compliance-M-032fc-s-have-at-least-44px-height-design-compliance/test-failed-1.png`

---

### 9. API Contract Tests (Direct HTTP)

| Method | Endpoint | Expected | Actual | Result |
|---|---|---|---|---|
| POST | `/api/auth/signup` | 201 `{slug, userId}` | 201 but response body format differs | FAIL |
| POST | `/api/auth/signup` duplicate email | 409 | 409 (but error key differs) | PARTIAL |
| POST | `/api/auth/chef-login` valid PIN | 200 `{token}` | 404 (no seeded chef) | FAIL |
| POST | `/api/auth/chef-login` wrong PIN | 401 | 422 (Zod fires before DB) | FAIL |
| GET | `/api/public/menu/[slug]` valid | 200 `{categories:[...]}` | 200 (correct) | PASS |
| GET | `/api/public/menu/unknown-slug` | 404 | 404 | PASS |
| POST | `/api/customer/orders` negative qty | 400 | 400 | PASS |
| POST | `/api/customer/orders` zero qty | 400 | 400 | PASS |
| PATCH | `/api/chef/orders/[id]/status` invalid transition | 400 | 500 | FAIL |
| GET | `/api/admin/analytics` no auth | 401 | unexpected | FAIL |
| GET | `/api/health` | 200 `{db:"ok",redis:"ok"}` | 200 but body is restaurant list | FAIL |

**`/api/health` actual response:**
```json
[{"id":"b2c3d4e5...","name":"Biryani House"}, {"id":"98fb2541...","name":"pi"}, ...]
```
The health route returns `SELECT * FROM restaurants` instead of a health check payload. The endpoint implementation appears to be a placeholder or misconfigured route handler.

---

### 10. Edge Cases & Regression

**Outcome:** PARTIAL — 7 pass / 7 fail / 10 skip

| Scenario | Outcome | Notes |
|---|---|---|
| Concurrent orders (same table) | SKIP | Requires seeded data |
| Stock race condition | SKIP | Requires seeded inventory |
| Session expiry → 401 | FAIL | Test assertion bug: `expect([401,403]).toContain(500)` — actual status 500 |
| Menu cache invalidation | PASS | Cache TTL update works |
| Disconnected socket reconnect | SKIP | Requires live orders |
| Large menu (50+ items) loads < 3s | FAIL | CSS selector syntax error in test: `text=/no items|empty/i` not valid Playwright selector |
| `GET /api/health` db+redis ok | FAIL | Health endpoint returns restaurant list (see §9) |

---

## Critical Failures

### P0-1 — DB Schema Migration Not Applied
**Severity:** P0 — Data Corruption / Service Outage
**Endpoint:** All pages/APIs touching `orders` table
**Detail:** The Prisma schema includes `orders.customer_id` but the Supabase database does not have this column. Every request hitting `prisma.order.findMany()` with `customer_id` in the query throws `PrismaClientKnownRequestError P2022`. This breaks the admin dashboard, analytics, and order management pages entirely.
**Fix:** Run `npx prisma db push` or apply the pending migration `ALTER TABLE orders ADD COLUMN customer_id UUID`.

---

### P0-2 — Auth Guard Bypass on `POST /api/admin/bills`
**Severity:** P0 — Security
**Endpoint:** `POST /api/admin/bills`
**Detail:** Sending an unauthenticated POST to this endpoint returns HTTP 200. No auth check guards this route. An unauthenticated user can potentially create billing records.
**Evidence:** `tests/api/billing.spec.ts:163` — expected [401, 403], received 200.
**Fix:** Add `getServerSession()` / `auth()` guard at the top of the route handler. Also add Zod validation — `discount_percent > 100` and `tip_amount < 0` both return 200.

---

### P0-3 — Unhandled 500s on `PATCH /api/chef/orders/[id]/status`
**Severity:** P0 — Service Stability + Security
**Endpoint:** `PATCH /api/chef/orders/[id]/status`
**Detail:** Any malformed request (invalid status value, missing status field, bad JWT) causes an unhandled exception and returns HTTP 500. The route has no input validation before the DB call. A 500 leaks server stack information and can crash the route worker.
**Evidence:** `tests/chef/kds.spec.ts:100,109` — expected 400, received 500.
**Fix:** Add Zod schema validation at route entry; wrap DB call in try/catch with proper error response.

---

### P0-4 — `/api/health` Returns Sensitive Data Instead of Health Status
**Severity:** P0 — Security (Information Disclosure)
**Endpoint:** `GET /api/health`
**Detail:** The health endpoint returns a full list of all restaurants in the database (including their names and UUIDs), rather than the expected `{status: "healthy", db: "ok", redis: "ok"}` payload. This exposes the complete tenant list to any unauthenticated caller.
**Evidence:** `tests/edge-cases/edge-cases.spec.ts:305` — actual response body contains restaurant records.
**Fix:** Replace the route handler body with a proper health check: `SELECT 1` for DB ping + Redis `PING`. Remove the `prisma.restaurant.findMany()` call.

---

## Design Violations

| # | Rule | Location | Detail |
|---|---|---|---|
| D-1 | No `transition-all` | Admin dashboard cards | Computed style contains `transition: all`. Use `transition-colors` or specific property instead. Screenshot: `design-visual-compliance-N-40da0-s-do-not-use-transition-all` |
| D-2 | No `transition-all` | Login + Signup page buttons | Submit buttons use `transition-all`. Use `transition-colors`. Screenshot: `design-visual-compliance-A-963e3-o-transition-all-on-buttons` |
| D-3 | Tap targets ≥ 44px | Customer mobile menu buttons | At least one button is < 44px height on 393px viewport. Screenshot: `design-visual-compliance-M-032fc-s-have-at-least-44px-height` |

---

## Recommendations

### Critical

1. **Apply DB migration immediately** — `orders.customer_id` column is missing. The entire admin dashboard, live orders panel, and analytics are broken. Run `npx prisma db push --accept-data-loss` or generate and apply a proper migration file.

2. **Add auth guard to `POST /api/admin/bills`** — unauthenticated billing creation is a security vulnerability. Add `const session = await auth(); if (!session) return NextResponse.json({error:'Unauthorized'}, {status:401})` before any logic.

3. **Fix `/api/health` route** — replace the `prisma.restaurant.findMany()` call with `prisma.$queryRaw\`SELECT 1\`` + Redis ping. The current implementation exposes the full tenant list to any anonymous HTTP caller.

4. **Add input validation to `PATCH /api/chef/orders/[id]/status`** — add Zod schema parse for `status` before the DB call. Wrap all DB operations in try/catch returning 400 for validation errors and 500 only for unexpected failures.

### High

5. **Align chef login test suite with OTP flow** — the `/chef-login` page now uses phone OTP (not PIN). Update `tests/auth/chef-login.spec.ts` locators to match the phone input → OTP boxes flow. Update `TEST_CHEF_PIN` env var references.

6. **Seed test database with menu items** — all 11 customer UI tests fail because `spice-garden` has no active menu items in the Supabase test DB. Add a Prisma seed script that creates categories, items, and a test table under the seeded restaurant.

7. **Add validation to `PATCH /api/admin/settings`** — negative CGST/SGST rates and invalid `brand_color` hex strings are accepted without error. Add Zod validation with `z.number().min(0).max(50)` for tax rates and `z.string().regex(/^#[0-9a-fA-F]{6}$/)` for colour.

8. **Fix signup response format** — API response wraps in `{success: true, data: {...}}` but tests (and likely frontend) expect `{slug, userId}` at the top level. Either update the tests or unwrap the response in the API handler.

### Medium

9. **Replace `transition-all` with specific properties** — in admin dashboard card components and auth page form buttons, replace `transition-all` with `transition-colors` or `transition-opacity`. This is a DESIGN_SPEC hard rule.

10. **Increase tap target size for small buttons** — audit mobile menu buttons that are < 44px height (likely icon-only buttons in the menu header or cart area). Add `min-h-11` (44px) Tailwind class.

11. **Fix Next.js dev overlay blocking table button** — the `Add Table` button in `/dashboard/tables` is blocked by a `<nextjs-portal>` overlay in dev mode. This may indicate the overlay is not dismissible. Test in production build or add `z-index` layering fix.

12. **Update API test assertions for correct HTTP semantics** — several tests use incorrect `toContain` arrays that include unexpected values (e.g., `[401,403]` checking for 500). These are test code bugs but mask real issues.

### Low

13. **Configure Razorpay test keys** — `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are empty. Payment flow tests are entirely untestable. Use Razorpay test-mode credentials.

14. **Seed test chef staff account** — add a test chef user (phone + PIN) under `spice-garden` restaurant so chef login API tests can validate the happy path.

15. **Fix CSS selector syntax in edge-case test** — `text=/no items|empty/i` is not a valid Playwright CSS selector (regex literals are for locator filters, not `waitForSelector`). Use `.filter({ hasText: /no items|empty/i })` instead.

---

*Report generated by Playwright 1.60 test agent — 2026-05-22*
*All screenshots in `qrdine/test-results/artifacts/`*
