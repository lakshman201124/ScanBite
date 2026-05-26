# QR Dine — PHASE 1: Foundation

> **Goal:** A running Next.js app with auth (admin + chef + customer), multi-tenant DB, and admin dashboard shell. Zero UI polish — just working bones.
> **Timeline:** Weeks 1–2
> **Brand Scout:** NOT required (no customer-facing UI in this phase)

---

## Pre-Conditions

```
Human has completed:
  ✓ create-next-app setup with TypeScript + Tailwind + App Router
  ✓ Supabase project created with connection string
  ✓ Upstash Redis project created
  ✓ .env.local populated with all keys
  ✓ Git repo initialized
```

---

## Task Breakdown (Dependency Order)

### TASK 1.1 — Project Configuration
**Type:** Setup · **Agent:** UI Developer · **Size:** Small

```
FILES TO CREATE:
  tsconfig.json          → strict mode, path aliases (@/)
  tailwind.config.ts     → extend with QR Dine default colors (overridden by brand later)
  next.config.mjs        → images (Cloudinary domain), security headers
  .env.example           → all required env keys (no values)
  src/lib/env.ts         → Zod schema validating all env vars at build time
  src/types/index.ts     → shared TypeScript types (User, Restaurant, Order, etc.)

ACCEPTANCE:
  □ pnpm dev starts without errors
  □ pnpm build completes with zero TS errors
  □ Missing env var → build fails with clear error message
```

### TASK 1.2 — Prisma Schema + First Migration
**Type:** Database · **Agent:** UI Developer · **Size:** Large

```
FILES TO CREATE:
  prisma/schema.prisma   → Full schema from reference doc:
                            restaurants, users, restaurant_tables,
                            menu_categories, menu_items, item_customizations,
                            customer_sessions, orders, order_items, bills,
                            loyalty_accounts, loyalty_transactions, game_sessions

SCHEMA RULES:
  - Every table has restaurant_id (except restaurants itself)
  - Every table has created_at TIMESTAMPTZ DEFAULT NOW()
  - UUID primary keys everywhere
  - All foreign keys with ON DELETE CASCADE where applicable
  - All indexes from reference doc applied
  - Prisma enums for: UserRole, OrderStatus, PaymentStatus, FoodType, PlanType

MIGRATION:
  → Human runs: npx prisma migrate dev --name init
  → Human runs: npx prisma generate
  → Human verifies: npx prisma studio opens and shows all tables

ACCEPTANCE:
  □ npx prisma migrate dev succeeds
  □ npx prisma studio shows all tables with correct columns
  □ restaurant_id column exists on every table (except restaurants)
  □ All indexes created (verify in Supabase SQL editor)
```

### TASK 1.3 — Multi-Tenant Utilities
**Type:** Backend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/lib/db.ts                → Prisma client singleton (connection pooling)
  src/lib/tenant.ts            → tenantScope(restaurantId) helper
                                  Returns { where: { restaurant_id: restaurantId } }
                                  Throws TenantError if restaurantId is null/undefined
  src/lib/errors.ts            → Custom error classes (TenantError, AuthError, ValidationError)
  src/lib/api-response.ts      → Standard API response helpers:
                                  success(data, status?)
                                  error(message, status)
                                  validationError(zodErrors)

TENANT SCOPE USAGE PATTERN:
  // Every DB query MUST use this:
  const menu = await prisma.menuItem.findMany({
    ...tenantScope(restaurantId),
    where: { ...tenantScope(restaurantId).where, is_available: true }
  })

ACCEPTANCE:
  □ tenantScope(null) throws TenantError
  □ tenantScope('uuid') returns correct where clause
  □ API response helpers return proper JSON shapes
```

### TASK 1.4 — Admin Auth (NextAuth v5)
**Type:** Auth · **Agent:** UI Developer · **Size:** Large

```
FILES TO CREATE:
  src/lib/auth.ts              → NextAuth v5 config:
                                  - CredentialsProvider (email + password)
                                  - JWT strategy (30-day expiry)
                                  - JWT callback: inject { userId, restaurantId, role, plan }
                                  - Session callback: expose same fields
  src/app/api/auth/[...nextauth]/route.ts
  src/app/(auth)/login/page.tsx  → Admin login form
  src/app/(auth)/signup/page.tsx → Restaurant registration form

AUTH FLOW:
  1. Admin enters email + password at /login
  2. CredentialsProvider verifies against users table (bcrypt compare)
  3. JWT minted with { userId, restaurantId, role: 'admin', plan }
  4. JWT stored in httpOnly cookie (30 days)
  5. Every /dashboard/* request → middleware extracts JWT → injects restaurant context

SIGNUP FLOW:
  1. Admin enters: restaurant name, email, password, phone
  2. Create restaurants row → get restaurant_id
  3. Create users row with hashed password + restaurant_id + role='admin'
  4. Auto-login → redirect to /dashboard
  5. Default plan: 'starter'

ACCEPTANCE:
  □ /login renders a form (email + password + submit)
  □ /signup renders a form (restaurant name, email, password, phone)
  □ Valid credentials → redirect to /dashboard
  □ Invalid credentials → error message shown
  □ JWT contains restaurantId + role + plan
  □ /dashboard without login → redirect to /login
```

### TASK 1.5 — Chef PIN Auth
**Type:** Auth · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/app/api/auth/chef-login/route.ts   → POST: validate PIN, return JWT
  src/app/(auth)/chef-login/page.tsx     → PIN entry screen (4-6 digits)

FLOW:
  1. Chef navigates to /chef-login
  2. Enters 4-6 digit PIN
  3. API hashes input → compares against users table (role='chef', same restaurant)
  4. JWT minted: { userId, restaurantId, role: 'chef' } (8-hour expiry)
  5. Redirect to /kds

NOTE: Chef users are created by the admin in the dashboard (Phase 2 enhancement).
      For Phase 1, seed a test chef user via Prisma seed script.

ACCEPTANCE:
  □ /chef-login renders PIN input (numeric keypad style)
  □ Correct PIN → redirect to /kds (blank page for now)
  □ Wrong PIN → error message
  □ JWT expires in 8 hours
  □ Chef cannot access /dashboard routes
```

### TASK 1.6 — Customer Anonymous Session
**Type:** Auth · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/lib/session.ts                      → createCustomerSession(restaurantId, tableId)
                                            Returns session_token (UUID)
                                            Stores in customer_sessions table + Redis
  src/app/api/session/create/route.ts     → POST: create session on QR scan
  src/middleware.ts                        → Route-based auth:
                                            /dashboard/* → require admin JWT
                                            /kds/*       → require chef JWT
                                            /m/*         → create/validate customer session
                                            /api/*       → role-based per route

SESSION FLOW:
  1. Customer scans QR → browser opens /m/[slug]?t=[qrToken]
  2. Middleware intercepts → validates qrToken against restaurant_tables
  3. Creates customer_sessions row (restaurant_id, table_id, session_token, 2hr expiry)
  4. Sets httpOnly cookie with session_token
  5. Customer can now browse menu and place orders (Phase 2)

ACCEPTANCE:
  □ GET /m/test-restaurant?t=valid-token → creates session + renders page
  □ GET /m/test-restaurant?t=invalid-token → error page ("Invalid QR code")
  □ Session cookie is httpOnly, secure, SameSite=Lax
  □ Session expires after 2 hours
  □ Session stored in both Postgres + Redis (Redis for fast lookup)
```

### TASK 1.7 — Next.js Middleware (Route Protection)
**Type:** Auth · **Agent:** UI Developer · **Size:** Medium

```
FILE: src/middleware.ts

ROUTE MAP:
  /dashboard/*    → Admin JWT required. Extract restaurantId, inject into headers.
  /kds/*          → Chef JWT required. Extract restaurantId, inject into headers.
  /m/*            → Customer session. Validate qrToken or existing session cookie.
  /api/admin/*    → Admin JWT required.
  /api/chef/*     → Chef JWT required.
  /api/customer/* → Customer session required.
  /api/public/*   → No auth (menu fetch, health check).
  /login          → Public (redirect to /dashboard if already logged in)
  /chef-login     → Public (redirect to /kds if already logged in)

TENANT INJECTION:
  After auth check, middleware adds x-restaurant-id header to the request.
  Every API route reads restaurantId from this header — never from user input.

ACCEPTANCE:
  □ Unauthenticated /dashboard → redirect to /login
  □ Unauthenticated /kds → redirect to /chef-login
  □ Admin accessing /kds → redirect to /dashboard (wrong role)
  □ Chef accessing /dashboard → redirect to /kds (wrong role)
  □ x-restaurant-id header present on all protected API calls
  □ No protected route accessible without valid JWT/session
```

### TASK 1.8 — Admin Dashboard Shell
**Type:** Frontend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/app/(dashboard)/layout.tsx       → Sidebar + header + content area
  src/app/(dashboard)/dashboard/page.tsx → Empty dashboard home (placeholder cards)
  src/components/layout/Sidebar.tsx     → Navigation: Dashboard, Menu, Tables, Orders,
                                          Billing, Analytics, Settings
  src/components/layout/Header.tsx      → Restaurant name, admin avatar, logout
  src/components/layout/MobileNav.tsx   → Bottom nav for mobile admin

LAYOUT:
  Desktop: 250px sidebar (fixed) + main content area
  Tablet: collapsible sidebar (hamburger toggle)
  Mobile: bottom nav (5 icons) + full-width content

SIDEBAR ITEMS:
  Dashboard  → /dashboard          (Phase 1: placeholder)
  Menu       → /dashboard/menu     (Phase 2)
  Tables     → /dashboard/tables   (Phase 2)
  Orders     → /dashboard/orders   (Phase 3)
  Billing    → /dashboard/billing  (Phase 4)
  Analytics  → /dashboard/analytics (Phase 5)
  Settings   → /dashboard/settings (Phase 1: basic)

NOTE: This phase uses default Tailwind styling. Brand Scout runs before Phase 2
      and will update all design tokens.

ACCEPTANCE:
  □ /dashboard renders sidebar + header + empty content
  □ Sidebar links navigate to correct routes (most show "Coming Soon")
  □ Mobile: bottom nav renders with icons
  □ Restaurant name shown in header (from JWT)
  □ Logout button works (clears JWT, redirects to /login)
  □ Layout is responsive (test 375px, 768px, 1280px)
```

### TASK 1.9 — Restaurant Onboarding (Basic)
**Type:** Backend + Frontend · **Agent:** UI Developer · **Size:** Medium

```
WHAT THIS IS:
  After signup, admin sees a setup wizard (Phase 1 = basic version):
    Step 1: Restaurant name + type (set during signup)
    Step 2: Upload logo (placeholder — Cloudinary in Phase 2)
    Step 3: Set address + GSTIN (optional for starter plan)
    Step 4: Auto-select Starter plan
    → Redirect to dashboard

FILES:
  src/app/(dashboard)/onboarding/page.tsx     → Multi-step form
  src/app/api/restaurant/setup/route.ts       → PATCH: update restaurant profile
  src/lib/validations/restaurant.ts           → Zod schemas for restaurant fields

ACCEPTANCE:
  □ New signup → redirect to /onboarding (not dashboard)
  □ Completing onboarding → redirect to /dashboard
  □ Restaurant profile updated in DB
  □ Returning admin (already onboarded) → skip to /dashboard
```

### TASK 1.10 — Seed Script + Dev Utilities
**Type:** Dev tooling · **Agent:** UI Developer · **Size:** Small

```
FILES TO CREATE:
  prisma/seed.ts → Seeds:
    - 2 test restaurants (different slugs, names, plans)
    - 1 admin user per restaurant
    - 1 chef user per restaurant (with PIN)
    - 3 tables per restaurant (with QR tokens)
    - 3 menu categories per restaurant
    - 5 menu items per category (with prices, food_type, images)

  src/lib/dev-utils.ts → Development helpers:
    - logTenant(context) — logs current restaurant context
    - assertTenant(restaurantId) — throws in dev if missing

UPDATE package.json:
  "prisma": { "seed": "ts-node prisma/seed.ts" }

ACCEPTANCE:
  □ npx prisma db seed populates all test data
  □ Can login as admin for Restaurant A and Restaurant B
  □ Restaurant A admin sees ONLY Restaurant A data
  □ Restaurant B admin sees ONLY Restaurant B data
  □ Chef PIN login works for both restaurants
```

---

## Phase 1 Completion Checklist

```
HUMAN VERIFICATION:
  □ pnpm dev — app starts, no errors
  □ pnpm build — zero TypeScript errors
  □ /login — renders, valid creds → dashboard, invalid → error
  □ /signup — creates restaurant + admin user
  □ /dashboard — shows sidebar, header, empty content
  □ /chef-login — PIN entry works, redirects to /kds
  □ /m/test-slug?t=valid-token — creates session (blank menu page OK)
  □ /m/test-slug?t=bad-token — error page
  □ Prisma Studio: 2 restaurants, 2 admins, 2 chefs, 6 tables, data isolated
  □ Admin A cannot see Admin B's restaurant data
  □ Console: zero errors, zero warnings
  □ Git: tag pre-phase-2, commit "Phase 1 complete"
```

---

## Use Cases Verified

| # | Actor | Action | Expected Result |
|---|---|---|---|
| 1 | New restaurant owner | Signs up with email + password | Restaurant + admin user created, redirected to onboarding |
| 2 | Returning admin | Logs in | Sees dashboard with own restaurant name |
| 3 | Admin | Clicks sidebar links | Pages navigate correctly (most are empty) |
| 4 | Admin | Logs out | Session cleared, redirected to /login |
| 5 | Chef | Enters correct PIN | Redirected to /kds |
| 6 | Chef | Enters wrong PIN | Error message, stays on /chef-login |
| 7 | Chef | Tries /dashboard | Redirected away (wrong role) |
| 8 | Customer | Scans valid QR | Session created, menu page loads (empty) |
| 9 | Customer | Scans invalid QR | Error page, no data leaked |
| 10 | Customer | Session expires | Prompt to re-scan QR |
| 11 | Attacker | Calls /api/admin/* without JWT | 401 Unauthorized |
| 12 | Admin A | Tries to fetch Restaurant B data | 403 Forbidden |

---

*Phase 1 = the skeleton. If multi-tenancy is broken here, everything built on top is broken. Get this right.*
