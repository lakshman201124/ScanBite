# ScanBite Frontend Use Case Analysis

## Purpose
This document analyzes the current frontend order and table design implementation in `qrdine` and connects it to the product requirements in `PRODUCT_SPEC.md`. It identifies where the UI already matches the spec, and where new user-facing use cases can be added for orders, billing, and tables.

---

## 1. Current frontend order and table experience

### Orders page (`OrdersPageClient.tsx`)
- Live admin order feed with kanban-style columns: New, Active, Ready, Done.
- Real-time socket updates via `useOrderUpdates`.
- New Order slide-in panel for `POST /api/admin/orders/manual`.
- Floor & Tables view showing a table heatmap and quick actions.
- Order cards with status pills, elapsed time, subtotal, and click-to-open detail modal.

### Tables page (`TablesManager.tsx`)
- Table cards with status badges and live order summaries.
- QR link preview, copy, download, regenerate, and delete actions.
- Table filters, search, and area tabs.
- KPI strip showing tables seated, ordering, bill-ready counts, and projected revenue.

### Order card / detail modal
- `AdminOrderCard` displays order number, table, items, notes, and subtotal.
- `OrderDetailModal` shows line items, special instructions, cancellation reason, and status actions.
- `OrderStatusActions` drives transitions via `PATCH /api/admin/orders/[id]/status`.

---

## 2. Where the current design supports product spec use cases

### Supported
- Live order management and kitchen status updates
- Admin manual order creation for any table
- Table heatmap and occupancy status
- QR-based table entry and QR regeneration
- Status transitions with real-time UI feedback
- Order detail inspection with notes and cancellation reason

### Gaps / missing frontend pieces relative to `PRODUCT_SPEC.md`
- Bill creation and bill status actions are not surfaced from order cards or tables.
- Split-bill / payment workflow does not appear in admin/order views.
- Table-specific billing workflows (`bill_requested`, `bill_ready`) are only implicit.
- Order search/filtering is limited — no amount, payment status, or customer note filter.
- Table workflows such as transfer, merge, reservation, and cleaning are not clearly surfaced.

---

## 3. Suggested new order panel use cases

### 3.1 Add billing entry points
- Add `Generate bill` / `Create bill` button on `AdminOrderCard` and in `OrderDetailModal`.
- Link `Ready` status directly to bill creation for instant checkout.
- Add a `Mark paid` / `Finalize payment` action when order reaches `ready`.
- Show a `Bill requested` badge on cards once `POST /api/customer/orders/[id]/bill` is triggered.

### 3.2 Add payment and invoice actions
- Add `Send invoice` / `Email bill` / `WhatsApp bill` buttons in order details.
- Expose `Create payment order` and `Verify payment` actions for Razorpay flows.
- Show `payment_status` on the order card: unpaid, verifying, paid.

### 3.3 Make order cards more bill-aware
- Show `bill amount` and `payment method` directly on the card summary.
- Add a `Last action` line: e.g. `Ready for bill`, `Bill generated`, `Paid`.
- Add a second badge for `Bill Pending` or `Payment Due`.

### 3.4 Improve order search / filters
- Add filters for `Table`, `Order Number`, `Status`, `Amount`, and `Payment Status`.
- Add a search bar to the orders view for menu item names and notes.
- Allow `Bills pending` quick filter to surface all orders waiting for checkout.

### 3.5 Enhance manual order flow
- Allow choosing an existing active order to update instead of always creating a new order.
- Add `Repeat last order` and `Quick reorder` from a selected table.
- Add `Customize and send to kitchen` fields for special prep instructions.

### 3.6 Expand order detail modal use cases
- Add tabs for `Items`, `Billing`, `Timeline`, and `History`.
- Add a bill breakdown with subtotal, taxes, discounts, and total.
- Add `Split bill` calculation directly from the modal.
- Add `Refund / cancel item` actions for partial order cancellations.

---

## 4. Suggested table-related use cases

### 4.1 Make tables more transactional
- Add `View bill` CTA for tables with `ready` or `bill_ready` orders.
- Add `Assign waiter` and `Request service` tags to table cards.
- Add `Transfer order` and `Merge tables` actions on table cards.
- Add a `Customer count` preview on each table card.

### 4.2 Add table billing workflow
- Show `Bill ready` status explicitly on the table and in filters.
- Add an action to `Send bill to customer` or `Print bill` from the table card.
- Display `Pending bill amount` and `Number of orders waiting for bill`.
- Add `Bill requested` and `Service call` indicators.

### 4.3 Add restaurant operations use cases
- Add `Reserve table` / `Hold table` workflows for bookings.
- Add `Cleaning required` and `Bussed` state transitions.
- Add `Customer feedback` or `complaint note` flags on table cards.
- Add `Estimated seating time` for walk-ins and waitlist management.

### 4.4 Data-driven table enhancements
- Use actual `area` / zone data instead of hardcoded indoor/terrace tabs.
- Show `Table heatmap` grouped by area and status.
- Add `Table load` KPI cards such as `Tables in billing`, `Tables waiting`, and `Tables in cleaning`.
- Show live `order amount` per table, not just order count.

### 4.5 QR and check-in use cases
- Show a clear `QR active` badge for tables ready to self-order.
- Add a `Regenerate QR` confirmation flow that clearly warns about invalidating printed codes.
- Add `Print QR` or `Share QR link` actions directly on the table card.
- Add `QR access history` or `last scanned` metadata if available.

---

## 5. Recommended feature story map

### Order management
1. Real-time orders appear in kanban columns.
2. Admin clicks an order card to open details.
3. Admin can update status, create a bill, or send invoice.
4. Once bill is generated, order transitions to `paid` or `settled`.
5. Table status updates automatically and moves to available when complete.

### Billing flow
1. `Ready` / `Bill requested` status becomes visible in both orders and tables.
2. Admin uses a single button to `Create bill` and `Send invoice`.
3. Bill totals are shown in the order modal with tax breakdown.
4. Customer receives payment or invoice notifications.

### Table operations
1. Tables display status, active order count, and pending bill amount.
2. Admin filters by `open`, `ordering`, `bill ready`, and `cleaning`.
3. Admin can reserve, seat, transfer, or clean tables from one view.
4. QR actions are available without leaving the tables page.

---

## 6. UI / design improvements aligned with current code

### Keep the existing brand tone
- The UI already uses strong semantic status colors and clean cards.
- Continue with the existing `var(--brand)`, `var(--green)`, and `var(--amber)` system.
- Keep the floor/dashboard split between `Floor & Tables` and `Live Orders`.

### Add richer metadata without clutter
- Use compact badges for `Bill pending`, `Paid`, `Service call`, and `Reserved`.
- Surface financial metrics in the table cards only when an order exists.
- Keep the order panel slide-in pattern for manual entry, but extend with bill-specific tabs.

### Use current concepts for new workflows
- The `New Order` panel can evolve into a `Table Order Workspace` with `Browse`, `Cart`, and `Billing` tabs.
- The table grid can support inline actions instead of requiring the Admin to switch pages.
- Use the existing table status legend for new states like `Bill ready` and `Cleaning`.

---

## 7. Prioritized list of additions

1. Bill actions in order cards and detail modal.
2. Bill-ready status and pending bill amount in table cards.
3. Order search/filter by table, amount, and payment status.
4. Split bill and invoice resend actions in the order detail modal.
5. Table transfer / merge / reservation actions on the tables page.
6. Explicit service request or guest assistance flag.
7. Better QR lifecycle messaging: active, expired, regenerated.

---

## 8. Conclusion
The current frontend implementation already delivers a strong live order and table management experience. The highest-value new use cases are billing and table operations: surfacing bills directly in the order panel, making table status more transactional, and adding service/payment controls for real daily restaurant workflows.

By adding these cases, the app will better connect the `POST /api/customer/orders/[id]/bill`, `POST /api/admin/orders/manual`, and billing API flows from `PRODUCT_SPEC.md` into the actual admin UI.
