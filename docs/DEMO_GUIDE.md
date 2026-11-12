# Demo guide

A step-by-step guide for walking a reviewer through all 22 requirements. The demo persists changes in `localStorage`; use **Reset** in the header before starting a fresh run.

## Before you start

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally <http://localhost:5173>). The app starts as **Admin** on **Overview**.

Data is seeded relative to today, so due dates, overdue POs, repeat orders and forecasts always look current.

---

## 1. Inventory (INV-01 … INV-08)

### INV-01 — Consolidated stock

1. Open **Inventory → Consolidated stock**.
2. Hover or read across a SKU row: warehouse, production, distributor, online and demo quantities.
3. Confirm **Total** is the sum of the location columns.
4. Use the location filter and search box to narrow the view.

**Expected:** one SKU × location view with channel grouping, a consolidated total, and a stock value at cost for roles that can see cost.

### INV-02 — Distributor stock

1. Open **Inventory → Distributors**.
2. Select a distributor.
3. Review dispatched, sold, returned and closing quantities.

**Expected:** closing stock is derived from company dispatch and distributor sales, and matches the distributor location balance.

### INV-03 — Demo stock

1. Open **Inventory → Demo stock**.
2. Click **Issue demo stock**, choose a SKU and quantity, and issue it to a trainer or customer.
3. On an open issue, click **Consume** and confirm.
4. On another open issue, click **Return** and confirm.

**Expected:** issuing moves units from warehouse to demo pool; consuming reduces the pool; returning moves units back to the warehouse. The ledger shows issued, consumed, returned and balance, and the pool total equals outstanding quantities.

### INV-04 — Combo stock

1. Open **Inventory → Combo stock**.
2. Review each combo card: component quantities, available sets, and limiting component.

**Expected:** available combos equal `min(floor(available component qty ÷ component qty))`. Components shared by combos are not double-counted.

### INV-05 — Daily dispatch report

1. Complete a dispatch first (see BIL-01 below) or use an existing movement.
2. Open **Inventory → Daily dispatch**.
3. Check opening, inward, outward and closing quantities for the selected date.
4. Switch to **Yesterday** to compare.

**Expected:** dispatching reduces on-hand stock immediately; the report reconciles as `opening + inward − outward = closing`.

### INV-06 — Packaging across locations

1. Open **Inventory → Packaging**.
2. Review warehouse, production and office columns for each packaging item.
3. Change the location filter.

**Expected:** packaging is tracked per location with reorder status.

### INV-07 — Packaging at office

1. On **Inventory → Packaging**, click **Issue packaging**.
2. Choose an item and **Mumbai Office**, enter a quantity and purpose, and record the issue.

**Expected:** the office balance drops, the office consumption history gains a row, and a packaging movement is written.

### INV-08 — Team stock visibility

1. Use the header role switcher.
2. Switch to **Sales**: Billing and CRM remain, Purchase orders and Requirements disappear, and the stock table hides cost and valuation.
3. Switch to **Warehouse**: Purchase orders appears; valuation is visible.
4. Switch to **Trainer**: only Inventory remains, with cost hidden.
5. Search stock in each role.

**Expected:** navigation and sensitive cost data change with the role, while stock remains searchable.

---

## 2. Billing (BIL-01 … BIL-03)

### BIL-01 — Order to PI

1. Open **Billing → Orders**.
2. Find an order with status **Open** and click **Create draft PI**.
3. Review available quantity, rate, value and any shortfall.
4. Confirm the order status becomes **PI drafted** (or **Partially available** / **Backorder**).

**Expected:** only currently available warehouse quantity is included; that quantity is reserved against the draft PI.

### BIL-02 — Shortfall and backorder

1. Open **Billing → Draft PIs** and review a PI with a non-zero shortfall (for example the Soukya Spa order).
2. Check the **Backorder queue** below the table.

**Expected:** unavailable quantity is shown separately; the order stays open until the remaining quantity is fulfilled.

### BIL-03 — Claim statements

1. Open **Billing → Claims**.
2. Click **Generate claim**, choose a distributor and period, and review the scheme, damage and additional customer-discount rates.
3. Adjust the additional discount if the distributor gave a different discount to customers, then generate the statement.
4. Approve the new statement.

**Expected:** claim amount = reported sales × (scheme rate + damage allowance + additional customer discount). The statement shows each reimbursement component separately so discounts can be reconciled against the distributor's records.

### Dispatch workflow (BIL-01 + INV-05)

1. Open **Billing → Draft PIs**.
2. Click **Review & dispatch** on a draft PI without shortfall.
3. Confirm dispatch.

**Expected:** PI status becomes **Dispatched**, warehouse on-hand and reserved quantities fall, dispatch movements appear in Inventory, and the source order becomes **Fulfilled**.

---

## 3. CRM (CRM-01 … CRM-05)

### CRM-01 — Instagram leads

1. Open **CRM → Pipeline**.
2. Click **Import Instagram leads**.

**Expected:** a new Instagram lead appears with source, owner, expected value, created date and next action.

### CRM-02 — Lead status and follow-up

1. On the pipeline, advance a lead (for example New → Contacted → Interested).
2. Review last contact and next action.

**Expected:** stage changes are recorded and last contact updates.

### CRM-03 — Offline leads

1. Click **Add offline lead**.
2. Enter name, source, phone, owner, expected value and next action.
3. Save.

**Expected:** the lead appears in the central pipeline and can be advanced like any imported lead.

### CRM-04 — Repeat orders

1. Open **CRM → Repeat orders**.
2. Find a customer with an overdue or due-soon repeat status.
3. Click **Mark reordered**.

**Expected:** last order date becomes today, reorder due date moves forward, and the status becomes **On track**.

### CRM-05 — Projected sales

1. Open **CRM → Forecast**.
2. Change the month.
3. Compare projected sales by salesperson and the weighted pipeline total.

**Expected:** projections combine weighted open pipeline with repeat-order value for the selected month.

---

## 4. Vendor POs (VEN-01 … VEN-06)

### VEN-01 — PO register

1. Open **Purchase orders → PO register**.
2. Filter by vendor, status or search text.
3. Review issue date, effective delivery date, line count, pending quantity and owner.

**Expected:** every PO is visible with its vendor and issue information.

### VEN-02 — Current status

1. Open a PO.
2. Change status through Issued → Acknowledged → In production → Dispatched.

**Expected:** the register reflects the new status and last updated date. "Received" is set automatically from receipts.

### VEN-03 — Committed delivery

1. Open a PO and choose a revised delivery date.
2. Click **Revise**.
3. Return to the register or follow-ups.

**Expected:** the effective date uses the revision, the original date is retained, and overdue calculations use the effective date.

### VEN-04 — Partial deliveries

1. Click **Receive** on an open PO.
2. Accept less than the pending quantity on at least one line.
3. Click **Accept N units**.

**Expected:** the PO becomes **Partially received**, each line shows ordered/received/pending, and a receipt is recorded against the PO.

### VEN-05 — Vendor follow-ups

1. Open **Purchase orders → Follow-ups**.
2. Review overdue, due-within-seven-days, awaiting acknowledgement and partial-delivery queues.
3. Check the assigned owner and recommended action.

**Expected:** alerts are derived from status and effective delivery date, not manually maintained.

### VEN-06 — Inventory linkage

1. Note the warehouse quantity of an item on a PO.
2. Change the PO status to **Dispatched** without receiving anything.
3. Confirm inventory does **not** change.
4. Receive part of the PO and confirm warehouse stock increases only for accepted quantities and inward movements are written.

**Expected:** vendor dispatch alone never posts stock; accepted receipts do.

---

## 5. Requirements traceability

1. Open **Requirements**.
2. Filter by module (Inventory, Billing, CRM, Vendor POs).
3. Search for an ID or keyword.
4. Click **Open demo** on any card.

**Expected:** all 22 requirements are listed with process, automation, data, outcome, priority, demo location and a deep link to the relevant tab.

---

## Role matrix

| Page | Admin | Sales | Warehouse | Trainer |
|---|---|---|---|---|
| Overview | Yes | Yes | Yes | — |
| Inventory | Yes | Yes | Yes | Yes |
| Purchase orders | Yes | — | Yes | — |
| Billing | Yes | Yes | — | — |
| CRM | Yes | Yes | — | — |
| Requirements | Yes | — | — | — |
| Cost visibility | Yes | No | Yes | No |

## Reset

Click **Reset** in the header and confirm to restore every seeded record and remove local changes.
