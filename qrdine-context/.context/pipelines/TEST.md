# QR Dine — TEST Pipeline

> **Testing pipeline: write cases → run → fix → re-run. Runs after every phase and before production deploy.**

---

## Test Layers

```
┌────────────────────────────────────────────┐
│            TEST PYRAMID                     │
│                                             │
│              /\  E2E (Playwright)            │
│             /  \  ~20 tests per phase       │
│            /    \  Full user flows          │
│           /──────\                          │
│          / Integr. \  API route tests       │
│         /  (Vitest)  \  ~50 per phase       │
│        /    + MSW     \  Request/Response   │
│       /────────────────\                    │
│      /   Unit Tests     \  Pure functions   │
│     /    (Vitest)        \  ~100 per phase  │
│    /   billing, tenant,   \                 │
│   /    validation, QR      \                │
│  /──────────────────────────\               │
└────────────────────────────────────────────┘
```

---

## Test Categories

### 1. Unit Tests (Vitest)

Test pure functions in isolation. No DB, no network.

**Target files:**
```
lib/billing.ts        → Bill calculation (GST, discounts, rounding)
lib/tenant.ts         → tenantScope throws on missing restaurant_id
lib/qr.ts             → QR token generation, URL construction
lib/validations/*.ts  → Zod schema validation (valid + invalid inputs)
store/cart.ts         → Zustand cart: add, remove, update, clear, total
```

**Example test:**
```typescript
// __tests__/lib/billing.test.ts
import { calculateBill } from '@/lib/billing'

describe('calculateBill', () => {
  it('calculates GST correctly (CGST 2.5% + SGST 2.5%)', () => {
    const result = calculateBill([
      { name: 'Burger', price: 200, quantity: 2 }
    ])
    expect(result.subtotal).toBe(400)
    expect(result.cgstAmount).toBe(10)   // 400 * 2.5%
    expect(result.sgstAmount).toBe(10)
    expect(result.finalAmount).toBe(420)
  })

  it('applies discount before tax', () => {
    const result = calculateBill(
      [{ name: 'Pizza', price: 500, quantity: 1 }],
      10 // 10% discount
    )
    expect(result.discountedSubtotal).toBe(450)
    expect(result.cgstAmount).toBe(11.25)
  })

  it('handles empty cart', () => {
    const result = calculateBill([])
    expect(result.finalAmount).toBe(0)
  })
})
```

### 2. Integration Tests (Vitest + MSW)

Test API routes with mocked DB responses.

**Target routes:**
```
POST /api/menu/items          → Create menu item (admin only)
GET  /api/menu/{restaurantId} → Get menu (public, cached)
POST /api/orders/create       → Create order (session required)
PATCH /api/orders/{id}/status → Update order status (admin/chef)
POST /api/payments/webhook    → Razorpay webhook (signature verify)
POST /api/auth/chef-login     → PIN login
```

**Key test scenarios per route:**
```
For EVERY API route, test:
  ✓ Happy path (valid input, authorized user) → 200/201
  ✓ Missing auth → 401
  ✓ Wrong role (customer calling admin route) → 403
  ✓ Invalid input (fails Zod validation) → 400
  ✓ Cross-tenant access (admin A accessing restaurant B) → 403
  ✓ Not found (valid ID but doesn't exist) → 404
  ✓ Server error handling (DB down) → 500
```

### 3. E2E Tests (Playwright)

Test complete user flows in a real browser.

**Critical flows to test:**

```
CUSTOMER FLOW:
  1. Visit /m/{slug}?t={validToken}
     → Menu loads with categories and items
     → Restaurant logo and brand color visible
  
  2. Add items to cart
     → Cart count updates
     → Cart total updates
     → Cart persists after page reload
  
  3. Place order
     → Order confirmation screen shown
     → Order status tracker visible
     → KDS receives the order (via Socket.IO)
  
  4. Invalid QR token
     → Error page shown ("Invalid QR code")
     → No menu data leaked

ADMIN FLOW:
  5. Login with email + password
     → Redirected to dashboard
     → Only own restaurant's data visible
  
  6. Create menu category + item
     → Item appears in menu list
     → Customer menu reflects the change (after cache invalidation)
  
  7. View live orders
     → New customer order appears in real-time
     → Can change order status (confirm → preparing → ready)
  
  8. Generate QR for table
     → QR code displays correctly
     → Scanning QR opens correct menu page

CHEF FLOW:
  9. Login with PIN
     → KDS screen loads
     → Only own restaurant's orders visible
  
  10. Mark order as ready
      → Customer order tracker updates
      → Admin dashboard reflects change

SECURITY FLOWS:
  11. Access /dashboard without login → redirect to /login
  12. Access /kds without login → redirect to /chef-login
  13. Admin A tries to access Restaurant B's menu items → 403
  14. Expired session tries to place order → session error
  15. Invalid Razorpay webhook signature → 400
```

---

## Test Pipeline Execution

```
TRIGGER: Phase complete, before human verification

[Step 1] WRITE test cases
     │   Unit tests for all new lib/ functions
     │   Integration tests for all new API routes
     │   E2E tests for all new user flows
     │
     ▼
[Step 2] RUN tests
     │   npm run test          (Vitest: unit + integration)
     │   npm run test:e2e      (Playwright: E2E)
     │
     ▼
[Step 3] ANALYZE results
     │   All pass → proceed to human verification
     │   Failures → categorize:
     │     - Test bug (wrong assertion) → fix test
     │     - Code bug (real failure) → fix code
     │     - Environment issue (DB not running) → fix setup
     │
     ▼
[Step 4] FIX failures
     │   UI Developer fixes code bugs
     │   Test agent fixes test bugs
     │
     ▼
[Step 5] RE-RUN (max 3 loops)
     │   All pass → proceed
     │   Still failing → escalate to human
     │
     ▼
[Step 6] REPORT
     │   Test coverage summary
     │   All passing tests listed
     │   Any known flaky tests noted
```

---

## Test Infrastructure Setup (Phase 1)

```bash
# Install test dependencies
pnpm add -D vitest @vitejs/plugin-react jsdom
pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D msw           # Mock Service Worker for API mocking
pnpm add -D @playwright/test
pnpm add -D @faker-js/faker  # Test data generation

# vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['lib/**', 'store/**', 'components/**'],
    }
  },
  resolve: {
    alias: { '@': '/path/to/src' }
  }
})
```

---

## Coverage Targets

| Layer | Target | Rationale |
|---|---|---|
| lib/ (billing, tenant, QR, validations) | 95%+ | These are business-critical pure functions |
| API routes | 80%+ | Every route needs happy + error path coverage |
| Components | 60%+ | Key interactions tested, not every CSS class |
| E2E flows | All critical paths | Every flow listed above must have a passing test |

---

*Tests are not optional. They are the safety net that lets you ship with confidence. Every phase ends with green tests.*
