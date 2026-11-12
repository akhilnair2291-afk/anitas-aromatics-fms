# Anita's Aromatics — FMS Automation Requirements

Source: `Anitas_Aromatics_FMS_Automation_Requirements.xlsx` (Inventory, Billing, CRM, Vendor POs, Overview).
Purpose: developer demo and implementation quotation. Proposed solution: JavaScript web application hosted in the cloud. Rupyz and Miracle remain in use.

**22 requirements** — Inventory 8 · Billing 3 · CRM 5 · Vendor POs 6.

Priority: all **High** except VEN-05 (Medium). All items were marked **Not shown** in the original demo status.

---

## 1. Inventory (8)

| ID | Process / bottleneck | Required automation | Data required | Expected result / dashboard | Priority |
|---|---|---|---|---|---|
| INV-01 | Consolidated stock | Calculate stock held offline, at distributors and in online channels | Location-wise SKU stock, sales, transfers and returns | Stock visibility by location and channel | High |
| INV-02 | Distributor stock | Track stock sent to distributors and quantity sold by them | Distributor statements and company dispatch data | Distributor-wise closing stock | High |
| INV-03 | Demo stock | Include demo stock issued to trainers, staff and customers | Demo issue, consumption and return records | Demo stock ledger and available balance | High |
| INV-04 | Combo stocks | Calculate available quantities for Potli + Ayurasa; Candle + Kit; Bath Bomb + Cocktail | Individual SKU stocks and combo component quantities | Available combo quantity without double counting | High |
| INV-05 | Daily dispatch report | Automatically reduce available stock as goods are dispatched | Dispatch transactions, cancellations, returns | Daily opening, inward, outward and closing stock | High |
| INV-06 | Packaging across locations | Track packaging material at different storage/production locations | Receipts, transfers, consumption and wastage | Location-wise packaging inventory | High |
| INV-07 | Packaging at office | Track packaging materials held and consumed at office | Office issue and consumption records | Office packaging balance | High |
| INV-08 | Team stock visibility | Provide authorised team access to stock availability | Role permissions and inventory data | Searchable stock dashboard | High |

**Acceptance criteria**
- INV-01: one SKU × location view with channel grouping and a consolidated total; values reconcile to the stock ledger.
- INV-02: dispatched, sold, returned and closing quantity per distributor; closing stock matches the distributor location balance.
- INV-03: every demo issue has issued / consumed / returned / outstanding quantities, and the demo pool balance equals the outstanding total.
- INV-04: combo availability is `min(floor(available component qty ÷ component qty))`; shared components are reserved once and never counted twice.
- INV-05: dispatching reduces on-hand stock immediately and writes a movement; report shows opening + inward − outward = closing per day.
- INV-06: packaging stock is held per location and adjusted by receipts, issues, transfers and wastage.
- INV-07: office packaging has its own balance and issue history.
- INV-08: role-based access (Admin, Sales, Warehouse, Trainer) filters modules and sensitive data; stock is searchable.

---

## 2. Billing (3)

| ID | Process / bottleneck | Required automation | Data required | Expected result / dashboard | Priority |
|---|---|---|---|---|---|
| BIL-01 | Order to PI | Convert Rupyz sales orders into draft proforma invoices based on available stock | Rupyz orders, stock availability and prices | Draft PI with available quantities | High |
| BIL-02 | Partial and pending orders | Show shortfall and remaining quantities when stock is insufficient | Order quantities, reserved and available stock | Pending / backorder quantities and follow-up status | High |
| BIL-03 | Claim statements | Prepare distributor claim statements from applicable schemes and sales | Distributor sales reports, claims, offer rules | Claim statement ready for review | High |

**Acceptance criteria**
- BIL-01: one click creates a draft PI with only currently available quantities, rates and totals.
- BIL-02: unavailable quantity is shown as shortfall/backorder; the order remains open until fulfilled.
- BIL-03: claim amount is calculated from sales value × scheme rate (+ damage allowance) and is reviewable/approvable.

**Boundary:** Miracle remains the billing system; the demo creates and approves draft PIs in this app.

---

## 3. CRM (5)

| ID | Process / bottleneck | Required automation | Data required | Expected result / dashboard | Priority |
|---|---|---|---|---|---|
| CRM-01 | Instagram leads | Pull supported Instagram/Meta lead information into CRM | Lead forms or supported Meta lead source | New lead record and owner assignment | High |
| CRM-02 | Instagram lead status | Track current status and follow-up of each imported lead | Lead activity, last contact, next action | New / contacted / interested / converted / lost | High |
| CRM-03 | Offline lead updates | Enable team to update offline enquiry and visit leads | Manual lead entry, employee updates | Centralised current lead pipeline | High |
| CRM-04 | Repeat orders | Identify and update repeat order status for existing customers | Customer master and order history | Last order, reorder date, repeat-order tracking | High |
| CRM-05 | Projected sales | Calculate projected sales by salesperson and period | Lead pipeline, expected value/date, order history | Expected sales dashboard and forecast | High |

**Acceptance criteria**
- CRM-01: a simulated Meta/Instagram import creates leads with source, owner, value and date.
- CRM-02: status can move through New → Contacted → Interested → Converted/Lost, with last contact and next action visible.
- CRM-03: offline leads can be added and edited manually.
- CRM-04: customer shows last order, reorder due date and repeat status (On track / Due soon / Overdue).
- CRM-05: weighted pipeline + repeat-order value produces projected sales by salesperson and month.

---

## 4. Vendor POs (6)

| ID | Process / bottleneck | Required automation | Data required | Expected result / dashboard | Priority |
|---|---|---|---|---|---|
| VEN-01 | PO issue records | Record vendor purchase orders and issue dates | Vendor, PO number, issue date, line items | PO register by vendor and date | High |
| VEN-02 | Current order status | Update each PO status through ordering and production stages | Acknowledgements and vendor status updates | Current status and last updated date | High |
| VEN-03 | Committed delivery | Record original and revised expected delivery dates | Vendor promised delivery dates | Due and overdue PO view | High |
| VEN-04 | Partial deliveries | Track quantity ordered, received and still pending | Purchase orders and inward goods receipts | Pending quantity per PO item | High |
| VEN-05 | Vendor follow-ups | Remind responsible team about pending vendor confirmations and delays | Due date, status and assigned owner | Follow-up alerts and escalation | Medium |
| VEN-06 | Inventory linkage | Update stock after goods receipt, not merely when vendor marks dispatched | Accepted inward receipts and inventory SKU mapping | Inventory updated after receipt | High |

**Acceptance criteria**
- VEN-01: PO register filterable by vendor/status with issue date and line items.
- VEN-02: status stages: Issued → Acknowledged → In production → Dispatched → Partially received → Received; last updated date recorded.
- VEN-03: overdue is derived from the effective (revised or original) delivery date.
- VEN-04: each line shows ordered, received and pending quantity; PO status updates from receipts.
- VEN-05: alerts for overdue, awaiting acknowledgement and stalled POs, assigned to an owner.
- VEN-06: accepting a receipt increases the mapped inventory item and writes an inward movement; vendor dispatch alone changes nothing.

---

## Implementation considerations (from the Overview sheet)

1. **Integrations** — confirm what can be pulled automatically from Rupyz, Miracle, online channels and Meta versus imported.
2. **Inventory accuracy** — distributor and packaging stock need reliable source records and periodic reconciliation.
3. **Combo logic** — reserve/shared SKU stocks must not be counted twice across combos or separate orders.
4. **Billing boundary** — Miracle remains billing; confirm where draft PIs are created and approved.
5. **Vendor updates** — vendor status is only current if vendor/team updates are recorded; receipt must reconcile against PO.
6. **Ownership** — company ownership of code, accounts, database, exports and admin permissions.
7. **Demo acceptance** — demonstrate a complete workflow with real or sample data before issuing the final quote.

---

## Demo scope / suggested build

A single-page cloud-style demo using sample data, covering a complete cross-module workflow:

1. See consolidated stock by location/channel (INV-01), distributor closing stock (INV-02), demo ledger (INV-03), and combo availability (INV-04).
2. Dispatch stock and see the daily opening/inward/outward/closing report update (INV-05).
3. Track packaging across warehouse/production/office and issue office packaging (INV-06, INV-07).
4. Switch roles and search stock with restricted cost visibility (INV-08).
5. Turn a sales order into a draft PI with available quantity + shortfall (BIL-01, BIL-02), then dispatch it and reduce stock.
6. Generate a distributor claim statement (BIL-03).
7. Import Instagram leads, move them through the pipeline, add offline leads, track repeat orders and view projected sales by salesperson (CRM-01…05).
8. Record POs, update stages, revise delivery dates, see due/overdue views and follow-up alerts, then receive goods and watch stock increase only on receipt (VEN-01…06).

### Suggested delivery phases for the real implementation
- **Phase 1 — Inventory truth:** SKU/location ledger, movement engine, roles.
- **Phase 2 — Order-to-PI:** Rupyz order import, stock reservation, shortfall/backorder, Miracle hand-off.
- **Phase 3 — Vendor PO + receipt:** PO lifecycle, receipts, inventory posting.
- **Phase 4 — CRM:** Meta lead sync, pipeline, repeat orders, forecasting.
- **Phase 5 — Reconciliation & reporting:** distributor statements, claims, packaging controls, audit exports.
