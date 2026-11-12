import { addDays, daysFromToday, formatDate, todayISO } from "@/lib/format";
import type {
  AppState,
  Combo,
  Customer,
  Lead,
  LeadStage,
  Movement,
  POStatus,
  PurchaseOrder,
  Role,
  StockLocation,
} from "@/lib/types";

export const WAREHOUSE = "WH-01";
export const DEMO_POOL = "DEMO-01";
export const OFFICE = "OFF-01";

export function skuById(state: AppState, id: string) {
  return state.skus.find((sku) => sku.id === id);
}

export function packagingById(state: AppState, id: string) {
  return state.packaging.find((item) => item.id === id);
}

export function locationById(state: AppState, id: string) {
  return state.locations.find((location) => location.id === id);
}

export function vendorById(state: AppState, id: string) {
  return state.vendors.find((vendor) => vendor.id === id);
}

export function stockAt(state: AppState, skuId: string, locationId: string): number {
  return state.stock.find((row) => row.skuId === skuId && row.locationId === locationId)?.onHand ?? 0;
}

export function reservedAt(state: AppState, skuId: string, locationId: string): number {
  return state.stock.find((row) => row.skuId === skuId && row.locationId === locationId)?.reserved ?? 0;
}

export function availableAt(state: AppState, skuId: string, locationId = WAREHOUSE): number {
  return Math.max(0, stockAt(state, skuId, locationId) - reservedAt(state, skuId, locationId));
}

export function totalOnHand(state: AppState, skuId: string): number {
  return state.stock.filter((row) => row.skuId === skuId).reduce((sum, row) => sum + row.onHand, 0);
}

export function totalReserved(state: AppState, skuId: string): number {
  return state.stock.filter((row) => row.skuId === skuId).reduce((sum, row) => sum + row.reserved, 0);
}

export interface ComboAvailability {
  combo: Combo;
  max: number;
  components: { skuId: string; qty: number; available: number; sets: number }[];
}

export function comboAvailability(state: AppState, combo: Combo): ComboAvailability {
  const components = combo.components.map((component) => {
    const available = availableAt(state, component.skuId);
    return {
      ...component,
      available,
      sets: Math.floor(available / component.qty),
    };
  });
  return {
    combo,
    max: components.reduce((min, component) => Math.min(min, component.sets), Number.POSITIVE_INFINITY),
    components,
  };
}

export function stockValue(state: AppState): number {
  return state.stock.reduce((sum, row) => {
    const sku = skuById(state, row.skuId);
    return sum + (sku ? row.onHand * sku.cost : 0);
  }, 0);
}

export function totalUnits(state: AppState): number {
  return state.stock.reduce((sum, row) => sum + row.onHand, 0);
}

export function lowStockItems(state: AppState) {
  return state.skus
    .map((sku) => ({
      sku,
      warehouse: stockAt(state, sku.id, WAREHOUSE),
      total: totalOnHand(state, sku.id),
    }))
    .filter((entry) => entry.warehouse <= entry.sku.reorderLevel);
}

export function locationsByType(state: AppState, type: StockLocation["type"]) {
  return state.locations.filter((location) => location.type === type);
}

export function distributorSummary(state: AppState) {
  return state.distributors.map((distributor) => {
    const dispatched = state.movements
      .filter((movement) => movement.itemType === "sku" && movement.to === distributor.locationId)
      .reduce((sum, movement) => sum + movement.qty, 0);
    const returned = state.movements
      .filter((movement) => movement.itemType === "sku" && movement.from === distributor.locationId && movement.type === "Return")
      .reduce((sum, movement) => sum + movement.qty, 0);
    const closing = state.stock
      .filter((row) => row.locationId === distributor.locationId)
      .reduce((sum, row) => sum + row.onHand, 0);
    const stockValueAtDistributor = state.stock
      .filter((row) => row.locationId === distributor.locationId)
      .reduce((sum, row) => {
        const sku = skuById(state, row.skuId);
        return sum + (sku ? row.onHand * sku.price : 0);
      }, 0);
    return {
      ...distributor,
      dispatched,
      returned,
      closing,
      stockValueAtDistributor,
      outstanding: Math.max(0, dispatched - returned - distributor.soldQty),
    };
  });
}

export function demoOutstanding(issue: { qtyIssued: number; qtyConsumed: number; qtyReturned: number }) {
  return Math.max(0, issue.qtyIssued - issue.qtyConsumed - issue.qtyReturned);
}

export function effectiveDelivery(po: PurchaseOrder): string {
  return po.revisedDelivery ?? po.originalDelivery;
}

export function poIsOverdue(po: PurchaseOrder): boolean {
  return po.status !== "Received" && daysFromToday(effectiveDelivery(po)) < 0;
}

export function poPendingQty(po: PurchaseOrder): number {
  return po.lines.reduce((sum, line) => sum + Math.max(0, line.qtyOrdered - line.qtyReceived), 0);
}

export function poFollowUp(po: PurchaseOrder): string | null {
  if (po.status === "Received") return null;
  if (poIsOverdue(po)) return "Overdue delivery — escalate";
  if (po.status === "Issued") return "Awaiting vendor acknowledgement";
  if (po.status === "Acknowledged" && daysFromToday(effectiveDelivery(po)) <= 7) return "Confirm dispatch date";
  if (po.status === "In production" && daysFromToday(effectiveDelivery(po)) <= 5) return "Chase production progress";
  if (po.status === "Dispatched") return "Book inward receipt on arrival";
  return null;
}

export function dailyDispatch(state: AppState, date: string) {
  const current = new Map<string, number>();
  state.stock
    .filter((row) => row.locationId === WAREHOUSE)
    .forEach((row) => current.set(row.skuId, row.onHand));

  const netToWarehouse = (movement: Movement): number => {
    if (movement.itemType !== "sku") return 0;
    let net = 0;
    if (movement.to === WAREHOUSE) net += movement.qty;
    if (movement.from === WAREHOUSE) net -= movement.qty;
    return net;
  };

  return state.skus.map((sku) => {
    const movements = state.movements.filter(
      (movement) => movement.itemType === "sku" && movement.itemId === sku.id,
    );
    const after = movements
      .filter((movement) => movement.date > date)
      .reduce((sum, movement) => sum + netToWarehouse(movement), 0);
    const closing = (current.get(sku.id) ?? 0) - after;
    const onDate = movements.filter((movement) => movement.date === date);
    const inward = onDate
      .filter((movement) => movement.to === WAREHOUSE)
      .reduce((sum, movement) => sum + movement.qty, 0);
    const outward = onDate
      .filter((movement) => movement.from === WAREHOUSE)
      .reduce((sum, movement) => sum + movement.qty, 0);
    return {
      sku,
      opening: closing - inward + outward,
      inward,
      outward,
      closing,
      hasActivity: inward > 0 || outward > 0,
    };
  });
}

export const STAGE_PROBABILITY: Record<LeadStage, number> = {
  New: 0.1,
  Contacted: 0.25,
  Interested: 0.5,
  Converted: 1,
  Lost: 0,
};

export function weightedPipeline(leads: Lead[]): number {
  return leads.reduce(
    (sum, lead) => sum + lead.expectedValue * STAGE_PROBABILITY[lead.stage],
    0,
  );
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export function projectedSales(state: AppState) {
  const people = Array.from(new Set(state.leads.map((lead) => lead.owner)));
  const thisMonth = todayISO().slice(0, 7);
  const nextMonth = addDays(todayISO(), 32).slice(0, 7);

  return people.map((person) => {
    const personLeads = state.leads.filter((lead) => lead.owner === person);
    const forMonth = (key: string) =>
      personLeads.filter(
        (lead) => monthKey(lead.expectedClose) === key && lead.stage !== "Lost",
      );
    const thisLeads = forMonth(thisMonth);
    const nextLeads = forMonth(nextMonth);
    const repeat = state.customers
      .filter(
        (customer) =>
          monthKey(customer.reorderDue) === thisMonth &&
          customer.repeatStatus !== "On track",
      )
      .reduce((sum, customer) => sum + customer.lastOrderValue, 0);
    return {
      person,
      thisMonth: weightedPipeline(thisLeads),
      nextMonth: weightedPipeline(nextLeads),
      openLeads: personLeads.filter((lead) => !["Converted", "Lost"].includes(lead.stage)).length,
      converted: personLeads.filter((lead) => lead.stage === "Converted").length,
      repeat,
    };
  });
}

export function repeatStatusFor(customer: Customer): Customer["repeatStatus"] {
  const days = daysFromToday(customer.reorderDue);
  if (days < 0) return "Overdue";
  if (days <= 10) return "Due soon";
  return "On track";
}

export function visiblePages(role: Role): string[] {
  switch (role) {
    case "Admin":
      return ["dashboard", "inventory", "purchase-orders", "billing", "crm", "requirements"];
    case "Sales":
      return ["dashboard", "inventory", "billing", "crm"];
    case "Warehouse":
      return ["dashboard", "inventory", "purchase-orders"];
    case "Trainer":
      return ["inventory"];
    default:
      return ["dashboard"];
  }
}

export function canSeeCost(role: Role): boolean {
  return role === "Admin" || role === "Warehouse";
}

export function poStatusTone(status: POStatus): "neutral" | "blue" | "yellow" | "cyan" | "lime" | "purple" {
  switch (status) {
    case "Issued":
      return "neutral";
    case "Acknowledged":
      return "blue";
    case "In production":
      return "yellow";
    case "Dispatched":
      return "purple";
    case "Partially received":
      return "cyan";
    case "Received":
      return "lime";
    default:
      return "neutral";
  }
}

export function nextId(prefix: string, existing: string[]): string {
  const numbers = existing
    .map((id) => Number(id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const next = (numbers.length ? Math.max(...numbers) : 100) + 1;
  return `${prefix}${next}`;
}

export function nextSequence(prefix: string, existing: string[]): string {
  return `${prefix}-${nextId("", existing).replace(/^-/, "")}`;
}

export function nextDate(months = 0): string {
  const base = new Date();
  base.setMonth(base.getMonth() + months);
  return `${base.getFullYear()}-${`${base.getMonth() + 1}`.padStart(2, "0")}-${`${base.getDate()}`.padStart(2, "0")}`;
}

export function describeLocation(state: AppState, id?: string): string {
  if (!id) return "Customer";
  const location = locationById(state, id);
  if (location) return location.name;
  return id;
}

export function movementLabel(state: AppState, movement: Movement): string {
  if (movement.itemType === "sku") {
    return skuById(state, movement.itemId)?.name ?? movement.itemId;
  }
  return packagingById(state, movement.itemId)?.name ?? movement.itemId;
}

export function dateSummary(): string {
  return formatDate(todayISO());
}
