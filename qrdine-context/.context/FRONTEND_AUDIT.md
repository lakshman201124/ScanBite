# QR Dine — FRONTEND_AUDIT.md (Multi-Agent Frontend Design & Audit Pipeline)

> **This is the single source of truth for frontend quality, design excellence, and UI/UX auditing.**  
> **Six parallel agents. Zero AI slop. Every pixel earns its place.**  
> **Read CLAUDE.md first. Read BRAND_ASSETS.md second. Read this third. Then execute.**

---

## What This File Does

This file orchestrates a **six-agent parallel pipeline** that ensures every customer-facing screen in QR Dine meets the standard of a multi-million-dollar design studio — not a generic SaaS template. The pipeline catches broken UI, generates innovative use cases, validates with the human, writes test cases, audits quality, and rebuilds until every screen is production-perfect.

**The customer menu is the product.** A restaurant lives or dies by how the food looks on someone's phone at 8 PM on a Friday. This pipeline treats that screen like a billboard in Times Square.

---

## Agent Overview — The Six

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND AUDIT PIPELINE — 6 AGENTS                      │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                  │
│  │ AGENT 1  │  │ AGENT 2  │  │ AGENT 3  │   ← PARALLEL DISCOVERY LAYER     │
│  │ LENS     │  │ IDEATOR  │  │ ARBITER  │                                  │
│  │ (Browser │  │ (Use Case│  │ (Human   │                                  │
│  │ Snapshot)│  │ Writer)  │  │ Approval)│                                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                                  │
│       │              │              │                                        │
│       ▼              ▼              ▼                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                  │
│  │ AGENT 4  │  │ AGENT 5  │  │ AGENT 6  │   ← PARALLEL BUILD LAYER         │
│  │ SENTINEL │  │ ARTISAN  │  │ CRAFTER  │                                  │
│  │ (Test    │  │ (QA &    │  │ (UI/UX   │                                  │
│  │ Writer)  │  │ Audit)   │  │ Builder) │                                  │
│  └──────────┘  └──────────┘  └──────────┘                                  │
│                                                                             │
│  Flow: LENS snapshots → IDEATOR writes use cases → ARBITER gets approval    │
│        → SENTINEL writes tests → ARTISAN audits → CRAFTER builds            │
│  Loop: CRAFTER output → LENS re-snapshot → ARTISAN re-audit → until PASS   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Execution Flow

```
START
  │
  ├─► LENS (Agent 1) takes full-page screenshots of every existing screen
  │   Outputs: Screenshot inventory + visual defect report
  │
  ├─► IDEATOR (Agent 2) reads codebase + BRAND_ASSETS + screenshots
  │   Outputs: Use case proposals (features, buttons, interactions, flows)
  │
  ├─► ARBITER (Agent 3) presents IDEATOR proposals to human
  │   Outputs: Approved use case list (human signs off each one)
  │
  │        ┌─────── ALL THREE FEED INTO ───────┐
  │        ▼                                    ▼
  │   SENTINEL (Agent 4)                   CRAFTER (Agent 6)
  │   Writes test cases from               Designs + builds approved
  │   LENS defects + approved              use cases with premium
  │   use cases                            UI/UX per BRAND_ASSETS
  │        │                                    │
  │        └──────── BOTH FEED INTO ───────────┘
  │                        │
  │                        ▼
  │                  ARTISAN (Agent 5)
  │                  QA audit: runs tests,
  │                  checks design fidelity,
  │                  scores every screen
  │                        │
  │                   ┌────┴────┐
  │                   │         │
  │                PASS      FAIL
  │                   │         │
  │              Next screen   Loop back
  │                            to CRAFTER
  │                            (max 3 loops)
  │                            then ESCALATE
  │                            to human
  │
  └─► COMPLETE: All screens pass. Tag release.
```

---

## Agent 1: LENS — The Browser Snapshot Agent

> **Role:** Visual surveillance. Captures every pixel of every frontend screen, identifies visual defects, layout breaks, missing states, and design inconsistencies.

### Identity

```
Name:       LENS
Type:       Automated visual inspector
Runs on:    Headless browser (Playwright / Puppeteer)
Parallel:   YES — runs independently, feeds IDEATOR and SENTINEL
Trigger:    Start of pipeline, and after every CRAFTER build cycle
```

### Responsibilities

```
1. FULL-PAGE SCREENSHOT INVENTORY
   Capture every route at three viewports:
     Mobile:  375×812  (iPhone 14 Pro)
     Tablet:  768×1024 (iPad)
     Desktop: 1440×900 (MacBook)

   Routes to capture:
   ┌─────────────────────────────────────────────────────┐
   │ CUSTOMER SCREENS (Priority 1 — capture first)       │
   │  /m/[slug]                    → Menu (empty state)   │
   │  /m/[slug]                    → Menu (populated)     │
   │  /m/[slug] + search active    → Search results       │
   │  /m/[slug] + veg filter       → Filtered view        │
   │  /m/[slug] + item detail open → Bottom sheet          │
   │  /m/[slug] + cart open        → Cart drawer           │
   │  /m/[slug]/checkout           → Checkout page         │
   │  /m/[slug]/order/[id]         → Order tracker         │
   │  /m/[slug]/bill/[id]          → Bill view             │
   ├─────────────────────────────────────────────────────┤
   │ ADMIN SCREENS (Priority 2)                           │
   │  /dashboard                   → Dashboard home        │
   │  /dashboard/menu              → Menu management       │
   │  /dashboard/tables            → Table management      │
   │  /dashboard/orders            → Live orders            │
   │  /dashboard/billing           → Billing page           │
   │  /dashboard/analytics         → Analytics              │
   │  /dashboard/settings          → Settings               │
   │  /login                       → Admin login            │
   │  /signup                      → Registration           │
   │  /onboarding                  → Onboarding wizard      │
   ├─────────────────────────────────────────────────────┤
   │ CHEF SCREENS (Priority 3)                            │
   │  /chef-login                  → Chef PIN entry        │
   │  /kds                         → Kitchen display        │
   └─────────────────────────────────────────────────────┘

2. STATE VARIATION CAPTURE
   For every screen, capture multiple states:
     □ Empty state (no data)
     □ Populated state (with seed data)
     □ Loading state (skeleton/spinner)
     □ Error state (API failure simulated)
     □ Overflow state (100+ items, long text, edge cases)
     □ Interactive states (hover, focus, active, disabled)

3. VISUAL DEFECT DETECTION
   Flag anything matching:
     □ Text overflow / truncation without ellipsis
     □ Image aspect ratio distortion
     □ Inconsistent spacing (margin/padding drift)
     □ Color contrast failing WCAG AA (4.5:1 for text)
     □ Misaligned elements (off-grid items)
     □ Missing hover/focus states on interactive elements
     □ Z-index stacking issues (overlapping incorrectly)
     □ Font rendering issues (wrong weight, missing font)
     □ Broken responsive layout at any viewport
     □ Missing empty state illustrations
     □ Flash of unstyled content (FOUC)
     □ Layout shift during load (CLS > 0.1)
     □ Scroll jank (non-60fps scrolling)
     □ Touch target too small (< 44×44px on mobile)

4. ANIMATION AUDIT
   Record GIF/video of:
     □ Page entry animations (stagger, fade, slide)
     □ Add-to-cart micro-interaction
     □ Cart drawer open/close
     □ Order status transitions
     □ Category tab scroll behavior
     □ Item detail sheet open/close
     □ Search filter transition
   Flag: missing animations, janky animations, wrong easing
```

### Output Format

```
📸 LENS REPORT — {Screen Name} — {Viewport}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screenshot: [path/to/screenshot.png]
States captured: [empty, populated, loading, error, overflow]
Viewport: {375×812 | 768×1024 | 1440×900}

DEFECTS FOUND:
  🔴 CRITICAL: {description} [line ref if applicable]
  🟡 WARNING:  {description}
  🔵 POLISH:   {description}

ANIMATION STATUS:
  ✅ {animation name}: smooth, correct easing
  ❌ {animation name}: {issue description}
  ⚠️  {animation name}: missing entirely

DESIGN FIDELITY vs BRAND_ASSETS.md:
  Colors:     {MATCH | DRIFT — details}
  Typography: {MATCH | DRIFT — details}
  Spacing:    {MATCH | DRIFT — details}
  Components: {MATCH | DRIFT — details}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Execution Commands

```bash
# LENS uses Playwright for captures
npx playwright install chromium

# Capture script (LENS generates this)
# lens-capture.ts
import { chromium } from 'playwright'

const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 812  },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1440, height: 900  },
]

const ROUTES = [
  { path: '/m/test-slug?t=valid-token', name: 'customer-menu', auth: 'customer' },
  { path: '/dashboard', name: 'admin-dashboard', auth: 'admin' },
  { path: '/kds', name: 'chef-kds', auth: 'chef' },
  // ... all routes
]

// For each route × viewport × state: full-page screenshot
// Output: screenshots/{name}/{viewport}/{state}.png
```

---

## Agent 2: IDEATOR — The Use Case Innovation Agent

> **Role:** Creative strategist. Analyzes existing screens and proposes innovative features, interactions, micro-details, and UX improvements that elevate QR Dine from "functional app" to "premium product."

### Identity

```
Name:       IDEATOR
Type:       Product designer + UX researcher
Runs on:    Reads codebase + LENS screenshots + BRAND_ASSETS.md
Parallel:   YES — runs alongside LENS
Trigger:    After LENS first pass, or independently from codebase analysis
```

### Responsibilities

```
1. USE CASE GENERATION
   For every screen, propose:
     □ Missing features that users expect (industry-standard)
     □ Delightful extras that differentiate (innovation)
     □ Buttons/actions that should exist but don't
     □ Edge cases not handled in current UI
     □ Accessibility improvements
     □ Performance optimizations visible to users

2. INNOVATION AREAS (by screen priority)

   ★★★ CUSTOMER MENU (/m/[slug]) — THE FLAGSHIP
   ──────────────────────────────────────────────
   IDEATOR must propose AT MINIMUM 15 use cases for this screen.
   Think like a Swiggy/Zomato product designer on launch day.

   Areas to explore:
     □ Menu browsing experience
       - Parallax food image scrolling
       - Category header images that shrink on scroll
       - "Chef's Picks" carousel at top with auto-scroll
       - Seasonal/limited-time badges with countdown
       - "New" badge that auto-expires after 7 days
       - Calorie filter slider (if calorie data exists)
       - Price range filter (₹, ₹₹, ₹₹₹)
       - Portion size visual indicator
       - Estimated wait time per item (from prep_time_mins)

     □ Item presentation
       - Full-bleed hero image on item detail sheet
       - Image gallery (multiple angles of dish)
       - "Pair with" suggestions (complementary items)
       - Popularity indicator ("Ordered 42 times today")
       - Ingredient list with allergen highlights
       - Spice level visual meter (not just text)
       - Serving size illustration

     □ Cart micro-interactions
       - Item count badge on cart icon with spring animation
       - "Flying item" animation (thumbnail arcs from card to cart)
       - Haptic feedback on add (navigator.vibrate)
       - Cart preview tooltip on hover (desktop)
       - Shake animation on cart icon when items waiting
       - Swipe-to-delete with undo toast
       - Smart upsell: "Add a drink?" when only food in cart

     □ Social proof
       - "Popular on this table" (items commonly ordered at same table)
       - "Most ordered" badge with order count
       - "Staff pick" badge (admin-assigned)
       - Real-time: "3 people are viewing this item"

     □ Accessibility + convenience
       - Font size toggle (A, A+, A++)
       - High contrast mode
       - Voice search ("search by speaking")
       - Repeat last order shortcut (from session/loyalty)
       - Share menu via link/WhatsApp

   ★★ CART DRAWER
   ──────────────────────────────────────────────
     □ Itemized customization breakdown
     □ Edit customization without removing item
     □ "Cooking instructions" per item (not just order-level)
     □ Estimated total with tax preview
     □ "Save for later" section
     □ Cart validity countdown (prices may change)
     □ Item thumbnail in cart rows
     □ Running total animation on quantity change
     □ Group items by category in cart
     □ Quantity stepper with long-press rapid increment

   ★★ ORDER TRACKER
   ──────────────────────────────────────────────
     □ Animated progress illustration per status
     □ Estimated time remaining per stage
     □ Push notification opt-in
     □ Order timeline with timestamps
     □ "Call waiter" button
     □ "Cancel order" with reason (if status = pending)
     □ Reorder button on completed orders
     □ Order receipt shareable via WhatsApp

   ★ ADMIN DASHBOARD
   ──────────────────────────────────────────────
     □ Today's revenue counter (animated odometer)
     □ Live customer count per table
     □ Menu item performance heatmap
     □ Staff performance metrics (chef prep times)
     □ Table turnover rate
     □ Customer satisfaction trend
     □ Real-time revenue graph (updates per order)
     □ Peak hour prediction

   ★ CHEF KDS
   ──────────────────────────────────────────────
     □ Order priority auto-sort (by time + table size)
     □ Ingredient aggregation ("Total: 5× Butter Chicken across 3 orders")
     □ Prep timer per item (not just per order)
     □ "Bump" gesture (swipe to mark ready)
     □ Color-blind safe urgency indicators
     □ Voice announcement of new orders
     □ Kitchen efficiency stats (avg prep time today)

3. USE CASE CLASSIFICATION
   Every use case gets classified:
     MUST-HAVE:  Missing = broken experience
     SHOULD-HAVE: Missing = noticeably worse than competitors
     DELIGHT:     Present = memorable, shareable, "wow"
     FUTURE:      Good idea but not for v1

4. EFFORT ESTIMATION
   Each use case gets:
     T-shirt size: XS (< 2 hours) | S (half day) | M (1 day) | L (2-3 days) | XL (1 week+)
     Dependencies: what must exist first
     Risk: low | medium | high (what could go wrong)
```

### Output Format

```
💡 IDEATOR REPORT — {Screen Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USE CASE #{number}
  Title:       {short descriptive name}
  Screen:      {route / component}
  Type:        MUST-HAVE | SHOULD-HAVE | DELIGHT | FUTURE
  Size:        XS | S | M | L | XL
  Description: {what the user sees / does}
  Why:         {why this matters — user benefit}
  How:         {brief technical approach}
  Depends on:  {prerequisite features / data}
  Risk:        {what could go wrong}
  Mockup hint: {rough layout description for CRAFTER}

  Visual reference: {link to Swiggy/Zomato/etc. if applicable}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Agent 3: ARBITER — The Human Approval Gate

> **Role:** Mediator between IDEATOR proposals and human decision-maker. Nothing gets built without explicit human sign-off. Presents proposals clearly, captures preferences, and produces the approved backlog.

### Identity

```
Name:       ARBITER
Type:       Product owner proxy
Runs on:    Interactive human conversation
Parallel:   YES — runs after IDEATOR produces proposals
Trigger:    IDEATOR output ready
```

### Responsibilities

```
1. PROPOSAL PRESENTATION
   Present IDEATOR use cases to the human in batches:
     Batch 1: MUST-HAVE items (non-negotiable quality bar)
     Batch 2: SHOULD-HAVE items (competitive parity)
     Batch 3: DELIGHT items (differentiators)
     Batch 4: FUTURE items (for roadmap only)

2. PRESENTATION FORMAT (per batch)

   ┌─────────────────────────────────────────────────────┐
   │ 🎯 APPROVAL NEEDED — Batch {N}: {Category}          │
   │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
   │                                                     │
   │ UC-{ID}: {Title}                                    │
   │ Size: {T-shirt} | Screen: {route}                   │
   │ {2-3 sentence description of what user experiences} │
   │                                                     │
   │ 👍 Approve   👎 Skip   ✏️ Modify                    │
   │                                                     │
   │ [If modify: what would you change?]                 │
   │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
   │ UC-{ID}: {Title}                                    │
   │ ...                                                 │
   └─────────────────────────────────────────────────────┘

3. HUMAN INTERACTION RULES
   □ Present MAX 5 use cases per batch (don't overwhelm)
   □ Provide visual context (LENS screenshots annotated)
   □ Include effort estimate so human can prioritize
   □ Accept: "yes", "no", "yes but change X", "defer to v2"
   □ Track all decisions in APPROVED_BACKLOG
   □ Never assume approval — explicit "approved" required
   □ If human says "you decide" — ARBITER picks MUST-HAVE only
   □ Ask design preference questions:
     - "Do you prefer this interaction pattern or this one?"
     - "Should the animation be subtle or dramatic?"
     - "Which layout feels more premium for your restaurant?"

4. DESIGN PREFERENCE INTERVIEW
   Before use case approval, ARBITER runs a quick design pulse:

   Round 1: Menu Card Layout
     "Which food card style do you prefer?"
     A) Horizontal — image left, text right (Swiggy-style)
     B) Vertical — full-width image top, text below (Instagram-style)
     C) Compact — small thumbnail left, stacked text right (list-style)
     D) Magazine — alternating large/small cards (editorial-style)

   Round 2: Color Temperature
     "What mood should the menu evoke?"
     A) Warm (amber, terracotta, cream — cozy, inviting)
     B) Cool (slate, sage, ivory — clean, modern)
     C) Bold (deep charcoal, vibrant accent — dramatic, premium)
     D) Playful (bright, multi-color — fun, casual)

   Round 3: Animation Intensity
     "How much animation?"
     A) Minimal — subtle fades, quick transitions (< 200ms)
     B) Moderate — smooth slides, gentle springs (200-400ms)
     C) Expressive — bouncy, playful, noticeable (400-600ms)
     D) Cinematic — dramatic reveals, staggered sequences (600ms+)

   Round 4: Typography Personality
     "What typographic voice?"
     A) Elegant serif (Playfair Display, Cormorant — fine dining)
     B) Modern geometric (DM Sans, Outfit — contemporary café)
     C) Friendly rounded (Nunito, Quicksand — family restaurant)
     D) Bold display (Cabinet Grotesk, Clash Display — trendy bar)
     E) Mix: display heading + clean body (best of both)

   Round 5: Density Preference
     "How much information on screen?"
     A) Spacious — fewer items visible, large images, breathing room
     B) Balanced — moderate density, good scannability
     C) Dense — more items visible, compact cards, efficient scanning
```

### Output Format

```
✅ APPROVED BACKLOG — {Date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DESIGN PREFERENCES:
  Card layout:    {chosen option}
  Color mood:     {chosen option}
  Animation:      {chosen option}
  Typography:     {chosen option}
  Density:        {chosen option}
  Notes:          {any human comments}

APPROVED USE CASES (build these):
  □ UC-001: {title} [MUST-HAVE, Size M]
  □ UC-002: {title} [SHOULD-HAVE, Size S]
  □ UC-003: {title} [DELIGHT, Size L] — modified: {human note}
  ...

SKIPPED (do not build):
  ✗ UC-004: {title} — Reason: {human said}
  ...

DEFERRED TO V2:
  ⏳ UC-005: {title}
  ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Agent 4: SENTINEL — The Test Case Agent

> **Role:** Writes comprehensive frontend test cases from LENS defects + ARBITER-approved use cases. Tests cover visual regression, interaction correctness, accessibility, performance, and edge cases.

### Identity

```
Name:       SENTINEL
Type:       QA engineer (test writer, not executor)
Runs on:    Reads LENS report + APPROVED_BACKLOG
Parallel:   YES — runs after ARBITER approval
Trigger:    APPROVED_BACKLOG finalized
```

### Responsibilities

```
1. TEST CATEGORIES

   VISUAL REGRESSION TESTS (from LENS defects)
   ────────────────────────────────────────────
   For every LENS defect, write a test that:
     □ Describes the expected visual state
     □ Specifies viewport (mobile/tablet/desktop)
     □ Identifies the selector/component
     □ Defines pass/fail criteria
     □ Includes screenshot comparison baseline

   INTERACTION TESTS (from approved use cases)
   ────────────────────────────────────────────
   For every approved use case, write tests for:
     □ Happy path (user does the intended thing)
     □ Edge case (unexpected input, rapid taps, network loss)
     □ Error recovery (what happens when it fails)
     □ State persistence (reload, back button, tab switch)

   ACCESSIBILITY TESTS
   ────────────────────────────────────────────
     □ Keyboard navigation (Tab, Enter, Escape, Arrow keys)
     □ Screen reader labels (aria-label, alt text, roles)
     □ Color contrast (WCAG AA minimum)
     □ Focus indicators (visible focus ring)
     □ Reduced motion preference (prefers-reduced-motion)
     □ Touch targets (minimum 44×44px)
     □ Semantic HTML (headings hierarchy, landmarks)

   PERFORMANCE TESTS
   ────────────────────────────────────────────
     □ First Contentful Paint < 1.2s (customer menu)
     □ Time to Interactive < 2.5s (customer menu)
     □ Cumulative Layout Shift < 0.1
     □ Largest Contentful Paint < 2.5s
     □ No jank during scroll (60fps)
     □ Image lazy loading (below-fold images)
     □ Bundle size regression check

   ANIMATION TESTS
   ────────────────────────────────────────────
     □ Animation plays on trigger (not before)
     □ Animation respects prefers-reduced-motion
     □ No layout shift during animation
     □ Animation completes (doesn't stutter/freeze)
     □ Easing curve matches BRAND_ASSETS.md spec
     □ Duration within spec (±50ms tolerance)

   RESPONSIVE TESTS
   ────────────────────────────────────────────
     □ Content readable at 320px (smallest phone)
     □ No horizontal scroll at any viewport
     □ Touch-friendly at mobile viewports
     □ Mouse-friendly at desktop viewports
     □ Orientation change (portrait ↔ landscape)
     □ Safe area inset handling (notch phones)

2. TEST CASE FORMAT

   Every test case follows this structure:

   TC-{SCREEN}-{NUMBER}
   ─────────────────────────────────────
   Title:       {what is being tested}
   Screen:      {route}
   Viewport:    {mobile | tablet | desktop | all}
   Category:    {visual | interaction | a11y | perf | animation | responsive}
   Source:      {LENS defect ID | UC-{id} from IDEATOR}
   Priority:    P0 (blocks release) | P1 (must fix) | P2 (should fix) | P3 (nice to fix)

   Preconditions:
     - {state required before test}

   Steps:
     1. {action}
     2. {action}
     3. {observe}

   Expected:
     - {specific expected outcome}

   Pass criteria:
     - {measurable success condition}

   Fail triggers:
     - {what constitutes failure — sent to CRAFTER for fix}
   ─────────────────────────────────────

3. CRITICAL TEST AREAS (NON-NEGOTIABLE)

   The following test areas are P0 — if any fail, the screen does not ship:

   CUSTOMER MENU:
     □ TC-MENU-001: Menu loads within 1.5s on 4G (Lighthouse simulated)
     □ TC-MENU-002: All food images load as WebP via Cloudinary
     □ TC-MENU-003: Veg/nonveg badge correctly positioned and colored
     □ TC-MENU-004: "ADD" button triggers cart state update
     □ TC-MENU-005: Item detail sheet opens with spring animation
     □ TC-MENU-006: Customization radio/checkbox works (single/multi/required)
     □ TC-MENU-007: Required customization blocks add without selection
     □ TC-MENU-008: Category tabs sticky on scroll
     □ TC-MENU-009: Active category highlights on scroll spy
     □ TC-MENU-010: Search filters items in < 300ms (debounced)
     □ TC-MENU-011: Empty search shows "No items found" state
     □ TC-MENU-012: Menu adapts to restaurant brand color
     □ TC-MENU-013: Price shows ₹ symbol correctly
     □ TC-MENU-014: MRP strikethrough when discounted
     □ TC-MENU-015: Bestseller badge renders on marked items

   CART:
     □ TC-CART-001: Cart persists on page reload (localStorage)
     □ TC-CART-002: Cart clears on different restaurant QR scan
     □ TC-CART-003: Quantity increment/decrement works
     □ TC-CART-004: Remove at qty 0 or swipe-to-delete
     □ TC-CART-005: Subtotal recalculates on every change
     □ TC-CART-006: Floating cart bar shows correct count + total
     □ TC-CART-007: Cart drawer opens with spring animation
     □ TC-CART-008: Empty cart hides floating bar
     □ TC-CART-009: Customization details visible in cart item
     □ TC-CART-010: "Proceed to Order" navigates to checkout

   ORDER TRACKER:
     □ TC-TRACK-001: Status updates via WebSocket < 1s
     □ TC-TRACK-002: Polling fallback at 10s when socket disconnects
     □ TC-TRACK-003: Each status step visually distinct
     □ TC-TRACK-004: Cancelled order shows reason
     □ TC-TRACK-005: "Reconnecting" banner on socket loss
```

### Handoff

```
SENTINEL output → CRAFTER (to inform build) + ARTISAN (to execute tests)
Test cases are the contract. CRAFTER builds to pass them. ARTISAN verifies.
```

---

## Agent 5: ARTISAN — The QA & Design Audit Agent

> **Role:** Quality guardian. Executes SENTINEL test cases, audits design fidelity against BRAND_ASSETS.md, scores every screen, and produces PASS/FAIL verdicts.

### Identity

```
Name:       ARTISAN
Type:       Senior QA + design auditor
Runs on:    Built screens (CRAFTER output) + SENTINEL test cases
Parallel:   YES — runs after CRAFTER delivers
Trigger:    CRAFTER marks a screen as "ready for audit"
```

### Responsibilities

```
1. TEST EXECUTION
   Run every SENTINEL test case:
     □ Automated: Playwright tests for interaction + visual regression
     □ Manual: design fidelity checks against BRAND_ASSETS.md
     □ Tools: Lighthouse for performance, axe-core for accessibility

2. DESIGN FIDELITY AUDIT — 40-POINT CHECKLIST

   COLORS (10 points)
     □ Primary color matches BRAND_ASSETS.md hex (±0 tolerance)
     □ Secondary color correct
     □ Background color correct
     □ Surface/card color correct
     □ Text colors correct (primary, secondary, muted)
     □ Veg badge = #0F8A1F, Nonveg badge = #E23744
     □ Success/warning/error states use correct colors
     □ No unapproved colors anywhere
     □ Color contrast passes WCAG AA (4.5:1 text, 3:1 UI)
     □ Dark mode colors correct (if applicable)

   TYPOGRAPHY (8 points)
     □ Display font matches BRAND_ASSETS.md spec
     □ Body font matches spec
     □ Price font matches spec (weight, size)
     □ Font sizes match mobile spec (exact px/rem)
     □ Font weights correct per role
     □ Line heights comfortable (1.4-1.6 for body)
     □ No font loading flash (FOUT/FOIT)
     □ Text truncation uses ellipsis where specified

   SPACING (6 points)
     □ Card gap matches spec
     □ Section gap matches spec
     □ Side padding matches spec (16px mobile, 24px desktop)
     □ Consistent internal padding on cards
     □ No spacing anomalies between components
     □ Max-width constraint respected (480px customer, 1440px admin)

   COMPONENTS (8 points)
     □ Button styles match spec (radius, fill, shadow)
     □ Card styles match spec (radius, border, shadow)
     □ Input fields match spec (height, border, focus ring)
     □ Badges match spec (veg/nonveg, bestseller, tags)
     □ Icons from Lucide React, correct size + stroke width
     □ Modal/sheet behavior matches spec (slide direction, spring)
     □ Navigation matches spec (sidebar/tabs/bottom nav)
     □ Loading states match spec (skeletons, not spinners)

   ANIMATION (4 points)
     □ Page entry animation matches spec
     □ Card interaction animation matches spec
     □ Add-to-cart animation matches spec
     □ All animations respect prefers-reduced-motion

   RESPONSIVE (4 points)
     □ Mobile (375px) layout correct
     □ Tablet (768px) layout correct
     □ Desktop (1440px) layout correct
     □ No breakage between breakpoints (resize test)

3. SCORING

   Each screen gets a score out of 40:
     38-40: ✅ PASS — ship it
     34-37: ✅ PASS WITH NOTES — ship but log issues for polish sprint
     28-33: ❌ FAIL — 3+ critical issues, send back to CRAFTER
     < 28:  🚨 ESCALATE — fundamental design problems, human must intervene

4. AI SLOP DETECTION (ZERO TOLERANCE)

   ARTISAN flags and FAILS any screen exhibiting:
     □ Inter or Roboto as primary font
     □ Purple gradient backgrounds
     □ Generic card layouts with no personality
     □ Stock illustration empty states (undraw.co defaults)
     □ Equal-width grid with no hierarchy
     □ Oversized padding that wastes mobile viewport
     □ Generic "Loading..." text instead of branded skeleton
     □ "Something went wrong" without character or brand voice
     □ Gray/slate everything (no color confidence)
     □ Identical component styling across unrelated screens
     □ Drop shadows that don't match light source
     □ Rounded corners inconsistent across component types
     □ Buttons with no hover/active state differentiation
     □ Form inputs that look like every other SaaS app
     □ Toast notifications with no brand personality
```

### Output Format

```
🔍 ARTISAN AUDIT — {Screen Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score: {N}/40
Verdict: PASS | PASS WITH NOTES | FAIL | ESCALATE

CHECKLIST:
  Colors:     {N}/10  [details of misses]
  Typography: {N}/8   [details of misses]
  Spacing:    {N}/6   [details of misses]
  Components: {N}/8   [details of misses]
  Animation:  {N}/4   [details of misses]
  Responsive: {N}/4   [details of misses]

TEST RESULTS:
  Passed: {N}/{total}
  Failed: {list of TC-IDs with failure details}

AI SLOP DETECTED:
  {list of violations, or "None — clean build"}

ACTION ITEMS:
  🔴 MUST FIX (blocks ship):
    - {specific issue + component + how to fix}
  🟡 SHOULD FIX (before next audit):
    - {specific issue}
  🟢 POLISH (backlog):
    - {specific issue}

VERDICT REASONING:
  {2-3 sentences explaining the verdict}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ If FAIL: send to CRAFTER with ACTION ITEMS
→ If PASS: proceed to next screen
→ Max 3 FAIL loops per screen before ESCALATE
```

---

## Agent 6: CRAFTER — The UI/UX Builder Agent

> **Role:** The hands. Takes approved use cases (ARBITER), design preferences, BRAND_ASSETS.md tokens, and test cases (SENTINEL), and builds production-grade frontend code that passes ARTISAN audit.

### Identity

```
Name:       CRAFTER
Type:       Senior frontend engineer + UI/UX designer hybrid
Runs on:    Approved backlog + BRAND_ASSETS.md + SENTINEL test cases
Parallel:   YES — builds while ARTISAN audits previous deliverables
Trigger:    APPROVED_BACKLOG + design preferences ready
```

### Core Design Principles (CRAFTER's Bible)

```
1. FOOD IS THE HERO
   Every design decision serves the food photography.
   The UI is the frame. The food is the painting.
   If a UI element competes with the food image for attention, the UI element loses.

2. THUMB-ZONE FIRST
   80% of customers are on phones, one-handed, standing in a restaurant.
   Primary actions live in the bottom 60% of the screen.
   "ADD" button, cart bar, category tabs — all thumb-reachable.

3. PROGRESSIVE REVELATION
   First: show the food (image + name + price)
   Then: let them tap for more (description, customization, allergens)
   Never front-load information that delays the "I want that" moment.

4. MOTION = MEANING
   Every animation communicates something:
     - Item slides into cart → "your choice was registered"
     - Cart icon bounces → "your cart has something new"
     - Status bar fills → "progress is happening"
   If an animation doesn't communicate, remove it.

5. BRAND-FLUID, NOT BRAND-LOCKED
   QR Dine serves thousands of restaurants. The design system
   must look premium with ANY brand color. Test every component with:
     - Deep red (#B91C1C) — Indian restaurant
     - Forest green (#166534) — organic café
     - Royal blue (#1E40AF) — modern bistro
     - Warm amber (#D97706) — casual diner
     - Pure black (#171717) — premium bar
   If it only looks good with one color, it's not a design system.
```

### Build Sequence (per screen)

```
CRAFTER builds each screen in this order:

STEP 1: STUDY
  □ Read BRAND_ASSETS.md (complete)
  □ Read ARBITER design preferences
  □ Read SENTINEL test cases for this screen
  □ Study LENS screenshots of current state
  □ Study reference designs (Swiggy, Zomato, DoorDash, Uber Eats)

STEP 2: DESIGN TOKENS
  □ Map brand colors to CSS variables / Tailwind config
  □ Configure fonts via next/font
  □ Set spacing scale
  □ Define component variants (button sizes, card types, badge styles)

STEP 3: COMPONENT ARCHITECTURE
  □ Break screen into atomic components
  □ Define props interface (TypeScript strict)
  □ Plan state management (Zustand for cart, TanStack Query for server)
  □ Plan animation sequences (Framer Motion variants)

STEP 4: BUILD (mobile-first)
  □ Build at 375px width FIRST
  □ Then expand to 768px, then 1440px
  □ Every component tested at all three viewports before moving on

STEP 5: ANIMATE
  □ Page entry sequence (staggered reveals)
  □ Interaction micro-animations (add-to-cart, tab switch, sheet open)
  □ Loading transitions (skeleton → content)
  □ Status change animations (order tracker)

STEP 6: POLISH
  □ Empty states (illustrated, branded, actionable)
  □ Error states (friendly, specific, retry-able)
  □ Loading states (skeleton screens, not spinners)
  □ Overflow handling (long names, many items, large prices)
  □ Edge cases (single item menu, 100-item category, ₹10000 item)

STEP 7: SELF-AUDIT
  □ Run SENTINEL test cases mentally
  □ Check against 40-point ARTISAN checklist
  □ Verify no AI slop patterns
  □ Submit to ARTISAN
```

### Customer Menu — Premium Component Specs

```
CRAFTER uses these as the minimum bar for the customer menu.
These are NOT suggestions — they are requirements.

MENU HEADER
━━━━━━━━━━
  Restaurant logo (40×40px, rounded): left-aligned
  Restaurant name: display font, bold, primary text color
  Table badge: "Table 5" pill with subtle background
  Search icon: right-aligned, triggers full-screen search overlay
  Height: 56-64px
  Sticky: YES, with backdrop-blur(12px) on scroll
  Brand color accent: thin line or gradient at top edge

CATEGORY TABS
━━━━━━━━━━━━
  Style: horizontal scroll, no scrollbar visible (-webkit-scrollbar: none)
  Active indicator: brand-colored underline (2-3px), slides with Framer Motion layoutId
  Font: body font, 14px, semi-bold when active
  Spacing: 16px gap between tabs, 16px side padding
  Sticky: YES, below header
  Scroll behavior: active tab auto-scrolls to center
  Tap: smooth scroll to category section with offset for sticky headers
  Scroll spy: IntersectionObserver on category sections updates active tab

MENU ITEM CARD (THE MOST IMPORTANT COMPONENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VARIANT A — Horizontal (Swiggy-inspired, recommended):
  ┌─────────────────────────────────────────┐
  │                                         │
  │  ● Veg                     ┌─────────┐ │
  │  Paneer Tikka              │         │ │
  │  Marinated cottage cheese  │  IMAGE  │ │
  │  grilled in tandoor...     │ 120×120 │ │
  │                            │         │ │
  │  ★ Bestseller              └────┬────┘ │
  │  ₹220  ₹280               [  ADD  ]   │
  │                                         │
  └─────────────────────────────────────────┘

  VARIANT B — Vertical (Instagram-inspired):
  ┌─────────────────────────────────────────┐
  │ ┌─────────────────────────────────────┐ │
  │ │                                     │ │
  │ │           FULL-WIDTH IMAGE          │ │
  │ │            aspect 16:10             │ │
  │ │                                     │ │
  │ └─────────────────────────────────────┘ │
  │ ● Veg   ★ Bestseller                    │
  │ Paneer Tikka                             │
  │ Marinated cottage cheese...              │
  │ ₹220  ₹280                    [  ADD  ] │
  └─────────────────────────────────────────┘

  VARIANT C — Magazine (alternating hero + compact):
  First item in category: VARIANT B (hero-size, full width)
  Remaining items: VARIANT A (compact horizontal)
  Creates visual hierarchy — the "hero" item draws the eye.

  Card details:
    □ Veg/nonveg badge: 12×12px square with rounded corners
      Green (#0F8A1F) = veg, Red (#E23744) = nonveg,
      Yellow (#FBBF24) = egg, Green+leaf = vegan
    □ Item name: heading font, 16px, semi-bold, max 2 lines, ellipsis
    □ Description: body font, 13px, secondary text color, max 2 lines
    □ Price: price font, 16px, bold, primary text color, "₹" prefix
    □ MRP: if different from price, show strikethrough, muted color
    □ Bestseller badge: small pill, amber/gold background, "★ Bestseller"
    □ Prep time: "~20 min" in caption font, muted, with clock icon
    □ Image: Cloudinary f_auto,q_auto,w_300 (horizontal) or w_600 (vertical)
             Rounded corners matching card radius
             Placeholder: shimmer skeleton during load
    □ ADD button: brand primary color, rounded-full, "ADD" text
                  On tap: transforms to quantity stepper [- N +]
                  Micro-animation: scale(0.95) → scale(1) spring bounce
    □ Customizable indicator: "customisable" text below ADD if item has groups
    □ Card tap: opens ItemDetailSheet (except ADD button which adds directly)
    □ Card background: surface color
    □ Card border: 1px border color (subtle), or no border with elevation shadow
    □ Card gap: 12px between cards

ITEM DETAIL SHEET
━━━━━━━━━━━━━━━━
  Trigger: tap on menu item card (anywhere except ADD button)
  Type: bottom sheet (Framer Motion AnimatePresence + drag-to-dismiss)
  Max height: 85vh
  Border radius: 16px top corners
  Drag indicator: 4px × 40px rounded bar at top center

  Content (top to bottom):
    □ Hero image: full-width, aspect 16:10, Cloudinary w_800
    □ Veg/nonveg badge: overlaid on image, top-left, 8px margin
    □ Item name: display font, 20px, bold
    □ Description: body font, 14px, secondary text, full (no truncation)
    □ Price: 18px, bold + MRP strikethrough if applicable
    □ Divider line
    □ Customization groups (if any):
        Group title: "Choose Spice Level" (heading font, 14px, semi-bold)
        Required indicator: red "Required" pill if group is required
        Options: radio buttons (single) or checkboxes (multi)
          Each option: name + price delta ("Extra Cheese +₹30")
          Selected state: brand primary color fill
    □ Special instructions: text input, placeholder "Any special requests?"
    □ Bottom action bar (sticky, elevated):
        Quantity stepper [- N +]: left side
        "Add to Cart — ₹{total}": right side, brand primary, full-width feel
        Total updates live as customizations selected

FLOATING CART BAR
━━━━━━━━━━━━━━━━
  Position: fixed bottom, 16px side margin, 16px bottom margin (above safe area)
  Visibility: hidden when cart empty, slides up (spring) on first item added
  Content:
    Left: "{N} item(s) | ₹{total}" — body font, white text
    Right: "View Cart →" — button font, white text
  Background: brand primary color, rounded-xl (16px), shadow-lg
  Tap: opens CartDrawer
  Animation: on new item added, bar does a subtle y-bounce (translateY -4px → 0)
  Cart icon: optional small cart icon with item count badge (spring scale on change)

CART DRAWER
━━━━━━━━━━
  Type: bottom sheet, 90vh max height, drag-to-dismiss
  Header: "Your Cart" + "×" close button
  Item list: scrollable
    Each item row:
      □ Item name (heading font, 14px)
      □ Customizations (caption, muted: "Extra Cheese, Hot")
      □ Quantity stepper [- N +]
      □ Item total price (price font, 14px, right-aligned)
      □ Special note (if set): small text below name
      □ Swipe left to reveal "Remove" (destructive red)
  Footer (sticky):
    □ Subtotal line: "Subtotal: ₹{amount}"
    □ Tax hint: "Taxes calculated at checkout" (caption, muted)
    □ "Proceed to Checkout" button: brand primary, full-width, rounded
    □ "Add more items" text link: closes drawer, scrolls to menu top

SEARCH OVERLAY
━━━━━━━━━━━━━
  Trigger: search icon tap in header
  Type: full-screen overlay, slides down from top
  Input: auto-focused, large font, placeholder "Search menu..."
  Results: filtered menu items as compact cards
  Debounce: 300ms
  Highlight: matching text highlighted in brand primary color
  Empty: "No items match '{query}'" with illustration
  Close: "×" button or swipe down

FILTER CHIPS
━━━━━━━━━━━
  Position: below category tabs (or inline with)
  Chips: "Veg", "Non-Veg", "Bestseller"
  Style: pill-shaped, outlined (inactive), filled (active)
  Behavior: toggle on/off, combinable
  Animation: chip background fills with spring on tap
```

### Design Quality Enforcement

```
CRAFTER self-checks against these anti-patterns before submitting:

NEVER DO:
  ✗ Use Inter, Roboto, Arial, system-ui as primary font
  ✗ Use purple/violet as primary brand color
  ✗ Use generic gray cards with no personality
  ✗ Use CSS transitions when Framer Motion is available
  ✗ Use setTimeout for animation timing
  ✗ Use fixed pixel widths on mobile (use %, vw, or max-width)
  ✗ Use browser default form elements without styling
  ✗ Use "Loading..." text (use skeleton screens)
  ✗ Use generic error messages ("Something went wrong")
  ✗ Use horizontal scrolling for content (only for carousels/tabs)
  ✗ Use auto-playing anything without user control
  ✗ Place important actions above thumb reach on mobile
  ✗ Forget empty states
  ✗ Forget loading states
  ✗ Forget error states

ALWAYS DO:
  ✓ Use next/font for font loading (no layout shift)
  ✓ Use next/image with Cloudinary loader for food photos
  ✓ Use Framer Motion for all animations (variants, AnimatePresence, layout)
  ✓ Use Zustand for cart state (with persist middleware)
  ✓ Use TanStack Query for server state (with suspense)
  ✓ Use Zod for form validation
  ✓ Use shadcn/ui as component base, then HEAVILY customize
  ✓ Test with restaurant brand colors (red, green, blue, amber, black)
  ✓ Build mobile (375px) first, then scale up
  ✓ Include prefers-reduced-motion fallbacks
  ✓ Include skeleton loading for every async section
  ✓ Include meaningful empty states with illustration + CTA
  ✓ Include error boundaries with retry buttons
  ✓ Use semantic HTML (nav, main, section, article, aside)
  ✓ Use aria-labels on all interactive elements
```

---

## Pipeline Orchestration — Parallel Execution Map

```
TIME →  ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
        │  LENS    │ IDEATOR  │ ARBITER  │ SENTINEL │ CRAFTER  │ ARTISAN  │
        ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
  T0    │ Snapshot │ Read     │ Wait     │ Wait     │ Wait     │ Wait     │
        │ all      │ codebase │          │          │          │          │
        │ screens  │ + refs   │          │          │          │          │
        ├──────────┼──────────┤          │          │          │          │
  T1    │ Report   │ Generate │          │          │          │          │
        │ defects  │ use cases│          │          │          │          │
        ├──────────┼──────────┼──────────┤          │          │          │
  T2    │          │ Done     │ Present  │          │          │          │
        │          │          │ to human │          │          │          │
        │          │          │ Batch 1  │          │          │          │
        ├──────────┤          ├──────────┤          │          │          │
  T3    │          │          │ Present  │          │          │          │
        │          │          │ Batch 2  │          │          │          │
        │          │          │ Design   │          │          │          │
        │          │          │ prefs    │          │          │          │
        ├──────────┤          ├──────────┼──────────┼──────────┤          │
  T4    │          │          │ Approved │ Write    │ Build    │          │
        │          │          │ backlog  │ tests    │ Screen 1 │          │
        │          │          │ final    │ for S1   │ (menu)   │          │
        ├──────────┤          │          ├──────────┼──────────┼──────────┤
  T5    │          │          │          │ Write    │ Build    │ Audit    │
        │          │          │          │ tests    │ Screen 2 │ Screen 1 │
        │          │          │          │ for S2   │ (cart)   │          │
        ├──────────┼──────────┤          ├──────────┼──────────┼──────────┤
  T6    │ Re-snap  │          │          │          │ Fix S1   │ Report   │
        │ Screen 1 │          │          │          │ if FAIL  │ S1       │
        │ (post-   │          │          │          │          │          │
        │ build)   │          │          │          │          │          │
        ├──────────┤          │          │          ├──────────┼──────────┤
  T7    │          │          │          │          │ Build    │ Audit    │
        │          │          │          │          │ Screen 3 │ Screen 2 │
        │          │          │          │          │ (tracker)│          │
        ├──────────┤          │          │          ├──────────┼──────────┤
  ...   │ ...      │          │          │          │ ...      │ ...      │
        └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

KEY: Agents T0-T3 run in the DISCOVERY LAYER
     Agents T4+ run in the BUILD LAYER
     LENS re-runs after every CRAFTER build for regression
     ARTISAN always runs one screen behind CRAFTER (pipeline overlap)
```

---

## Screen Priority Order (CRAFTER builds in this sequence)

```
PRIORITY 1 — CUSTOMER-FACING (build these FIRST, audit strictest)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. /m/[slug]                → Customer menu (THE flagship)
  2. /m/[slug] item detail    → Item detail bottom sheet
  3. /m/[slug] cart            → Cart drawer + floating bar
  4. /m/[slug]/checkout        → Checkout page
  5. /m/[slug]/order/[id]      → Order tracker
  6. /m/[slug]/bill/[id]       → Bill view

PRIORITY 2 — ADMIN (build second, audit standard)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  7. /dashboard                → Dashboard home
  8. /dashboard/orders         → Live orders
  9. /dashboard/menu           → Menu management
  10. /dashboard/tables        → Table management
  11. /dashboard/billing       → Billing
  12. /dashboard/analytics     → Analytics
  13. /dashboard/settings      → Settings

PRIORITY 3 — CHEF + AUTH (build last, audit standard)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  14. /kds                     → Kitchen display
  15. /login                   → Admin login
  16. /chef-login              → Chef PIN entry
  17. /signup                  → Registration
  18. /onboarding              → Onboarding wizard
```

---

## Escalation Protocol

```
When an agent gets stuck or a screen fails 3 audit loops:

🚨 ESCALATION — {Agent Name} → Human
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screen:    {route}
Agent:     {who is stuck}
Issue:     {specific problem}
Attempts:  {N}/3
What was tried:
  1. {first attempt summary}
  2. {second attempt summary}
  3. {third attempt summary}
Root cause: {agent's best guess}
Suggested fix: {what the human could do}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Human options:
  A) Provide guidance → agent retries
  B) Lower quality bar → ARTISAN adjusts pass threshold
  C) Skip screen → move to next, come back later
  D) Take over → human builds it manually
```

---

## Design Reference Library

> **CRAFTER and IDEATOR study these for inspiration. Never copy — absorb and exceed.**

### Food Delivery Apps (Benchmark — meet or beat)
```
Swiggy:       Category tabs, horizontal item cards, bottom cart bar
Zomato:       Full-bleed food images, restaurant branding, search UX
DoorDash:     Clean typography, group ordering, item detail sheet
Uber Eats:    Map integration, estimated times, promotional banners
Rappi:        Playful animations, category illustrations, dark mode
```

### Premium Dining Apps (Aspiration — the vibe to chase)
```
Resy:         Minimal, editorial, black + accent color, serif typography
Tock:         Photo-forward, full-bleed imagery, smooth transitions
SevenRooms:   Hospitality-grade, warm tones, personal touch
```

### Design Patterns Worth Stealing
```
Apple.com:        Scroll-triggered reveals, restraint, typography mastery
Stripe:           Gradient meshes, spatial depth, micro-interactions
Linear:           Precision, dark mode excellence, keyboard-first
Notion:           Content-first, flexible layouts, playful illustrations
Vercel:           Performance consciousness visible in design
```

---

## Immutable Design Laws (CRAFTER + ARTISAN enforce these)

```
LAW 1: THE 3-SECOND RULE
  A customer must see food within 3 seconds of landing on /m/[slug].
  No splash screens. No welcome modals. No permission prompts. Food first.

LAW 2: THE THUMB RULE
  Any action a customer does more than once per visit lives in thumb-zone.
  ADD button, cart, category tabs = bottom 60% of screen. Always.

LAW 3: THE BRAND CHAMELEON
  Every component must look premium with any brand color.
  Test with 5 different hues before shipping. No color assumptions.

LAW 4: THE EMPTY STATE RULE
  Every screen that CAN be empty MUST have a designed empty state.
  No blank pages. No "No data". An illustration + message + action.

LAW 5: THE SKELETON RULE
  If it takes more than 100ms to load, show a skeleton.
  Skeletons match the layout of the loaded content exactly.
  Shimmer animation: left-to-right sweep, subtle, 1.5s duration.

LAW 6: THE 60FPS RULE
  All animations at 60fps. If a frame drops, the animation is broken.
  Use transform + opacity only. No animating width/height/margin.
  Framer Motion handles this — use it. No CSS animation hacks.

LAW 7: THE ZERO-SCROLL-LOCK RULE
  Never prevent scrolling. Even with modals open, the sheet/overlay
  handles its own scroll. Background content scrolls with overscroll containment.

LAW 8: THE ₹ RULE
  Price ALWAYS shows with ₹ symbol. Right-aligned or left with item name.
  Font: mono-width digits (tabular-nums) so prices align vertically.
  Discounted price: original in strikethrough muted, current in bold primary.

LAW 9: THE SOUND-OFF DEFAULT
  All sounds off by default. Admin/chef can enable.
  No customer-facing sounds. Ever. Restaurants are noisy enough.

LAW 10: THE ONE-TAP PRINCIPLE
  Any primary action takes one tap. Not two. Not a long-press.
  ADD = one tap. View Cart = one tap. Place Order = one tap.
  Confirmations only for destructive/financial actions.
```

---

## Human Verification Checklist (After Full Pipeline Run)

```
🏁 FRONTEND AUDIT COMPLETE — Human Final Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CUSTOMER MENU (/m/[slug]):
  □ Open on your actual phone (not devtools simulator)
  □ Food images load crisp and fast (< 1.5s)
  □ Scroll feels native-smooth (no jank)
  □ Category tabs highlight correctly on scroll
  □ "ADD" button works on simple items
  □ Item detail sheet opens smoothly
  □ Customizations render and work (radio/checkbox/required)
  □ Cart bar appears after first add
  □ Cart drawer shows all items correctly
  □ Checkout flow reaches order confirmation
  □ Order tracker shows correct status
  □ Does this look like Swiggy/Zomato quality? YES / NO

ADMIN DASHBOARD (/dashboard):
  □ Open on desktop (1440px+)
  □ Sidebar navigation works
  □ Menu management: create category + item
  □ Tables management: create table + generate QR
  □ Live orders: see new orders in real-time
  □ Analytics: charts render with correct data

CHEF KDS (/kds):
  □ Open on tablet (768px)
  □ New orders appear in real-time
  □ Timer updates and color-codes correctly
  □ "ALL READY" marks order as ready

BRAND FIDELITY:
  □ Colors match BRAND_ASSETS.md
  □ Fonts match BRAND_ASSETS.md
  □ No AI slop detected (generic fonts, purple gradients, lifeless cards)
  □ "Does this look designed by a premium agency?" YES / NO

Reply "verified" when all checks pass.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

*This pipeline exists because "looks fine" is not a quality bar. "Looks like a multi-million-dollar food app" is. Every agent serves that bar. No shortcuts.*
