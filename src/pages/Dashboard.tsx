import {
  RiAlertLine,
  RiArrowRightUpLine,
  RiCheckLine,
  RiFileList3Line,
  RiMoneyRupeeCircleLine,
  RiRestartLine,
  RiStackLine,
  RiTruckLine,
} from "@remixicon/react";
import { StatCards, type Stat } from "@/components/application/dashboard/stat-cards";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badge";
import { useApp } from "@/store/AppStore";
import { requirements } from "@/data/requirements";
import { formatMoney, formatNumber, formatShortDate, todayISO } from "@/lib/format";
import {
  demoOutstanding,
  distributorSummary,
  lowStockItems,
  poFollowUp,
  poIsOverdue,
  stockValue,
  totalUnits,
  weightedPipeline,
  WAREHOUSE,
} from "@/lib/selectors";
import type { PageKey } from "@/lib/types";
import {
  Bar,
  Callout,
  Card,
  DataTable,
  LinkAction,
  PageHeader,
  SectionHeader,
  StatusChip,
  type DataColumn,
} from "@/components/ui";

interface Alert {
  id: string;
  title: string;
  detail: string;
  tone: "rose" | "yellow" | "blue";
  page: PageKey;
  tab: string;
  action: string;
}

export function DashboardPage({
  onNavigate,
}: {
  onNavigate: (page: PageKey, tab?: string) => void;
}) {
  const { state, dispatch } = useApp();
  const units = totalUnits(state);
  const value = stockValue(state);
  const low = lowStockItems(state);
  const overdue = state.purchaseOrders.filter(poIsOverdue);
  const followUps = state.purchaseOrders.filter((po) => poFollowUp(po) !== null);
  const openPis = state.pis.filter((pi) => pi.status === "Draft");
  const shortfall = openPis.reduce(
    (sum, pi) => sum + pi.items.reduce((inner, item) => inner + item.shortfall, 0),
    0,
  );
  const outstandingDemo = state.demoIssues.reduce(
    (sum, issue) => sum + demoOutstanding(issue),
    0,
  );
  const overdueRepeat = state.customers.filter((c) => c.repeatStatus === "Overdue");
  const pipeline = weightedPipeline(
    state.leads.filter((lead) => !["Converted", "Lost"].includes(lead.stage)),
  );
  const distributors = distributorSummary(state);
  const distributorClosing = distributors.reduce((sum, d) => sum + d.closing, 0);

  const stats: Stat[] = [
    {
      icon: RiStackLine,
      label: "Units on hand",
      value: formatNumber(units),
      delta: `${state.locations.length} locations`,
      deltaColor: "neutral",
    },
    {
      icon: RiMoneyRupeeCircleLine,
      label: "Stock value at cost",
      value: formatMoney(value, true),
      delta: "Live ledger",
      deltaColor: "neutral",
    },
    {
      icon: RiTruckLine,
      label: "Open purchase orders",
      value: formatNumber(state.purchaseOrders.filter((po) => po.status !== "Received").length),
      delta: overdue.length > 0 ? `${overdue.length} overdue` : "On schedule",
      deltaColor: overdue.length > 0 ? "rose" : "lime",
    },
    {
      icon: RiFileList3Line,
      label: "Draft PIs",
      value: formatNumber(openPis.length),
      delta: shortfall > 0 ? `${formatNumber(shortfall)} short` : "Fully available",
      deltaColor: shortfall > 0 ? "rose" : "lime",
    },
  ];

  const alerts: Alert[] = [
    ...overdue.map((po) => ({
      id: `po-${po.id}`,
      title: `${po.poNumber} is overdue`,
      detail: `${po.owner} · ${po.lines.length} line${po.lines.length > 1 ? "s" : ""} pending`,
      tone: "rose" as const,
      page: "purchase-orders" as PageKey,
      tab: "follow-ups",
      action: "Escalate",
    })),
    ...openPis
      .filter((pi) => pi.items.some((item) => item.shortfall > 0))
      .map((pi) => ({
        id: `pi-${pi.id}`,
        title: `${pi.customer} PI has a shortfall`,
        detail: `${pi.items.reduce((sum, item) => sum + item.shortfall, 0)} units still to allocate`,
        tone: "yellow" as const,
        page: "billing" as PageKey,
        tab: "pis",
        action: "Review PI",
      })),
    ...low.slice(0, 3).map((entry) => ({
      id: `low-${entry.sku.id}`,
      title: `${entry.sku.name} below reorder level`,
      detail: `${entry.warehouse} at warehouse · reorder at ${entry.sku.reorderLevel}`,
      tone: "yellow" as const,
      page: "inventory" as PageKey,
      tab: "stock",
      action: "View stock",
    })),
    ...overdueRepeat.map((customer) => ({
      id: `repeat-${customer.id}`,
      title: `${customer.name} repeat order overdue`,
      detail: `Last order ${formatShortDate(customer.lastOrderDate)} · ${formatMoney(customer.lastOrderValue)}`,
      tone: "blue" as const,
      page: "crm" as PageKey,
      tab: "repeat",
      action: "Open CRM",
    })),
  ].slice(0, 6);

  const stockByLocation = state.locations
    .map((location) => {
      const rows = state.stock.filter((row) => row.locationId === location.id);
      const unitsAtLocation = rows.reduce((sum, row) => sum + row.onHand, 0);
      const valueAtLocation = rows.reduce((sum, row) => {
        const sku = state.skus.find((entry) => entry.id === row.skuId);
        return sum + (sku ? sku.cost * row.onHand : 0);
      }, 0);
      return { ...location, unitsAtLocation, valueAtLocation };
    })
    .filter((location) => location.unitsAtLocation > 0)
    .sort((a, b) => b.unitsAtLocation - a.unitsAtLocation);
  const maxLocationUnits = Math.max(...stockByLocation.map((row) => row.unitsAtLocation), 1);

  const recentMovements = [...state.movements]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 7);

  const movementColumns: DataColumn<(typeof recentMovements)[number]>[] = [
    {
      id: "item",
      header: "Item",
      isRowHeader: true,
      cell: (movement) => {
        const item =
          movement.itemType === "sku"
            ? state.skus.find((sku) => sku.id === movement.itemId)
            : state.packaging.find((entry) => entry.id === movement.itemId);
        return (
          <div className="min-w-0">
            <p className="truncate text-body-medium text-text-primary">{item?.name ?? movement.itemId}</p>
            <p className="truncate text-caption-1-medium text-text-tertiary">
              {movement.reference}
              {movement.note ? ` · ${movement.note}` : ""}
            </p>
          </div>
        );
      },
    },
    {
      id: "type",
      header: "Type",
      cell: (movement) => <StatusChip status={movement.type} />,
    },
    {
      id: "route",
      header: "Route",
      cell: (movement) => (
        <span className="text-body-regular text-text-secondary">
          {movement.from ?? "Vendor"} → {movement.to ?? "Customer"}
        </span>
      ),
    },
    {
      id: "qty",
      header: "Qty",
      align: "end",
      cell: (movement) => (
        <span className="text-body-medium text-text-primary">
          {movement.from === WAREHOUSE ? "−" : "+"}
          {formatNumber(movement.qty)}
        </span>
      ),
    },
    {
      id: "date",
      header: "Date",
      align: "end",
      cell: (movement) => (
        <span className="text-body-regular text-text-tertiary">{formatShortDate(movement.date)}</span>
      ),
    },
  ];

  const modules = [
    { key: "inventory" as const, label: "Inventory", count: requirements.filter((r) => r.module === "inventory").length },
    { key: "billing" as const, label: "Billing", count: requirements.filter((r) => r.module === "billing").length },
    { key: "crm" as const, label: "CRM", count: requirements.filter((r) => r.module === "crm").length },
    { key: "vendor" as const, label: "Vendor POs", count: requirements.filter((r) => r.module === "vendor").length },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`Live demo · ${formatShortDate(todayISO())}`}
        title="Inventory command centre"
        description="One view across warehouse, distributor, online and demo stock, with the pending billing, CRM and vendor work that needs attention."
        actions={
          <>
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiRestartLine}
              onClick={() => dispatch({ type: "set-role", role: "Admin" })}
            >
              Show all data
            </Button>
            <Button
              size="small"
              leadingIcon={RiCheckLine}
              onClick={() => onNavigate("requirements")}
            >
              Requirement coverage
            </Button>
          </>
        }
      />

      <StatCards stats={stats} columns={4} />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-4">
          <SectionHeader
            title="Needs attention"
            description="Derived from the stock ledger, open PIs and vendor follow-ups."
            actions={
              <Badge color="neutral">{alerts.length} open</Badge>
            }
          />
          <div className="mt-3 flex flex-col gap-2">
            {alerts.length === 0 ? (
              <p className="rounded-2xl bg-background-primary-default p-4 text-body-regular text-text-secondary">
                Nothing urgent. All stock is above reorder level and no PO is overdue.
              </p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-col gap-2 rounded-2xl bg-background-primary-default p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={
                        alert.tone === "rose"
                          ? "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-status-rose-background text-status-rose-text"
                          : alert.tone === "yellow"
                            ? "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-status-yellow-background text-status-yellow-text"
                            : "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-status-blue-background text-status-blue-text"
                      }
                    >
                      <RiAlertLine className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-body-medium text-text-primary">{alert.title}</p>
                      <p className="truncate text-caption-1-medium text-text-tertiary">{alert.detail}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    trailingIcon={RiArrowRightUpLine}
                    onClick={() => onNavigate(alert.page, alert.tab)}
                  >
                    {alert.action}
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader
            title="Stock by location"
            description="Units on hand, all channels"
            actions={<Badge color="neutral">{formatNumber(units)}</Badge>}
          />
          <div className="mt-3 flex flex-col gap-3">
            {stockByLocation.map((location) => (
              <div key={location.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-body-medium text-text-primary">{location.name}</p>
                  <p className="shrink-0 text-caption-1-medium text-text-tertiary tabular-nums">
                    {formatNumber(location.unitsAtLocation)} · {formatMoney(location.valueAtLocation, true)}
                  </p>
                </div>
                <Bar value={location.unitsAtLocation} max={maxLocationUnits} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-separator-border pt-3">
            <div>
              <p className="text-caption-1-medium text-text-tertiary">Distributor closing</p>
              <p className="text-body-medium text-text-primary tabular-nums">{formatNumber(distributorClosing)} units</p>
            </div>
            <div>
              <p className="text-caption-1-medium text-text-tertiary">Demo outstanding</p>
              <p className="text-body-medium text-text-primary tabular-nums">{formatNumber(outstandingDemo)} units</p>
            </div>
            <div>
              <p className="text-caption-1-medium text-text-tertiary">Weighted pipeline</p>
              <p className="text-body-medium text-text-primary tabular-nums">{formatMoney(pipeline, true)}</p>
            </div>
            <div>
              <p className="text-caption-1-medium text-text-tertiary">Follow-ups due</p>
              <p className="text-body-medium text-text-primary tabular-nums">{followUps.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden p-4">
          <SectionHeader
            title="Recent stock movements"
            description="Every dispatch, receipt, demo issue and return writes to the same ledger."
            actions={
              <Button
                variant="ghost"
                size="xs"
                trailingIcon={RiArrowRightUpLine}
                onClick={() => onNavigate("inventory", "dispatch")}
              >
                Daily report
              </Button>
            }
          />
          <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
            <DataTable
              label="Recent stock movements"
              columns={movementColumns}
              rows={recentMovements}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <SectionHeader
              title="Requirement coverage"
              description="All 22 items are represented in this demo."
              actions={<Badge color="primary">22 / 22</Badge>}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {modules.map((module) => (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => onNavigate("requirements")}
                  className="rounded-2xl bg-background-primary-default p-3 text-start transition-colors hover:bg-background-tertiary-default"
                >
                  <p className="text-caption-1-medium text-text-tertiary">{module.label}</p>
                  <p className="mt-0.5 text-title-3-semibold text-text-primary">{module.count}</p>
                  <p className="text-caption-1-medium text-status-lime-text">Implemented</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader title="Try the full workflow" />
            <div className="mt-3 flex flex-col gap-2">
              {[
                { label: "Receive a PO and watch stock rise", page: "purchase-orders" as PageKey, tab: "register" },
                { label: "Turn a sales order into a draft PI", page: "billing" as PageKey, tab: "orders" },
                { label: "Dispatch the PI and reduce stock", page: "billing" as PageKey, tab: "pis" },
                { label: "Import an Instagram lead", page: "crm" as PageKey, tab: "pipeline" },
              ].map((step, index) => (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => onNavigate(step.page, step.tab)}
                  className="flex items-center gap-2.5 rounded-xl p-2 text-start transition-colors hover:bg-background-tertiary-default"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-100 text-caption-1-semibold text-accent-700 dark:bg-accent-900 dark:text-accent-200">
                    {index + 1}
                  </span>
                  <span className="text-body-regular text-text-secondary">{step.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Callout
        title="Demo boundary"
        action={
          <LinkAction onClick={() => onNavigate("requirements")}>
            See traceability
          </LinkAction>
        }
      >
        Rupyz and Miracle remain the systems of record. This workspace demonstrates the automation layer: stock truth,
        PI preparation, CRM pipeline and vendor receipt posting.
      </Callout>
    </>
  );
}
