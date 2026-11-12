export type PageKey =
  | "dashboard"
  | "inventory"
  | "purchase-orders"
  | "billing"
  | "crm"
  | "requirements";

export type ModuleKey = "inventory" | "billing" | "crm" | "vendor";
export type Role = "Admin" | "Sales" | "Warehouse" | "Trainer";
export type Priority = "High" | "Medium";

export interface SKU {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  reorderLevel: number;
}

export type LocationType =
  | "warehouse"
  | "production"
  | "office"
  | "distributor"
  | "online"
  | "demo";

export interface StockLocation {
  id: string;
  name: string;
  city: string;
  type: LocationType;
  channel: string;
}

export interface StockRow {
  skuId: string;
  locationId: string;
  onHand: number;
  reserved: number;
}

export type MovementType =
  | "Inward"
  | "Dispatch"
  | "Transfer"
  | "Return"
  | "Demo issue"
  | "Demo return"
  | "Consumption"
  | "Wastage";

export interface Movement {
  id: string;
  date: string;
  type: MovementType;
  itemType: "sku" | "packaging";
  itemId: string;
  from?: string;
  to?: string;
  qty: number;
  reference: string;
  note?: string;
}

export interface ComboComponent {
  skuId: string;
  qty: number;
}

export interface Combo {
  id: string;
  name: string;
  price: number;
  components: ComboComponent[];
}

export interface Distributor {
  locationId: string;
  id: string;
  name: string;
  city: string;
  contact: string;
  soldQty: number;
  returnedQty: number;
  schemeRate: number;
  damageRate: number;
  /** Additional discount offered by the distributor to customers, reimbursable by the company. */
  discountRate: number;
  salesValue: number;
}

export interface DemoIssue {
  id: string;
  date: string;
  skuId: string;
  issuedTo: string;
  qtyIssued: number;
  qtyConsumed: number;
  qtyReturned: number;
  status: "Outstanding" | "Closed";
}

export interface PackagingItem {
  id: string;
  name: string;
  unit: string;
  cost: number;
  reorderLevel: number;
}

export interface PackagingStockRow {
  itemId: string;
  locationId: string;
  onHand: number;
}

export interface PackagingIssue {
  id: string;
  date: string;
  itemId: string;
  locationId: string;
  qty: number;
  purpose: string;
}

export interface OrderItem {
  skuId: string;
  qty: number;
  rate: number;
}

export type OrderStatus =
  | "Open"
  | "PI drafted"
  | "Partially available"
  | "Backorder"
  | "Fulfilled";

export interface SalesOrder {
  id: string;
  customer: string;
  channel: string;
  date: string;
  salesperson: string;
  items: OrderItem[];
  status: OrderStatus;
  piId?: string;
}

export interface PIItem {
  skuId: string;
  qty: number;
  available: number;
  shortfall: number;
  rate: number;
}

export interface PI {
  id: string;
  orderId: string;
  customer: string;
  date: string;
  items: PIItem[];
  status: "Draft" | "Dispatched";
  dispatchedDate?: string;
}

export type LeadStage = "New" | "Contacted" | "Interested" | "Converted" | "Lost";
export type LeadSource = "Instagram" | "Meta" | "Offline" | "Referral";

export interface Lead {
  id: string;
  name: string;
  source: LeadSource;
  phone: string;
  owner: string;
  stage: LeadStage;
  createdAt: string;
  lastContact: string;
  nextAction: string;
  expectedValue: number;
  expectedClose: string;
  notes?: string;
}

export type RepeatStatus = "On track" | "Due soon" | "Overdue";

export interface Customer {
  id: string;
  name: string;
  city: string;
  type: string;
  phone: string;
  lastOrderDate: string;
  lastOrderValue: number;
  reorderDue: string;
  repeatStatus: RepeatStatus;
}

export interface Claim {
  id: string;
  distributorId: string;
  period: string;
  salesValue: number;
  schemeRate: number;
  damageRate: number;
  /** Additional customer discount claimed for reimbursement. */
  discountRate: number;
  amount: number;
  status: "Pending review" | "Approved";
  generatedOn: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
}

export type POStatus =
  | "Issued"
  | "Acknowledged"
  | "In production"
  | "Dispatched"
  | "Partially received"
  | "Received";

export interface POLine {
  id: string;
  itemType: "sku" | "packaging";
  itemId: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  issueDate: string;
  originalDelivery: string;
  revisedDelivery?: string;
  status: POStatus;
  lastUpdated: string;
  owner: string;
  lines: POLine[];
  notes?: string;
}

export interface Receipt {
  id: string;
  poId: string;
  date: string;
  lines: { lineId: string; itemType: "sku" | "packaging"; itemId: string; qty: number }[];
  acceptedBy: string;
}

export interface AppState {
  role: Role;
  skus: SKU[];
  locations: StockLocation[];
  stock: StockRow[];
  movements: Movement[];
  combos: Combo[];
  distributors: Distributor[];
  demoIssues: DemoIssue[];
  packaging: PackagingItem[];
  packagingStock: PackagingStockRow[];
  packagingIssues: PackagingIssue[];
  orders: SalesOrder[];
  pis: PI[];
  claims: Claim[];
  customers: Customer[];
  leads: Lead[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  receipts: Receipt[];
}
