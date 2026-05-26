# QR Dine — PHASE 5: Analytics, SaaS Plans, Polish + Deploy

> **Goal:** Admin analytics dashboard, SaaS plan enforcement, restaurant onboarding wizard, performance audit (Lighthouse 90+), security hardening, and production deployment with monitoring.
> **Timeline:** Week 7-8
> **Brand Scout:** Not required (uses existing design tokens).

---

## Pre-Conditions

```
Phase 4 complete:
  ✓ Full order → bill → payment cycle working
  ✓ Thermal printing operational
  ✓ Digital invoices generating
  ✓ All three user flows functional end-to-end

Human provides:
  □ Vercel account (for production deploy)
  □ Sentry DSN (for error monitoring)
  □ PostHog project key (for product analytics) — optional
  □ Custom domain (qrdine.app or similar) — optional for initial deploy
  □ Razorpay LIVE mode keys (when ready for real payments)
```

---

## Task Breakdown

### TASK 5.1 — Admin Analytics Dashboard
**Type:** Full-stack · **Agent:** UI Developer · **Size:** Large

```
FILES TO CREATE:
  src/app/(dashboard)/dashboard/analytics/page.tsx     → Analytics page
  src/app/api/admin/analytics/route.ts                  → GET: analytics data
  src/components/analytics/RevenueChart.tsx              → Line/bar chart (Recharts)
  src/components/analytics/OrdersChart.tsx               → Orders over time
  src/components/analytics/PopularItems.tsx              → Top selling items list
  src/components/analytics/SummaryCards.tsx              → KPI cards (revenue, orders, avg)
  src/components/analytics/PeakHours.tsx                 → Heatmap of busy hours
  src/components/analytics/DateRangePicker.tsx            → Date range selector

DASHBOARD LAYOUT:
  Top row: 4 KPI cards
    - Total Revenue (₹) for period
    - Total Orders for period
    - Average Order Value (₹)
    - Unique Customers (sessions) for period

  Second row: Revenue chart
    - Line chart: daily revenue over selected period
    - Toggle: daily / weekly / monthly aggregation

  Third row: two columns
    Left: Top 10 Popular Items (bar chart + list)
    Right: Peak Hours heatmap (hour × day of week)

  Bottom row:
    - Orders by Status (pie chart: completed / cancelled)
    - Payment Method breakdown (UPI / Card / Cash pie chart)

DATE RANGES:
  Quick selects: Today, Last 7 Days, Last 30 Days, This Month, Custom
  Default: Last 7 Days

API QUERIES:
  All analytics queries use READ REPLICA or separate connection
  (don't slow down the main DB with analytics aggregations)
  
  Queries scoped to restaurant_id + date range:
    SELECT DATE(created_at) as day, SUM(total_amount) as revenue
    FROM orders WHERE restaurant_id = $1 AND created_at BETWEEN $2 AND $3
    GROUP BY day ORDER BY day

CACHING:
  Analytics for past days (not today) → cache in Redis for 1 hour
  Today's data → always fresh (no cache)

ACCEPTANCE:
  □ KPI cards show correct numbers
  □ Revenue chart renders correctly for 7-day / 30-day range
  □ Popular items matches actual order data
  □ Peak hours heatmap renders
  □ Date range picker works (quick select + custom)
  □ Data matches what's in the DB (cross-verify with Prisma Studio)
  □ Loading states (skeletons) while fetching
  □ Empty state: "No data for this period"
  □ Multi-tenant: only own restaurant's data
```

### TASK 5.2 — CSV/PDF Export
**Type:** Backend · **Agent:** UI Developer · **Size:** Small

```
FILES TO CREATE:
  src/app/api/admin/export/orders/route.ts     → GET: orders CSV
  src/app/api/admin/export/bills/route.ts      → GET: bills CSV
  src/app/api/admin/export/analytics/route.ts  → GET: analytics summary PDF
  src/lib/export.ts                             → CSV + PDF generation helpers

CSV FORMAT:
  Orders CSV: order_number, date, table, items_count, subtotal, tax, total, payment_method, status
  Bills CSV: bill_number, date, table, subtotal, cgst, sgst, total, payment_method

PDF REPORT:
  Monthly summary PDF:
    - Restaurant header
    - Period: "May 2026"
    - Total revenue, total orders, avg order value
    - Top 10 items table
    - Daily breakdown table
    - GST summary (total CGST, total SGST)

ACCEPTANCE:
  □ CSV downloads with correct headers and data
  □ CSV works in Excel/Google Sheets
  □ PDF report generates with correct data
  □ Date range filtering on exports
  □ Multi-tenant: only own restaurant's data exported
```

### TASK 5.3 — Inventory Management (Basic)
**Type:** Full-stack · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/app/(dashboard)/dashboard/inventory/page.tsx     → Inventory page
  src/app/api/admin/inventory/route.ts                  → GET + PATCH
  src/components/inventory/InventoryTable.tsx            → Editable stock table
  src/components/inventory/LowStockAlert.tsx             → Alert banner

INVENTORY MODEL:
  Add to menu_items table:
    stock_quantity    INTEGER DEFAULT NULL  (NULL = unlimited/not tracked)
    low_stock_threshold INTEGER DEFAULT 10

  Manual tracking only (Phase 5 = basic):
    Admin sets stock count per item
    Auto-decrements on order (if tracking enabled)
    Low stock alert when quantity ≤ threshold

INVENTORY PAGE:
  Table: item name, category, current stock, threshold, status
  Status: In Stock (green), Low (amber), Out (red)
  Inline edit: click stock number → edit → save
  Bulk update: select multiple → set stock

LOW STOCK ALERTS:
  Dashboard home: "Low Stock" banner if any items below threshold
  Auto-mark item as unavailable when stock = 0
  Notification on admin dashboard when item hits threshold

ACCEPTANCE:
  □ Inventory table shows all items with stock levels
  □ Can set stock quantity per item
  □ Stock decrements on order placement
  □ Low stock banner on dashboard when items ≤ threshold
  □ Item auto-unavailable at stock = 0
  □ NULL stock = unlimited (no tracking for that item)
  □ Multi-tenant: only own restaurant's inventory
```

### TASK 5.4 — SaaS Plan Gates
**Type:** Backend + Frontend · **Agent:** UI Developer · **Size:** Large

```
FILES TO CREATE:
  src/lib/plans.ts                                    → Plan limits + checkPlanLimit()
  src/middleware/plan-gate.ts                          → Middleware to enforce limits
  src/components/ui/UpgradePrompt.tsx                  → "Upgrade to unlock" modal
  src/app/(dashboard)/dashboard/settings/plan/page.tsx → Plan management page

PLAN LIMITS (from reference doc):
  starter: { maxTables: 5, maxMenuItems: 30, gamesEnabled: false,
             analyticsRetentionDays: 30, bluetoothPrinting: false,
             whatsappBilling: false, prioritySupport: false, monthlyPrice: 0 }
  growth:  { maxTables: 20, maxMenuItems: 200, gamesEnabled: true,
             analyticsRetentionDays: 90, bluetoothPrinting: true,
             whatsappBilling: true, prioritySupport: false, monthlyPrice: 999 }
  premium: { maxTables: 999, maxMenuItems: 999, gamesEnabled: true,
             analyticsRetentionDays: 365, bluetoothPrinting: true,
             whatsappBilling: true, prioritySupport: true, monthlyPrice: 2499 }

ENFORCEMENT POINTS:
  - Create table: check tables count < maxTables
  - Create menu item: check items count < maxMenuItems
  - Bluetooth print: check bluetoothPrinting flag
  - WhatsApp invoice: check whatsappBilling flag
  - Analytics page: filter data by analyticsRetentionDays

  When limit hit → UpgradePrompt modal with plan comparison + upgrade button

PLAN MANAGEMENT PAGE:
  - Current plan displayed
  - Feature comparison table (Starter vs Growth vs Premium)
  - "Upgrade" button → Razorpay subscription flow
  - "Downgrade" with warning about losing features

RAZORPAY SUBSCRIPTIONS:
  Use Razorpay Subscriptions API:
  - Create plan in Razorpay dashboard (₹999/mo, ₹2499/mo)
  - Admin clicks "Upgrade" → Razorpay subscription checkout
  - Webhook: subscription.activated → update restaurant.plan
  - Webhook: subscription.cancelled → downgrade to starter

ACCEPTANCE:
  □ Starter plan: cannot create 6th table (shows upgrade prompt)
  □ Starter plan: cannot create 31st menu item
  □ Starter plan: Bluetooth print button → upgrade prompt
  □ Growth plan: all above work
  □ Plan comparison page renders correctly
  □ Upgrade flow works via Razorpay
  □ Downgrade resets limits
  □ Analytics data filtered by retention period
  □ Plan stored in restaurants.plan column
```

### TASK 5.5 — Restaurant Onboarding Wizard (Full)
**Type:** Frontend · **Agent:** UI Developer · **Size:** Medium

```
UPDATE FILES:
  src/app/(dashboard)/onboarding/page.tsx → Full wizard (replace Phase 1 basic version)

ONBOARDING STEPS (from reference doc):
  Step 1: Restaurant Profile
    - Name, type (restaurant/cafe/cloud kitchen/bar)
    - Address, city, pin code
    - Phone number

  Step 2: Brand Setup
    - Upload logo (Cloudinary)
    - Set brand color (color picker, or auto-extract from logo)
    - Restaurant tagline

  Step 3: Tax Configuration
    - GSTIN (optional for starter)
    - CGST rate (default 2.5%)
    - SGST rate (default 2.5%)

  Step 4: Plan Selection
    - Starter (Free) / Growth (₹999/mo) / Premium (₹2499/mo)
    - Feature comparison
    - Payment if Growth/Premium selected

  Step 5: First Menu Setup
    - Create first category
    - Add at least 3 items
    - Upload food images

  Step 6: Table Setup
    - Create first 2 tables
    - Generate QR codes
    - Download QR PDF

  Step 7: Chef Setup
    - Create chef user with PIN
    - Show QR for chef-login page

  Step 8: Go Live
    - Summary of everything set up
    - "Your restaurant is live!" celebration screen
    - Link to dashboard

PROGRESS BAR:
  Step indicator at top (1/8, 2/8, ... 8/8)
  Can go back to previous steps
  Progress saved (can continue later)

ACCEPTANCE:
  □ All 8 steps render correctly
  □ Can navigate forward and backward
  □ Progress persists (reload → resumes at last step)
  □ Logo upload works
  □ Color picker works
  □ Plan selection + payment works
  □ First menu items created
  □ QR codes generated and downloadable
  □ Chef user created with PIN
  □ "Go Live" screen with celebration
  □ After completion → redirect to dashboard, never show onboarding again
```

### TASK 5.6 — Settings Page
**Type:** Frontend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/app/(dashboard)/dashboard/settings/page.tsx           → Settings hub
  src/app/(dashboard)/dashboard/settings/profile/page.tsx   → Restaurant profile
  src/app/(dashboard)/dashboard/settings/staff/page.tsx     → Staff management
  src/app/(dashboard)/dashboard/settings/tax/page.tsx       → Tax configuration
  src/app/(dashboard)/dashboard/settings/printer/page.tsx   → Printer settings

SETTINGS SECTIONS:
  Restaurant Profile: name, logo, brand color, address, type, slug
  Staff: list chef users, create new, reset PIN, deactivate
  Tax: CGST rate, SGST rate, GSTIN
  Printer: paired printer, test print, forget printer
  Plan: current plan, upgrade/downgrade (links to plan page)
  Account: change password, email, 2FA setup (future)

ACCEPTANCE:
  □ All settings sections navigable
  □ Profile changes save correctly
  □ Can create/edit/deactivate chef users
  □ Tax rates configurable
  □ Printer management works
  □ Changes reflected immediately across app
```

### TASK 5.7 — Performance Audit + Optimization
**Type:** DevOps · **Agent:** Auditor · **Size:** Medium

```
TARGETS:
  /m/[slug] (customer menu):
    Lighthouse Performance: ≥ 90
    FCP: < 1.2s
    TTI: < 2.5s
    CLS: < 0.1

  /dashboard (admin):
    Lighthouse Performance: ≥ 80
    No layout shifts during data load

OPTIMIZATION CHECKLIST:
  □ Images: next/image with Cloudinary loader, lazy loading, blur placeholder
  □ Fonts: next/font with preload, font-display: swap
  □ JS bundle: analyze with @next/bundle-analyzer, code-split large pages
  □ Menu data: ISR or SWR with Redis cache (already in Phase 2)
  □ Animations: will-change on animated elements, GPU-accelerated transforms
  □ API routes: response compression, proper Cache-Control headers
  □ Components: React.memo on expensive renders, virtualized long lists
  □ Socket.IO: connection only on pages that need it (not global)

ACCEPTANCE:
  □ Lighthouse report for /m/[slug]: Performance ≥ 90
  □ Lighthouse report for /dashboard: Performance ≥ 80
  □ Bundle size analyzed and optimized
  □ No unnecessary re-renders (React DevTools profiler)
  □ Images served as WebP with correct sizing
```

### TASK 5.8 — Security Hardening
**Type:** Backend · **Agent:** Auditor · **Size:** Medium

```
SECURITY CHECKLIST (from reference doc):
  □ SQL Injection: Prisma parameterized only (no raw queries)
  □ Tenant isolation: every query has restaurant_id (audit all API routes)
  □ QR token validation: constant-time comparison (timingSafeEqual)
  □ Payment webhook: signature verification (already in Phase 4)
  □ Rate limiting: per IP + per tenant (Upstash Ratelimit)
     - Menu API: 100 req/min per IP
     - Order creation: 10 req/min per session
     - Auth: 5 attempts/15min per IP
  □ Input validation: Zod on every API route (audit all)
  □ CORS: restrict to known origins in production
  □ CSP headers: strict Content-Security-Policy in next.config.mjs
  □ HTTPS only: HSTS header, redirect HTTP
  □ ENV secrets: never in code, .env.local not committed
  □ Audit logging: log all admin actions to audit_logs table

FILES TO CREATE:
  src/middleware/rate-limit.ts              → Rate limiting middleware
  src/lib/audit.ts                          → Audit log helper
  prisma/migrations/add_audit_logs.sql      → audit_logs table

AUDIT LOGS TABLE:
  id, restaurant_id, user_id, action, entity_type, entity_id,
  old_value (JSONB), new_value (JSONB), ip_address, created_at

ACCEPTANCE:
  □ All API routes have Zod validation (audit confirms)
  □ All DB queries include restaurant_id (audit confirms)
  □ Rate limiting blocks excessive requests
  □ CSP headers present in response
  □ CORS rejects unknown origins
  □ Audit logs record admin menu/order/settings changes
  □ No secrets in codebase (git log search)
```

### TASK 5.9 — Production Deployment
**Type:** DevOps · **Agent:** UI Developer · **Size:** Medium

```
DEPLOYMENT TARGET:
  Next.js app → Vercel
  Socket.IO server → Railway
  Database → Supabase (already production-ready)
  Redis → Upstash (already production-ready)
  Images → Cloudinary (already production-ready)

VERCEL SETUP:
  □ Connect GitHub repo to Vercel
  □ Set all env vars in Vercel dashboard
  □ Configure custom domain (if available)
  □ Enable Vercel Analytics (basic)
  □ Set Node.js 20 runtime

RAILWAY SETUP:
  □ Socket.IO server deployed
  □ Env vars set (REDIS_URL, JWT_SECRET, CORS_ORIGIN)
  □ Health check endpoint configured

MONITORING:
  □ Sentry: install @sentry/nextjs
     - Configure: DSN, environment, release tracking
     - Source maps uploaded on build
     - Error boundaries on all pages
  □ PostHog (optional): basic events tracking
     - Page views, button clicks, order placed, payment completed

ENVIRONMENT SEPARATION:
  .env.local       → development (Supabase dev project, Razorpay test)
  Vercel env vars  → production (Supabase prod, Razorpay live)

PRE-DEPLOY CHECKLIST:
  □ All tests passing (npm run test + npm run test:e2e)
  □ TypeScript: zero errors (npm run type-check)
  □ Build: succeeds (npm run build)
  □ Lighthouse: ≥ 90 for customer menu
  □ Security checklist complete
  □ Razorpay switched to LIVE mode (when ready)
  □ Sentry capturing errors correctly

ACCEPTANCE:
  □ Production URL accessible
  □ Admin login works on production
  □ Customer QR flow works end-to-end on production
  □ Socket.IO connects from production frontend to Railway
  □ Sentry receives test error
  □ No console errors in production
```

---

## Phase 5 Completion Checklist

```
HUMAN VERIFICATION:
  □ Analytics: revenue chart matches manual calculation
  □ Analytics: popular items correct
  □ CSV export opens correctly in Excel
  □ Inventory: stock decrements on order
  □ Inventory: low stock alert appears
  □ SaaS: starter plan limits enforced (tables, items)
  □ SaaS: upgrade to growth plan works via Razorpay
  □ Onboarding: complete all 8 steps as new restaurant
  □ Settings: change restaurant name → reflected everywhere
  □ Settings: add new chef → can login with PIN
  □ Lighthouse: /m/[slug] ≥ 90 performance
  □ Security: rate limiting blocks rapid requests
  □ Security: CORS rejects unknown origin
  □ Production: full flow works (QR scan → order → pay → bill)
  □ Sentry: errors captured from production
  □ Load test: 50 concurrent users → no errors (basic)
  □ Git: tag v1.0.0, commit "Phase 5 complete — production ready"
```

---

## Use Cases Verified

| # | Actor | Action | Expected |
|---|---|---|---|
| 1 | Admin | Opens analytics | Revenue chart, KPI cards, popular items |
| 2 | Admin | Exports orders CSV | CSV downloads with correct data |
| 3 | Admin | Sets item stock to 5 | Stock displays correctly |
| 4 | Customer | Orders item with stock 1 | Stock → 0, item becomes unavailable |
| 5 | Admin (starter) | Tries to add 6th table | Upgrade prompt shown |
| 6 | Admin | Upgrades to Growth plan | Payment via Razorpay, plan updated |
| 7 | New restaurant | Completes onboarding | All 8 steps, live in < 30 minutes |
| 8 | Admin | Changes brand color in settings | Customer menu reflects new color |
| 9 | Admin | Adds new chef with PIN | Chef can login to KDS |
| 10 | Attacker | Sends 200 requests/min to menu API | Rate limited after 100 |
| 11 | Human | Runs Lighthouse on /m/slug | Score ≥ 90 |
| 12 | Human | Triggers error in production | Sentry captures with stack trace |
| 13 | Human | Full E2E on production | QR → menu → order → pay → bill → served |

---

## Post-Phase 5: What's Next (Future Enhancements)

```
NOT in scope for v1.0 — future phases:
  □ Games engine (Truth or Dare, Trivia, Spin the Bottle)
  □ Loyalty points system
  □ Coupon/promo code system
  □ AI dish recommendations
  □ Multi-outlet support (one admin → N restaurants)
  □ Waiter role (between admin and chef)
  □ Aggregator integration (Zomato/Swiggy)
  □ Mobile app (React Native / Expo)
  □ WhatsApp Business API (native, replacing Twilio)
  □ Dynamic pricing
  □ Customer reviews/ratings system
  □ Kitchen analytics (prep time tracking)
```

---

*This is the finish line for v1.0. After this phase, a restaurant can go from zero to live in 30 minutes. That's the product promise. Deliver it.*
