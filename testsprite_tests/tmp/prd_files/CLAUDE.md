# QR Dine — CLAUDE.md (Master Orchestration File)

> **This is the single source of truth for every AI agent working on this project.**  
> **Read this FIRST. Then read the file it points you to. Never freelance.**

---

## What Is QR Dine?

A **multi-tenant B2B SaaS** restaurant operating system. Customers scan a QR code at their table, browse a Swiggy-grade animated menu on their phone, order, pay, and track — all without an app or login. Restaurant admins manage menus, tables, orders, billing, and analytics from a dashboard. Chefs see live orders on a Kitchen Display System (KDS). Every restaurant is fully isolated by `tenant_id` (restaurant_id).

**One codebase. Thousands of restaurants. Zero code changes between tenants.**

---

## Context File Map — Read Order

Every AI agent MUST read files in this order before touching any code:

```
1. CLAUDE.md                          ← YOU ARE HERE (orchestration + rules)
2. .context/ARCHITECTURE.md           ← System design, multi-tenancy, auth, data flow
3. .context/BRAND_ASSETS.md           ← Design system, colors, typography, component specs
4. .context/BUILD_PLAN.md             ← Phase-by-phase build sequence with deliverables
5. .context/agents/BRAIN.md           ← Multi-agent pipeline: who does what, in what order
6. .context/agents/PLANNER.md         ← Phase planning agent instructions
7. .context/agents/BRAND_SCOUT.md     ← Brand/design asset gathering agent
8. .context/agents/UI_DEVELOPER.md    ← Frontend build agent (the most critical agent)
9. .context/agents/AUDITOR.md         ← Frontend QA + use-case testing agent
10. .context/agents/GATE_KEEPER.md    ← Pass/fail loop controller
11. .context/pipelines/BUILD.md       ← Build pipeline (plan → design → code → audit → gate)
12. .context/pipelines/TEST.md        ← Test pipeline (write cases → run → fix → re-run)
13. .context/phases/PHASE_1.md        ← Foundation (auth, multi-tenancy, admin shell)
14. .context/phases/PHASE_2.md        ← Menu builder + customer ordering UI
15. .context/phases/PHASE_3.md        ← Real-time (Socket.IO, KDS, live orders)
16. .context/phases/PHASE_4.md        ← Billing, payments, printing
17. .context/phases/PHASE_5.md        ← Analytics, SaaS plans, polish, deploy
```

---

## Immutable Rules (NEVER Violate)

### Multi-Tenancy
- EVERY database query MUST include `restaurant_id` in the WHERE clause
- NEVER query across tenants — not even for "admin convenience"
- Validate that the JWT's `restaurant_id` matches the requested resource
- All Prisma models that are tenant-scoped MUST have a `restaurant_id` field + index

### TypeScript
- NEVER use `any` — use `unknown` and narrow with Zod
- Every API route validates input with Zod before touching the DB
- Shared types live in `/types` — frontend and backend import from there
- Strict mode ON: `"strict": true` in tsconfig.json

### Database
- All DB access through Prisma — no raw SQL unless mathematically impossible otherwise
- Snapshot `item_name` and `item_price` in `order_items` at order time (prices change)
- New tables need indexes on: `restaurant_id`, all foreign keys, `status` fields
- UUIDs everywhere — no auto-increment integers for primary keys

### Security
- Payment calculations server-side ONLY — never trust client amounts
- Razorpay webhook signature MUST be verified before marking paid
- Rate limiting on every public API (menu: 100/min, orders: 10/min, auth: 5/15min)
- QR tokens validated with constant-time comparison
- CORS locked to known origins only

### Frontend (THE MOST IMPORTANT SECTION)
- NO AI SLOP — no generic Inter/Roboto, no purple gradients, no cookie-cutter cards
- Every page gets a design spec BEFORE code is written
- Framer Motion for all animations — not CSS hacks
- Mobile-first ALWAYS — 80%+ of customers are on phones
- Cart state in Zustand with localStorage persistence
- Images via Cloudinary with auto-format WebP + responsive transforms
- shadcn/ui as base components, HEAVILY customized per brand

### Real-Time
- Order status changes MUST emit Socket.IO events AFTER successful DB update
- Never trust client-side order status — always fetch from DB on load
- Socket rooms: `restaurant:{id}` for admin/chef, `order:{id}` for customer

### Build Discipline
- ONE page at a time. Build → Audit → Gate → Next page.
- No skipping the audit. No "I'll fix it later."
- Every phase ends with a manual checklist the human must verify
- If an agent needs something from the human (API keys, brand assets, decisions), it STOPS and asks. It does NOT assume.

---

## Tech Stack (Locked — Do Not Deviate)

| Layer | Choice | Non-Negotiable? |
|---|---|---|
| Framework | Next.js 15 (App Router) | YES |
| Language | TypeScript (strict) | YES |
| Styling | Tailwind CSS v4 + shadcn/ui | YES |
| Animations | Framer Motion | YES |
| Client State | Zustand | YES |
| Server State | TanStack Query v5 | YES |
| Forms | React Hook Form + Zod | YES |
| ORM | Prisma | YES |
| Database | PostgreSQL (Supabase) | YES |
| Cache | Redis (Upstash) | YES |
| Auth | NextAuth v5 | YES |
| Payments | Razorpay (India) | YES |
| Images | Cloudinary | YES |
| Real-time | Socket.IO | YES |
| Icons | Lucide React | YES |
| Charts | Recharts | YES |
| Hosting | Vercel + Railway (Socket server) | Flexible |

---

## File Structure (Target)

```
qrdine/
├── .context/                   ← All context files (you're reading from here)
├── app/
│   ├── (admin)/               ← Admin dashboard (auth-gated)
│   │   ├── dashboard/
│   │   ├── menu/
│   │   ├── tables/
│   │   ├── orders/
│   │   ├── billing/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── (chef)/                ← Chef KDS (auth-gated)
│   │   ├── kds/
│   │   └── layout.tsx
│   ├── (auth)/                ← Login pages
│   │   ├── login/
│   │   ├── chef-login/
│   │   ├── register/
│   │   └── onboarding/
│   ├── m/[slug]/              ← Customer menu (public, no auth)
│   │   ├── page.tsx           ← Menu page
│   │   ├── cart/
│   │   ├── order/[orderId]/   ← Order tracking
│   │   └── bill/[orderId]/    ← Bill view
│   ├── api/                   ← API route handlers
│   │   ├── auth/
│   │   ├── menu/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── tables/
│   │   ├── billing/
│   │   └── admin/
│   ├── layout.tsx
│   └── page.tsx               ← Landing page (marketing)
├── components/
│   ├── ui/                    ← shadcn/ui base (customized)
│   ├── menu/                  ← Customer-facing menu components
│   ├── kds/                   ← Kitchen display components
│   ├── admin/                 ← Dashboard components
│   └── shared/                ← Cross-cutting (loaders, errors, etc.)
├── lib/
│   ├── auth.ts                ← NextAuth config
│   ├── prisma.ts              ← Prisma client singleton
│   ├── tenant.ts              ← Multi-tenant helpers
│   ├── billing.ts             ← Bill calculation (pure functions)
│   ├── qr.ts                  ← QR generation + validation
│   ├── printer.ts             ← ESC/POS thermal printing
│   ├── redis.ts               ← Redis client
│   ├── cloudinary.ts          ← Image upload helpers
│   └── validations/           ← Zod schemas
├── server/
│   └── socket.ts              ← Socket.IO server (separate process)
├── store/
│   ├── cart.ts                ← Zustand cart store
│   └── session.ts             ← Customer session store
├── types/
│   ├── index.ts               ← Shared types
│   ├── api.ts                 ← API request/response types
│   ├── socket.ts              ← Socket event types
│   └── database.ts            ← Prisma-generated type extensions
├── prisma/
│   └── schema.prisma          ← THE source of truth for DB
├── public/
│   └── sounds/                ← KDS notification sounds
├── middleware.ts               ← Multi-tenant + auth middleware
├── CLAUDE.md                   ← This file
└── .context/                   ← Everything else
```

---

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=random-32-char-string
NEXTAUTH_URL=https://qrdine.app

# Payments
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Images
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Cache
REDIS_URL=redis://...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Real-time
NEXT_PUBLIC_SOCKET_URL=wss://socket.qrdine.app

# Email
RESEND_API_KEY=...

# WhatsApp/SMS
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=...

# Monitoring
SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=...
```

---

## How to Start (Human Setup Checklist)

Before ANY agent writes code, YOU (the human) must:

1. **Install Node.js 20+** — `nvm install 20 && nvm use 20`
2. **Install pnpm** — `npm install -g pnpm` (faster than npm)
3. **Create the Next.js project:**
   ```bash
   pnpx create-next-app@latest qrdine --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
   cd qrdine
   ```
4. **Install core dependencies** (run the command from PHASE_1.md)
5. **Set up Supabase project** at supabase.com — get DATABASE_URL
6. **Set up Upstash Redis** at upstash.com — get REDIS_URL
7. **Set up Cloudinary** at cloudinary.com — get cloud name + keys
8. **Set up Razorpay** at razorpay.com — get key ID + secret
9. **Copy `.env.example` to `.env.local`** and fill in all values
10. **Run `npx prisma migrate dev`** to create DB tables
11. **Tell the AI agent: "Phase 1 ready, begin."**

---

## Agent Communication Protocol

When an agent needs something from you:

```
🛑 HUMAN ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━
What I need: [specific thing]
Why: [brief reason]
How: [exact steps for you to do]
━━━━━━━━━━━━━━━━━━━━━━
Reply "done" when complete.
```

When an agent completes a phase:

```
✅ PHASE [N] COMPLETE
━━━━━━━━━━━━━━━━━━━━━━
Built: [list of files/features]
Tested: [what was verified]
Manual checks needed: [what YOU should verify]
━━━━━━━━━━━━━━━━━━━━━━
Reply "verified" to proceed to Phase [N+1].
```

---

*This file is the root. Every agent reads this first. Every decision traces back here.*
