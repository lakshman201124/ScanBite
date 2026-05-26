# QR Dine — PHASE 2: Menu Builder + Customer Ordering

> **Goal:** Admin builds a full menu (categories, items, images, customizations). Customer scans QR and gets a Swiggy-grade browsing + ordering experience.
> **Timeline:** Weeks 3–4
> **Brand Scout:** ★ REQUIRED before any frontend code. Run full interview (6 rounds).

---

## Pre-Conditions

```
Phase 1 complete:
  ✓ Auth working (admin, chef, customer session)
  ✓ Multi-tenant middleware active
  ✓ DB migrated with all tables
  ✓ Admin dashboard shell rendered
  ✓ Seed data available for testing

Brand Scout complete:
  ✓ BRAND_ASSETS.md status = 🟢 COMPLETE
  ✓ Color palette defined (14 roles)
  ✓ Typography selected (headings + body + price + badge)
  ✓ Component specs locked (buttons, cards, nav, modals)
  ✓ Animation specs locked (8 animation types)
  ✓ Human approved all brand decisions
```

---

## Task Breakdown (Dependency Order)

### TASK 2.1 — Cloudinary Image Upload Integration
**Type:** Backend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/lib/cloudinary.ts                      → Cloudinary config + upload helpers
  src/app/api/upload/route.ts                → POST: signed upload endpoint
  src/components/ui/ImageUpload.tsx           → Drag-and-drop image uploader component

CLOUDINARY SETUP:
  - Upload preset: qrdine_menu (auto-format, auto-quality)
  - Folder structure: qrdine/{restaurant_id}/menu/
  - Transformations: auto WebP, max 800px width, quality auto:good
  - Signed upload (server-side signature, client-side upload to Cloudinary direct)

FLOW:
  1. Admin drags image onto ImageUpload component
  2. Component requests signed params from /api/upload
  3. Component uploads directly to Cloudinary (no server bandwidth)
  4. Cloudinary returns URL → stored in menu_items.image_url

ACCEPTANCE:
  □ ImageUpload renders with drag-and-drop zone
  □ Uploading shows progress bar
  □ Completed upload returns Cloudinary URL
  □ URL includes auto-format and auto-quality transforms
  □ Images land in correct restaurant folder
  □ Invalid file types (non-image) rejected client-side
```

### TASK 2.2 — Menu Category CRUD (Admin)
**Type:** Full-stack · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/app/api/menu/categories/route.ts       → GET (list) + POST (create)
  src/app/api/menu/categories/[id]/route.ts  → PATCH (update) + DELETE
  src/app/(dashboard)/dashboard/menu/page.tsx → Menu management page
  src/components/menu/CategoryList.tsx        → Category list with drag-reorder
  src/components/menu/CategoryForm.tsx        → Create/edit category modal
  src/lib/validations/menu.ts                → Zod schemas for category + item

CATEGORY FIELDS:
  - name (required, max 100 chars)
  - description (optional)
  - image_url (optional, via ImageUpload)
  - sort_order (drag to reorder)
  - is_active (toggle on/off)
  - available_from / available_until (time-based: "Breakfast" = 7am-11am)

API RULES:
  - Every query scoped to tenantScope(restaurantId)
  - POST validates via Zod schema
  - Sort order updates in batch (single API call for reorder)
  - DELETE: soft-delete (set is_active=false) if items exist, hard-delete if empty

ACCEPTANCE:
  □ Admin sees list of categories with item counts
  □ Can create a new category (name + optional image)
  □ Can edit category name, description, image
  □ Can drag-reorder categories → sort_order updates
  □ Can toggle category active/inactive
  □ Can set time availability (e.g., "Starters" only after 6pm)
  □ Deleting category with items → soft-delete + warning
  □ Deleting empty category → hard-delete
  □ Category from Restaurant A NOT visible to Restaurant B
```

### TASK 2.3 — Menu Item CRUD (Admin)
**Type:** Full-stack · **Agent:** UI Developer · **Size:** Large

```
FILES TO CREATE:
  src/app/api/menu/items/route.ts            → GET (list by category) + POST
  src/app/api/menu/items/[id]/route.ts       → GET + PATCH + DELETE
  src/components/menu/ItemList.tsx            → Items grid within selected category
  src/components/menu/ItemForm.tsx            → Create/edit item form (rich)
  src/components/menu/ItemCard.tsx            → Item card in admin view

ITEM FIELDS:
  - name, description, price, mrp (for showing discounts)
  - image_url (via ImageUpload)
  - food_type: veg | nonveg | egg | vegan (radio buttons with colored dots)
  - is_bestseller (toggle)
  - is_available (toggle — "86'd" in kitchen terminology)
  - prep_time_mins (number input)
  - calories (optional)
  - allergens (multi-select: gluten, dairy, nuts, soy, shellfish, eggs)
  - tags (multi-select: spicy, new, chef-special, seasonal)
  - sort_order (drag within category)

ADMIN UX:
  Left panel: category list (clickable)
  Right panel: items grid for selected category
  Floating "Add Item" button → opens modal form
  Each item card shows: image thumbnail, name, price, veg/nonveg dot, availability toggle

ACCEPTANCE:
  □ Admin selects category → sees items in that category
  □ Can create item with all fields
  □ Image upload works inline in the form
  □ Veg/nonveg dot displays correctly (green/red/yellow/green-with-leaf)
  □ Bestseller badge toggles on/off
  □ Can mark item unavailable (grays out in customer menu)
  □ Can drag-reorder items within category
  □ MRP shows strikethrough when price < MRP
  □ Multi-tenant: items scoped to restaurant_id
```

### TASK 2.4 — Item Customizations (Admin)
**Type:** Full-stack · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/app/api/menu/items/[id]/customizations/route.ts   → GET + POST
  src/components/menu/CustomizationEditor.tsx             → Customization group manager

CUSTOMIZATION MODEL:
  Each item can have multiple customization groups:
    Group: "Spice Level"  → type: single  → options: [{Mild, 0}, {Medium, 0}, {Hot, 0}]
    Group: "Add-ons"      → type: multi   → options: [{Extra Cheese, ₹30}, {Mushrooms, ₹40}]
    Group: "Size"          → type: required → options: [{Regular, 0}, {Large, ₹50}]

  Types:
    single   = radio buttons, pick one (optional)
    multi    = checkboxes, pick any (optional)
    required = radio buttons, must pick one

ADMIN UX:
  Inside item edit form → "Customizations" accordion section
  Can add/remove groups
  Can add/remove options per group
  Each option has: name + extra price (₹0 for no-cost options)

ACCEPTANCE:
  □ Admin can add a customization group to an item
  □ Can set group type: single / multi / required
  □ Can add options with name + price
  □ Can remove options and groups
  □ Customizations saved as JSONB in item_customizations table
  □ Customer menu (Task 2.7) reads and renders these correctly
```

### TASK 2.5 — QR Code Generation + Table Management (Admin)
**Type:** Full-stack · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/lib/qr.ts                                  → generateQRToken(), buildQRUrl()
  src/app/api/tables/route.ts                     → GET (list) + POST (create)
  src/app/api/tables/[id]/route.ts                → PATCH + DELETE
  src/app/api/tables/[id]/qr/route.ts             → GET: generate QR image/PDF
  src/app/(dashboard)/dashboard/tables/page.tsx    → Table management page
  src/components/tables/TableGrid.tsx              → Visual table layout
  src/components/tables/QRDownload.tsx             → QR preview + download

TABLE FIELDS:
  - table_name ("T1", "Table 12", "Patio-3")
  - table_capacity (seats)
  - qr_token (crypto.randomBytes(16).toString('hex'))
  - is_active (toggle)
  - current_session_id (nullable — occupied / empty)

QR URL FORMAT:
  https://qrdine.app/m/{restaurantSlug}?t={qrToken}
  
  In dev: http://localhost:3000/m/{restaurantSlug}?t={qrToken}

QR GENERATION:
  Use 'qrcode' npm package
  Generate as: SVG (for web display) + PNG (for download + PDF)
  Style: restaurant logo in center (if available), brand color dots

QR PDF DOWNLOAD:
  Admin clicks "Download All QR Codes" → generates PDF:
    - A4 page with 4 QR codes per page (2x2 grid)
    - Each: restaurant logo + table name + QR code + "Scan to order"
    - Print-ready format for table tent cards

ACCEPTANCE:
  □ Admin can create tables (name + capacity)
  □ QR token auto-generated on table creation
  □ QR code preview displayed for each table
  □ Can download individual QR as PNG
  □ Can download all QR codes as single PDF
  □ QR URL points to correct menu page
  □ Can toggle table active/inactive
  □ Can regenerate QR token (invalidates old code)
```

### TASK 2.6 — Public Menu API (Cached)
**Type:** Backend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/app/api/public/menu/[slug]/route.ts    → GET: full menu for restaurant
  src/lib/cache.ts                            → Redis cache helpers (get/set/invalidate)

API: GET /api/public/menu/{restaurantSlug}
  1. Check Redis cache (key: menu:{slug}, TTL: 5 minutes)
  2. Cache HIT → return cached JSON
  3. Cache MISS → query DB:
     - Restaurant (name, logo, brand_color, slug)
     - Categories (active, ordered by sort_order)
     - Items per category (available, ordered by sort_order)
     - Customizations per item
  4. Assemble full menu JSON → cache in Redis → return

CACHE INVALIDATION:
  When admin updates menu (category/item CRUD):
    → Delete Redis key: menu:{slug}
    → Next customer request rebuilds cache

RESPONSE SHAPE:
  {
    restaurant: { name, logo, brandColor, slug },
    categories: [
      {
        id, name, description, image,
        items: [
          { id, name, description, price, mrp, image, foodType,
            isBestseller, prepTime, calories, allergens, tags,
            customizations: [
              { groupName, groupType, options: [{ name, price }] }
            ]
          }
        ]
      }
    ]
  }

ACCEPTANCE:
  □ First request: ~200ms (DB hit + cache write)
  □ Subsequent requests: < 50ms (Redis hit)
  □ Menu data matches what admin configured
  □ Inactive categories/items excluded
  □ Unavailable items excluded
  □ Cache invalidates when admin updates menu
  □ Different restaurant slugs return different menus
```

### TASK 2.7 — Customer Menu Page (/m/[slug])
**Type:** Frontend · **Agent:** UI Developer · **Size:** ★ EXTRA LARGE ★

```
THIS IS THE MOST IMPORTANT PAGE IN THE ENTIRE APPLICATION.
Read BRAND_ASSETS.md completely before writing a single line of code.

FILES TO CREATE:
  src/app/m/[slug]/page.tsx                     → Server component: fetch menu + validate session
  src/app/m/[slug]/layout.tsx                   → Customer layout (no sidebar, mobile-first)
  src/components/customer/MenuHeader.tsx         → Restaurant logo, name, table number
  src/components/customer/CategoryTabs.tsx       → Horizontal scrollable category tabs (sticky)
  src/components/customer/MenuSection.tsx        → Category section with items
  src/components/customer/MenuItemCard.tsx       → Item card (image, name, price, veg dot, add btn)
  src/components/customer/ItemDetailSheet.tsx    → Bottom sheet: full item detail + customizations
  src/components/customer/SearchBar.tsx          → Search items by name
  src/components/customer/FilterChips.tsx        → Veg / Non-veg / Bestseller filter chips
  src/components/customer/AddToCartButton.tsx    → Animated "Add" button with quantity stepper

DESIGN REQUIREMENTS (from BRAND_ASSETS.md):
  - Mobile-first (375px primary, 768px secondary)
  - Full-bleed food images (Cloudinary auto-WebP, lazy loaded)
  - Category tabs: sticky top bar, horizontally scrollable
  - Item cards: image left or top, name, price, veg/nonveg dot, "ADD" button
  - Bestseller badge: gold/orange accent on card
  - MRP strikethrough when discounted
  - Prep time shown (subtle, secondary text)
  - Allergen icons (small, in item detail sheet)
  
ANIMATIONS (Framer Motion — from BRAND_ASSETS.md):
  - Page entry: categories fade + slide up (staggered 50ms each)
  - Item cards: stagger within category (30ms gap)
  - Add to cart: button transforms to quantity stepper
  - Item detail sheet: slides up from bottom (spring physics)
  - Search: results filter with layout animation
  - Scroll: category tabs highlight active section

SWIGGY-GRADE UX PRINCIPLES:
  - No loading spinners on menu (ISR/cache means instant load)
  - Skeleton screens during any async operations
  - Tap anywhere on card → opens detail sheet
  - "ADD" button on card for quick add (no customization)
  - Detail sheet for items WITH customizations (must select before adding)
  - Veg/nonveg filter persists during session
  - Search debounced (300ms), highlights matching text
  - Scroll spy: active category tab follows scroll position
  - Category tab tap: smooth scroll to that section

ACCEPTANCE:
  □ /m/test-slug loads menu in < 1.5 seconds (FCP)
  □ Restaurant branding visible (logo, name, brand color)
  □ Categories render as sticky scrollable tabs
  □ Items render with images, prices, veg/nonveg dots
  □ Tapping item opens detail bottom sheet
  □ Customization options render correctly (single/multi/required)
  □ "ADD" button works for simple items (no customizations)
  □ Items with required customizations → must use detail sheet
  □ Search filters items in real-time
  □ Veg/non-veg filter works
  □ Bestseller badge visible on marked items
  □ Animations are smooth (60fps, no jank)
  □ Mobile: full-width cards, no horizontal scroll on content
  □ Invalid slug → 404 page
  □ Empty menu → "Menu coming soon" state
```

### TASK 2.8 — Cart (Zustand + UI)
**Type:** Frontend · **Agent:** UI Developer · **Size:** Large

```
FILES TO CREATE:
  src/store/cart.ts                            → Zustand store (from reference doc)
  src/components/customer/CartDrawer.tsx        → Slide-up cart drawer (mobile)
  src/components/customer/CartItem.tsx          → Item in cart (name, qty, price, customizations)
  src/components/customer/CartSummary.tsx       → Subtotal + item count
  src/components/customer/FloatingCartBar.tsx   → Fixed bottom bar showing cart total + "View Cart"

CART BEHAVIOR:
  - Persists in localStorage (Zustand persist middleware)
  - Scoped to restaurant + table (clear if different restaurant QR scanned)
  - FloatingCartBar: shows item count + total amount, slides up on first add
  - CartDrawer: full item list, quantity +/-, remove, special notes per item
  - Customizations shown under item name (e.g., "Extra Cheese, Hot spice")
  - "Add more items" button → closes drawer, scrolls to top
  - "Proceed to Order" button → navigates to checkout

ANIMATIONS:
  - Item added: FloatingCartBar bounces
  - Cart drawer: slides up from bottom (spring)
  - Remove item: swipe left or fade out
  - Quantity change: number transitions

ACCEPTANCE:
  □ Adding item → appears in cart, FloatingCartBar updates
  □ Cart persists on page reload
  □ Quantity +/- works (min 1, or remove at 0)
  □ Customization details shown in cart
  □ Special note editable per item
  □ Subtotal calculated correctly
  □ "Proceed to Order" navigates to checkout
  □ Different restaurant QR → cart clears with warning
  □ Empty cart → FloatingCartBar hidden
```

### TASK 2.9 — Order Placement Flow
**Type:** Full-stack · **Agent:** UI Developer · **Size:** Large

```
FILES TO CREATE:
  src/app/m/[slug]/checkout/page.tsx            → Checkout/review page
  src/app/m/[slug]/order/[orderId]/page.tsx     → Order confirmation + status tracker
  src/app/api/customer/orders/route.ts           → POST: create order
  src/components/customer/CheckoutPage.tsx        → Order review + notes + submit
  src/components/customer/OrderConfirmation.tsx   → Success screen
  src/components/customer/OrderTracker.tsx        → Status progress bar (placeholder for Phase 3 real-time)

CHECKOUT FLOW:
  1. Customer taps "Proceed to Order" from cart
  2. Checkout page shows:
     - Order summary (all items, customizations, quantities)
     - Special instructions text field (whole order)
     - Subtotal (no payment yet — Phase 4)
     - "Place Order" button
  3. POST /api/customer/orders:
     - Validate session
     - Validate all items still exist and are available
     - Snapshot item names + prices (don't reference live data later)
     - Calculate subtotal
     - Create orders row (status: 'pending', payment_status: 'unpaid')
     - Create order_items rows
     - Clear cart
     - Return orderId
  4. Redirect to /m/[slug]/order/[orderId]
  5. Order confirmation shows:
     - Order number (ORD-YYYY-NNNN)
     - Table name
     - Items ordered
     - Status tracker: ● Placed → ○ Confirmed → ○ Preparing → ○ Ready → ○ Served
     - "Place Another Order" button

ORDER NUMBER FORMAT:
  ORD-{YYYY}-{sequential 4-digit per restaurant}
  e.g., ORD-2026-0001, ORD-2026-0042

API RULES:
  - Items must be re-validated (could be removed between cart and checkout)
  - Prices must be re-fetched from DB (never trust client price)
  - Customization options re-validated against item_customizations table
  - restaurant_id from session (never from client)
  - table_id from session (never from client)

ACCEPTANCE:
  □ Checkout page shows correct order summary
  □ Special instructions field works
  □ "Place Order" creates order in DB
  □ Order items snapshot prices at time of order
  □ Cart clears after successful order
  □ Order confirmation page shows order details
  □ Status tracker shows "Placed" (first step active)
  □ Unavailable item in cart → error message, item highlighted
  □ Price change between cart and checkout → user informed
  □ Empty cart → cannot access checkout
  □ Order number format: ORD-YYYY-NNNN
  □ Multi-tenant: order.restaurant_id = session.restaurant_id
```

### TASK 2.10 — Admin Menu Preview
**Type:** Frontend · **Agent:** UI Developer · **Size:** Small

```
FILES TO CREATE:
  src/app/(dashboard)/dashboard/menu/preview/page.tsx  → Embedded customer menu preview

WHAT THIS IS:
  Admin clicks "Preview Menu" button in the menu management page.
  Opens an iframe/embedded view of the customer menu page.
  Shows exactly what the customer sees.
  Admin can toggle between mobile (375px) and tablet (768px) viewport.

ACCEPTANCE:
  □ "Preview Menu" button visible in admin menu page
  □ Opens customer menu in embedded view
  □ Can switch between mobile/tablet viewport
  □ Changes made in admin → refresh preview → changes reflected
```

---

## Phase 2 Completion Checklist

```
HUMAN VERIFICATION:
  □ Admin: create 3+ categories with images
  □ Admin: create 5+ items per category with varying types (veg, nonveg, bestseller)
  □ Admin: add customizations to at least 2 items
  □ Admin: generate QR for 3 tables
  □ Admin: download QR PDF — print-ready quality
  □ Customer: scan QR → menu loads in < 1.5s
  □ Customer: branded UI matches approved BRAND_ASSETS.md
  □ Customer: category tabs work (scroll + tap)
  □ Customer: search filters correctly
  □ Customer: veg/nonveg filter works
  □ Customer: add items to cart (simple + customized)
  □ Customer: cart persists on reload
  □ Customer: place order → confirmation screen
  □ Customer: order appears in DB (check Prisma Studio)
  □ Lighthouse: /m/[slug] scores 90+ performance
  □ Mobile: test on actual phone (not just devtools)
  □ Multi-tenant: Restaurant A menu ≠ Restaurant B menu
  □ Git: tag pre-phase-3, commit "Phase 2 complete"
```

---

## Use Cases Verified

| # | Actor | Action | Expected |
|---|---|---|---|
| 1 | Admin | Creates "Starters" category | Category appears in list |
| 2 | Admin | Adds "Paneer Tikka" with image, ₹220, veg | Item shows in category |
| 3 | Admin | Marks item as bestseller | Gold badge appears |
| 4 | Admin | Sets item unavailable | Item grayed out in admin, hidden from customer |
| 5 | Admin | Adds "Spice Level" customization (single: Mild/Medium/Hot) | Customization group saved |
| 6 | Admin | Reorders categories via drag | sort_order updates, customer menu reflects |
| 7 | Admin | Generates QR for "Table 5" | QR image displayed, downloads as PNG |
| 8 | Admin | Downloads all QR codes | PDF with 2x2 grid per page |
| 9 | Customer | Scans QR | Menu loads with restaurant branding |
| 10 | Customer | Scrolls through menu | Category tabs highlight active section |
| 11 | Customer | Taps "ADD" on simple item | Item added to cart, bar updates |
| 12 | Customer | Taps item with customizations | Detail sheet opens with options |
| 13 | Customer | Selects required customization + adds | Item with customization in cart |
| 14 | Customer | Searches "pizza" | Only pizza items shown |
| 15 | Customer | Filters "Veg only" | Non-veg items hidden |
| 16 | Customer | Opens cart, adjusts quantity | Total updates correctly |
| 17 | Customer | Places order | Order created, confirmation shown |
| 18 | Customer | Item removed by admin between cart and checkout | Error shown, item highlighted |
| 19 | Customer | Price changed between cart and checkout | User informed of new price |
| 20 | Customer | Scans QR from different restaurant | Old cart cleared with warning |

---

*This phase IS the product. If the customer menu sucks, nothing else matters. Treat every pixel like it's Swiggy's competition.*
