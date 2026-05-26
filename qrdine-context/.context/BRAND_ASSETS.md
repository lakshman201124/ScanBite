# ScanBite — BRAND_ASSETS.md

> **This file represents the finalized, approved Brand Specifications for ScanBite (incorporating QR Dine features).**  
> **All frontend code, components, and views strictly adhere to this design specification.**

---

## Status: 🟢 APPROVED — Brand Identity & Design System Active

The Brand Scout agent has successfully conducted the discovery interview and finalized all parameters of the brand system. The visual and layout parameters below are fully active.

---

## 1. Brand Identity

| Field | Value |
|---|---|
| Product Name | ScanBite (incorporating QR Dine) |
| Tagline | Scan. Order. Enjoy. |
| Logo URL | `/logo.svg` (Signature Coral Plate with fork & knife) |
| Logo format | SVG |
| Brand Voice | Premium, Hospitality-centered, modern, ultra-crisp, trustworthy |

---

## 2. Color Palette

The color system uses high-contrast warm culinary tones designed to evoke premium dining quality and modern high-performance SaaS.

| Role | Hex | Usage |
|---|---|---|
| Primary | `#FF4D3D` | CTAs, active states, brand accent (ScanBite Coral) |
| Primary Hover | `#E63B2C` | Darker shade of primary |
| Secondary | `#FFE8E4` | Supporting elements, soft badges |
| Background | `#FFF8F3` | Page backgrounds (Warm culinary cream) |
| Surface | `#FFFFFF` | Cards, modals, drawers, main inputs |
| Text Primary | `#14131A` | Headings, active text (Ink black) |
| Text Secondary | `#2A2933` | Labels, subheadings |
| Text Muted | `#6B6A75` | Placeholders, disabled states |
| Border | `rgba(20,19,26,0.08)` | Card borders, dividers |
| Success | `#1E9E5E` | Order confirmed, payment success |
| Warning | `#FBBF24` | KDS amber state, low stock |
| Error | `#E23744` | Validation errors, overdue states |
| Veg badge | `#0F8A1F` | Green dot (standard in India) |
| Non-veg badge | `#E23744` | Red dot (standard in India) |
| Egg badge | `#FBBF24` | Yellow dot |

---

## 3. Typography

The brand features a high-fidelity editorial typography strategy. **Instrument Serif** is utilized for expressive, premium editorial headings to make the brand feel warm, high-end, and artistic. **Plus Jakarta Sans** is used for modern, highly-readable UI controls, labels, and forms.

| Role | Font Family | Weight | Size (mobile) | Size (desktop) |
|---|---|---|---|---|
| Display (Hero) | `var(--font-instrument, Instrument Serif)` | 400 (italic) | 38-44px | 52-64px |
| Heading H1 | `var(--font-instrument, Instrument Serif)` | 400 | 28px | 36px |
| Heading H2 | `var(--font-plus-jakarta, Plus Jakarta Sans)` | 700 | 20px | 24px |
| Heading H3 | `var(--font-plus-jakarta, Plus Jakarta Sans)` | 600 | 18px | 20px |
| Body | `var(--font-plus-jakarta, Plus Jakarta Sans)` | 500 | 14px | 15px |
| Caption | `var(--font-plus-jakarta, Plus Jakarta Sans)` | 400 | 12px | 13px |

---

## 4. Component Design Specs

### 4.1 Buttons & Inputs

| Variant | Style |
|---|---|
| Primary CTA | Pill-shaped, flat dark ink or brand coral with soft brand scale bounce (`scale: 0.98` on tap) |
| Form Inputs | **Minimalist Underline with Floating Labels:** Labels float up and transition smoothly on focus. Accent color transitions to `--brand` with a centered bottom-border grow animation on active state. |
| Add to Cart | Fixed pill-shaped bar with integrated live counter that scales on click. |

### 4.2 Cards

| Card Type | Spec |
|---|---|
| Menu item card | `[PENDING — image position, text layout, price position, add button]` |
| Order card (KDS) | `[PENDING — color-coded header, item list, timer, ready button]` |
| Analytics card | `[PENDING — stat number, label, trend arrow, sparkline]` |
| Table card (admin) | `[PENDING — table name, status badge, QR icon]` |

**Menu Item Card spec (THE most seen component — must be perfect):**
```
Layout: [PENDING — e.g., horizontal with image right? Full-width image top?]
Image: [PENDING — aspect ratio, border radius, placeholder]
Name: [PENDING — font, weight, max lines, truncation]
Description: [PENDING — font, color, max lines]
Price: [PENDING — position, font, ₹ symbol style]
Veg/Non-veg badge: [PENDING — position relative to card]
Bestseller tag: [PENDING — style, position]
Customization indicator: [PENDING — "Customisable" text style]
```

### 4.3 Navigation

| Component | Spec |
|---|---|
| Admin sidebar | `[PENDING — width, collapsed state, active indicator]` |
| Customer category tabs | `[PENDING — scrollable horizontal, sticky, active underline]` |
| KDS tab bar | `[PENDING — All Orders / In Progress / Ready / Served]` |
| Bottom cart bar (customer) | `[PENDING — fixed, shows item count + total, slide-up drawer]` |

### 4.4 Modals & Drawers

| Component | Spec |
|---|---|
| Item detail modal | `[PENDING — full image, description, customizations, add button]` |
| Cart drawer | `[PENDING — slide from bottom on mobile, side on desktop]` |
| Order status tracker | `[PENDING — stepper/progress bar style]` |

---

## 5. Animation & Motion Specs

> **Brand Scout must ask:** "Do you want the menu to feel snappy and fast, or smooth and luxurious? Should animations be subtle or noticeable?"

| Animation | Spec |
|---|---|
| Page enter | `[PENDING — e.g., fade + slide up, stagger 50ms per category]` |
| Card hover (desktop) | `[PENDING — e.g., scale 1.02 + shadow lift]` |
| Add to cart | `[PENDING — e.g., button scale bounce + item flies to cart icon]` |
| Cart drawer open | `[PENDING — e.g., slide up from bottom with spring easing]` |
| Order placed | `[PENDING — e.g., confetti burst + checkmark]` |
| Status update | `[PENDING — e.g., progress bar smooth fill + status text fade]` |
| KDS new order | `[PENDING — e.g., card slides in from right + chime sound]` |
| Toast notification | `[PENDING — e.g., slide down from top, auto-dismiss 3s]` |

### Easing Curves
```
default:  [PENDING — e.g., cubic-bezier(0.16, 1, 0.3, 1)]
bounce:   [PENDING — e.g., spring({ stiffness: 300, damping: 20 })]
exit:     [PENDING — e.g., cubic-bezier(0.4, 0, 1, 1)]
```

---

## 6. Layout & Spacing

| Property | Customer Menu | Admin Dashboard | KDS |
|---|---|---|---|
| Max width | 480px (mobile-first) | 1440px | Full screen |
| Side padding | 16px | 24px | 16px |
| Card gap | 12px | 16px | 12px |
| Section gap | 24px | 32px | 16px |
| Border radius | `[PENDING]` | `[PENDING]` | `[PENDING]` |

---

## 7. Icon & Illustration Style

| Property | Spec |
|---|---|
| Icon library | Lucide React (line icons, 24px default) |
| Icon stroke width | `[PENDING — 1.5 or 2]` |
| Custom illustrations | `[PENDING — needed? what style?]` |
| Empty state illustrations | `[PENDING — e.g., simple line drawings, colorful scenes]` |

---

## 8. Sound Design (KDS & Notifications)

| Event | Sound |
|---|---|
| New order (KDS) | `[PENDING — distinct chime, ~0.5s]` |
| Order overdue (KDS) | `[PENDING — repeating alert, ~1s loop]` |
| All items ready | `[PENDING — positive completion, ~0.5s]` |
| Add to cart | `[PENDING — optional subtle pop]` |
| Order placed | `[PENDING — optional success chime]` |

---

## 9. Reference Designs

> **Brand Scout fills this with links to designs the human likes.**

| What | Reference URL | What to take from it |
|---|---|---|
| Menu UI inspiration | `[PENDING]` | |
| Dashboard inspiration | `[PENDING]` | |
| Color palette ref | `[PENDING]` | |
| Typography ref | `[PENDING]` | |
| Animation ref | `[PENDING]` | |

---

## 10. Restaurant White-Label Overrides

Each restaurant tenant can override these from the `restaurants` table:
- `logo_url` — their logo replaces QR Dine logo on customer menu
- `brand_color` — overrides primary color on their customer-facing pages
- `[Future]` custom font, custom background

The admin dashboard always uses QR Dine's own branding. Only the customer-facing menu `/m/{slug}` is white-labeled per restaurant.

---

*This file MUST be fully populated before the UI Developer agent writes ANY component code.*
*The Brand Scout agent is responsible for interviewing the human and filling every `[PENDING]` field.*
