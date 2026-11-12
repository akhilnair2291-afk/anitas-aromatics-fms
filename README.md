# Anita's Aromatics — Inventory & FMS Demo

A working front-end demo of an inventory and operations system for **Anita's Aromatics**, built from the 22 requirements in `Anitas_Aromatics_FMS_Automation_Requirements.xlsx`.

The demo covers consolidated inventory, distributor and demo stock, combo availability, daily dispatch, packaging across locations, order-to-proforma-invoice, distributor claims, CRM, and vendor purchase orders with goods receipts.

> **Demo, not production.** All data is sample data stored in the browser. There is no backend, authentication, or live Rupyz/Miracle/Meta integration. Rupyz remains the order source and Miracle remains the billing system of record.

---

## What is included

| Module | Requirements | What the demo shows |
|---|---|---|
| **Inventory** | INV-01 … INV-08 | Consolidated SKU × location stock, distributor closing stock, demo issue/consume/return ledger, combo availability, daily dispatch report, packaging by warehouse/production/office, role-based cost visibility |
| **Billing** | BIL-01 … BIL-03 | Rupyz-style order list, draft proforma invoices built from available stock, shortfall/backorder handling, dispatch that reduces stock immediately, distributor claim statements with approval |
| **CRM** | CRM-01 … CRM-05 | Instagram lead import, lead pipeline stages, offline lead capture, repeat-order tracking, projected sales by salesperson and month |
| **Vendor POs** | VEN-01 … VEN-06 | PO register, status lifecycle, revised delivery dates, partial receipts, follow-up queue, stock posting only on accepted goods receipt |

Every requirement has a traceability card in **Requirements** inside the app, with a deep link to the screen that demonstrates it.

See [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for the source requirements and acceptance criteria.

---

## Tech stack

- **React 19** + **TypeScript 7**
- **Vite 8**
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **BoardUI** source-owned components (`components/`, `styles/`, `utils/`)
- **React Aria Components** for accessible tables, tabs, selects, modals and search fields
- **Remix Icon** for icons
- **Recharts** for dashboard charts
- **localStorage** for demo persistence — no server required

---

## Quick start

### Prerequisites

- **Node.js 20.19+** or **22.12+** (22 LTS or 24 LTS recommended)
- npm 10+

### Run locally

```bash
git clone https://github.com/akhilnair2291-afk/anitas-aromatics-fms.git
cd anitas-aromatics-fms
npm install
npm run dev
```

Open the printed URL, normally <http://localhost:5173>.

### Other scripts

```bash
npm run build     # type-check and production build
npm run preview   # preview the production build
npm run lint      # oxlint
```

---

## Demo guide

The app opens on **Overview**. Use the role switcher in the header and the left navigation to move between modules.

### Recommended end-to-end walkthrough

1. **Inventory → Consolidated stock** — inspect warehouse, production, distributor, online and demo quantities for one SKU. Totals reconcile to the stock ledger.
2. **Inventory → Demo stock** — issue demo stock, consume it, or return it. The demo pool balance changes with each action.
3. **Inventory → Combo stock** — see combo availability calculated from the minimum of component stock ÷ component quantity.
4. **Inventory → Daily dispatch** — run a dispatch from Billing, then return here to see opening, inward, outward and closing quantities.
5. **Inventory → Packaging** — issue packaging from Mumbai Office and confirm the office balance drops.
6. **Billing → Orders** — create a draft PI for an order. Available quantity is reserved; a shortfall is shown when stock is insufficient.
7. **Billing → Draft PIs** — open the PI and dispatch it. Warehouse on-hand and reserved quantities drop, a dispatch movement is written, and the order becomes **Fulfilled**.
8. **Billing → Claims** — generate a distributor claim statement and approve it.
9. **CRM → Pipeline** — import an Instagram lead, advance a lead's stage, and add an offline lead.
10. **CRM → Repeat orders** — mark a customer as reordered and watch the due date move.
11. **CRM → Forecast** — switch the month and compare projected sales by salesperson.
12. **Purchase orders → PO register** — open a PO, revise the delivery date, then receive part of the order. Stock increases only for accepted quantities and the PO becomes **Partially received**.
13. **Purchase orders → Follow-ups** — inspect overdue, due-soon and awaiting-acknowledgement queues.
14. **Requirements** — filter by module or search, then deep-link to any of the 22 requirements.

### Roles

Switch roles from the header to demonstrate access control:

| Role | Pages | Notes |
|---|---|---|
| **Admin** | Overview, Inventory, Purchase orders, Billing, CRM, Requirements | Full access; can see cost and valuation |
| **Sales** | Overview, Inventory, Billing, CRM | Cannot view SKU cost or stock valuation |
| **Warehouse** | Overview, Inventory, Purchase orders | Can receive goods and view valuation |
| **Trainer** | Inventory | Stock availability only, no cost |

### Resetting the demo

Click **Reset** in the header to restore the seeded sample data. Data persists across reloads in `localStorage` under `anitas-fms-demo-v1`.

More detailed scenarios: [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md).

---

## Project structure

```text
.
├─ components/              BoardUI source-owned components
│  ├─ base/                 Buttons, inputs, tables, tabs, modals, toast…
│  ├─ application/          Larger application patterns
│  └─ foundations/          Direction, scroll fade and layout primitives
├─ docs/
│  ├─ REQUIREMENTS.md       All 22 source requirements + acceptance criteria
│  ├─ ARCHITECTURE.md       State model, data flow and design decisions
│  └─ DEMO_GUIDE.md         Step-by-step demo and test scenarios
├─ src/
│  ├─ components/           App shell and shared UI helpers
│  ├─ data/requirements.ts   Requirement traceability metadata
│  ├─ lib/                  Types, seed data, formatting and selectors
│  ├─ pages/                Dashboard, Inventory, Billing, CRM, POs, Requirements
│  ├─ store/AppStore.tsx    Reducer, actions and localStorage persistence
│  ├─ App.tsx               Page routing and role redirects
│  └─ main.tsx              Entry point
├─ styles/                  BoardUI theme, typography and global CSS
├─ utils/                   cx(), directional icons, shared hooks
├─ public/                  Static assets
└─ vite.config.ts           Vite + Tailwind + path aliases
```

### Path aliases

BoardUI files live at the repository root, while app code lives in `src/`. The Vite and TypeScript configs map:

- `@/components/base/*`, `@/components/application/*`, `@/components/foundations/*` → root `components/`
- `@/styles/*` → root `styles/`
- `@/utils/*` → root `utils/`
- every other `@/*` import → `src/`

This keeps BoardUI imports identical to the upstream component documentation.

---

## Design system notes

The UI follows the BoardUI rules in [`AGENTS.md`](AGENTS.md):

- Prefer installed components over hand-built lookalikes.
- Use semantic color tokens (`text-text-primary`, `bg-background-secondary-default`, `border-border-button-default`) — no raw palette classes or hex values.
- Use composite typography utilities (`text-title-1-semibold`, `text-body-regular`, `text-caption-1-medium`).
- Merge classes with `cx()` from `@/utils/cx`.
- Keep focus styles and RTL-safe logical spacing.

Dark mode is available from the header theme toggle.

---

## Data model (summary)

`AppState` is a single serializable object containing:

- SKUs, locations, stock rows and movements
- Combos and component quantities
- Distributors, demo issues, packaging items/issues
- Sales orders, proforma invoices and claims
- Customers, leads, vendors, purchase orders and receipts

State transitions are handled by a typed reducer in `src/store/AppStore.tsx` (for example `create-pi`, `dispatch-pi`, `receive-po`, `issue-demo`, `generate-claim`). Selectors in `src/lib/selectors.ts` derive availability, combo counts, distributor closing stock, forecasts, follow-ups and role visibility.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.

---

## Known limitations

- Sample data only; no server, database, auth or API integration.
- Rupyz, Miracle, Meta/Instagram and vendor updates are simulated.
- Currency is INR and dates are seeded relative to the current date.
- The app is a demonstration of workflows, not a production accounting or inventory system.
- The production bundle is a single large chunk; code splitting is a future improvement.

---

## Documentation

- [Requirements](docs/REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Demo guide](docs/DEMO_GUIDE.md)
- [Contributing](CONTRIBUTING.md)
- [License](LICENSE)

---

## Credits

- UI components and design tokens: [BoardUI](https://www.boardui.com/)
- Icons: [Remix Icon](https://remixicon.com/)
- Charts: [Recharts](https://recharts.org/)
- Built for Anita's Aromatics as a workflow demonstration.

## License

[MIT](LICENSE) © 2026 Akhil
