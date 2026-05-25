# ScanBite — Ultra-Modern Frontend Design Specification

> Derived from the official `brandassets/app.css`, context files, and mockup HTML files. This is the law for every pixel. No AI slop. No generic dashboards. No emoji-buttons.

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Brand Token System](#2-brand-token-system)
3. [Typography Rules](#3-typography-rules)
4. [Spacing & Radius System](#4-spacing--radius-system)
5. [Shadow System](#5-shadow-system)
6. [Component Contracts — Customer Layer](#6-component-contracts--customer-layer)
7. [Component Contracts — Admin Dashboard](#7-component-contracts--admin-dashboard)
8. [Component Contracts — Kitchen Display (KDS)](#8-component-contracts--kitchen-display-kds)
9. [Animation Rules](#9-animation-rules)
10. [Anti-Pattern Blacklist](#10-anti-pattern-blacklist)
11. [Screen-by-Screen Design Audit Checklist](#11-screen-by-screen-design-audit-checklist)

---

## 1. Design Philosophy

ScanBite is NOT a generic B2B dashboard. It is a **hospitality product** — warm, food-forward, alive. The design must feel like a premium food delivery app crossed with a boutique POS system.

### Three Design Pillars

**1. Warmth before precision**
The brand color is `#FF4D3D` — a warm coral/tomato red, not a cold blue or neutral grey. Every decision should feel inviting, not clinical. The background is warm cream (`#FFF8F3`), not white. Ink is near-black with a warm undertone (`#14131A`).

**2. Real depth over flat shadows**
Every elevated element uses layered box-shadows (see Shadow System). No `shadow-md`, no single flat drop-shadow. Shadows must be color-tinted — coral shadows for brand elements, ink shadows for dark surfaces.

**3. Kinetic energy**
The product is live — orders arrive, timers count down, chefs cook. Every status transition must be animated. Tracking screens must feel alive with motion. Idle states should breathe (subtle pulse/float).

---

## 2. Brand Token System

These CSS variables are the **only** values that can be used for these properties. Never hardcode hex values where a token exists.

```css
/* ====== BRAND ====== */
--brand:       #FF4D3D;   /* Primary CTA, active nav, status indicators */
--brand-deep:  #E63B2C;   /* Hover state on brand elements */
--brand-soft:  #FFE8E4;   /* Background tint on brand highlights */
--brand-tint:  #FFF1EE;   /* Very subtle brand background */

/* ====== INK (Text) ====== */
--ink:         #14131A;   /* Primary text, high-contrast labels */
--ink-2:       #2A2933;   /* Secondary text, table rows */
--muted:       #6B6A75;   /* Placeholder text, metadata labels */
--muted-2:     #9A99A4;   /* Disabled text, hairline labels */
--hairline:    rgba(20,19,26,0.08);  /* Borders, dividers */
--hairline-2:  rgba(20,19,26,0.04); /* Very subtle separators */

/* ====== SURFACES ====== */
--bg:          #FFF8F3;   /* Page background — warm cream */
--bg-2:        #FFFCF8;   /* Slightly lighter cream, quick-action bars */
--surface:     #FFFFFF;   /* Cards, modals, inputs */
--surface-2:   #F6F2EC;   /* Subtle fill, image backgrounds */

/* ====== SEMANTIC ====== */
--green:       #1E9E5E;   /* Success, ready status, available tables */
--green-soft:  #E2F5EC;   /* Success background tint */
--amber:       #F2A500;   /* Warning, preparing status */
--amber-soft:  #FFF4DC;   /* Warning background tint */
--red:         #E03A30;   /* Error, critical KDS timer */
--blue:        #2E6EF7;   /* New order status badge */

/* ====== TRACKING SCREEN ACCENTS ====== */
--sun:         #FFC627;   /* Order tracking hero yellow */
--sun-deep:    #F5A623;   /* Yellow hover state */
--sun-soft:    #FFF2C2;   /* Yellow tint background */
--night:       #1B1B22;   /* Dark surface in tracking screen */
```

### Per-Restaurant Theming
Each restaurant can override `--brand` and `--brand-deep` via CSS variable injection based on their `brand_color` DB field. All brand-derived values cascade from this single variable.

---

## 3. Typography Rules

### Font Stack
```
--sans:    'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
--display: 'Instrument Serif', 'Plus Jakarta Sans', serif;
--mono:    'JetBrains Mono', ui-monospace, monospace;
```

### Pairing Rules
- **Display (`Instrument Serif`)**: Hero headings, price displays, welcome greetings. Always weight 400 (the natural italic is the feature). Size minimum 24px. Use `em {}` tags for italic-brand-colored accents.
- **Sans (`Plus Jakarta Sans`)**: Everything else. Weights 500 (body), 600 (labels, chips), 700 (item names, card titles), 800 (KPI values, CTAs, critical info).
- **Mono (`JetBrains Mono`)**: KDS timers only. Never use mono in customer-facing screens.

### Size Scale (Do Not Deviate)
| Role | Size | Weight | Notes |
|---|---|---|---|
| Page hero | 34px | 400 display | Line-height 1.04, letter-spacing -0.01em |
| Card title (admin) | 22px | 800 sans | letter-spacing -0.01em |
| Section heading | 18px | 700 sans | letter-spacing -0.01em |
| KPI value | 28px | 800 sans | letter-spacing -0.02em |
| Card h3 | 15px | 800 sans | letter-spacing -0.005em |
| Body | 13.5px | 500 sans | line-height 1.55 |
| Metadata | 12px | 500 sans | color --muted |
| Labels/caps | 10-11px | 600-700 sans | letter-spacing 0.06-0.14em, uppercase |
| Price (large) | 22px | 800 sans | color --brand, letter-spacing -0.01em |

---

## 4. Spacing & Radius System

### Border Radius Tokens
```
--r-1: 8px    → Input corners, small chips, toggle knobs
--r-2: 14px   → Addon rows, option selectors, small cards
--r-3: 20px   → Menu cards, admin cards, cart items, bill cards
--r-4: 28px   → Promo hero cards, large feature sections
--r-5: 36px   → Full-width hero blocks, sheet modals
--r-pill: 999px → Tab bars, status pills, CTA buttons, chips
```

**Rules**:
- CTA buttons are always `--r-pill`, never squared corners
- Navigation items in admin sidebar: `border-radius: 10px`
- Tab bars float with `--r-pill` and dark background
- Food image containers within cards: `border-radius: 14px`

### Spacing
- Standard page gutter: `20px` (mobile), `28px` (desktop)
- Card internal padding: `18px` standard, `12-14px` compact
- Gap between cards: `16px` on desktop, `14px` on mobile grids
- Section stacks: `16px` gap between components

---

## 5. Shadow System

**Never use a single flat shadow.** Always use layered, multi-stop shadows.

```css
--sh-1: 0 1px 2px rgba(20,19,26,.04), 0 1px 0 rgba(20,19,26,.02);
/* Use for: subtle card lift, icon buttons, toggles */

--sh-2: 0 8px 24px -8px rgba(20,19,26,.10), 0 2px 6px -2px rgba(20,19,26,.06);
/* Use for: modals, floating cards, elevated panels */

--sh-3: 0 22px 60px -20px rgba(20,19,26,.22), 0 8px 18px -8px rgba(20,19,26,.10);
/* Use for: sheets, drawers, top-layer overlays */

--sh-coral: 0 14px 40px -10px rgba(255,77,61,.45);
/* Use for: brand CTA buttons, brand icon marks, logo marks */
```

**Color-tinted shadows rule**: Brand buttons cast coral shadow. Dark ink buttons cast ink-tinted shadow `0 14px 40px -10px rgba(20,19,26,.45)`. Yellow tracking elements cast amber shadow `0 22px 50px -20px rgba(245,166,35,.55)`.

---

## 6. Component Contracts — Customer Layer

### 6.1 Top Bar (`cust-topbar`)
- Left: Brand pin icon (38×38px, `--r-1`, `--brand` bg, coral shadow) + restaurant name (15px/700) + table label (11px/600, uppercase, muted)
- Right: Icon buttons (40×40px, `--r-2`, `--surface` bg, hairline border) with coral notification dot
- No text labels on icon buttons — icons only

### 6.2 Greeting Header (`cust-greet`)
- Uses `--display` font at 34px/400
- italic span in `--brand` color for the food word
- Subtitle in 14px/500 `--muted`
- **No emoji in the heading**

### 6.3 Search Bar
- Full width with horizontal gutter (20px sides)
- `--surface` background, `--hairline` border, `--r-3` radius
- 20px radius — not pill, not square
- Left icon: Lucide `Search` at 16px `--muted-2`
- Input: 14px/500, placeholder `--muted-2`

### 6.4 Category Chips
- Horizontal scrolling, no scrollbar visible
- Default state: `--surface` bg, `--hairline` border, `--r-pill`, 9px 16px padding
- Active state: `--ink` background, white text — **not brand color**
- Each chip has a 24×24 icon circle (`--surface-2` bg)
- **No emoji icons** — use SVG food category icons or colored dot indicators

### 6.5 Hero Promo Card
- Gradient: `linear-gradient(120deg, var(--brand) 0%, #FF7A4D 100%)`
- Coral shadow: `--sh-coral`
- Tag pill: `rgba(255,255,255,.22)` bg, `blur(6px)` backdrop-filter, pill shape
- Title: `--display` 28px, italic for accent word
- Art: Absolute positioned circle image, rotated 8deg, bottom-right overflow
- **No generic "20% OFF" clipart** — use actual food photography

### 6.6 Food Cards (Grid)
- 2-column grid, 14px gap
- Card: `--surface` bg, `--hairline` border, `--r-3` radius, 10px 10px 12px padding
- Image: Full width, 1:0.82 aspect ratio, `--r-2` radius, `--surface-2` placeholder
- Heart/wishlist: Absolute top-right, 30×30px frosted glass circle
- Name: 13.5px/700, letter-spacing -0.005em
- Meta: 11px/500 `--muted` with `veg-dot` indicator (FSSAI-standard square with circle, not leaf emoji)
- Price: 15px/700 `--ink`
- Add button: 30×30px brand square with `--r-1`, coral shadow — **not a pill, not labeled**

### 6.7 Tab Bar (Bottom Navigation)
- Dark floating pill: `--ink` background, `--r-pill`, 0 14px 8px padding
- Inactive items: `rgba(255,255,255,.5)` text, no background
- Active item: `--brand` background pill, white text, `flex: 1.4` (wider than inactive)
- **No emoji tab icons** — use Lucide icons only
- Floats with bottom margin, does NOT touch screen edge

### 6.8 Food Detail Sheet
- Hero: 360px tall full-bleed image with gradient overlay bottom 40%→45% opacity
- Back button: 42×42 frosted glass circle (90% white, blur 6px)
- Price chip: Floating at bottom-left of hero, inside white pill
- Body pulls up over hero with 36px top radius (slide-up reveal)
- Customization options: Pill-shaped selection group, active state `--ink` bg

### 6.9 Cart Drawer
- Cart items: `--surface` bg, `--r-3`, `--hairline` border, flex row with 72×72 image
- Qty control: Pill-shaped inline counter (`--r-pill`), `-` and `+` buttons
- Bill summary card: `--surface`, `--r-3`, internal dashed divider before total
- Total amount: 18px/800 `--brand`
- CTA: Full-width pill button with coral shadow

### 6.10 Order Tracking Screen (V2 — Yellow Theme)
- Background: `#FFFBEC` (warm yellow-cream)
- **Hero card**: Layered radial gradient yellow card (32px radius), amber shadow
  - Tag: Dark pill `rgba(27,27,34,.9)` with yellow text — no fire emoji unless user-initiated animation
  - Headline: `--display` 34px italic, color `#8a3a00` for accent
  - Countdown ring: 134×134 SVG ring with animated `stroke-dashoffset` transition
  - Food orbiting animation: single dot on a rotating ring
- **Chef card**: White card, chef avatar with green online pulse ring animation
- **Journey steps**: Vertical track with dashed line, animated fill, bouncing `is-now` bullet
- **NO generic material icons** — use custom SVG checkmarks and status indicators

---

## 7. Component Contracts — Admin Dashboard

### 7.1 Sidebar Navigation
- Width: 240px (desktop), collapsible on mobile
- Background: `--surface` (white), `--hairline` right border
- Logo mark: 36×36px `--r-1`, `--brand` bg, coral shadow + wordmark 18px/800
- Nav items: 10×12px padding, `--r-1`, `--ink-2` text
- Active state: `--ink` background, white text + small `--brand` dot at right edge — **not an underline, not a left bar**
- Section labels: 10px/700, uppercase, 0.12em tracking, `--muted-2`
- User card at bottom: flex row with avatar, name, role — `--bg` background, 12px radius
- **No emoji in nav labels** — Lucide icons only

### 7.2 Top Bar
- 22px/800 page title + muted subtitle below
- Search: 280px, `--bg` background, `--r-1`
- Icon buttons: 38×38 `--r-1`, `--bg` bg — notification bell, settings
- `--hairline` bottom border separating from content

### 7.3 Quick Actions Bar
- Between topbar and content area: `--bg-2` background, `--hairline` bottom border
- Pill-shaped action buttons: `--surface` default, coral for primary action, ink for dark actions
- Icon + text layout, 7px 14px padding, `--r-1` radius
- `--sh-1` shadow on each button

### 7.4 KPI Cards (4-grid)
- Standard: `--surface` bg, `--hairline` border, `--r-3`, 18px padding
- Feature card: `--ink` background, coral radial glow at bottom-right
- Label row: 24×24 icon square (`--r-1`) + 11.5px/600 text
- Value: 28px/800, letter-spacing -0.02em
- Delta badge: Pill with green/red semantic color + background tint
- Decorative sparkline: Absolute positioned, low opacity SVG path

### 7.5 Data Cards
- `--surface`, `--r-3`, `--hairline` border, 18px padding
- Card header: h3 15px/800 + optional segment control (pill toggle, `--sh-1`)
- No flat colored header bands — all-white cards

### 7.6 Orders Table
- Grid layout: `110px 1fr 110px 90px 110px 36px`
- Row separator: `--hairline` top border, no background alternation
- Status pills: Semantic colored pills (`amber-soft/amber` for preparing, `green-soft/green` for ready, etc.)
- **No colored row backgrounds** — pills carry all semantic color
- Action column: Icon-only button (36px)

### 7.7 Table Floor Heatmap
- 5-column CSS grid, square aspect-ratio cells with `--r-1`
- Status: `free` = green-soft/green, `busy` = amber-soft/amber, `alert` = red pulse animation
- No numbers in circles — table number is the cell content
- Subtle pulse animation on `alert` state only

### 7.8 Admin Menu Cards
- 4-column grid, `--r-3`, `--surface`, overflow hidden
- Image: 130px tall, `--surface-2` placeholder
- Price: `--brand` colored, 14px/800
- Toggle: 32×18px custom toggle (green = active), no external library
- Badge: Absolute positioned pill (frosted glass or amber for "bestseller")

---

## 8. Component Contracts — Kitchen Display (KDS)

### 8.1 KDS Grid
- 3-column grid (or adaptive for large screens)
- **No emoji in item names or notes**

### 8.2 KDS Order Card
- Top accent border: 5px — green (fresh), amber (warn >10min), red (critical >20min)
- Standard side borders: `--hairline`
- Header: Table number 16px/800 + order ref 11px/600 muted + timer pill
- Timer pill: Monospace font, semantic color based on urgency
- Items section: Dashed top separator, each item with qty badge
- Qty badge: `--ink` bg, white, 28×28 minimum, `--r-1`
- Note: Amber-soft pill for special instructions — `text-only`, never emoji
- Checkbox: 22×22, `--r-1`, green checkmark when ticked
- Footer: Two buttons — secondary (outline) + primary (brand or dark)

---

## 9. Animation Rules

### Allowed Properties (ONLY these two)
- `transform` — scale, translate, rotate
- `opacity`

**Never animate**: `width`, `height`, `margin`, `padding`, `top/left/right/bottom`, `background`, `color`, or the shorthand `transition-all`.

### Timing Curves
```css
/* Entry (elements appearing) */
cubic-bezier(0.16, 1, 0.3, 1)   /* Spring-like, fast settle */

/* Exit (elements disappearing) */
cubic-bezier(0.4, 0, 1, 1)       /* Fast exit, ease-out */

/* Status transitions */
ease-in-out                        /* Smooth bidirectional changes */
```

### Duration Scale
| Type | Duration | Notes |
|---|---|---|
| Micro (button press, toggle) | 120-150ms | Immediate feedback |
| Component enter | 220-280ms | Staggered list items |
| Sheet/drawer | 320ms | Bottom sheet slide-up |
| Hero transition | 450ms | Page load hero |
| Tracking countdown ring | 1000ms linear | Smooth tick |
| Chef pulse / orbital | 1600ms ease-in-out | Breathing, alive |

### Framer Motion Patterns
```typescript
// Staggered list items (orders, menu items)
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } }
}

// Sheet entrance
const sheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } }
}

// Status change on KDS card
const cardFlash = {
  scale: [1, 1.02, 1],
  transition: { duration: 0.3 }
}
```

### Breathing Animations (CSS, not Framer)
- Chef avatar online indicator: `trk-pulse` — ring pulse every 1.6s
- KDS "alert" table: radial box-shadow pulse every 2s
- Tracking ring rider: `trk-rider` — float up/down every 2s
- Orbital food icon: `trk-orbit` 14s continuous rotation

---

## 10. Anti-Pattern Blacklist

These patterns will be flagged as critical failures in the design audit:

### Layout Anti-Patterns
- `transition-all` — **banned**
- Hardcoded hex colors outside CSS variables
- `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` flat generic shadows
- Background color alternation in table rows (zebra striping) — use `--hairline` separators
- Left-border accent on nav items — use background fill instead
- Colored top header bands on dashboard cards — cards are always white surface

### Typography Anti-Patterns
- Default Inter, Roboto, or system-ui as primary font
- Blue or purple primary colors (`indigo-500`, `blue-600`) — only coral brand
- Font sizes below 11px (accessibility minimum)
- All-caps body text (only labels/metadata use uppercase)

### Component Anti-Patterns
- Emoji in button labels, nav items, table cells, KPI cards
- Emoji as status indicators — use colored dots and semantic pills
- Cards with colored header backgrounds (header band pattern)
- Generic "plus" buttons that are pill-shaped with text — add buttons are icon-only
- Toast notifications that stay on screen > 4 seconds
- Loading spinners (use skeleton loaders instead)
- Accordion components for navigation (use nested routes)

### Admin Dashboard Anti-Patterns
- Purple/blue color scheme (the default for most SaaS tools)
- Cookie-cutter `shadcn/ui` card components without customization
- Generic stat cards with up/down arrow icons without delta pills
- Table with checkbox column unless bulk actions are available
- Sidebar with hover underlines instead of fill backgrounds
- Notification dropdown without real-time badge count

### Customer UI Anti-Patterns
- Bottom navigation with text-only labels (icons required)
- Floating add-to-cart button that obscures content
- Price without veg/non-veg indicator
- Menu without section sticky headers
- Order tracking as a generic progress bar — must be journey steps
- Payment screen with a single "pay now" button — must show breakdown first

---

## 11. Screen-by-Screen Design Audit Checklist

The three-level agent pipeline (screenshot → audit → enhance) must verify every item below.

### Customer Menu Page (`/m/[slug]`)
- [ ] Warm cream `#FFF8F3` page background
- [ ] Top bar with brand pin icon, restaurant name, table number chip
- [ ] Display font greeting with italic `--brand` accent word
- [ ] Search bar with 20px radius (not pill)
- [ ] Category chips scrollable, no scrollbar, active = ink black
- [ ] Hero promo card with coral gradient + brand image circle
- [ ] Food grid 2-column, food cards with veg-dot indicator
- [ ] Dark floating pill tab bar (not stuck to screen edge)
- [ ] Zero emoji in any heading, button, or status

### Item Detail Sheet
- [ ] 360px hero image with gradient fade
- [ ] Frosted glass back button
- [ ] Body slides up over hero with 36px top radius
- [ ] Display font title, brand-colored price
- [ ] Required customizations marked clearly (not hidden)
- [ ] Sticky footer with quantity pill + CTA coral button

### Cart / Checkout
- [ ] 72×72 item images in cart
- [ ] Inline quantity control pills
- [ ] Bill breakdown with dashed separator before total
- [ ] Coupon code section with dashed coral border
- [ ] Notes input with icon prefix
- [ ] Full-width pill CTA with coral shadow

### Order Tracking
- [ ] Yellow-cream background `#FFFBEC`
- [ ] Yellow radial gradient hero card (not brand coral)
- [ ] Animated countdown ring with smooth tick
- [ ] Chef card with green pulse dot
- [ ] Vertical journey with animated fill line and bouncing bullet
- [ ] Dark cheer card at bottom with dual radial glow

### Admin Login
- [ ] Clean centered card, no background illustration
- [ ] Brand logo mark
- [ ] Email + password fields with hairline borders
- [ ] CTA button with coral shadow
- [ ] Link to chef login

### Admin Dashboard (Home)
- [ ] 240px sidebar, white, hairline right border
- [ ] Active nav = ink black fill, coral dot
- [ ] Quick actions bar (coral + ink + white variants)
- [ ] 4 KPI cards (one dark feature card with coral glow)
- [ ] Line chart (hourly revenue) + donut chart (order status)
- [ ] Table heatmap (5-col grid, semantic colors)
- [ ] Top selling items list (image + name + qty)
- [ ] Zero generic cards with colored header bands

### Admin Orders Page
- [ ] Grid-based table with hairline separators
- [ ] Semantic status pills (blue new / amber preparing / green ready)
- [ ] Filter chips above table
- [ ] Order detail modal with all item customizations
- [ ] Status update buttons within modal

### Admin Menu Builder
- [ ] Category tabs (adm-cat pills, active = ink)
- [ ] 4-column food card grid
- [ ] Image thumbnails with absolute badges
- [ ] Toggle switch (not checkbox) for availability
- [ ] Inline price display in brand color

### Admin Tables Page
- [ ] Floor heatmap with live status
- [ ] Table list with QR download button
- [ ] Status chip per table row

### KDS Page (`/kds`)
- [ ] Full-screen dark background
- [ ] 3-column card grid
- [ ] Top accent bar (green/amber/red based on time)
- [ ] Timer in monospace font
- [ ] Ink qty badges on each item
- [ ] Dashed separators between items
- [ ] Two-button footer (bump / serve)
- [ ] Zero emoji anywhere
- [ ] Sound notification on new order (programmatic, no visible indicator)

---

*Last updated: 2026-05-21 — Derived from official ScanBite brand CSS and context documentation*
