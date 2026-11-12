import { useState } from "react";
import {
  RiAddLine,
  RiAlertLine,
  RiCheckLine,
  RiFileList3Line,
  RiMoneyRupeeCircleLine,
  RiTruckLine,
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
  formatDate,
  formatMoney,
  formatNumber,
  formatShortDate,
} from "@/lib/format";
import { skuById } from "@/lib/selectors";
import type { Claim, PI, SalesOrder } from "@/lib/types";
import {
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

const BILLING_TABS = ["orders", "pis", "claims"];

export function BillingPage({
  tab,
  onTabChange,
}: {
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  const { state, dispatch } = useApp();
  const [openPiId, setOpenPiId] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const activeTab = BILLING_TABS.includes(tab) ? tab : "orders";

  const openOrders = state.orders.filter((order) => !["Fulfilled"].includes(order.status));
  const draftPis = state.pis.filter((pi) => pi.status === "Draft");
  const shortfall = draftPis.reduce(
    (sum, pi) => sum + pi.items.reduce((inner, item) => inner + item.shortfall, 0),
    0,
  );
  const orderValue = openOrders.reduce(
    (sum, order) => sum + order.items.reduce((inner, item) => inner + item.qty * item.rate, 0),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Orders, proforma invoices & claims"
        description="Convert Rupyz orders into draft PIs against available stock, surface shortfalls, and prepare distributor claim statements. Miracle remains the billing system of record."
        actions={
          activeTab === "claims" ? (
            <Button size="small" leadingIcon={RiAddLine} onClick={() => setClaimOpen(true)}>
              Generate claim
            </Button>
          ) : (
            <Button
              size="small"
              leadingIcon={RiFileList3Line}
              onClick={() => onTabChange("pis")}
            >
              {draftPis.length} draft PI{draftPis.length === 1 ? "" : "s"}
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open sales orders" value={openOrders.length} caption="Not yet fulfilled" icon={RiFileList3Line} />
        <Metric label="Open order value" value={formatMoney(orderValue, true)} caption="Before PI conversion" icon={RiMoneyRupeeCircleLine} />
        <Metric label="Draft PIs" value={draftPis.length} caption="Awaiting dispatch to Miracle" icon={RiTruckLine} />
        <Metric label="Units short" value={formatNumber(shortfall)} caption="Across draft PIs" icon={RiAlertLine} tone="accent" />
      </div>

      <Tabs selectedKey={activeTab} onSelectionChange={(key) => onTabChange(String(key))}>
        <TabList aria-label="Billing views">
          <Tab id="orders" count={openOrders.length}>Orders</Tab>
          <Tab id="pis" count={draftPis.length}>Draft PIs</Tab>
          <Tab id="claims" count={state.claims.length}>Claims</Tab>
        </TabList>
        <TabPanel id="orders">
          <OrdersTab onOpenPi={(piId) => { setOpenPiId(piId); onTabChange("pis"); }} />
        </TabPanel>
        <TabPanel id="pis">
          <PIsTab onOpen={setOpenPiId} />
        </TabPanel>
        <TabPanel id="claims">
          <ClaimsTab onGenerate={() => setClaimOpen(true)} />
        </TabPanel>
      </Tabs>

      {openPiId ? (
        <PiDetail key={openPiId} piId={openPiId} onClose={() => setOpenPiId(null)} dispatch={dispatch} />
      ) : null}

      <GenerateClaimModal open={claimOpen} onClose={() => setClaimOpen(false)} />
    </>
  );
}

/* ------------------------------------------------------------------ orders */

function OrdersTab({ onOpenPi }: { onOpenPi: (piId: string) => void }) {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const rows = state.orders.filter((order) => {
    const haystack = `${order.id} ${order.customer} ${order.channel} ${order.salesperson}`.toLowerCase();
    return (
      haystack.includes(query.trim().toLowerCase()) &&
      (status === "all" || order.status === status)
    );
  });

  const columns: DataColumn<SalesOrder>[] = [
    {
      id: "order",
      header: "Order",
      isRowHeader: true,
      cell: (order) => (
        <div>
          <p className="text-body-medium text-text-primary">{order.id}</p>
          <p className="text-caption-1-medium text-text-tertiary">{order.customer} · {order.channel}</p>
        </div>
      ),
    },
    {
      id: "date",
      header: "Date",
      cell: (order) => <span className="text-body-regular text-text-secondary">{formatShortDate(order.date)}</span>,
    },
    {
      id: "items",
      header: "Items",
      cell: (order) => (
        <div className="min-w-[190px]">
          {order.items.map((item) => (
            <p key={item.skuId} className="truncate text-body-regular text-text-secondary">
              {item.qty} × {skuById(state, item.skuId)?.name}
            </p>
          ))}
        </div>
      ),
    },
    {
      id: "owner",
      header: "Salesperson",
      cell: (order) => <span className="text-body-regular text-text-secondary">{order.salesperson}</span>,
    },
    {
      id: "value",
      header: "Value",
      align: "end",
      cell: (order) => formatMoney(order.items.reduce((sum, item) => sum + item.qty * item.rate, 0)),
    },
    { id: "status", header: "Status", cell: (order) => <StatusChip status={order.status} /> },
    {
      id: "action",
      header: "",
      cell: (order) =>
        order.piId ? (
          <Button variant="ghost" size="xs" onClick={() => onOpenPi(order.piId!)}>
            View PI
          </Button>
        ) : order.status === "Fulfilled" ? null : (
          <Button
            variant="secondary"
            size="xs"
            onClick={() => {
              dispatch({ type: "create-pi", orderId: order.id });
              toast("Draft PI created", {
                description: `${order.customer} order converted using currently available stock.`,
                status: "success",
              });
            }}
          >
            Create draft PI
          </Button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Callout title="Order-to-PI uses live available stock">
        Creating a draft PI reserves the available quantity in the warehouse. Reserved units are excluded from fresh
        orders and combo availability. Shortfalls stay on the order as backorder quantities.
      </Callout>

      <Card className="p-4">
        <SectionHeader
          title="Sales orders"
          description="Orders imported from Rupyz; convert to a draft PI or open the existing one."
          actions={<Chip variant="subtle" color="soft">{rows.length} orders</Chip>}
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <SearchField
            aria-label="Search orders"
            placeholder="Search order, customer or salesperson…"
            value={query}
            onChange={setQuery}
            className="sm:max-w-sm"
          />
          <Select
            aria-label="Filter orders by status"
            selectedKey={status}
            onSelectionChange={(key) => setStatus(String(key))}
            className="w-full sm:w-[200px]"
          >
            <SelectItem id="all" textValue="All statuses">All statuses</SelectItem>
            {["Open", "PI drafted", "Partially available", "Backorder", "Fulfilled"].map((option) => (
              <SelectItem key={option} id={option} textValue={option}>{option}</SelectItem>
            ))}
          </Select>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable
            label="Sales orders"
            columns={columns}
            rows={rows}
            empty={<EmptyState title="No matching orders" description="Try another search or status." />}
          />
        </div>
      </Card>
    </div>
  );
}

/* --------------------------------------------------------------------- PIs */

function PIsTab({ onOpen }: { onOpen: (piId: string) => void }) {
  const { state } = useApp();
  const rows = state.pis;
  const draft = rows.filter((pi) => pi.status === "Draft");
  const dispatched = rows.filter((pi) => pi.status === "Dispatched");

  const columns: DataColumn<PI>[] = [
    {
      id: "pi",
      header: "Proforma invoice",
      isRowHeader: true,
      cell: (pi) => (
        <div>
          <p className="text-body-medium text-text-primary">{pi.id}</p>
          <p className="text-caption-1-medium text-text-tertiary">{pi.customer} · {pi.orderId}</p>
        </div>
      ),
    },
    {
      id: "date",
      header: "Created",
      cell: (pi) => <span className="text-body-regular text-text-secondary">{formatShortDate(pi.date)}</span>,
    },
    {
      id: "available",
      header: "Available value",
      align: "end",
      cell: (pi) => formatMoney(pi.items.reduce((sum, item) => sum + item.available * item.rate, 0)),
    },
    {
      id: "shortfall",
      header: "Shortfall",
      align: "end",
      cell: (pi) => {
        const units = pi.items.reduce((sum, item) => sum + item.shortfall, 0);
        return units > 0 ? <span className="text-status-rose-text">{formatNumber(units)} units</span> : <span className="text-status-lime-text">None</span>;
      },
    },
    { id: "status", header: "Status", cell: (pi) => <StatusChip status={pi.status} /> },
    {
      id: "action",
      header: "",
      cell: (pi) => (
        <Button variant="ghost" size="xs" onClick={() => onOpen(pi.id)}>
          {pi.status === "Draft" ? "Review & dispatch" : "View"}
        </Button>
      ),
    },
  ];

  const backorders = state.orders.filter((order) =>
    ["Backorder", "Partially available"].includes(order.status),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Draft PIs" value={draft.length} caption="Ready for review" icon={RiFileList3Line} />
        <Metric label="Dispatched PIs" value={dispatched.length} caption="Stock already reduced" icon={RiTruckLine} />
        <Metric
          label="Draft PI value"
          value={formatMoney(draft.reduce((sum, pi) => sum + pi.items.reduce((inner, item) => inner + item.available * item.rate, 0), 0), true)}
          caption="Available quantities only"
          icon={RiMoneyRupeeCircleLine}
        />
        <Metric
          label="Backorder units"
          value={formatNumber(draft.reduce((sum, pi) => sum + pi.items.reduce((inner, item) => inner + item.shortfall, 0), 0))}
          caption="Awaiting stock"
          icon={RiAlertLine}
          tone="accent"
        />
      </div>

      <Card className="p-4">
        <SectionHeader
          title="Proforma invoices"
          description="Draft PIs use available stock only. Dispatching reduces the ledger immediately."
        />
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable label="Proforma invoices" columns={columns} rows={rows} />
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Backorder queue"
          description="Orders that still have quantity pending after PI allocation."
        />
        <div className="mt-3 flex flex-col gap-2">
          {backorders.length === 0 ? (
            <EmptyState title="No backorders" description="Every open order is fully allocated." />
          ) : (
            backorders.map((order) => {
              const pi = state.pis.find((row) => row.id === order.piId);
              const pending = pi
                ? pi.items.reduce((sum, item) => sum + item.shortfall, 0)
                : order.items.reduce((sum, item) => sum + item.qty, 0);
              return (
                <div key={order.id} className="flex flex-col gap-2 rounded-2xl bg-background-primary-default p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-body-medium text-text-primary">{order.id} · {order.customer}</p>
                    <p className="text-caption-1-medium text-text-tertiary">
                      {pi ? `${pi.id} · created ${formatShortDate(pi.date)}` : "No PI yet"} · {order.salesperson}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip variant="bold" color="rose">{formatNumber(pending)} units pending</Chip>
                    {pi ? (
                      <Button variant="ghost" size="xs" onClick={() => onOpen(pi.id)}>Review PI</Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function PiDetail({
  piId,
  onClose,
  dispatch,
}: {
  piId: string;
  onClose: () => void;
  dispatch: ReturnType<typeof useApp>["dispatch"];
}) {
  const { state } = useApp();
  const pi = state.pis.find((row) => row.id === piId);
  if (!pi) return null;
  const order = state.orders.find((row) => row.id === pi.orderId);

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="lg">
      <ModalHeader
        title={`${pi.id} · ${pi.customer}`}
        description={`${pi.orderId} · created ${formatDate(pi.date)} · ${pi.status === "Draft" ? "Draft — stock reserved" : `Dispatched ${formatDate(pi.dispatchedDate)}`}`}
      />
      <ModalBody>
        <div className="flex flex-col gap-3">
          {order ? (
            <div className="rounded-xl bg-background-secondary-default p-3">
              <p className="text-caption-1-medium text-text-tertiary">Source order</p>
              <p className="text-body-medium text-text-primary">
                {order.channel} · {order.salesperson} · status {order.status}
              </p>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-separator-border">
            <table className="bui-table bui-table-sm">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-end">Ordered</th>
                  <th className="text-end">Available</th>
                  <th className="text-end">Shortfall</th>
                  <th className="text-end">Rate</th>
                  <th className="text-end">Value</th>
                </tr>
              </thead>
              <tbody>
                {pi.items.map((item) => (
                  <tr key={item.skuId}>
                    <td>
                      <p className="text-body-medium text-text-primary">{skuById(state, item.skuId)?.name}</p>
                      <p className="text-caption-1-medium text-text-tertiary">{item.skuId}</p>
                    </td>
                    <td className="text-end">{formatNumber(item.qty)}</td>
                    <td className="text-end">{formatNumber(item.available)}</td>
                    <td className="text-end">
                      {item.shortfall > 0 ? <span className="text-status-rose-text">{formatNumber(item.shortfall)}</span> : "—"}
                    </td>
                    <td className="text-end">{formatMoney(item.rate)}</td>
                    <td className="text-end">{formatMoney(item.available * item.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-background-secondary-default p-3">
            <span className="text-body-medium text-text-secondary">Available PI value</span>
            <span className="text-title-3-semibold text-text-primary">
              {formatMoney(pi.items.reduce((sum, item) => sum + item.available * item.rate, 0))}
            </span>
          </div>
          {pi.items.some((item) => item.shortfall > 0) ? (
            <Callout title="Partial fulfilment" tone="warning">
              Dispatching this PI will send the available quantity and leave the shortfall on the order as a
              backorder. Replenish stock, then create a follow-up PI for the balance.
            </Callout>
          ) : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {pi.status === "Draft" ? (
          <Button
            leadingIcon={RiTruckLine}
            onClick={() => {
              dispatch({ type: "dispatch-pi", piId: pi.id });
              toast("PI dispatched and stock reduced", {
                description: `${pi.id} posted to the ledger. ${pi.items.some((item) => item.shortfall > 0) ? "The balance remains on backorder." : "The order is fulfilled."}`,
                status: "success",
              });
              onClose();
            }}
          >
            Dispatch available stock
          </Button>
        ) : null}
      </ModalFooter>
    </Modal>
  );
}

/* ------------------------------------------------------------------ claims */

function ClaimsTab({ onGenerate }: { onGenerate: () => void }) {
  const { state, dispatch } = useApp();
  const pending = state.claims.filter((claim) => claim.status === "Pending review");
  const approved = state.claims.filter((claim) => claim.status === "Approved");
  const total = state.claims.reduce((sum, claim) => sum + claim.amount, 0);

  const columns: DataColumn<Claim>[] = [
    {
      id: "claim",
      header: "Claim",
      isRowHeader: true,
      cell: (claim) => {
        const distributor = state.distributors.find((row) => row.locationId === claim.distributorId);
        return (
          <div>
            <p className="text-body-medium text-text-primary">{claim.id}</p>
            <p className="text-caption-1-medium text-text-tertiary">{distributor?.name} · {claim.period}</p>
          </div>
        );
      },
    },
    { id: "sales", header: "Sales value", align: "end", cell: (claim) => formatMoney(claim.salesValue) },
    {
      id: "scheme",
      header: "Scheme",
      align: "end",
      cell: (claim) => `${claim.schemeRate}% + ${claim.damageRate}%`,
    },
    { id: "amount", header: "Claim amount", align: "end", cell: (claim) => <span className="font-medium">{formatMoney(claim.amount)}</span> },
    { id: "status", header: "Status", cell: (claim) => <StatusChip status={claim.status} /> },
    {
      id: "action",
      header: "",
      cell: (claim) =>
        claim.status === "Pending review" ? (
          <Button
            variant="secondary"
            size="xs"
            leadingIcon={RiCheckLine}
            onClick={() => {
              dispatch({ type: "approve-claim", claimId: claim.id });
              toast("Claim approved", {
                description: `${claim.id} approved for ${formatMoney(claim.amount)}.`,
                status: "success",
              });
            }}
          >
            Approve
          </Button>
        ) : (
          <span className="text-caption-1-medium text-text-tertiary">Approved</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Claims pending" value={pending.length} caption="Awaiting review" icon={RiFileList3Line} />
        <Metric label="Approved claims" value={approved.length} caption="Ready to pay" icon={RiCheckLine} />
        <Metric label="Total claim value" value={formatMoney(total, true)} caption="Current statements" icon={RiMoneyRupeeCircleLine} />
        <Metric label="Sales covered" value={formatMoney(state.claims.reduce((sum, claim) => sum + claim.salesValue, 0), true)} caption="Distributor reported" icon={RiTruckLine} tone="accent" />
      </div>

      <Card className="p-4">
        <SectionHeader
          title="Distributor claim statements"
          description="Scheme and damage rates applied to distributor-reported sales. Statements are generated for review before approval."
          actions={<Button size="small" leadingIcon={RiAddLine} onClick={onGenerate}>Generate claim</Button>}
        />
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable label="Distributor claim statements" columns={columns} rows={state.claims} />
        </div>
      </Card>

      <Callout title="Claim calculation">
        Claim amount = distributor sales value × (scheme rate + damage allowance). The statement keeps the source
        sales figure and rates so it can be reconciled against the distributor's own report.
      </Callout>
    </div>
  );
}

function GenerateClaimModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const first = state.distributors[0];
  const [distributorId, setDistributorId] = useState(first?.locationId ?? "");
  const [period, setPeriod] = useState("November 2026");
  const [scheme, setScheme] = useState(String(first?.schemeRate ?? 5));
  const [damage, setDamage] = useState(String(first?.damageRate ?? 1));
  const distributor = state.distributors.find((row) => row.locationId === distributorId);
  const amount = distributor
    ? (distributor.salesValue * ((Number(scheme) || 0) + (Number(damage) || 0))) / 100
    : 0;

  return (
    <Modal isOpen={open} onOpenChange={(next) => !next && onClose()} size="md">
      <ModalHeader
        title="Generate claim statement"
        description="Apply the distributor's scheme and damage rates to reported sales for the period."
      />
      <ModalBody>
        <div className="flex flex-col gap-3">
          <Select
            label="Distributor"
            selectedKey={distributorId}
            onSelectionChange={(key) => {
              const id = String(key);
              setDistributorId(id);
              const next = state.distributors.find((row) => row.locationId === id);
              if (next) {
                setScheme(String(next.schemeRate));
                setDamage(String(next.damageRate));
              }
            }}
          >
            {state.distributors.map((row) => (
              <SelectItem key={row.locationId} id={row.locationId} textValue={row.name}>
                {row.name}
              </SelectItem>
            ))}
          </Select>
          <Input label="Period" value={period} onChange={setPeriod} placeholder="e.g. November 2026" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Scheme rate (%)" type="number" value={scheme} onChange={setScheme} />
            <Input label="Damage allowance (%)" type="number" value={damage} onChange={setDamage} />
          </div>
          <div className="rounded-xl bg-background-secondary-default p-3">
            <div className="flex items-center justify-between">
              <span className="text-body-medium text-text-secondary">Reported sales</span>
              <span className="text-body-medium text-text-primary">{formatMoney(distributor?.salesValue ?? 0)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-body-medium text-text-secondary">Calculated claim</span>
              <span className="text-title-3-semibold text-text-primary">{formatMoney(amount)}</span>
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (!distributorId || !period.trim()) {
              toast("Choose a distributor and period", { status: "error" });
              return;
            }
            dispatch({
              type: "generate-claim",
              distributorId,
              period,
              schemeRate: Number(scheme) || 0,
              damageRate: Number(damage) || 0,
            });
            toast("Claim statement generated", {
              description: `${period} claim for ${distributor?.name} is ready for review.`,
              status: "success",
            });
            onClose();
          }}
        >
          Generate statement
        </Button>
      </ModalFooter>
    </Modal>
  );
}
