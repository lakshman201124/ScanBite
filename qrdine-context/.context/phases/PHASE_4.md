# QR Dine — PHASE 4: Billing + Payments

> **Goal:** Complete financial loop — GST-compliant billing, Razorpay payments (UPI + card), split bill, thermal printing (ESC/POS + Bluetooth), digital invoices (PDF → WhatsApp + Email).
> **Timeline:** Week 6
> **Brand Scout:** Not required (billing UI is functional, uses existing design tokens).

---

## Pre-Conditions

```
Phase 3 complete:
  ✓ Orders created and tracked in real-time
  ✓ Socket.IO working for all three clients
  ✓ Order lifecycle (pending → served) functional
  ✓ Admin dashboard showing live orders

Human provides:
  □ Razorpay test mode keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET)
  □ Razorpay webhook URL configured in Razorpay dashboard (→ /api/payments/webhook)
  □ Twilio credentials for WhatsApp invoice (or defer WhatsApp to later)
  □ Resend API key for email invoices (free tier: 100 emails/day)
```

---

## Task Breakdown

### TASK 4.1 — Bill Calculation Engine
**Type:** Backend (pure function) · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/lib/billing.ts           → calculateBill() from reference doc
  src/lib/bill-number.ts       → generateBillNumber() sequential per restaurant

BILL CALCULATION:
  Input: order items + discount % + tip + tax config
  Output: {
    subtotal, discountAmount, discountedSubtotal,
    cgstRate, sgstRate, cgstAmount, sgstAmount,
    taxTotal, tipAmount, finalAmount,
    items: [{ name, qty, unitPrice, total }]
  }

TAX CONFIG (per restaurant):
  - Stored in restaurants table: cgst_rate, sgst_rate
  - Default: CGST 2.5% + SGST 2.5% = 5% GST
  - AC restaurants: may be different (configurable)
  - Tax calculated AFTER discount

BILL NUMBER FORMAT:
  BILL-{YYYY}-{sequential per restaurant}
  e.g., BILL-2026-0001
  Stored in bills table, UNIQUE constraint

ROUNDING:
  - All amounts rounded to 2 decimal places
  - Final amount: Math.round(finalAmount * 100) / 100

ACCEPTANCE:
  □ calculateBill with known inputs → expected output
  □ Discount applied before tax
  □ GST split correctly into CGST + SGST
  □ Zero items → zero bill
  □ Tip added after tax
  □ Bill numbers sequential per restaurant (not global)
  □ 100% unit test coverage on this function
```

### TASK 4.2 — Bill Generation API
**Type:** Backend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/app/api/admin/bills/route.ts               → POST: generate bill for order
  src/app/api/admin/bills/[id]/route.ts           → GET: bill details
  src/app/api/customer/orders/[id]/bill/route.ts  → GET: customer views their bill

FLOW:
  1. Admin clicks "Generate Bill" on a served order
  2. API calls calculateBill() with order items + restaurant tax config
  3. Creates bills row in DB (linked to order)
  4. Updates order.bill_printed = false (will be true after printing)
  5. Returns bill data for display

CUSTOMER "REQUEST BILL" FLOW:
  1. Customer taps "Request Bill" on order tracker page
  2. Emits socket event: bill:requested to restaurant:{rid}:orders
  3. Admin sees "Bill Requested" badge on order card
  4. Admin generates bill → customer receives bill data via socket

ACCEPTANCE:
  □ Bill created with correct GST breakdown
  □ Bill linked to order (one-to-one)
  □ Cannot generate bill for unpaid/cancelled order (unless cash payment)
  □ Customer can view their bill
  □ "Request Bill" notifies admin in real-time
  □ Multi-tenant: bills scoped to restaurant_id
```

### TASK 4.3 — Razorpay Payment Integration
**Type:** Full-stack · **Agent:** UI Developer · **Size:** Large

```
FILES TO CREATE:
  src/lib/razorpay.ts                              → Razorpay client instance
  src/app/api/payments/create-order/route.ts        → POST: create Razorpay order
  src/app/api/payments/webhook/route.ts             → POST: handle Razorpay webhook
  src/app/api/payments/verify/route.ts              → POST: client-side verification
  src/components/customer/PaymentSheet.tsx           → Payment UI (UPI/card selection)
  src/components/customer/PaymentSuccess.tsx         → Payment confirmation

PAYMENT FLOW:
  1. Customer on checkout page → selects payment method:
     - Pay Online (UPI / Card) → Razorpay checkout
     - Pay at Counter (cash) → order placed without payment
  
  2. Pay Online flow:
     a. Frontend calls POST /api/payments/create-order { orderId, amount }
     b. API creates Razorpay order → returns { razorpayOrderId, amount, keyId }
     c. Frontend opens Razorpay Checkout widget
     d. Customer completes payment (UPI / card / net banking)
     e. Razorpay sends webhook to /api/payments/webhook
     f. Webhook verifies signature → marks order as paid
     g. Frontend polls /api/payments/verify for confirmation

  3. Pay at Counter flow:
     a. Order placed with payment_status: 'unpaid', payment_method: 'cash'
     b. Admin marks as paid when customer pays at counter
     c. Generates bill after cash collection

WEBHOOK SECURITY:
  - Validate x-razorpay-signature header (HMAC SHA256)
  - Use raw body (not parsed JSON) for signature verification
  - Reject invalid signatures with 400
  - Idempotent: check if already processed before updating

RAZORPAY CHECKOUT OPTIONS:
  {
    key: RAZORPAY_KEY_ID,
    amount: amountInPaise,
    currency: 'INR',
    name: restaurantName,
    description: `Order ${orderNumber}`,
    image: restaurantLogo,
    order_id: razorpayOrderId,
    prefill: { contact: customerPhone }, // optional
    theme: { color: restaurantBrandColor }
  }

ACCEPTANCE:
  □ "Pay Online" opens Razorpay Checkout
  □ UPI payment completes successfully (test mode)
  □ Webhook fires → order marked as paid in DB
  □ Payment verification endpoint confirms status
  □ Invalid webhook signature → 400 rejection
  □ "Pay at Counter" creates order without payment
  □ Admin can mark cash order as paid
  □ Double webhook (same payment) → no duplicate processing
  □ Payment failure → user can retry
  □ Restaurant branding on Razorpay Checkout (name, logo, color)
```

### TASK 4.4 — Split Bill Feature
**Type:** Full-stack · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/components/customer/SplitBillSheet.tsx    → Split bill UI
  src/app/api/customer/bills/split/route.ts    → POST: calculate split amounts

SPLIT OPTIONS:
  1. Equal Split: total ÷ N people
  2. By Item: each person selects their items → individual totals
  3. Custom: enter custom amounts per person

UI FLOW:
  1. Customer taps "Split Bill" on bill view
  2. Sheet slides up with split options
  3. Equal: enter number of people → shows each person's share
  4. By Item: checkboxes per item → assign to "Person 1", "Person 2", etc.
  5. Custom: manual amount entry per person (must sum to total)
  6. Each split generates a separate Razorpay payment link (or QR)

NOTE: Split bill is a convenience feature. Each person opens the payment link
      on their phone and pays their share. All payments tracked against same order.

ACCEPTANCE:
  □ Equal split: correct calculation including GST share
  □ By item: items assignable to people, totals calculated
  □ Custom: validates amounts sum to total
  □ Each split creates separate payment link
  □ All partial payments tracked under same order
  □ Order marked fully paid when all splits paid
  □ Works on mobile (primary use case)
```

### TASK 4.5 — ESC/POS Bill + KOT Generation
**Type:** Backend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/lib/printer/escpos.ts       → ESC/POS command builders
  src/lib/printer/kot.ts          → buildKOTBuffer() — kitchen order ticket
  src/lib/printer/bill.ts         → buildBillBuffer() — final customer bill
  src/lib/printer/bluetooth.ts    → Web Bluetooth API wrapper

KOT FORMAT (Kitchen Order Ticket):
  ┌────────────────────────────┐
  │    RESTAURANT NAME         │
  │    KITCHEN ORDER TICKET    │
  │ ──────────────────────── │
  │ Table: T5                  │
  │ KOT #: ORD-2026-0042      │
  │ Time : 7:42 PM            │
  │ ──────────────────────── │
  │ QTY  ITEM                  │
  │  2   Butter Chicken        │
  │       > Extra gravy        │
  │  1   Garlic Naan           │
  │  1   Mango Lassi           │
  │       > Less sugar         │
  │ ──────────────────────── │
  │       *** CUT ***          │
  └────────────────────────────┘

BILL FORMAT (Customer Receipt):
  ┌────────────────────────────┐
  │    RESTAURANT NAME         │
  │    Address line            │
  │    GSTIN: 29XXXXXX         │
  │ ──────────────────────── │
  │ Bill No: BILL-2026-0042   │
  │ Date: 19/05/2026           │
  │ Table: T5                  │
  │ ──────────────────────── │
  │ ITEM           QTY  AMOUNT │
  │ ──────────────────────── │
  │ Butter Chicken  2   600.00 │
  │ Garlic Naan     1    60.00 │
  │ Mango Lassi     1   120.00 │
  │ ──────────────────────── │
  │ Subtotal:          780.00  │
  │ CGST @2.5%:         19.50  │
  │ SGST @2.5%:         19.50  │
  │ TOTAL:             819.00  │
  │ ──────────────────────── │
  │  Thank you! Visit again.  │
  │    Powered by QR Dine      │
  └────────────────────────────┘

ESC/POS LIBRARY:
  Use escpos-buffer (browser-compatible) or build raw ESC/POS commands.
  80mm standard thermal paper (32 chars per line at default font).
  Commands: initialize, bold, align, cut, line feed.

ACCEPTANCE:
  □ KOT buffer generates correct format
  □ Bill buffer generates correct format with GST
  □ Special characters handled (₹ symbol — use "Rs." fallback for thermal)
  □ Items with long names truncated gracefully
  □ Customizations indented under item
  □ Cut command at end of document
```

### TASK 4.6 — Web Bluetooth Printing
**Type:** Frontend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/components/admin/PrintButton.tsx       → "Print Bill" / "Print KOT" buttons
  src/hooks/usePrinter.ts                    → Bluetooth printer connection hook

WEB BLUETOOTH FLOW:
  1. Admin/chef taps "Print"
  2. First time: browser shows Bluetooth device picker → select printer
  3. Device pairing saved for future prints
  4. ESC/POS buffer sent in 512-byte chunks with 50ms delay
  5. Printer prints receipt

SUPPORTED PRINTERS:
  Any ESC/POS Bluetooth thermal printer:
  Epson TM-T20, Sunmi V2, SEWOO, iMin, generic 80mm BT printers

BROWSER SUPPORT:
  Web Bluetooth API: Chrome on Android (primary use case — restaurant tablets)
  NOT supported: iOS Safari, Firefox, desktop Chrome (limited)
  Fallback for unsupported: show "Printing not supported on this browser" message

PRINTER MANAGEMENT:
  Settings page shows:
  - Last paired printer name
  - "Test Print" button
  - "Forget Printer" button
  - Connection status indicator

ACCEPTANCE:
  □ Bluetooth picker appears on first print
  □ Subsequent prints auto-connect to paired device
  □ KOT prints correctly on thermal printer
  □ Bill prints correctly with GST breakdown
  □ 512-byte chunking works (no data loss)
  □ Connection failure → retry with error message
  □ Unsupported browser → clear fallback message
  □ Test print button works
```

### TASK 4.7 — Digital Invoice (PDF Generation)
**Type:** Backend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/lib/invoice.ts                         → PDF invoice generator
  src/app/api/admin/bills/[id]/invoice/route.ts → GET: generate + return PDF

PDF INVOICE:
  Professional GST-compliant invoice:
  - Restaurant header (name, address, GSTIN, logo)
  - Bill details (number, date, table, order ID)
  - Itemized list (name, qty, unit price, total)
  - Tax breakdown (subtotal, CGST, SGST, total)
  - Payment method + reference
  - Footer: "Thank you for dining with us"

PDF LIBRARY:
  Use @react-pdf/renderer (server-side) or jsPDF
  Output: A5 size (half of A4 — standard receipt size)

STORAGE:
  Upload generated PDF to Cloudinary: qrdine/{restaurant_id}/invoices/
  Store URL in bills.invoice_url

ACCEPTANCE:
  □ PDF generates with all bill details
  □ GST breakdown matches calculateBill output
  □ Restaurant logo in header
  □ PDF downloadable by admin
  □ PDF URL stored in bills table
  □ PDF renders correctly when opened
```

### TASK 4.8 — Invoice Delivery (WhatsApp + Email)
**Type:** Backend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/lib/notifications/whatsapp.ts               → Twilio WhatsApp message sender
  src/lib/notifications/email.ts                   → Resend email sender
  src/app/api/admin/bills/[id]/send/route.ts       → POST: send invoice via WhatsApp/Email

WHATSAPP (Twilio):
  Admin taps "Send to WhatsApp" → enters customer phone (or reads from session)
  Sends: message text + PDF attachment
  Template: "Hi! Here's your bill from {restaurant}. Total: ₹{amount}. Invoice attached."

EMAIL (Resend):
  Admin taps "Send via Email" → enters customer email
  Sends: HTML email + PDF attachment
  Template: branded email with bill summary + PDF attached

CUSTOMER SELF-SERVICE:
  Customer on order tracker → "Get Invoice" button
  Options: Enter phone (WhatsApp) or email
  Triggers the same send flow

ACCEPTANCE:
  □ WhatsApp message sends with invoice PDF
  □ Email sends with invoice PDF attached
  □ Customer can request invoice themselves
  □ Phone/email validated before sending
  □ Rate limited (max 3 sends per bill)
  □ Bills.whatsapp_sent / email_sent flags updated
```

### TASK 4.9 — Admin Billing Dashboard
**Type:** Frontend · **Agent:** UI Developer · **Size:** Medium

```
FILES TO CREATE:
  src/app/(dashboard)/dashboard/billing/page.tsx       → Billing management page
  src/components/billing/BillsList.tsx                  → List of all bills (paginated)
  src/components/billing/BillDetailModal.tsx            → Full bill detail view
  src/components/billing/DailySummary.tsx               → Today's summary card

BILLING PAGE:
  Top: Today's summary
    - Total revenue, total orders, avg order value
    - Cash vs online breakdown
    - Outstanding (unpaid) orders count + amount

  Below: Bills list (paginated, searchable)
    - Bill number, table, amount, payment method, status, time
    - Click → detail modal with full breakdown
    - Actions: print, send WhatsApp, send email, view PDF

  Filters: date range, payment method, payment status

ACCEPTANCE:
  □ Today's summary shows correct totals
  □ Bills list paginated (20 per page)
  □ Search by bill number or table name
  □ Filter by date range works
  □ Filter by payment method works
  □ Bill detail shows full GST breakdown
  □ Print button triggers Bluetooth print
  □ Send buttons trigger WhatsApp/Email
  □ Multi-tenant: only own restaurant's bills
```

---

## Phase 4 Completion Checklist

```
HUMAN VERIFICATION:
  □ Place order → generate bill → correct GST calculation
  □ Pay via Razorpay (test mode UPI) → order marked as paid
  □ Razorpay webhook fires → verify in server logs
  □ Split bill: equal split between 2 people → correct amounts
  □ Print KOT on Bluetooth thermal printer → format correct
  □ Print bill on Bluetooth thermal printer → GST breakdown correct
  □ Generate PDF invoice → download and verify
  □ Send invoice via WhatsApp → message received with PDF
  □ Send invoice via email → email received with PDF
  □ Billing dashboard → today's totals correct
  □ Cash order flow: place → admin marks paid → bill generated
  □ Multi-tenant: Restaurant A bills ≠ Restaurant B bills
  □ Git: tag pre-phase-5, commit "Phase 4 complete"
```

---

## Use Cases Verified

| # | Actor | Action | Expected |
|---|---|---|---|
| 1 | Customer | Chooses "Pay Online" at checkout | Razorpay Checkout opens |
| 2 | Customer | Pays via UPI (test mode) | Payment confirmed, order marked paid |
| 3 | Customer | Chooses "Pay at Counter" | Order placed, payment_status: unpaid |
| 4 | Admin | Marks cash order as paid | payment_status → paid |
| 5 | Admin | Generates bill for served order | Bill created with GST breakdown |
| 6 | Admin | Prints KOT | Thermal printer prints kitchen ticket |
| 7 | Admin | Prints bill | Thermal printer prints customer receipt |
| 8 | Customer | Requests bill | Admin notified, bill generated |
| 9 | Customer | Taps "Split Bill" → Equal (3 people) | Each share = total ÷ 3 |
| 10 | Customer | Taps "Get Invoice" → enters email | Invoice PDF emailed |
| 11 | Admin | Views billing dashboard | Today's revenue, orders, averages |
| 12 | Admin | Filters bills by date range | Correct bills shown |
| 13 | Attacker | Sends fake Razorpay webhook | Rejected (invalid signature) |
| 14 | Customer | Payment fails | Can retry, order not marked paid |

---

*Money touches this phase. Triple-check every calculation. GST errors = legal problems. Payment bugs = trust destroyed. Test with real amounts (Razorpay test mode).*
