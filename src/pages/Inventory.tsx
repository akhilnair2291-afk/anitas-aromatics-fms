import { useState } from "react";
import {
  RiAddLine,
  RiAlertLine,
  RiArrowRightUpLine,
  RiBox3Line,
  RiCheckLine,
  RiFileListLine,
  RiGiftLine,
  RiStackLine,
  RiStore2Line,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
import { Input } from "@/components/base/input/input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/base/modal/modal";
import { SearchField } from "@/components/base/search-field/search-field";
import { Select, SelectItem } from "@/components/base/select/select";
import { Tab, TabList, TabPanel, Tabs } from "@/components/base/tabs/tabs";
import { toast } from "@/components/base/toast/toast";
import { useApp } from "@/store/AppStore";
import {
  addDays,
  formatDate,
  formatMoney,
  formatNumber,
  formatShortDate,
  todayISO,
} from "@/lib/format";
import {
  availableAt,
  canSeeCost,
  comboAvailability,
  dailyDispatch,
  demoOutstanding,
  distributorSummary,
  locationById,
  reservedAt,
  skuById,
  stockAt,
  stockValue,
  totalOnHand,
  totalUnits,
  WAREHOUSE,
  OFFICE,
} from "@/lib/selectors";
import type { DemoIssue, PackagingItem } from "@/lib/types";
import {
  Bar,
  Callout,
  Card,
  DataTable,
  EmptyState,
  Metric,
  PageHeader,
  SectionHeader,
  StatusChip,
  type DataColumn,
} from "@/components/ui";

type InventoryTab = "stock" | "distributors" | "demo" | "combos" | "dispatch" | "packaging";

const TAB_KEYS: InventoryTab[] = ["stock", "distributors", "demo", "combos", "dispatch", "packaging"];

export function InventoryPage({
  tab,
  onTabChange,
  onNavigate,
}: {
  tab: string;
  onTabChange: (tab: string) => void;
  onNavigate: (page: "billing" | "purchase-orders", tab?: string) => void;
}) {
  const { state } = useApp();
  const [issueDemoOpen, setIssueDemoOpen] = useState(false);
  const [issuePackagingOpen, setIssuePackagingOpen] = useState(false);
  const activeTab = (TAB_KEYS.includes(tab as InventoryTab) ? tab : "stock") as InventoryTab;

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock, combos and packaging"
        description="A single ledger for warehouse, production, distributors, online channels and the demo pool. Dispatches and receipts post here immediately."
        actions={
          activeTab === "demo" ? (
            <Button size="small" leadingIcon={RiAddLine} onClick={() => setIssueDemoOpen(true)}>
              Issue demo stock
            </Button>
          ) : activeTab === "packaging" ? (
            <Button size="small" leadingIcon={RiAddLine} onClick={() => setIssuePackagingOpen(true)}>
              Issue packaging
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiArrowRightUpLine}
              onClick={() => onNavigate("purchase-orders", "register")}
            >
              Receive goods
            </Button>
          )
        }
      />

      <Tabs selectedKey={activeTab} onSelectionChange={(key) => onTabChange(String(key))}>
        <TabList aria-label="Inventory views">
          <Tab id="stock" count={state.skus.length}>Consolidated stock</Tab>
          <Tab id="distributors" count={state.distributors.length}>Distributors</Tab>
          <Tab id="demo" count={state.demoIssues.filter((issue) => issue.status === "Outstanding").length}>Demo stock</Tab>
          <Tab id="combos" count={state.combos.length}>Combo stock</Tab>
          <Tab id="dispatch">Daily dispatch</Tab>
          <Tab id="packaging" count={state.packaging.length}>Packaging</Tab>
        </TabList>

        <TabPanel id="stock">
          <StockTab />
        </TabPanel>
        <TabPanel id="distributors">
          <DistributorTab />
        </TabPanel>
        <TabPanel id="demo">
          <DemoTab onIssue={() => setIssueDemoOpen(true)} />
        </TabPanel>
        <TabPanel id="combos">
          <ComboTab />
        </TabPanel>
        <TabPanel id="dispatch">
          <DispatchTab onOpenPis={() => onNavigate("billing", "pis")} />
        </TabPanel>
        <TabPanel id="packaging">
          <PackagingTab onIssue={() => setIssuePackagingOpen(true)} />
        </TabPanel>
      </Tabs>

      <IssueDemoModal open={issueDemoOpen} onClose={() => setIssueDemoOpen(false)} />
      <IssuePackagingModal open={issuePackagingOpen} onClose={() => setIssuePackagingOpen(false)} />
    </>
  );
}

/* ------------------------------------------------------------------ stock */

type StockView = "all" | "warehouse" | "production" | "distributor" | "online" | "demo";

const STOCK_VIEWS: { id: StockView; label: string }[] = [
  { id: "all", label: "All locations" },
  { id: "warehouse", label: "Warehouse" },
  { id: "production", label: "Production" },
  { id: "distributor", label: "Distributors" },
  { id: "online", label: "Online channels" },
  { id: "demo", label: "Demo pool" },
];

function StockTab() {
  const { state } = useApp();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<StockView>("all");
  const showCost = canSeeCost(state.role);

  const locationIds = state.locations
    .filter((location) => (view === "all" ? true : location.type === view))
    .map((location) => location.id);

  const rows = state.skus
    .filter((sku) => {
      const text = `${sku.name} ${sku.id} ${sku.category}`.toLowerCase();
      return text.includes(query.trim().toLowerCase());
    })
    .map((sku) => {
      const at = (ids: string[]) =>
        state.stock
          .filter((row) => row.skuId === sku.id && ids.includes(row.locationId))
          .reduce((sum, row) => sum + row.onHand, 0);
      const warehouse = stockAt(state, sku.id, WAREHOUSE);
      const reserved = reservedAt(state, sku.id, WAREHOUSE);
      const distributorIds = state.locations.filter((l) => l.type === "distributor").map((l) => l.id);
      const onlineIds = state.locations.filter((l) => l.type === "online").map((l) => l.id);
      const demoIds = state.locations.filter((l) => l.type === "demo").map((l) => l.id);
      const productionIds = state.locations.filter((l) => l.type === "production").map((l) => l.id);
      return {
        id: sku.id,
        sku,
        warehouse,
        reserved,
        available: Math.max(0, warehouse - reserved),
        production: at(productionIds),
        distributor: at(distributorIds),
        online: at(onlineIds),
        demo: at(demoIds),
        scoped: at(locationIds),
        total: totalOnHand(state, sku.id),
      };
    })
    .filter((row) => (view === "all" ? true : row.scoped > 0 || row.warehouse > 0));

  const columns: DataColumn<(typeof rows)[number]>[] = [
    {
      id: "sku",
      header: "SKU",
      isRowHeader: true,
      cell: (row) => (
        <div className="min-w-[190px]">
          <p className="text-body-medium text-text-primary">{row.sku.name}</p>
          <p className="text-caption-1-medium text-text-tertiary">
            {row.sku.id} · {row.sku.category}
          </p>
        </div>
      ),
    },
    ...(view === "all"
      ? [
          { id: "warehouse", header: "Warehouse", align: "end" as const, cell: (row: (typeof rows)[number]) => formatNumber(row.warehouse) },
          { id: "production", header: "Production", align: "end" as const, cell: (row: (typeof rows)[number]) => formatNumber(row.production) },
          { id: "distributor", header: "Distributors", align: "end" as const, cell: (row: (typeof rows)[number]) => formatNumber(row.distributor) },
          { id: "online", header: "Online", align: "end" as const, cell: (row: (typeof rows)[number]) => formatNumber(row.online) },
          { id: "demo", header: "Demo", align: "end" as const, cell: (row: (typeof rows)[number]) => formatNumber(row.demo) },
          { id: "total", header: "Total", align: "end" as const, cell: (row: (typeof rows)[number]) => <span className="font-medium">{formatNumber(row.total)}</span> },
        ]
      : [
          { id: "onhand", header: "On hand", align: "end" as const, cell: (row: (typeof rows)[number]) => formatNumber(row.scoped) },
          { id: "reserved", header: "Reserved", align: "end" as const, cell: (row: (typeof rows)[number]) => formatNumber(row.reserved) },
          { id: "available", header: "Available", align: "end" as const, cell: (row: (typeof rows)[number]) => formatNumber(Math.max(0, row.scoped - row.reserved)) },
          { id: "total", header: "All locations", align: "end" as const, cell: (row: (typeof rows)[number]) => formatNumber(row.total) },
        ]),
    {
      id: "status",
      header: "Status",
      cell: (row) =>
        row.warehouse <= row.sku.reorderLevel ? (
          <StatusChip status="Low" />
        ) : (
          <StatusChip status="Healthy" />
        ),
    },
    ...(showCost
      ? [
          {
            id: "value",
            header: "Value at cost",
            align: "end" as const,
            cell: (row: (typeof rows)[number]) => formatMoney(row.total * row.sku.cost),
          },
        ]
      : []),
  ];

  const warehouseUnits = state.stock
    .filter((row) => row.locationId === WAREHOUSE)
    .reduce((sum, row) => sum + row.onHand, 0);
  const reservedUnits = state.stock
    .filter((row) => row.locationId === WAREHOUSE)
    .reduce((sum, row) => sum + row.reserved, 0);
  const lowCount = state.skus.filter(
    (sku) => stockAt(state, sku.id, WAREHOUSE) <= sku.reorderLevel,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Units on hand" value={formatNumber(totalUnits(state))} caption={`${state.locations.length} locations`} icon={RiStackLine} tone="accent" />
        <Metric label="Warehouse available" value={formatNumber(warehouseUnits - reservedUnits)} caption={`${formatNumber(warehouseUnits)} on hand · ${formatNumber(reservedUnits)} reserved`} icon={RiBox3Line} />
        <Metric label="Low stock SKUs" value={formatNumber(lowCount)} caption="At or below reorder level" icon={RiAlertLine} />
        <Metric
          label={showCost ? "Stock value at cost" : "Stock value hidden"}
          value={showCost ? formatMoney(stockValue(state), true) : "Restricted"}
          caption={showCost ? "Across all locations" : `${state.role} role cannot view cost`}
          icon={RiStore2Line}
        />
      </div>

      <Callout title={`Searchable stock view · ${state.role} access`}>
        {showCost
          ? "Cost and valuation are visible for this role. Reserved stock is held against draft PIs and is not available to new orders or combos."
          : "This role can see availability but not cost prices. Switch to Admin or Warehouse in the header to inspect valuation."}
      </Callout>

      <Card className="p-4">
        <SectionHeader
          title="Consolidated stock"
          description="Location-wise SKU stock with channel grouping. Totals reconcile to the movement ledger."
          actions={<Chip variant="subtle" color="soft">{rows.length} SKUs</Chip>}
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchField
            aria-label="Search stock"
            placeholder="Search SKU, category or code…"
            value={query}
            onChange={setQuery}
            className="sm:max-w-sm"
          />
          <Select
            aria-label="Filter stock by location or channel"
            selectedKey={view}
            onSelectionChange={(key) => setView(String(key) as StockView)}
            className="w-full sm:w-[190px]"
          >
            {STOCK_VIEWS.map((option) => (
              <SelectItem key={option.id} id={option.id} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable
            label="Consolidated stock by location"
            columns={columns}
            rows={rows}
            empty={<EmptyState title="No matching stock" description="Try a different SKU or location filter." />}
          />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------ distributors */

function DistributorTab() {
  const { state } = useApp();
  const [statementId, setStatementId] = useState<string | null>(null);
  const summaries = distributorSummary(state);
  const totalDispatched = summaries.reduce((sum, row) => sum + row.dispatched, 0);
  const totalSold = summaries.reduce((sum, row) => sum + row.soldQty, 0);
  const totalClosing = summaries.reduce((sum, row) => sum + row.closing, 0);
  const totalValue = summaries.reduce((sum, row) => sum + row.stockValueAtDistributor, 0);

  const columns: DataColumn<(typeof summaries)[number]>[] = [
    {
      id: "distributor",
      header: "Distributor",
      isRowHeader: true,
      cell: (row) => (
        <div>
          <p className="text-body-medium text-text-primary">{row.name}</p>
          <p className="text-caption-1-medium text-text-tertiary">
            {row.city} · {row.contact}
          </p>
        </div>
      ),
    },
    { id: "dispatched", header: "Dispatched", align: "end", cell: (row) => formatNumber(row.dispatched) },
    { id: "sold", header: "Sold", align: "end", cell: (row) => formatNumber(row.soldQty) },
    { id: "returned", header: "Returned", align: "end", cell: (row) => formatNumber(row.returnedQty) },
    {
      id: "closing",
      header: "Closing stock",
      align: "end",
      cell: (row) => <span className="font-medium">{formatNumber(row.closing)}</span>,
    },
    { id: "value", header: "Value at MRP", align: "end", cell: (row) => formatMoney(row.stockValueAtDistributor) },
    {
      id: "status",
      header: "Statement",
      cell: (row) => (
        <Button variant="ghost" size="xs" onClick={() => setStatementId(row.locationId)}>
          View statement
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Dispatched to date" value={formatNumber(totalDispatched)} caption="From company ledger" icon={RiArrowRightUpLine} />
        <Metric label="Sold by distributors" value={formatNumber(totalSold)} caption="From statements" icon={RiCheckLine} />
        <Metric label="Closing stock" value={formatNumber(totalClosing)} caption="Reconciled to location balance" icon={RiStackLine} tone="accent" />
        <Metric label="Stock value at MRP" value={formatMoney(totalValue, true)} caption="Distributor-held inventory" icon={RiStore2Line} />
      </div>

      <Card className="p-4">
        <SectionHeader
          title="Distributor stock"
          description="Dispatched quantity from the company ledger, sold quantity from distributor statements, and the closing balance held at the distributor."
        />
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable label="Distributor stock" columns={columns} rows={summaries} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {summaries.map((distributor) => (
          <Card key={distributor.id} className="p-4">
            <SectionHeader
              title={distributor.name}
              description={`${distributor.city} · Scheme ${distributor.schemeRate}% + damage ${distributor.damageRate}%`}
              actions={<StatusChip status={distributor.outstanding > 0 ? "Outstanding" : "Closed"} />}
            />
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-body-regular text-text-secondary">Closing stock</span>
                <span className="text-body-medium text-text-primary">{formatNumber(distributor.closing)} units</span>
              </div>
              <Bar value={distributor.soldQty} max={distributor.dispatched || 1} />
              <div className="flex justify-between text-caption-1-medium text-text-tertiary">
                <span>{formatNumber(distributor.soldQty)} sold</span>
                <span>{formatNumber(distributor.dispatched)} dispatched</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <DistributorStatementModal distributorId={statementId} onClose={() => setStatementId(null)} />
    </div>
  );
}

function DistributorStatementModal({
  distributorId,
  onClose,
}: {
  distributorId: string | null;
  onClose: () => void;
}) {
  const { state } = useApp();
  if (!distributorId) return null;
  const distributor = state.distributors.find((row) => row.locationId === distributorId);
  if (!distributor) return null;
  const rows = state.stock
    .filter((row) => row.locationId === distributorId)
    .map((row) => {
      const sku = skuById(state, row.skuId);
      return {
        id: row.skuId,
        sku,
        onHand: row.onHand,
        value: (sku?.price ?? 0) * row.onHand,
      };
    });

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="lg">
      <ModalHeader
        title={`${distributor.name} — stock statement`}
        description={`${distributor.city} · Closing balance as at ${formatDate(todayISO())}`}
      />
      <ModalBody>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-background-secondary-default p-3">
            <p className="text-caption-1-medium text-text-tertiary">Dispatched</p>
            <p className="text-body-medium text-text-primary">{formatNumber(distributor.soldQty + distributor.returnedQty)} units</p>
          </div>
          <div className="rounded-xl bg-background-secondary-default p-3">
            <p className="text-caption-1-medium text-text-tertiary">Reported sold</p>
            <p className="text-body-medium text-text-primary">{formatNumber(distributor.soldQty)} units</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-separator-border">
          <table className="bui-table bui-table-sm">
            <thead>
              <tr>
                <th>SKU</th>
                <th className="text-end">Closing qty</th>
                <th className="text-end">Value at MRP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <p className="text-body-medium text-text-primary">{row.sku?.name}</p>
                    <p className="text-caption-1-medium text-text-tertiary">{row.id}</p>
                  </td>
                  <td className="text-end">{formatNumber(row.onHand)}</td>
                  <td className="text-end">{formatMoney(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}

/* -------------------------------------------------------------- demo stock */

function DemoTab({ onIssue }: { onIssue: () => void }) {
  const { state, dispatch } = useApp();
  const [action, setAction] = useState<{ issue: DemoIssue; mode: "consume" | "return" } | null>(null);

  const totals = state.demoIssues.reduce(
    (acc, issue) => ({
      issued: acc.issued + issue.qtyIssued,
      consumed: acc.consumed + issue.qtyConsumed,
      returned: acc.returned + issue.qtyReturned,
      outstanding: acc.outstanding + demoOutstanding(issue),
    }),
    { issued: 0, consumed: 0, returned: 0, outstanding: 0 },
  );
  const poolUnits = state.stock
    .filter((row) => row.locationId === "DEMO-01")
    .reduce((sum, row) => sum + row.onHand, 0);

  const columns: DataColumn<DemoIssue>[] = [
    {
      id: "issue",
      header: "Demo issue",
      isRowHeader: true,
      cell: (issue) => (
        <div>
          <p className="text-body-medium text-text-primary">{skuById(state, issue.skuId)?.name}</p>
          <p className="text-caption-1-medium text-text-tertiary">{issue.id} · {formatShortDate(issue.date)}</p>
        </div>
      ),
    },
    {
      id: "issuedTo",
      header: "Issued to",
      cell: (issue) => <span className="text-body-regular text-text-secondary">{issue.issuedTo}</span>,
    },
    { id: "issued", header: "Issued", align: "end", cell: (issue) => formatNumber(issue.qtyIssued) },
    { id: "consumed", header: "Consumed", align: "end", cell: (issue) => formatNumber(issue.qtyConsumed) },
    { id: "returned", header: "Returned", align: "end", cell: (issue) => formatNumber(issue.qtyReturned) },
    {
      id: "balance",
      header: "Balance",
      align: "end",
      cell: (issue) => <span className="font-medium">{formatNumber(demoOutstanding(issue))}</span>,
    },
    { id: "status", header: "Status", cell: (issue) => <StatusChip status={issue.status} /> },
    {
      id: "actions",
      header: "",
      cell: (issue) =>
        issue.status === "Outstanding" ? (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="xs" onClick={() => setAction({ issue, mode: "consume" })}>
              Consume
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setAction({ issue, mode: "return" })}>
              Return
            </Button>
          </div>
        ) : null,
    },
  ];

  const pool = state.stock
    .filter((row) => row.locationId === "DEMO-01" && row.onHand > 0)
    .map((row) => ({ id: row.skuId, row, sku: skuById(state, row.skuId) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Issued to date" value={formatNumber(totals.issued)} caption={`${state.demoIssues.length} demo issues`} icon={RiGiftLine} />
        <Metric label="Consumed" value={formatNumber(totals.consumed)} caption="Samples, trials and workshops" icon={RiCheckLine} />
        <Metric label="Returned" value={formatNumber(totals.returned)} caption="Back into warehouse stock" icon={RiArrowRightUpLine} />
        <Metric label="Demo pool balance" value={formatNumber(poolUnits)} caption={`${formatNumber(totals.outstanding)} outstanding in ledger`} icon={RiStackLine} tone="accent" />
      </div>

      <Callout
        title="Demo stock is part of inventory"
        action={<Button size="small" leadingIcon={RiAddLine} onClick={onIssue}>Issue demo stock</Button>}
      >
        Issuing demo stock moves units out of the warehouse and into the demo pool. The pool balance equals the
        outstanding quantity across all open demo issues.
      </Callout>

      <Card className="p-4">
        <SectionHeader
          title="Demo stock ledger"
          description="Every issue, consumption and return is tracked against the person or location holding the stock."
        />
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable label="Demo stock ledger" columns={columns} rows={state.demoIssues} />
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Demo pool by SKU"
          description="What is currently held by trainers, staff and customer trials."
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {pool.length === 0 ? (
            <p className="text-body-regular text-text-secondary">No demo stock is currently held.</p>
          ) : (
            pool.map((entry) => (
              <div key={entry.id} className="rounded-2xl bg-background-primary-default p-3">
                <p className="text-body-medium text-text-primary">{entry.sku?.name}</p>
                <p className="mt-0.5 text-caption-1-medium text-text-tertiary">{entry.row.onHand} units in the demo pool</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <DemoActionModal action={action} onClose={() => setAction(null)} dispatch={dispatch} />
    </div>
  );
}

function DemoActionModal({
  action,
  onClose,
  dispatch,
}: {
  action: { issue: DemoIssue; mode: "consume" | "return" } | null;
  onClose: () => void;
  dispatch: ReturnType<typeof useApp>["dispatch"];
}) {
  const [qty, setQty] = useState("1");
  if (!action) return null;
  const outstanding = demoOutstanding(action.issue);

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="sm">
      <ModalHeader
        title={action.mode === "consume" ? "Consume demo stock" : "Return demo stock"}
        description={`${action.issue.issuedTo} · ${formatNumber(outstanding)} units outstanding`}
      />
      <ModalBody>
        <Input
          label="Quantity"
          type="number"
          value={qty}
          onChange={setQty}
          hint={`Maximum ${outstanding} units`}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            const value = Math.max(1, Math.min(Number(qty) || 0, outstanding));
            dispatch(
              action.mode === "consume"
                ? { type: "consume-demo", issueId: action.issue.id, qty: value }
                : { type: "return-demo", issueId: action.issue.id, qty: value },
            );
            toast(
              action.mode === "consume" ? "Demo consumption recorded" : "Demo stock returned",
              {
                description: `${value} × ${action.issue.id} ${
                  action.mode === "consume" ? "consumed" : "returned to warehouse"
                }.`,
                status: "success",
              },
            );
            onClose();
          }}
        >
          Confirm
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function IssueDemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [skuId, setSkuId] = useState(state.skus[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [issuedTo, setIssuedTo] = useState("");
  const available = availableAt(state, skuId);

  return (
    <Modal isOpen={open} onOpenChange={(next) => !next && onClose()} size="md">
      <ModalHeader
        title="Issue demo stock"
        description="Move stock from the warehouse into the demo pool for a trainer, staff member or customer trial."
      />
      <ModalBody>
        <div className="flex flex-col gap-3">
          <Select label="SKU" selectedKey={skuId} onSelectionChange={(key) => setSkuId(String(key))}>
            {state.skus.map((sku) => (
              <SelectItem key={sku.id} id={sku.id} textValue={sku.name}>
                {sku.name}
              </SelectItem>
            ))}
          </Select>
          <Input
            label="Issued to"
            placeholder="Trainer, staff member or customer"
            value={issuedTo}
            onChange={setIssuedTo}
          />
          <Input
            label="Quantity"
            type="number"
            value={qty}
            onChange={setQty}
            hint={`${formatNumber(available)} available at the warehouse`}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            const value = Math.min(Number(qty) || 0, available);
            if (value <= 0 || !issuedTo.trim()) {
              toast("Add a recipient and a valid quantity", { status: "error" });
              return;
            }
            dispatch({ type: "issue-demo", skuId, qty: value, issuedTo: issuedTo.trim() });
            toast("Demo stock issued", {
              description: `${value} units moved to the demo pool for ${issuedTo.trim()}.`,
              status: "success",
            });
            setQty("1");
            setIssuedTo("");
            onClose();
          }}
        >
          Issue stock
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/* ----------------------------------------------------------------- combos */

function ComboTab() {
  const { state } = useApp();
  const availability = state.combos.map((combo) => comboAvailability(state, combo));
  const shared = state.skus.filter(
    (sku) => state.combos.filter((combo) => combo.components.some((c) => c.skuId === sku.id)).length > 1,
  );
  const totalSets = availability.reduce((sum, entry) => sum + entry.max, 0);

  return (
    <div className="flex flex-col gap-4">
      <Callout title="Combo availability uses the same available pool as orders" tone="warning">
        Available sets = the lowest component availability. Shared SKUs are never counted in more than one combo,
        and stock already reserved by a draft PI is excluded.{" "}
        {shared.length > 0 ? `Shared components: ${shared.map((sku) => sku.name).join(", ")}.` : ""}
      </Callout>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Buildable combo sets" value={formatNumber(totalSets)} caption="Across all four combos" icon={RiGiftLine} tone="accent" />
        <Metric label="Combos configured" value={state.combos.length} caption="Potli, candle, bath and ritual" icon={RiBox3Line} />
        <Metric label="Shared SKUs" value={shared.length} caption="Counted once across combos" icon={RiStackLine} />
        <Metric
          label="Potential combo revenue"
          value={formatMoney(availability.reduce((sum, entry) => sum + entry.max * entry.combo.price, 0), true)}
          caption="If every available set is sold"
          icon={RiFileListLine}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {availability.map((entry) => {
          const limiting = entry.components.reduce(
            (min, component) => (component.sets < min.sets ? component : min),
            entry.components[0],
          );
          return (
            <Card key={entry.combo.id} className="p-4">
              <SectionHeader
                title={entry.combo.name}
                description={`${entry.combo.id} · ${formatMoney(entry.combo.price)} per set`}
                actions={<Chip variant="bold" color="blue">{entry.max} available</Chip>}
              />
              <div className="mt-3 flex flex-col gap-2">
                {entry.components.map((component) => {
                  const sku = skuById(state, component.skuId);
                  const isShared = shared.some((item) => item.id === component.skuId);
                  return (
                    <div key={component.skuId} className="rounded-xl bg-background-primary-default p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-body-medium text-text-primary">
                            {sku?.name}
                            {isShared ? <span className="ms-1 text-caption-1-medium text-status-yellow-text">shared</span> : null}
                          </p>
                          <p className="text-caption-1-medium text-text-tertiary">
                            {component.qty} per set · {component.available} available
                          </p>
                        </div>
                        <span className="shrink-0 text-body-medium text-text-primary tabular-nums">{component.sets} sets</span>
                      </div>
                      <Bar className="mt-2" value={component.available} max={Math.max(...entry.components.map((c) => c.available), 1)} />
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-caption-1-medium text-text-tertiary">
                Limiting component: {skuById(state, limiting.skuId)?.name} · {limiting.available} on hand, {limiting.qty} per set.
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- dispatch */

function DispatchTab({ onOpenPis }: { onOpenPis: () => void }) {
  const { state } = useApp();
  const [date, setDate] = useState(todayISO());
  const rows = dailyDispatch(state, date).map((row) => ({ ...row, id: row.sku.id }));
  const totals = rows.reduce(
    (acc, row) => ({
      opening: acc.opening + row.opening,
      inward: acc.inward + row.inward,
      outward: acc.outward + row.outward,
      closing: acc.closing + row.closing,
    }),
    { opening: 0, inward: 0, outward: 0, closing: 0 },
  );
  const dayMovements = state.movements.filter((movement) => movement.date === date);

  const columns: DataColumn<(typeof rows)[number]>[] = [
    {
      id: "sku",
      header: "SKU",
      isRowHeader: true,
      cell: (row) => (
        <div>
          <p className="text-body-medium text-text-primary">{row.sku.name}</p>
          <p className="text-caption-1-medium text-text-tertiary">{row.sku.id}</p>
        </div>
      ),
    },
    { id: "opening", header: "Opening", align: "end", cell: (row) => formatNumber(row.opening) },
    { id: "inward", header: "Inward", align: "end", cell: (row) => <span className="text-status-lime-text">+{formatNumber(row.inward)}</span> },
    { id: "outward", header: "Outward", align: "end", cell: (row) => <span className="text-status-rose-text">−{formatNumber(row.outward)}</span> },
    { id: "closing", header: "Closing", align: "end", cell: (row) => <span className="font-medium">{formatNumber(row.closing)}</span> },
    {
      id: "activity",
      header: "Activity",
      cell: (row) => (row.hasActivity ? <Chip variant="caption" color="blue">Moved</Chip> : <span className="text-caption-1-medium text-text-tertiary">No movement</span>),
    },
  ];

  const movementColumns: DataColumn<(typeof dayMovements)[number]>[] = [
    {
      id: "item",
      header: "Item",
      isRowHeader: true,
      cell: (movement) => {
        const item =
          movement.itemType === "sku"
            ? skuById(state, movement.itemId)
            : state.packaging.find((entry) => entry.id === movement.itemId);
        return (
          <div>
            <p className="text-body-medium text-text-primary">{item?.name}</p>
            <p className="text-caption-1-medium text-text-tertiary">{movement.reference}</p>
          </div>
        );
      },
    },
    { id: "type", header: "Type", cell: (movement) => <StatusChip status={movement.type} /> },
    {
      id: "direction",
      header: "Route",
      cell: (movement) => (
        <span className="text-body-regular text-text-secondary">
          {movement.from ? locationById(state, movement.from)?.name ?? movement.from : "Vendor"} →{" "}
          {movement.to ? locationById(state, movement.to)?.name ?? movement.to : "Customer"}
        </span>
      ),
    },
    { id: "qty", header: "Qty", align: "end", cell: (movement) => formatNumber(movement.qty) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Opening stock" value={formatNumber(totals.opening)} caption="Warehouse units" icon={RiStackLine} />
        <Metric label="Inward" value={`+${formatNumber(totals.inward)}`} caption="Receipts and returns" icon={RiArrowRightUpLine} />
        <Metric label="Outward" value={`−${formatNumber(totals.outward)}`} caption="Dispatches, demo and wastage" icon={RiArrowRightUpLine} />
        <Metric label="Closing stock" value={formatNumber(totals.closing)} caption="Opening + inward − outward" icon={RiBox3Line} tone="accent" />
      </div>

      <Card className="p-4">
        <SectionHeader
          title="Daily dispatch report"
          description="Opening, inward, outward and closing by SKU. Dispatching a draft PI reduces stock immediately."
          actions={
            <div className="flex items-end gap-2">
              <Input
                aria-label="Report date"
                type="date"
                value={date}
                onChange={(value) => setDate(value || todayISO())}
                className="w-[160px]"
              />
              <Button variant="secondary" size="small" onClick={() => setDate(addDays(todayISO(), -1))}>
                Yesterday
              </Button>
              <Button variant="secondary" size="small" onClick={onOpenPis} trailingIcon={RiArrowRightUpLine}>
                Draft PIs
              </Button>
            </div>
          }
        />
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable label="Daily dispatch report" columns={columns} rows={rows} />
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title={`Movements on ${formatDate(date)}`}
          description={`${dayMovements.length} ledger entries`}
        />
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable
            label={`Movements on ${formatDate(date)}`}
            columns={movementColumns}
            rows={dayMovements}
            empty={<EmptyState title="No movements on this date" description="Pick another date or dispatch a PI to create one." />}
          />
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------- packaging */

function PackagingTab({ onIssue }: { onIssue: () => void }) {
  const { state } = useApp();
  const [locationId, setLocationId] = useState("all");
  const [query, setQuery] = useState("");
  const showCost = canSeeCost(state.role);

  const locations = state.locations.filter((location) =>
    ["warehouse", "production", "office"].includes(location.type),
  );
  const packagingLocations = state.locations.filter((location) =>
    ["warehouse", "production", "office"].includes(location.type),
  );

  const rows = state.packaging
    .filter((item) => {
      const text = `${item.name} ${item.id}`.toLowerCase();
      return text.includes(query.trim().toLowerCase());
    })
    .map((item) => {
      const at = (id: string) =>
        state.packagingStock.find((row) => row.itemId === item.id && row.locationId === id)?.onHand ?? 0;
      const total = state.packagingStock
        .filter((row) => row.itemId === item.id)
        .reduce((sum, row) => sum + row.onHand, 0);
      return {
        id: item.id,
        item,
        warehouse: at("WH-01"),
        production: at("PRD-01"),
        office: at(OFFICE),
        total,
      };
    })
    .filter((row) => (locationId === "all" ? true : row[locationId === "WH-01" ? "warehouse" : locationId === "PRD-01" ? "production" : "office"] > 0));

  const columns: DataColumn<(typeof rows)[number]>[] = [
    {
      id: "item",
      header: "Packaging item",
      isRowHeader: true,
      cell: (row) => (
        <div>
          <p className="text-body-medium text-text-primary">{row.item.name}</p>
          <p className="text-caption-1-medium text-text-tertiary">
            {row.item.id}
            {showCost ? ` · ${formatMoney(row.item.cost)} each` : ""}
          </p>
        </div>
      ),
    },
    { id: "warehouse", header: "Warehouse", align: "end", cell: (row) => formatNumber(row.warehouse) },
    { id: "production", header: "Production", align: "end", cell: (row) => formatNumber(row.production) },
    { id: "office", header: "Office", align: "end", cell: (row) => formatNumber(row.office) },
    { id: "total", header: "Total", align: "end", cell: (row) => <span className="font-medium">{formatNumber(row.total)}</span> },
    {
      id: "status",
      header: "Reorder",
      cell: (row) =>
        row.total <= row.item.reorderLevel ? (
          <StatusChip status="Low" />
        ) : (
          <StatusChip status="Healthy" />
        ),
    },
  ];

  const totalUnits = state.packagingStock.reduce((sum, row) => sum + row.onHand, 0);
  const officeUnits = state.packagingStock
    .filter((row) => row.locationId === OFFICE)
    .reduce((sum, row) => sum + row.onHand, 0);
  const lowCount = state.packaging.filter((item) => {
    const total = state.packagingStock
      .filter((row) => row.itemId === item.id)
      .reduce((sum, row) => sum + row.onHand, 0);
    return total <= item.reorderLevel;
  }).length;

  const officeIssues = state.packagingIssues.filter((issue) => issue.locationId === OFFICE).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total packaging units" value={formatNumber(totalUnits)} caption={`${state.packaging.length} SKUs`} icon={RiBox3Line} tone="accent" />
        <Metric label="Office balance" value={formatNumber(officeUnits)} caption="Mumbai office" icon={RiStore2Line} />
        <Metric label="Low packaging items" value={formatNumber(lowCount)} caption="At or below reorder level" icon={RiAlertLine} />
        <Metric label="Locations tracked" value={packagingLocations.length} caption="Warehouse, production, office" icon={RiFileListLine} />
      </div>

      <Card className="p-4">
        <SectionHeader
          title="Packaging across locations"
          description="Receipts, transfers and consumption by storage or production location."
          actions={<Button size="small" leadingIcon={RiAddLine} onClick={onIssue}>Issue packaging</Button>}
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <SearchField
            aria-label="Search packaging"
            placeholder="Search packaging item…"
            value={query}
            onChange={setQuery}
            className="sm:max-w-sm"
          />
          <Select
            aria-label="Filter packaging by location"
            selectedKey={locationId}
            onSelectionChange={(key) => setLocationId(String(key))}
            className="w-full sm:w-[190px]"
          >
            <SelectItem id="all" textValue="All locations">All locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} id={location.id} textValue={location.name}>
                {location.name}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable label="Packaging inventory by location" columns={columns} rows={rows} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionHeader
            title="Office packaging balance"
            description="Packaging held and consumed at the Mumbai office."
            actions={<Chip variant="bold" color="cyan">{formatNumber(officeUnits)} units</Chip>}
          />
          <div className="mt-3 flex flex-col gap-2">
            {state.packagingStock
              .filter((row) => row.locationId === OFFICE)
              .map((row) => {
                const item = state.packaging.find((entry) => entry.id === row.itemId);
                return (
                  <div key={row.itemId} className="flex items-center justify-between rounded-xl bg-background-primary-default p-2.5">
                    <span className="text-body-medium text-text-primary">{item?.name}</span>
                    <span className="text-body-medium text-text-primary tabular-nums">{formatNumber(row.onHand)}</span>
                  </div>
                );
              })}
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader
            title="Recent office consumption"
            description="Office issue records feed the office balance."
          />
          <div className="mt-3 flex flex-col gap-2">
            {officeIssues.length === 0 ? (
              <p className="text-body-regular text-text-secondary">No office issues recorded yet.</p>
            ) : (
              officeIssues.map((issue) => {
                const item = state.packaging.find((entry) => entry.id === issue.itemId);
                return (
                  <div key={issue.id} className="rounded-xl bg-background-primary-default p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-body-medium text-text-primary">{item?.name}</p>
                      <span className="text-body-medium text-text-primary">−{issue.qty}</span>
                    </div>
                    <p className="text-caption-1-medium text-text-tertiary">
                      {formatShortDate(issue.date)} · {issue.purpose}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function IssuePackagingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [itemId, setItemId] = useState<PackagingItem["id"]>(state.packaging[0]?.id ?? "");
  const [locationId, setLocationId] = useState(OFFICE);
  const [qty, setQty] = useState("1");
  const [purpose, setPurpose] = useState("");
  const stock =
    state.packagingStock.find((row) => row.itemId === itemId && row.locationId === locationId)?.onHand ?? 0;

  return (
    <Modal isOpen={open} onOpenChange={(next) => !next && onClose()} size="md">
      <ModalHeader
        title="Issue packaging"
        description="Record consumption of packaging from a warehouse, production or office location."
      />
      <ModalBody>
        <div className="flex flex-col gap-3">
          <Select label="Packaging item" selectedKey={itemId} onSelectionChange={(key) => setItemId(String(key))}>
            {state.packaging.map((item) => (
              <SelectItem key={item.id} id={item.id} textValue={item.name}>
                {item.name}
              </SelectItem>
            ))}
          </Select>
          <Select label="From location" selectedKey={locationId} onSelectionChange={(key) => setLocationId(String(key))}>
            {state.locations
              .filter((location) => ["warehouse", "production", "office"].includes(location.type))
              .map((location) => (
                <SelectItem key={location.id} id={location.id} textValue={location.name}>
                  {location.name}
                </SelectItem>
              ))}
          </Select>
          <Input
            label="Quantity"
            type="number"
            value={qty}
            onChange={setQty}
            hint={`${formatNumber(stock)} units available at this location`}
          />
          <Input
            label="Purpose"
            placeholder="Order packing, sample dispatch, production…"
            value={purpose}
            onChange={setPurpose}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            const value = Math.min(Number(qty) || 0, stock);
            if (value <= 0 || !purpose.trim()) {
              toast("Add a quantity and purpose", { status: "error" });
              return;
            }
            dispatch({ type: "issue-packaging", itemId, locationId, qty: value, purpose: purpose.trim() });
            toast("Packaging consumed", {
              description: `${value} units issued from ${locationById(state, locationId)?.name}.`,
              status: "success",
            });
            setQty("1");
            setPurpose("");
            onClose();
          }}
        >
          Record issue
        </Button>
      </ModalFooter>
    </Modal>
  );
}
