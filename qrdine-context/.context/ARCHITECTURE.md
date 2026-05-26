# QR Dine — ARCHITECTURE.md

> **The complete system architecture. Every agent reads this before writing a single line of code.**  
> **If something isn't in here, it doesn't exist yet. Don't invent architecture.**

---

## 1. System Overview

QR Dine is a **shared-database, tenant-isolated** SaaS platform. One PostgreSQL database serves all restaurants. Every row that belongs to a restaurant has a `restaurant_id` column. There are NO separate databases per tenant — isolation is purely logical via row-level filtering and middleware enforcement.

```
┌──────────────────────────────────────────────────────────────────┐
│                        THREE CLIENT APPS                          │
│                                                                    │
│  📱 Customer Browser        🖥️ Admin Dashboard       📟 Chef KDS   │
│  (Phone, no login)          (Desktop/Tablet)          (Tablet)     │
│  /m/{slug}?t={token}        /(admin)/dashboard        /(chef)/kds  │
└─────────┬───────────────────────┬───────────────────────┬─────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │ HTTPS + WSS
                         ┌────────▼────────┐
                         │   Cloudflare     │  DNS, CDN, WAF, DDoS
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │                           │
           ┌────────▼────────┐        ┌────────▼────────┐
           │   Vercel Edge    │        │   Railway        │
           │   (Next.js App)  │        │   (Socket.IO)    │
           │   API Routes     │        │   WebSocket srv   │
           │   SSR + RSC      │        │   Sticky sessions │
           └────────┬────────┘        └────────┬────────┘
                    │                           │
                    └─────────┬─────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼──────┐ ┌─────▼─────┐ ┌───────▼───────┐
     │  PostgreSQL    │ │  Redis     │ │  Cloudinary    │
     │  (Supabase)    │ │  (Upstash) │ │  (Image CDN)   │
     │  Primary DB    │ │  Cache +   │ │  Food photos    │
     │  + RLS         │ │  Pub/Sub   │ │  Auto-WebP      │
     └───────────────┘ └───────────┘ └───────────────┘
```

---

## 2. Multi-Tenancy Model

### Strategy: Shared Database + `restaurant_id` Column Isolation

Every tenant-scoped table has:
```sql
restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE
```

Every tenant-scoped query has:
```typescript
where: { restaurant_id: currentRestaurantId, ...otherConditions }
```

### Tenant Resolution Flow

```
REQUEST ARRIVES
     │
     ├─► Admin route (/dashboard/*)
     │   └─► Extract restaurant_id from JWT token
     │       └─► Middleware sets x-restaurant-id header
     │
     ├─► Chef route (/kds/*)
     │   └─► Extract restaurant_id from JWT token (chef or admin)
     │       └─► Middleware sets x-restaurant-id header
     │
     ├─► Customer route (/m/{slug}?t={qrToken})
     │   └─► Resolve restaurant from slug in URL
     │       └─► Validate qrToken against restaurant_tables
     │           └─► Create anonymous session tied to restaurant_id + table_id
     │
     └─► API route (/api/*)
         └─► Extract restaurant_id from:
             ├─► JWT (admin/chef routes)
             └─► Session token (customer routes)
```

### Tenant Isolation Helper (MANDATORY)

```typescript
// lib/tenant.ts — EVERY service function imports this
export function tenantScope(restaurantId: string) {
  if (!restaurantId) throw new Error('CRITICAL: Missing restaurant_id — tenant isolation breach')
  return { restaurant_id: restaurantId }
}

// Usage in every query:
const items = await prisma.menuItem.findMany({
  where: {
    ...tenantScope(restaurantId),
    is_available: true
  }
})
```

---

## 3. Authentication Architecture

### Three Completely Separate Auth Flows

```
┌─────────────────────────────────────────────────────────┐
│                    AUTH FLOW MAP                          │
├─────────────┬──────────────┬────────────────────────────┤
│ ADMIN       │ CHEF         │ CUSTOMER                    │
├─────────────┼──────────────┼────────────────────────────┤
│ Email +     │ PIN (4-6     │ No login. Anonymous.        │
│ Password    │ digits) OR   │ UUID session from QR scan.  │
│ + 2FA (opt) │ Email login  │                             │
├─────────────┼──────────────┼────────────────────────────┤
│ NextAuth v5 │ NextAuth v5  │ Custom session middleware    │
│ Credentials │ Credentials  │ httpOnly cookie + Redis      │
│ Provider    │ Provider     │                             │
├─────────────┼──────────────┼────────────────────────────┤
│ JWT payload:│ JWT payload: │ Session payload:             │
│ userId      │ userId       │ sessionId                    │
│ restaurantId│ restaurantId │ restaurantId                 │
│ role: admin │ role: chef   │ tableId                      │
│ plan        │              │ expiresAt (2 hours)          │
├─────────────┼──────────────┼────────────────────────────┤
│ TTL: 30 days│ TTL: 8 hours │ TTL: 2 hours                │
├─────────────┼──────────────┼────────────────────────────┤
│ Access:     │ Access:      │ Access:                      │
│ /dashboard/*│ /kds/*       │ /m/{slug}/* only             │
│ /api/admin/*│ /api/kds/*   │ /api/menu/* /api/orders/*   │
└─────────────┴──────────────┴────────────────────────────┘
```

### Role Hierarchy

```
Platform Super Admin (Lakshman — hardcoded in DB seed)
  └── Restaurant Admin (one per restaurant, creates during onboarding)
        ├── Chef (created by admin, PIN-based login)
        └── [Future] Waiter (created by admin)

Customer = stateless anonymous session. No account. No password.
           Optional: phone number for loyalty tracking (OTP verified).
```

### Middleware Chain

```typescript
// middleware.ts — runs on EVERY request

Request → Rate Limit Check (Redis)
  → Route Classification:
      /dashboard/*  → requireAdmin()  → inject restaurant_id header
      /kds/*        → requireChefOrAdmin() → inject restaurant_id header
      /m/*          → validateQRSession() → inject session context
      /api/admin/*  → requireAdmin()
      /api/kds/*    → requireChefOrAdmin()
      /api/menu/*   → requireValidSession()
      /api/orders/* → requireValidSession()
      /api/payments/* → webhookSignatureCheck() (Razorpay only)
      /login        → public
      /chef-login   → public
      /register     → public
      /*            → public (landing page, marketing)
```

---

## 4. Data Flow — Order Lifecycle

This is the CORE flow of the entire product:

```
CUSTOMER SCANS QR
       │
       ▼
[1] Browser opens /m/{slug}?t={qrToken}
       │
       ▼
[2] Server validates qrToken → resolves restaurant_id + table_id
       │
       ▼
[3] Anonymous session created (UUID → Redis + httpOnly cookie)
       │
       ▼
[4] Menu loaded (Redis cache hit → or Prisma query → Redis cache set)
    Menu data: categories → items → customizations
    Images: Cloudinary CDN URLs (never from our server)
       │
       ▼
[5] Customer browses, adds to cart (Zustand + localStorage)
    Cart is 100% client-side until checkout
       │
       ▼
[6] Customer places order → POST /api/orders/create
    Server validates:
      - Session is valid + not expired
      - All item IDs exist in this restaurant
      - Prices match current DB prices (recalculate server-side)
      - Stock available (if inventory tracking ON)
    Server creates:
      - orders row (status: pending, payment_status: unpaid)
      - order_items rows (snapshot item_name + item_price at order time)
      - Increment order_number counter
    Server emits:
      - Socket.IO → restaurant:{restaurantId} → 'order:new' event
       │
       ▼
[7] ADMIN sees new order on Live Orders dashboard
    CHEF sees new order card on KDS
    Both via Socket.IO real-time push
       │
       ▼
[8] Admin confirms order → PATCH /api/orders/{id}/status
    Status: pending → confirmed
    Socket emit: order:{orderId} → 'order:status_updated'
    Customer sees: "Order Confirmed ✓"
       │
       ▼
[9] Chef starts preparing → status: confirmed → preparing
    Socket emit to customer: "Being Prepared 🍳"
    Prep timer starts on KDS card
       │
       ▼
[10] Chef marks ready → status: preparing → ready
     Socket emit to customer: "Ready! 🎉"
     Sound alert on admin dashboard
       │
       ▼
[11] Served → status: ready → served
     Customer can now: Request Bill / Play Games / Rate
       │
       ▼
[12] Bill requested → POST /api/billing/generate
     Server calculates: subtotal + GST (CGST + SGST) + discount + tip
     Bill row created in DB
     Optional: print KOT/Bill via Bluetooth ESC/POS
       │
       ▼
[13] Payment:
     Option A: Pay at counter (cash) → admin marks paid manually
     Option B: UPI/Card → Razorpay checkout → webhook confirms payment
     payment_status: unpaid → paid
       │
       ▼
[14] Invoice generated → PDF stored on Cloudinary
     Sent via WhatsApp (Twilio) + Email (Resend)
     Rating prompt shown to customer
       │
       ▼
[15] Table freed → status: occupied → available
     Socket emit: table:status_changed
```

---

## 5. Database Schema (Entity Relationship)

```
restaurants (TENANT ROOT)
  │
  ├── users (admin, chef, waiter)
  ├── restaurant_tables
  │     └── customer_sessions
  ├── menu_categories
  │     └── menu_items
  │           └── item_customizations
  ├── orders
  │     ├── order_items
  │     └── bills
  ├── loyalty_accounts
  │     └── loyalty_transactions
  ├── coupons
  └── game_sessions (future — skip for now)
```

### Critical Schema Rules
1. `restaurants.slug` is UNIQUE — used in customer-facing URLs
2. `restaurant_tables.qr_token` is UNIQUE — the secret in the QR URL
3. `order_items` snapshots `item_name` + `item_price` — decoupled from menu_items
4. `bills` stores final calculated amounts — never recalculated from order_items
5. All monetary fields use `DECIMAL(10,2)` — never float
6. All timestamps use `TIMESTAMPTZ` — always UTC, convert in UI
7. `orders.order_number` is human-readable: "ORD-2024-0042" (per restaurant, sequential)

---

## 6. Caching Strategy

```
┌──────────────────────────────────────────────────┐
│               REDIS CACHE LAYERS                   │
├──────────────────────┬───────────────────────────┤
│ Key Pattern          │ TTL    │ Purpose            │
├──────────────────────┼────────┼───────────────────┤
│ menu:{restaurantId}  │ 5 min  │ Full menu JSON     │
│ session:{token}      │ 2 hrs  │ Customer session   │
│ rate:{ip}:{route}    │ 1 min  │ Rate limit counter │
│ order:{orderId}      │ 30 min │ Active order cache  │
│ restaurant:{slug}    │ 1 hr   │ Restaurant config   │
└──────────────────────┴────────┴───────────────────┘

Cache invalidation:
  - Menu updated by admin → delete menu:{restaurantId}
  - Order status changed → update order:{orderId}
  - Restaurant settings changed → delete restaurant:{slug}
```

---

## 7. Real-Time Architecture

### Socket.IO Room Strategy

```
restaurant:{restaurantId}  ← Admin + all chefs join this room
  │                           Receives: order:new, order:status_updated,
  │                                     table:status_changed
  │
order:{orderId}             ← Customer joins this room after placing order
  │                           Receives: order:status_updated
  │
table:{tableId}             ← [Future] Game players join this room
                               Receives: game:state_updated
```

### Event Flow (Order Status Update)

```
Chef clicks "Ready" on KDS
       │
       ▼
POST /api/orders/{id}/status  { status: 'ready' }
       │
       ▼
Prisma update: orders.status = 'ready'
       │
       ▼
Redis publish: channel='socket_events'
  payload={ room: 'restaurant:{id}', event: 'order:status_updated', data: {...} }
  payload={ room: 'order:{orderId}', event: 'order:status_updated', data: {...} }
       │
       ▼
Socket.IO server (Railway) subscribes to Redis channel
       │
       ▼
Socket.IO emits to both rooms simultaneously
       │
       ├─► Admin dashboard: order card updates color/status
       └─► Customer phone: tracking screen animates to "Ready! 🎉"
```

---

## 8. Payment Architecture

```
CUSTOMER CHECKOUT
       │
       ├─► Option A: "Pay at Counter"
       │   └─► Order created with payment_status: 'unpaid', payment_method: 'cash'
       │       └─► Admin manually marks paid from dashboard
       │
       └─► Option B: "Pay Now" (UPI/Card)
           │
           ▼
       POST /api/payments/create-order
       Server creates Razorpay order (amount in paise, receipt = orderId)
           │
           ▼
       Client opens Razorpay checkout modal
       Customer completes payment
           │
           ▼
       Razorpay sends webhook → POST /api/payments/webhook
       Server verifies signature (HMAC SHA256)
           │
           ▼
       IF signature valid:
         - Mark order payment_status: 'paid'
         - Generate bill + invoice PDF
         - Send invoice via WhatsApp + Email
         - Emit Socket.IO event to admin
       IF signature invalid:
         - Log attempt + return 400
         - NEVER mark order as paid from client-side callback alone
```

### Critical Payment Rules
1. NEVER trust the amount from the frontend — recalculate server-side
2. Razorpay order amount MUST match server-calculated total (prevent tampering)
3. Only the webhook confirms payment — not the client-side success callback
4. All payment events logged to `audit_log` table

---

## 9. Image Architecture

```
ADMIN UPLOADS FOOD IMAGE
       │
       ▼
Direct upload to Cloudinary (client-side with signed upload preset)
  - No image touches our server
  - Cloudinary returns: public_id + secure_url
       │
       ▼
Store Cloudinary URL in menu_items.image_url
       │
       ▼
CUSTOMER VIEWS MENU
  - next/image component with Cloudinary loader
  - Auto-transforms: f_auto (WebP), q_auto (quality), w_400 (responsive width)
  - Lazy loaded below the fold
  - Placeholder blur hash for instant paint

URL pattern:
https://res.cloudinary.com/{cloud}/image/upload/f_auto,q_auto,w_400/{public_id}
```

---

## 10. Deployment Architecture

### Phase 1-4 (Development → MVP Launch)

```
Vercel (Free/Pro)         → Next.js app (auto-deploy from GitHub main)
Supabase (Free/Pro)       → PostgreSQL + built-in connection pooling
Upstash (Free/Pay-as-go)  → Redis (serverless, edge)
Railway ($5/mo)           → Socket.IO server (persistent process)
Cloudinary (Free/Plus)    → Image CDN
Cloudflare (Free)         → DNS + basic CDN + SSL
```

### Phase 5+ (Scale)

```
Vercel Pro                → Edge functions, ISR, analytics
Supabase Pro              → Read replicas, larger connection pool
Upstash Pro               → Higher rate limits
Railway Pro               → Multiple Socket.IO instances
Sentry                    → Error monitoring
PostHog                   → Product analytics
```

---

## 11. Performance Targets

| Metric | Target | How |
|---|---|---|
| Menu page FCP | < 1.2s | RSC + Cloudinary CDN + Redis cache |
| Menu page TTI | < 2.5s | Code splitting + lazy load below fold |
| Order creation | < 500ms | Direct Prisma write + async Socket emit |
| Order status update (WebSocket) | < 50ms | Redis pub/sub → Socket.IO |
| Admin dashboard load | < 2s | TanStack Query + optimistic updates |
| KDS order card appear | < 100ms | Socket.IO push, no polling |
| Lighthouse score | 90+ | Image optimization, code splitting, caching |

---

*This is the architecture. Every agent references this. Every code decision maps back to a section here.*
