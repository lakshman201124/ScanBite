# QR Dine — Master Build Plan

> **The single source of truth for what gets built, in what order, and why.**
> Read CLAUDE.md first. Read ARCHITECTURE.md second. Read this third.

---

## Build Philosophy

```
1. Foundation before features. Auth + multi-tenancy + DB before any UI.
2. One phase at a time. Never start Phase N+1 until Phase N passes human verification.
3. Frontend is the product. Customers judge restaurants by the menu UI — it must be Swiggy-grade.
4. Every query carries restaurant_id. Zero exceptions. Zero shortcuts.
5. Games deferred. Phases 1-5 cover the entire restaurant workflow. Games = future enhancement.
```

---

## Phase Map

```
┌──────────────────────────────────────────────────────────────┐
│                     QR DINE BUILD MAP                         │
│                                                               │
│  PHASE 1 ─── Foundation                                       │
│  │           DB schema, auth (admin + chef + customer),       │
│  │           multi-tenant middleware, admin dashboard shell    │
│  │           + restaurant onboarding                          │
│  │                                                            │
│  PHASE 2 ─── Menu Builder + Customer Ordering                 │
│  │           Admin: CRUD categories + items + images           │
│  │           QR: token generation, table management            │
│  │           Customer: /m/[slug] menu page, cart, order flow   │
│  │           ★ BRAND SCOUT runs BEFORE this phase              │
│  │                                                            │
│  PHASE 3 ─── Real-Time Engine                                 │
│  │           Socket.IO server, Redis adapter                   │
│  │           Admin live orders dashboard                       │
│  │           Chef KDS with real-time order cards                │
│  │           Customer live order tracker                        │
│  │                                                            │
│  PHASE 4 ─── Billing + Payments                               │
│  │           Bill calculation (GST), Razorpay integration      │
│  │           Split bill, thermal printing (ESC/POS + BLE)      │
│  │           Digital invoice (PDF → WhatsApp + Email)          │
│  │                                                            │
│  PHASE 5 ─── Analytics, SaaS Plans, Polish + Deploy           │
│             Admin analytics (Recharts), CSV export             │
│             Inventory management, SaaS plan gates              │
│             Restaurant onboarding wizard, performance audit    │
│             Security audit, production deploy (Vercel + Sentry)│
│                                                               │
│  [FUTURE] ── Games Engine, Loyalty, AI Recommendations,       │
│              Multi-outlet, Mobile App                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase Dependencies (Strict Order)

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
   │          │          │          │          │
   │          │          │          │          └─ Requires: billing engine, 
   │          │          │          │                       all CRUD working
   │          │          │          └─ Requires: real-time infra,
   │          │          │                       order lifecycle complete
   │          │          └─ Requires: orders table, session auth,
   │          │                       menu items exist in DB
   │          └─ Requires: auth working, DB migrated,
   │                       admin shell rendered, Brand Scout complete
   └─ No dependencies. Start here. Always.
```

---

## Pre-Phase 1: Human Setup Checklist

Before ANY code is written, the human must complete:

```
ENVIRONMENT:
  □ Node.js 20+ installed (node -v)
  □ pnpm installed (npm i -g pnpm)
  □ Git initialized + remote repo created

PROJECT:
  □ pnpm create next-app@latest qrdine --ts --tailwind --app --eslint --src-dir
  □ cd qrdine && pnpm install

SERVICES (free tiers sufficient for development):
  □ Supabase project created → get SUPABASE_URL + SUPABASE_ANON_KEY + DATABASE_URL
  □ Upstash Redis created → get UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  □ Cloudinary account → get CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
  □ Razorpay test mode → get RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET + RAZORPAY_WEBHOOK_SECRET

ENV FILE (.env.local):
  □ Copy all keys into .env.local (never commit this file)

DEPENDENCIES (Phase 1):
  □ pnpm add @prisma/client next-auth@beta zustand zod
  □ pnpm add @upstash/redis @upstash/ratelimit
  □ pnpm add -D prisma tailwindcss postcss autoprefixer
  □ pnpm add @radix-ui/react-* (as needed per component)
  □ pnpm add framer-motion lucide-react clsx tailwind-merge
  □ npx shadcn-ui@latest init (select New York style, Zinc base)
```

---

## Human Touchpoints Per Phase

Every phase has moments where AI MUST stop and ask the human:

```
PHASE 1:
  → "Please create the Supabase project and provide the connection string."
  → "Please run: npx prisma migrate dev --name init"
  → "Please verify /login and /dashboard routes render in your browser."

PHASE 2:
  → BRAND SCOUT full interview (Round 1-6) before any frontend code
  → "Please upload a test food image to Cloudinary and confirm."
  → "Please scan this QR URL on your phone and confirm the menu loads."

PHASE 3:
  → "Please run: node socket-server.js and confirm Socket.IO connects."
  → "Please open KDS on a tablet/second browser and confirm orders appear."
  → "Please place a test order and confirm the live tracker updates."

PHASE 4:
  → "Please create a Razorpay test order and confirm webhook fires."
  → "Please pair a Bluetooth thermal printer and print a test receipt."
  → "Please verify the GST breakdown matches a manual calculation."

PHASE 5:
  → "Please verify analytics show correct data for the last 7 days."
  → "Please switch plan from Starter to Growth and confirm limits change."
  → "Please run Lighthouse and confirm score ≥ 90 for /m/[slug]."
  → "Please review Sentry error dashboard after 1 hour of testing."
```

---

## Success Criteria Per Phase

| Phase | Done When |
|---|---|
| 1 | Admin can login, see empty dashboard, session persists. Chef can PIN-login to blank KDS. Customer QR scan creates anonymous session. Multi-tenant: two test restaurants see only their own data. |
| 2 | Admin creates categories + items with images. Customer scans QR, sees branded menu, adds to cart, places order. Order exists in DB with correct restaurant_id + table_id. |
| 3 | New order triggers real-time card on KDS. Chef marks ready → customer tracker updates live. Admin sees live order feed. All updates < 50ms latency on LAN. |
| 4 | Customer can pay via Razorpay. Bill calculates GST correctly. Admin can print bill via Bluetooth. Invoice PDF generates and sends to WhatsApp/Email. |
| 5 | Analytics dashboard shows revenue, orders, popular items. SaaS plan limits enforced. Lighthouse ≥ 90. Sentry captures errors. Production URL live. |

---

## File Quick Reference

| File | Purpose | When to Read |
|---|---|---|
| `CLAUDE.md` | Master orchestration, immutable rules | Always first |
| `ARCHITECTURE.md` | System design, data flows, multi-tenancy | Before any coding |
| `BRAND_ASSETS.md` | Design tokens, colors, typography, components | Before any frontend |
| `agents/BRAIN.md` | Multi-agent pipeline orchestration | Before starting any phase |
| `agents/PLANNER.md` | Task breakdown rules | Start of each phase |
| `agents/BRAND_SCOUT.md` | Interview flow for design decisions | Phase 2 (before code) |
| `agents/UI_DEVELOPER.md` | Component templates, code patterns | During frontend build |
| `agents/AUDITOR.md` | 30-point audit checklist | After every page/feature |
| `agents/GATE_KEEPER.md` | Pass/fail loop rules | After every audit |
| `phases/PHASE_1.md` | Foundation tasks + acceptance criteria | Phase 1 only |
| `phases/PHASE_2.md` | Menu + ordering tasks + customer UX | Phase 2 only |
| `phases/PHASE_3.md` | Real-time engine tasks | Phase 3 only |
| `phases/PHASE_4.md` | Billing + payments tasks | Phase 4 only |
| `phases/PHASE_5.md` | Analytics, SaaS, polish, deploy tasks | Phase 5 only |
| `pipelines/BUILD.md` | Build execution pipeline | During every phase |
| `pipelines/TEST.md` | Test writing + running pipeline | End of every phase |

---

*This plan is the contract. Follow it. The pipeline files tell you HOW. The phase files tell you WHAT. The agent files tell you WHO.*
