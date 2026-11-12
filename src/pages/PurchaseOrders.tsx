import { useState } from "react";
import {
  RiAlertLine,
  RiArrowRightUpLine,
  RiCheckLine,
  RiFileListLine,
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
  dueLabel,
  formatDate,
  formatMoney,
  formatNumber,
  formatShortDate,
} from "@/lib/format";
import {
  effectiveDelivery,
  packagingById,
  poFollowUp,
  poIsOverdue,
  poPendingQty,
  skuById,
  vendorById,
} from "@/lib/selectors";
import type { POLine, POStatus, PurchaseOrder } from "@/lib/types";
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

const PO_TABS = ["register", "follow-ups"];
const STATUS_OPTIONS: POStatus[] = [
  "Issued",
  "Acknowledged",
  "In production",
  "Dispatched",
  "Partially received",
  "Received",
];

export function PurchaseOrdersPage({
  tab,
  onTabChange,
}: {
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  const { state, dispatch } = useApp();
  const [openPoId, setOpenPoId] = useState<string | null>(null);
  const [receivePoId, setReceivePoId] = useState<string | null>(null);
  const activeTab = PO_TABS.includes(tab) ? tab : "register";

  const open = state.purchaseOrders.filter((po) => po.status !== "Received");
  const overdue = state.purchaseOrders.filter(poIsOverdue);
  const pendingUnits = state.purchaseOrders.reduce((sum, po) => sum + poPendingQty(po), 0);
  const awaitingAck = state.purchaseOrders.filter((po) => po.status === "Issued").length;
  const partial = state.purchaseOrders.filter((po) => po.status === "Partially received").length;

  return (
    <>
      <PageHeader
        eyebrow="Vendor POs"
        title="Purchase orders & receipts"
        description="Track vendor orders from issue through production and delivery, receive goods partially, and post stock only when the receipt is accepted."
        actions={
          <Button
            size="small"
            leadingIcon={RiArrowRightUpLine}
            onClick={() => onTabChange("follow-ups")}
          >
            {overdue.length > 0 ? `${overdue.length} overdue` : "Delivery watch"}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open POs" value={open.length} caption={`${state.purchaseOrders.length} total`} icon={RiFileListLine} />
        <Metric label="Pending units" value={formatNumber(pendingUnits)} caption="Across all line items" icon={RiTruckLine} />
        <Metric label="Overdue deliveries" value={overdue.length} caption="Past effective delivery date" icon={RiAlertLine} />
        <Metric label="Awaiting acknowledgement" value={awaitingAck} caption={`${partial} partially received`} icon={RiCheckLine} tone="accent" />
      </div>

      <Tabs selectedKey={activeTab} onSelectionChange={(key) => onTabChange(String(key))}>
        <TabList aria-label="Purchase order views">
          <Tab id="register" count={state.purchaseOrders.length}>PO register</Tab>
          <Tab id="follow-ups" count={overdue.length}>Follow-ups</Tab>
        </TabList>
        <TabPanel id="register">
          <RegisterTab onOpen={setOpenPoId} onReceive={setReceivePoId} />
        </TabPanel>
        <TabPanel id="follow-ups">
          <FollowUpTab onOpen={setOpenPoId} onReceive={setReceivePoId} />
        </TabPanel>
      </Tabs>

      {openPoId ? (
        <PurchaseOrderDetail
          key={`detail-${openPoId}`}
          poId={openPoId}
          onClose={() => setOpenPoId(null)}
          onReceive={() => setReceivePoId(openPoId)}
        />
      ) : null}

      {receivePoId ? (
        <ReceiveGoodsModal
          key={`receive-${receivePoId}`}
          poId={receivePoId}
          onClose={() => setReceivePoId(null)}
          dispatch={dispatch}
        />
      ) : null}
    </>
  );
}

function usePoFilter(state: ReturnType<typeof useApp>["state"]) {
  const [query, setQuery] = useState("");
  const [vendorId, setVendorId] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = state.purchaseOrders.filter((po) => {
    const vendor = vendorById(state, po.vendorId);
    const itemText = po.lines
      .map((line) =>
        line.itemType === "sku"
          ? skuById(state, line.itemId)?.name
          : packagingById(state, line.itemId)?.name,
      )
      .join(" ");
    const haystack = `${po.poNumber} ${vendor?.name ?? ""} ${itemText}`.toLowerCase();
    return (
      haystack.includes(query.trim().toLowerCase()) &&
      (vendorId === "all" || po.vendorId === vendorId) &&
      (status === "all" || po.status === status)
    );
  });

  return { query, setQuery, vendorId, setVendorId, status, setStatus, rows };
}

function PoFilters({
  query,
  setQuery,
  vendorId,
  setVendorId,
  status,
  setStatus,
  state,
}: {
  query: string;
  setQuery: (value: string) => void;
  vendorId: string;
  setVendorId: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  state: ReturnType<typeof useApp>["state"];
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <SearchField
        aria-label="Search purchase orders"
        placeholder="Search PO, vendor or item…"
        value={query}
        onChange={setQuery}
        className="sm:max-w-sm"
      />
      <Select
        aria-label="Filter by vendor"
        selectedKey={vendorId}
        onSelectionChange={(key) => setVendorId(String(key))}
        className="w-full sm:w-[190px]"
      >
        <SelectItem id="all" textValue="All vendors">All vendors</SelectItem>
        {state.vendors.map((vendor) => (
          <SelectItem key={vendor.id} id={vendor.id} textValue={vendor.name}>
            {vendor.name}
          </SelectItem>
        ))}
      </Select>
      <Select
        aria-label="Filter by status"
        selectedKey={status}
        onSelectionChange={(key) => setStatus(String(key))}
        className="w-full sm:w-[180px]"
      >
        <SelectItem id="all" textValue="All statuses">All statuses</SelectItem>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} id={option} textValue={option}>
            {option}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}

function PoTable({
  rows,
  state,
  onOpen,
  onReceive,
}: {
  rows: PurchaseOrder[];
  state: ReturnType<typeof useApp>["state"];
  onOpen: (id: string) => void;
  onReceive: (id: string) => void;
}) {
  const columns: DataColumn<PurchaseOrder>[] = [
    {
      id: "po",
      header: "PO",
      isRowHeader: true,
      cell: (po) => {
        const vendor = vendorById(state, po.vendorId);
        return (
          <div className="min-w-[170px]">
            <p className="text-body-medium text-text-primary">{po.poNumber}</p>
            <p className="text-caption-1-medium text-text-tertiary">{vendor?.name} · {vendor?.category}</p>
          </div>
        );
      },
    },
    {
      id: "issued",
      header: "Issued",
      cell: (po) => <span className="text-body-regular text-text-secondary">{formatShortDate(po.issueDate)}</span>,
    },
    {
      id: "delivery",
      header: "Delivery",
      cell: (po) => (
        <div>
          <p className={`text-body-medium ${poIsOverdue(po) ? "text-status-rose-text" : "text-text-primary"}`}>
            {formatShortDate(effectiveDelivery(po))}
          </p>
          <p className="text-caption-1-medium text-text-tertiary">
            {po.revisedDelivery ? `Revised · was ${formatShortDate(po.originalDelivery)}` : "Original date"}
          </p>
        </div>
      ),
    },
    { id: "status", header: "Status", cell: (po) => <StatusChip status={po.status} /> },
    {
      id: "lines",
      header: "Lines",
      align: "end",
      cell: (po) => `${po.lines.length}`,
    },
    {
      id: "pending",
      header: "Pending",
      align: "end",
      cell: (po) => <span className="font-medium">{formatNumber(poPendingQty(po))}</span>,
    },
    {
      id: "owner",
      header: "Owner",
      cell: (po) => <span className="text-body-regular text-text-secondary">{po.owner}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: (po) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="xs" onClick={() => onOpen(po.id)}>
            Open
          </Button>
          {po.status !== "Received" ? (
            <Button variant="secondary" size="xs" onClick={() => onReceive(po.id)}>
              Receive
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl bg-background-primary-default">
      <DataTable
        label="Purchase order register"
        columns={columns}
        rows={rows}
        onRowAction={(po) => onOpen(po.id)}
        empty={
          <EmptyState
            title="No matching purchase orders"
            description="Try a different PO number, vendor or status."
          />
        }
      />
    </div>
  );
}

function RegisterTab({
  onOpen,
  onReceive,
}: {
  onOpen: (id: string) => void;
  onReceive: (id: string) => void;
}) {
  const { state } = useApp();
  const filters = usePoFilter(state);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <SectionHeader
          title="PO register"
          description="Every purchase order with issue date, effective delivery date, current status and pending quantity."
          actions={<Chip variant="subtle" color="soft">{filters.rows.length} POs</Chip>}
        />
        <div className="mt-3">
          <PoFilters state={state} {...filters} />
        </div>
        <div className="mt-3">
          <PoTable rows={filters.rows} state={state} onOpen={onOpen} onReceive={onReceive} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionHeader
            title="Vendors"
            description="Purchase order counts and open value by vendor."
          />
          <div className="mt-3 flex flex-col gap-2">
            {state.vendors.map((vendor) => {
              const orders = state.purchaseOrders.filter((po) => po.vendorId === vendor.id);
              const value = orders.reduce(
                (sum, po) =>
                  sum +
                  po.lines.reduce(
                    (inner, line) => inner + line.qtyOrdered * line.unitCost,
                    0,
                  ),
                0,
              );
              return (
                <div key={vendor.id} className="flex items-center justify-between rounded-xl bg-background-primary-default p-2.5">
                  <div className="min-w-0">
                    <p className="text-body-medium text-text-primary">{vendor.name}</p>
                    <p className="text-caption-1-medium text-text-tertiary">{vendor.category} · {orders.length} POs</p>
                  </div>
                  <span className="text-body-medium text-text-primary">{formatMoney(value, true)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader
            title="Receipt posting rule"
            description="Vendor dispatch does not change inventory."
          />
          <div className="mt-3">
            <Callout title="Stock posts only on accepted receipt">
              Use “Receive” on a PO to accept goods. Only accepted quantities increase SKU or packaging stock and
              create an inward movement. A PO marked “Dispatched” by the vendor leaves inventory untouched.
            </Callout>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FollowUpTab({
  onOpen,
  onReceive,
}: {
  onOpen: (id: string) => void;
  onReceive: (id: string) => void;
}) {
  const { state } = useApp();
  const filters = usePoFilter(state);
  const open = state.purchaseOrders.filter((po) => po.status !== "Received");
  const queue = open
    .filter((po) => poFollowUp(po) !== null)
    .sort((a, b) => (effectiveDelivery(a) < effectiveDelivery(b) ? -1 : 1));
  const overdue = open.filter(poIsOverdue);
  const dueSoon = open.filter((po) => {
    const days = Math.round(
      (new Date(`${effectiveDelivery(po)}T00:00:00`).getTime() -
        new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`).getTime()) /
        86_400_000,
    );
    return days >= 0 && days <= 7;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Overdue" value={overdue.length} caption="Escalate to vendor" icon={RiAlertLine} />
        <Metric label="Due within 7 days" value={dueSoon.length} caption="Confirm dispatch" icon={RiTruckLine} />
        <Metric label="Awaiting acknowledgement" value={open.filter((po) => po.status === "Issued").length} caption="No vendor response" icon={RiFileListLine} />
        <Metric label="Partial deliveries" value={open.filter((po) => po.status === "Partially received").length} caption="Pending balance on PO" icon={RiCheckLine} tone="accent" />
      </div>

      <Card className="p-4">
        <SectionHeader
          title="Follow-up queue"
          description="Derived from PO status and the effective delivery date, assigned to the responsible owner."
          actions={<Chip variant="bold" color={overdue.length > 0 ? "rose" : "lime"}>{queue.length} to action</Chip>}
        />
        <div className="mt-3 flex flex-col gap-2">
          {queue.length === 0 ? (
            <EmptyState title="No follow-ups due" description="Every open PO is on schedule." />
          ) : (
            queue.map((po) => {
              const vendor = vendorById(state, po.vendorId);
              const overduePo = poIsOverdue(po);
              return (
                <div
                  key={po.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    overduePo
                      ? "border-status-rose-background bg-status-rose-background/30"
                      : "border-border-button-default bg-background-primary-default"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                        overduePo
                          ? "bg-status-rose-background text-status-rose-text"
                          : "bg-status-yellow-background text-status-yellow-text"
                      }`}
                    >
                      <RiAlertLine className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-body-medium text-text-primary">
                        {po.poNumber} · {vendor?.name}
                      </p>
                      <p className="text-caption-1-medium text-text-secondary">
                        {poFollowUp(po)} · {dueLabel(effectiveDelivery(po))} · Owner {po.owner}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusChip status={po.status} />
                    <Button variant="ghost" size="xs" onClick={() => onOpen(po.id)}>Open</Button>
                    <Button variant="secondary" size="xs" onClick={() => onReceive(po.id)}>Receive</Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Delivery watch" description="All open POs with original and revised delivery dates." />
        <div className="mt-3">
          <PoFilters state={state} {...filters} />
        </div>
        <div className="mt-3">
          <PoTable rows={filters.rows.filter((po) => po.status !== "Received")} state={state} onOpen={onOpen} onReceive={onReceive} />
        </div>
      </Card>
    </div>
  );
}

function PurchaseOrderDetail({
  poId,
  onClose,
  onReceive,
}: {
  poId: string;
  onClose: () => void;
  onReceive: () => void;
}) {
  const { state, dispatch } = useApp();
  const [revised, setRevised] = useState("");
  const po = state.purchaseOrders.find((row) => row.id === poId);
  if (!po) return null;
  const vendor = vendorById(state, po.vendorId);
  const receipts = state.receipts.filter((receipt) => receipt.poId === po.id);

  const lineName = (line: POLine) =>
    line.itemType === "sku"
      ? skuById(state, line.itemId)?.name
      : packagingById(state, line.itemId)?.name;

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="xl">
      <ModalHeader
        title={`${po.poNumber} · ${vendor?.name}`}
        description={`Issued ${formatDate(po.issueDate)} · Owner ${po.owner} · Last updated ${formatDate(po.lastUpdated)}`}
      />
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-background-secondary-default p-3">
              <p className="text-caption-1-medium text-text-tertiary">Current status</p>
              <div className="mt-1">
                <Select
                  aria-label="Update PO status"
                  selectedKey={po.status}
                  onSelectionChange={(key) => {
                    const status = String(key) as POStatus;
                    dispatch({ type: "update-po-status", poId: po.id, status });
                    toast("PO status updated", {
                      description: `${po.poNumber} moved to ${status}.`,
                      status: "success",
                    });
                  }}
                >
                  {STATUS_OPTIONS.filter((option) => option !== "Received").map((option) => (
                    <SelectItem key={option} id={option} textValue={option}>
                      {option}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <p className="mt-1 text-caption-1-medium text-text-tertiary">
                “Received” is set automatically when every line is fully received.
              </p>
            </div>
            <div className="rounded-xl bg-background-secondary-default p-3">
              <p className="text-caption-1-medium text-text-tertiary">Committed delivery</p>
              <p className="mt-1 text-body-medium text-text-primary">
                {formatDate(effectiveDelivery(po))}
                {poIsOverdue(po) ? <span className="ms-2 text-status-rose-text">Overdue</span> : null}
              </p>
              <p className="text-caption-1-medium text-text-tertiary">
                Original {formatShortDate(po.originalDelivery)}
                {po.revisedDelivery ? ` · Revised ${formatShortDate(po.revisedDelivery)}` : ""}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <Input
                  aria-label="Revised delivery date"
                  type="date"
                  value={revised || po.revisedDelivery || po.originalDelivery}
                  onChange={setRevised}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="small"
                  disabled={!revised}
                  onClick={() => {
                    dispatch({ type: "revise-po-date", poId: po.id, date: revised });
                    toast("Delivery date revised", {
                      description: `${po.poNumber} now due ${formatDate(revised)}.`,
                      status: "success",
                    });
                    setRevised("");
                  }}
                >
                  Revise
                </Button>
              </div>
            </div>
          </div>

          <div>
            <SectionHeader title="Line items" description="Ordered, received and pending quantity per item." />
            <div className="mt-2 overflow-hidden rounded-xl border border-separator-border">
              <table className="bui-table bui-table-sm">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Type</th>
                    <th className="text-end">Ordered</th>
                    <th className="text-end">Received</th>
                    <th className="text-end">Pending</th>
                    <th className="text-end">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lines.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <p className="text-body-medium text-text-primary">{lineName(line)}</p>
                        <p className="text-caption-1-medium text-text-tertiary">{line.itemId}</p>
                      </td>
                      <td><Chip variant="caption" color="soft">{line.itemType === "sku" ? "SKU" : "Packaging"}</Chip></td>
                      <td className="text-end">{formatNumber(line.qtyOrdered)}</td>
                      <td className="text-end">{formatNumber(line.qtyReceived)}</td>
                      <td className="text-end font-medium">{formatNumber(Math.max(0, line.qtyOrdered - line.qtyReceived))}</td>
                      <td className="text-end">{formatMoney(line.qtyOrdered * line.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {po.notes ? (
            <div className="rounded-xl bg-background-secondary-default p-3 text-body-regular text-text-secondary">
              <span className="text-text-tertiary">Notes: </span>{po.notes}
            </div>
          ) : null}

          <div>
            <SectionHeader title="Goods receipts" description="Accepted receipts posted against this PO." />
            <div className="mt-2 flex flex-col gap-2">
              {receipts.length === 0 ? (
                <p className="text-body-regular text-text-secondary">No receipts yet.</p>
              ) : (
                receipts.map((receipt) => (
                  <div key={receipt.id} className="rounded-xl bg-background-secondary-default p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-body-medium text-text-primary">{receipt.id} · {formatShortDate(receipt.date)}</p>
                      <Chip variant="caption" color="lime">{receipt.acceptedBy}</Chip>
                    </div>
                    <p className="mt-1 text-caption-1-medium text-text-tertiary">
                      {receipt.lines
                        .map((line) => {
                          const name =
                            line.itemType === "sku"
                              ? skuById(state, line.itemId)?.name
                              : packagingById(state, line.itemId)?.name;
                          return `${name}: ${line.qty}`;
                        })
                        .join(" · ")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {po.status !== "Received" ? (
          <Button leadingIcon={RiTruckLine} onClick={onReceive}>Receive goods</Button>
        ) : null}
      </ModalFooter>
    </Modal>
  );
}

function ReceiveGoodsModal({
  poId,
  onClose,
  dispatch,
}: {
  poId: string;
  onClose: () => void;
  dispatch: ReturnType<typeof useApp>["dispatch"];
}) {
  const { state } = useApp();
  const po = state.purchaseOrders.find((row) => row.id === poId);
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (po?.lines ?? []).map((line) => [
        line.id,
        String(Math.max(0, line.qtyOrdered - line.qtyReceived)),
      ]),
    ),
  );
  if (!po) return null;
  const vendor = vendorById(state, po.vendorId);
  const totalAccepted = po.lines.reduce((sum, line) => {
    const pending = Math.max(0, line.qtyOrdered - line.qtyReceived);
    return sum + Math.min(Number(quantities[line.id]) || 0, pending);
  }, 0);
  const lineName = (line: POLine) =>
    line.itemType === "sku"
      ? skuById(state, line.itemId)?.name
      : packagingById(state, line.itemId)?.name;

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="lg">
      <ModalHeader
        title={`Receive goods · ${po.poNumber}`}
        description={`${vendor?.name} · Accept quantities physically received. Stock and inward movements post only for accepted quantities.`}
      />
      <ModalBody>
        <div className="flex flex-col gap-3">
          {po.lines.map((line) => {
            const pending = Math.max(0, line.qtyOrdered - line.qtyReceived);
            return (
              <div key={line.id} className="rounded-xl bg-background-secondary-default p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body-medium text-text-primary">{lineName(line)}</p>
                    <p className="text-caption-1-medium text-text-tertiary">
                      Ordered {formatNumber(line.qtyOrdered)} · received {formatNumber(line.qtyReceived)} · pending{" "}
                      {formatNumber(pending)}
                    </p>
                  </div>
                  <Chip variant="caption" color={line.itemType === "sku" ? "blue" : "purple"}>
                    {line.itemType === "sku" ? "SKU" : "Packaging"}
                  </Chip>
                </div>
                <div className="mt-2">
                  <Input
                    aria-label={`Accepted quantity for ${lineName(line)}`}
                    type="number"
                    value={quantities[line.id] ?? "0"}
                    onChange={(value) => setQuantities((prev) => ({ ...prev, [line.id]: value }))}
                    hint={pending === 0 ? "Fully received" : `Up to ${pending} units`}
                    isDisabled={pending === 0}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          disabled={totalAccepted <= 0}
          onClick={() => {
            const parsed: Record<string, number> = {};
            Object.entries(quantities).forEach(([lineId, value]) => {
              parsed[lineId] = Number(value) || 0;
            });
            dispatch({ type: "receive-po", poId: po.id, quantities: parsed });
            toast("Receipt posted to inventory", {
              description: `${totalAccepted} units added from ${po.poNumber}. Inward movements created.`,
              status: "success",
            });
            onClose();
          }}
        >
          Accept {formatNumber(totalAccepted)} units
        </Button>
      </ModalFooter>
    </Modal>
  );
}
