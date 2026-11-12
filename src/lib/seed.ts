import { daysAgo, daysAhead, todayISO } from "@/lib/format";
import type {
  AppState,
  Claim,
  Combo,
  Customer,
  DemoIssue,
  Distributor,
  Lead,
  Movement,
  PackagingIssue,
  PackagingItem,
  PackagingStockRow,
  PI,
  PurchaseOrder,
  SalesOrder,
  SKU,
  StockLocation,
  StockRow,
  Vendor,
} from "@/lib/types";

const skus: SKU[] = [
  { id: "SKU-POT-100", name: "Potli Oil 100ml", category: "Wellness", unit: "bottle", price: 899, cost: 380, reorderLevel: 40 },
  { id: "SKU-AYU-60", name: "Ayurasa Tablets 60ct", category: "Wellness", unit: "jar", price: 649, cost: 270, reorderLevel: 35 },
  { id: "SKU-CAN-SAN", name: "Sandal Soy Candle", category: "Home", unit: "jar", price: 749, cost: 310, reorderLevel: 30 },
  { id: "SKU-KIT-STR", name: "Starter Aroma Kit", category: "Gifting", unit: "kit", price: 1499, cost: 640, reorderLevel: 20 },
  { id: "SKU-BB-ROS", name: "Rose Bath Bomb", category: "Spa", unit: "piece", price: 349, cost: 120, reorderLevel: 50 },
  { id: "SKU-BB-LAV", name: "Lavender Bath Bomb", category: "Spa", unit: "piece", price: 349, cost: 120, reorderLevel: 50 },
  { id: "SKU-CBW-200", name: "Cocktail Body Wash 200ml", category: "Spa", unit: "bottle", price: 599, cost: 240, reorderLevel: 40 },
  { id: "SKU-PRR-50", name: "Pain Relief Roll-on 50ml", category: "Wellness", unit: "piece", price: 499, cost: 190, reorderLevel: 30 },
  { id: "SKU-HGS-100", name: "Hair Growth Serum 100ml", category: "Hair", unit: "bottle", price: 799, cost: 330, reorderLevel: 25 },
  { id: "SKU-LIP-MIN", name: "Mint Lip Balm", category: "Skin", unit: "piece", price: 249, cost: 90, reorderLevel: 60 },
  { id: "SKU-DIF-250", name: "Diffuser Refill 250ml", category: "Home", unit: "bottle", price: 699, cost: 280, reorderLevel: 25 },
  { id: "SKU-GBX-L", name: "Ritual Gift Box", category: "Gifting", unit: "box", price: 2199, cost: 980, reorderLevel: 15 },
];

const locations: StockLocation[] = [
  { id: "WH-01", name: "Vasai Warehouse", city: "Vasai", type: "warehouse", channel: "Offline" },
  { id: "PRD-01", name: "Vasai Production", city: "Vasai", type: "production", channel: "Production" },
  { id: "OFF-01", name: "Mumbai Office", city: "Mumbai", type: "office", channel: "Office" },
  { id: "DIST-01", name: "Wellness Distributors", city: "Pune", type: "distributor", channel: "Distributor" },
  { id: "DIST-02", name: "Aroma Retail", city: "Nagpur", type: "distributor", channel: "Distributor" },
  { id: "ONL-AMZ", name: "Amazon Fulfilment", city: "Bhiwandi", type: "online", channel: "Amazon" },
  { id: "ONL-FLK", name: "Flipkart Fulfilment", city: "Bhiwandi", type: "online", channel: "Flipkart" },
  { id: "DEMO-01", name: "Demo & Trainer Pool", city: "Field", type: "demo", channel: "Demo" },
];

function stock(skuId: string, locationId: string, onHand: number, reserved = 0): StockRow {
  return { skuId, locationId, onHand, reserved };
}

const stockRows: StockRow[] = [
  // Vasai warehouse — the saleable pool
  stock("SKU-POT-100", "WH-01", 120),
  stock("SKU-AYU-60", "WH-01", 64),
  stock("SKU-CAN-SAN", "WH-01", 58),
  stock("SKU-KIT-STR", "WH-01", 42),
  stock("SKU-BB-ROS", "WH-01", 210, 35),
  stock("SKU-BB-LAV", "WH-01", 185),
  stock("SKU-CBW-200", "WH-01", 76, 20),
  stock("SKU-PRR-50", "WH-01", 88),
  stock("SKU-HGS-100", "WH-01", 54),
  stock("SKU-LIP-MIN", "WH-01", 240),
  stock("SKU-DIF-250", "WH-01", 38),
  stock("SKU-GBX-L", "WH-01", 26),
  // Production
  stock("SKU-POT-100", "PRD-01", 40),
  stock("SKU-AYU-60", "PRD-01", 30),
  stock("SKU-BB-ROS", "PRD-01", 120),
  stock("SKU-BB-LAV", "PRD-01", 100),
  stock("SKU-CBW-200", "PRD-01", 45),
  stock("SKU-LIP-MIN", "PRD-01", 150),
  // Distributors
  stock("SKU-POT-100", "DIST-01", 24),
  stock("SKU-AYU-60", "DIST-01", 18),
  stock("SKU-BB-ROS", "DIST-01", 60),
  stock("SKU-BB-LAV", "DIST-01", 42),
  stock("SKU-CBW-200", "DIST-01", 30),
  stock("SKU-CAN-SAN", "DIST-02", 20),
  stock("SKU-KIT-STR", "DIST-02", 12),
  stock("SKU-POT-100", "DIST-02", 10),
  stock("SKU-DIF-250", "DIST-02", 15),
  // Online channels
  stock("SKU-POT-100", "ONL-AMZ", 18),
  stock("SKU-CAN-SAN", "ONL-AMZ", 22),
  stock("SKU-KIT-STR", "ONL-AMZ", 10),
  stock("SKU-HGS-100", "ONL-AMZ", 12),
  stock("SKU-LIP-MIN", "ONL-AMZ", 60),
  stock("SKU-GBX-L", "ONL-AMZ", 8),
  stock("SKU-AYU-60", "ONL-FLK", 15),
  stock("SKU-BB-ROS", "ONL-FLK", 35),
  stock("SKU-BB-LAV", "ONL-FLK", 30),
  stock("SKU-CBW-200", "ONL-FLK", 18),
  stock("SKU-PRR-50", "ONL-FLK", 20),
  stock("SKU-DIF-250", "ONL-FLK", 10),
  // Demo pool — equals outstanding demo quantities below
  stock("SKU-POT-100", "DEMO-01", 3),
  stock("SKU-AYU-60", "DEMO-01", 2),
  stock("SKU-CAN-SAN", "DEMO-01", 2),
  stock("SKU-KIT-STR", "DEMO-01", 1),
  stock("SKU-BB-ROS", "DEMO-01", 3),
  stock("SKU-CBW-200", "DEMO-01", 2),
];

const combos: Combo[] = [
  {
    id: "CMB-WELL",
    name: "Potli + Ayurasa Duo",
    price: 1399,
    components: [
      { skuId: "SKU-POT-100", qty: 1 },
      { skuId: "SKU-AYU-60", qty: 1 },
    ],
  },
  {
    id: "CMB-CALM",
    name: "Candle + Kit Calm Evening",
    price: 1999,
    components: [
      { skuId: "SKU-CAN-SAN", qty: 1 },
      { skuId: "SKU-KIT-STR", qty: 1 },
    ],
  },
  {
    id: "CMB-SPA",
    name: "Bath Bomb + Cocktail Spa Set",
    price: 849,
    components: [
      { skuId: "SKU-BB-ROS", qty: 1 },
      { skuId: "SKU-CBW-200", qty: 1 },
    ],
  },
  {
    id: "CMB-RITUAL",
    name: "Complete Ritual Box",
    price: 2399,
    components: [
      { skuId: "SKU-POT-100", qty: 1 },
      { skuId: "SKU-CAN-SAN", qty: 2 },
      { skuId: "SKU-BB-LAV", qty: 1 },
      { skuId: "SKU-CBW-200", qty: 1 },
    ],
  },
];

const distributors: Distributor[] = [
  {
    locationId: "DIST-01",
    id: "DIST-01",
    name: "Wellness Distributors",
    city: "Pune",
    contact: "Rahul Deshmukh",
    soldQty: 186,
    returnedQty: 7,
    schemeRate: 5,
    damageRate: 1.5,
    salesValue: 248_000,
  },
  {
    locationId: "DIST-02",
    id: "DIST-02",
    name: "Aroma Retail",
    city: "Nagpur",
    contact: "Shalini Kale",
    soldQty: 96,
    returnedQty: 3,
    schemeRate: 4,
    damageRate: 1,
    salesValue: 132_000,
  },
];

const demoIssues: DemoIssue[] = [
  { id: "DM-201", date: daysAgo(14), skuId: "SKU-POT-100", issuedTo: "Riya Sharma (Trainer)", qtyIssued: 4, qtyConsumed: 1, qtyReturned: 0, status: "Outstanding" },
  { id: "DM-202", date: daysAgo(10), skuId: "SKU-AYU-60", issuedTo: "Staff sampling", qtyIssued: 3, qtyConsumed: 1, qtyReturned: 0, status: "Outstanding" },
  { id: "DM-203", date: daysAgo(6), skuId: "SKU-CAN-SAN", issuedTo: "Meera Kapoor (customer trial)", qtyIssued: 2, qtyConsumed: 0, qtyReturned: 0, status: "Outstanding" },
  { id: "DM-204", date: daysAgo(5), skuId: "SKU-KIT-STR", issuedTo: "Trainer workshop", qtyIssued: 2, qtyConsumed: 1, qtyReturned: 0, status: "Outstanding" },
  { id: "DM-205", date: daysAgo(4), skuId: "SKU-BB-ROS", issuedTo: "Soukya Spa demo", qtyIssued: 3, qtyConsumed: 0, qtyReturned: 0, status: "Outstanding" },
  { id: "DM-206", date: daysAgo(3), skuId: "SKU-CBW-200", issuedTo: "Trainer kit", qtyIssued: 2, qtyConsumed: 0, qtyReturned: 0, status: "Outstanding" },
];

const packaging: PackagingItem[] = [
  { id: "PKG-BOX-S", name: "Mailer Box — Small", unit: "pcs", cost: 12, reorderLevel: 300 },
  { id: "PKG-BOX-M", name: "Mailer Box — Medium", unit: "pcs", cost: 18, reorderLevel: 200 },
  { id: "PKG-WRAP", name: "Gift Wrap Sheet", unit: "pcs", cost: 8, reorderLevel: 400 },
  { id: "PKG-RIB", name: "Ribbon — Gold", unit: "pcs", cost: 15, reorderLevel: 200 },
  { id: "PKG-POUCH", name: "Bubble Pouch", unit: "pcs", cost: 6, reorderLevel: 500 },
  { id: "PKG-CARD", name: "Thank You Card", unit: "pcs", cost: 3, reorderLevel: 500 },
  { id: "PKG-BAG", name: "Paper Bag — Small", unit: "pcs", cost: 10, reorderLevel: 250 },
  { id: "PKG-TISSUE", name: "Tissue Paper", unit: "pcs", cost: 2, reorderLevel: 1000 },
];

const packagingStock: PackagingStockRow[] = [
  { itemId: "PKG-BOX-S", locationId: "WH-01", onHand: 850 },
  { itemId: "PKG-BOX-S", locationId: "PRD-01", onHand: 300 },
  { itemId: "PKG-BOX-S", locationId: "OFF-01", onHand: 120 },
  { itemId: "PKG-BOX-M", locationId: "WH-01", onHand: 420 },
  { itemId: "PKG-BOX-M", locationId: "PRD-01", onHand: 150 },
  { itemId: "PKG-BOX-M", locationId: "OFF-01", onHand: 60 },
  { itemId: "PKG-WRAP", locationId: "WH-01", onHand: 1200 },
  { itemId: "PKG-WRAP", locationId: "OFF-01", onHand: 40 },
  { itemId: "PKG-RIB", locationId: "WH-01", onHand: 640 },
  { itemId: "PKG-RIB", locationId: "OFF-01", onHand: 25 },
  { itemId: "PKG-POUCH", locationId: "WH-01", onHand: 980 },
  { itemId: "PKG-POUCH", locationId: "PRD-01", onHand: 200 },
  { itemId: "PKG-POUCH", locationId: "OFF-01", onHand: 80 },
  { itemId: "PKG-CARD", locationId: "WH-01", onHand: 1500 },
  { itemId: "PKG-CARD", locationId: "OFF-01", onHand: 200 },
  { itemId: "PKG-BAG", locationId: "WH-01", onHand: 310 },
  { itemId: "PKG-BAG", locationId: "OFF-01", onHand: 90 },
  { itemId: "PKG-TISSUE", locationId: "WH-01", onHand: 600 },
  { itemId: "PKG-TISSUE", locationId: "OFF-01", onHand: 150 },
];

const packagingIssues: PackagingIssue[] = [
  { id: "PKI-301", date: daysAgo(6), itemId: "PKG-BOX-S", locationId: "OFF-01", qty: 40, purpose: "Office order packing" },
  { id: "PKI-302", date: daysAgo(5), itemId: "PKG-CARD", locationId: "OFF-01", qty: 20, purpose: "Thank-you cards for dispatches" },
  { id: "PKI-303", date: daysAgo(4), itemId: "PKG-POUCH", locationId: "OFF-01", qty: 30, purpose: "Sample dispatch" },
  { id: "PKI-304", date: daysAgo(2), itemId: "PKG-BOX-M", locationId: "PRD-01", qty: 45, purpose: "Production packing" },
  { id: "PKI-305", date: daysAgo(1), itemId: "PKG-WRAP", locationId: "WH-01", qty: 60, purpose: "Gift orders" },
];

const movements: Movement[] = [
  { id: "MOV-1001", date: daysAgo(7), type: "Wastage", itemType: "sku", itemId: "SKU-BB-LAV", from: "WH-01", qty: 5, reference: "WASTE-07", note: "Damaged in handling" },
  { id: "MOV-1002", date: daysAgo(6), type: "Dispatch", itemType: "sku", itemId: "SKU-CBW-200", from: "WH-01", to: "ONL-FLK", qty: 12, reference: "ORD-1039", note: "Flipkart replenishment" },
  { id: "MOV-1003", date: daysAgo(5), type: "Demo issue", itemType: "sku", itemId: "SKU-POT-100", from: "WH-01", to: "DEMO-01", qty: 2, reference: "DM-207" },
  { id: "MOV-1004", date: daysAgo(4), type: "Return", itemType: "sku", itemId: "SKU-KIT-STR", from: "DIST-02", to: "WH-01", qty: 3, reference: "RET-22", note: "Unsold stock returned" },
  { id: "MOV-1005", date: daysAgo(3), type: "Dispatch", itemType: "sku", itemId: "SKU-CAN-SAN", from: "WH-01", to: "DIST-02", qty: 8, reference: "ORD-1040" },
  { id: "MOV-1006", date: daysAgo(3), type: "Dispatch", itemType: "sku", itemId: "SKU-HGS-100", from: "WH-01", qty: 2, reference: "ORD-1047", note: "Repeat order — Radhika Nair" },
  { id: "MOV-1007", date: daysAgo(2), type: "Inward", itemType: "packaging", itemId: "PKG-BOX-S", to: "WH-01", qty: 600, reference: "RCP-01", note: "PO-2026-042 partial receipt" },
  { id: "MOV-1008", date: daysAgo(1), type: "Dispatch", itemType: "sku", itemId: "SKU-BB-ROS", from: "WH-01", to: "DIST-01", qty: 10, reference: "ORD-1041" },
  { id: "MOV-1009", date: daysAgo(1), type: "Dispatch", itemType: "sku", itemId: "SKU-POT-100", from: "WH-01", to: "DIST-01", qty: 15, reference: "ORD-1041" },
  { id: "MOV-1010", date: todayISO(), type: "Dispatch", itemType: "sku", itemId: "SKU-HGS-100", from: "WH-01", to: "ONL-AMZ", qty: 6, reference: "ORD-1048" },
];

const orders: SalesOrder[] = [
  {
    id: "ORD-1042",
    customer: "Glow Retail",
    channel: "Website",
    date: daysAgo(3),
    salesperson: "Neha Sharma",
    status: "Open",
    items: [
      { skuId: "SKU-POT-100", qty: 12, rate: 899 },
      { skuId: "SKU-AYU-60", qty: 8, rate: 649 },
    ],
  },
  {
    id: "ORD-1043",
    customer: "Wellness Distributors",
    channel: "Distributor",
    date: daysAgo(2),
    salesperson: "Rohan Mehta",
    status: "Open",
    items: [
      { skuId: "SKU-BB-ROS", qty: 40, rate: 314 },
      { skuId: "SKU-BB-LAV", qty: 30, rate: 314 },
      { skuId: "SKU-CBW-200", qty: 20, rate: 539 },
    ],
  },
  {
    id: "ORD-1044",
    customer: "Aroma Retail",
    channel: "Distributor",
    date: daysAgo(5),
    salesperson: "Rohan Mehta",
    status: "PI drafted",
    piId: "PI-2081",
    items: [
      { skuId: "SKU-CAN-SAN", qty: 25, rate: 674 },
      { skuId: "SKU-KIT-STR", qty: 10, rate: 1349 },
    ],
  },
  {
    id: "ORD-1045",
    customer: "Meera Kapoor",
    channel: "Instagram",
    date: daysAgo(1),
    salesperson: "Neha Sharma",
    status: "Open",
    items: [
      { skuId: "SKU-POT-100", qty: 2, rate: 899 },
      { skuId: "SKU-LIP-MIN", qty: 3, rate: 249 },
    ],
  },
  {
    id: "ORD-1046",
    customer: "Soukya Spa",
    channel: "B2B",
    date: daysAgo(7),
    salesperson: "Rohan Mehta",
    status: "Partially available",
    piId: "PI-2082",
    items: [
      { skuId: "SKU-CBW-200", qty: 50, rate: 539 },
      { skuId: "SKU-BB-ROS", qty: 50, rate: 314 },
    ],
  },
  {
    id: "ORD-1047",
    customer: "Radhika Nair",
    channel: "Website",
    date: daysAgo(3),
    salesperson: "Neha Sharma",
    status: "Fulfilled",
    items: [{ skuId: "SKU-HGS-100", qty: 2, rate: 799 }],
  },
];

const pis: PI[] = [
  {
    id: "PI-2081",
    orderId: "ORD-1044",
    customer: "Aroma Retail",
    date: daysAgo(4),
    status: "Draft",
    items: [
      { skuId: "SKU-CAN-SAN", qty: 25, available: 25, shortfall: 0, rate: 674 },
      { skuId: "SKU-KIT-STR", qty: 10, available: 10, shortfall: 0, rate: 1349 },
    ],
  },
  {
    id: "PI-2082",
    orderId: "ORD-1046",
    customer: "Soukya Spa",
    date: daysAgo(6),
    status: "Draft",
    items: [
      { skuId: "SKU-CBW-200", qty: 50, available: 20, shortfall: 30, rate: 539 },
      { skuId: "SKU-BB-ROS", qty: 50, available: 35, shortfall: 15, rate: 314 },
    ],
  },
];

const claims: Claim[] = [
  {
    id: "CLM-501",
    distributorId: "DIST-01",
    period: "October 2026",
    salesValue: 248_000,
    schemeRate: 5,
    damageRate: 1.5,
    amount: 16_120,
    status: "Pending review",
    generatedOn: daysAgo(9),
  },
  {
    id: "CLM-502",
    distributorId: "DIST-02",
    period: "October 2026",
    salesValue: 132_000,
    schemeRate: 4,
    damageRate: 1,
    amount: 6_600,
    status: "Approved",
    generatedOn: daysAgo(12),
  },
];

const customers: Customer[] = [
  { id: "CUST-01", name: "Meera Kapoor", city: "Mumbai", type: "Retail", phone: "+91 98200 11223", lastOrderDate: daysAgo(54), lastOrderValue: 4_200, reorderDue: daysAhead(7), repeatStatus: "Due soon" },
  { id: "CUST-02", name: "Radhika Nair", city: "Bengaluru", type: "Retail", phone: "+91 98450 33445", lastOrderDate: daysAgo(40), lastOrderValue: 2_850, reorderDue: daysAhead(21), repeatStatus: "On track" },
  { id: "CUST-03", name: "Soukya Spa", city: "Hyderabad", type: "B2B", phone: "+91 90000 55667", lastOrderDate: daysAgo(73), lastOrderValue: 86_500, reorderDue: daysAgo(12), repeatStatus: "Overdue" },
  { id: "CUST-04", name: "Glow Retail", city: "Delhi", type: "Distributor", phone: "+91 98110 77889", lastOrderDate: daysAgo(22), lastOrderValue: 124_000, reorderDue: daysAhead(9), repeatStatus: "Due soon" },
  { id: "CUST-05", name: "Ananya Iyer", city: "Chennai", type: "Retail", phone: "+91 98840 99001", lastOrderDate: daysAgo(10), lastOrderValue: 1_500, reorderDue: daysAhead(20), repeatStatus: "On track" },
];

const leads: Lead[] = [
  { id: "LEAD-101", name: "Priya Menon", source: "Instagram", phone: "+91 98330 12001", owner: "Neha Sharma", stage: "New", createdAt: daysAgo(1), lastContact: daysAgo(1), nextAction: "Send welcome DM with catalogue", expectedValue: 4_500, expectedClose: daysAhead(9) },
  { id: "LEAD-102", name: "Aisha Khan", source: "Instagram", phone: "+91 98200 12002", owner: "Rohan Mehta", stage: "Contacted", createdAt: daysAgo(4), lastContact: daysAgo(2), nextAction: "Follow up on product shortlist", expectedValue: 6_200, expectedClose: daysAhead(14) },
  { id: "LEAD-103", name: "Kavya Rao", source: "Meta", phone: "+91 99010 12003", owner: "Neha Sharma", stage: "Interested", createdAt: daysAgo(8), lastContact: daysAgo(1), nextAction: "Share bulk pricing", expectedValue: 12_000, expectedClose: daysAhead(24) },
  { id: "LEAD-104", name: "Sunita's Studio", source: "Offline", phone: "+91 98190 12004", owner: "Rohan Mehta", stage: "Interested", createdAt: daysAgo(12), lastContact: daysAgo(3), nextAction: "Studio visit scheduled", expectedValue: 35_000, expectedClose: daysAhead(17) },
  { id: "LEAD-105", name: "Veda Wellness", source: "Referral", phone: "+91 98220 12005", owner: "Neha Sharma", stage: "Converted", createdAt: daysAgo(35), lastContact: daysAgo(9), nextAction: "Onboarding call complete", expectedValue: 48_000, expectedClose: daysAgo(9) },
  { id: "LEAD-106", name: "Pure Roots", source: "Offline", phone: "+91 98330 12006", owner: "Rohan Mehta", stage: "Lost", createdAt: daysAgo(28), lastContact: daysAgo(17), nextAction: "Revisit next quarter", expectedValue: 8_000, expectedClose: daysAgo(17) },
  { id: "LEAD-107", name: "Nalini Spa", source: "Instagram", phone: "+91 98900 12007", owner: "Neha Sharma", stage: "New", createdAt: daysAgo(2), lastContact: daysAgo(2), nextAction: "Qualify requirement", expectedValue: 9_500, expectedClose: daysAhead(29) },
  { id: "LEAD-108", name: "Bloom & Co", source: "Meta", phone: "+91 99200 12008", owner: "Rohan Mehta", stage: "Contacted", createdAt: daysAgo(6), lastContact: daysAgo(1), nextAction: "Send sample kit", expectedValue: 15_000, expectedClose: daysAhead(34) },
];

const vendors: Vendor[] = [
  { id: "VEN-01", name: "Sunrise Naturals", category: "Oils & herbs", contact: "Mahesh Patil" },
  { id: "VEN-02", name: "PackRight Industries", category: "Packaging", contact: "Farah Sheikh" },
  { id: "VEN-03", name: "Aroma Chem Labs", category: "Fragrance & formulations", contact: "Dr. Iyer" },
  { id: "VEN-04", name: "Deccan Glassworks", category: "Bottles & jars", contact: "Sandeep Rao" },
];

const purchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-2026-041",
    poNumber: "PO-2026-041",
    vendorId: "VEN-01",
    issueDate: daysAgo(28),
    originalDelivery: daysAgo(6),
    revisedDelivery: daysAhead(3),
    status: "In production",
    lastUpdated: daysAgo(2),
    owner: "Neha Sharma",
    notes: "Vendor requested a short extension for the Ayurasa batch.",
    lines: [
      { id: "POL-411", itemType: "sku", itemId: "SKU-POT-100", qtyOrdered: 500, qtyReceived: 0, unitCost: 380 },
      { id: "POL-412", itemType: "sku", itemId: "SKU-AYU-60", qtyOrdered: 300, qtyReceived: 0, unitCost: 270 },
    ],
  },
  {
    id: "PO-2026-042",
    poNumber: "PO-2026-042",
    vendorId: "VEN-02",
    issueDate: daysAgo(22),
    originalDelivery: daysAgo(12),
    revisedDelivery: daysAgo(3),
    status: "Partially received",
    lastUpdated: daysAgo(2),
    owner: "Rohan Mehta",
    notes: "Small mailer boxes received; medium boxes still pending.",
    lines: [
      { id: "POL-421", itemType: "packaging", itemId: "PKG-BOX-S", qtyOrdered: 1_000, qtyReceived: 600, unitCost: 12 },
      { id: "POL-422", itemType: "packaging", itemId: "PKG-BOX-M", qtyOrdered: 600, qtyReceived: 0, unitCost: 18 },
    ],
  },
  {
    id: "PO-2026-043",
    poNumber: "PO-2026-043",
    vendorId: "VEN-03",
    issueDate: daysAgo(14),
    originalDelivery: daysAhead(7),
    status: "Acknowledged",
    lastUpdated: daysAgo(3),
    owner: "Neha Sharma",
    lines: [
      { id: "POL-431", itemType: "sku", itemId: "SKU-DIF-250", qtyOrdered: 200, qtyReceived: 0, unitCost: 280 },
      { id: "POL-432", itemType: "sku", itemId: "SKU-HGS-100", qtyOrdered: 150, qtyReceived: 0, unitCost: 330 },
    ],
  },
  {
    id: "PO-2026-044",
    poNumber: "PO-2026-044",
    vendorId: "VEN-04",
    issueDate: daysAgo(42),
    originalDelivery: daysAgo(17),
    status: "Received",
    lastUpdated: daysAgo(20),
    owner: "Rohan Mehta",
    lines: [
      { id: "POL-441", itemType: "packaging", itemId: "PKG-BAG", qtyOrdered: 2_000, qtyReceived: 2_000, unitCost: 10 },
      { id: "POL-442", itemType: "packaging", itemId: "PKG-CARD", qtyOrdered: 3_000, qtyReceived: 3_000, unitCost: 3 },
    ],
  },
  {
    id: "PO-2026-045",
    poNumber: "PO-2026-045",
    vendorId: "VEN-01",
    issueDate: daysAgo(9),
    originalDelivery: daysAhead(1),
    status: "Issued",
    lastUpdated: daysAgo(9),
    owner: "Neha Sharma",
    notes: "Awaiting vendor acknowledgement.",
    lines: [{ id: "POL-451", itemType: "sku", itemId: "SKU-PRR-50", qtyOrdered: 400, qtyReceived: 0, unitCost: 190 }],
  },
  {
    id: "PO-2026-046",
    poNumber: "PO-2026-046",
    vendorId: "VEN-02",
    issueDate: daysAgo(5),
    originalDelivery: daysAhead(9),
    status: "Dispatched",
    lastUpdated: daysAgo(1),
    owner: "Rohan Mehta",
    lines: [
      { id: "POL-461", itemType: "packaging", itemId: "PKG-WRAP", qtyOrdered: 2_000, qtyReceived: 0, unitCost: 8 },
      { id: "POL-462", itemType: "packaging", itemId: "PKG-RIB", qtyOrdered: 1_000, qtyReceived: 0, unitCost: 15 },
    ],
  },
  {
    id: "PO-2026-047",
    poNumber: "PO-2026-047",
    vendorId: "VEN-03",
    issueDate: daysAgo(47),
    originalDelivery: daysAgo(22),
    revisedDelivery: daysAgo(12),
    status: "Acknowledged",
    lastUpdated: daysAgo(15),
    owner: "Neha Sharma",
    notes: "Second revised date missed — escalate to vendor.",
    lines: [{ id: "POL-471", itemType: "sku", itemId: "SKU-LIP-MIN", qtyOrdered: 600, qtyReceived: 0, unitCost: 90 }],
  },
];

export function createSeedState(): AppState {
  return {
    role: "Admin",
    skus,
    locations,
    stock: stockRows.map((row) => ({ ...row })),
    movements: movements.map((row) => ({ ...row })),
    combos,
    distributors: distributors.map((row) => ({ ...row })),
    demoIssues: demoIssues.map((row) => ({ ...row })),
    packaging,
    packagingStock: packagingStock.map((row) => ({ ...row })),
    packagingIssues: packagingIssues.map((row) => ({ ...row })),
    orders: orders.map((row) => ({ ...row, items: row.items.map((item) => ({ ...item })) })),
    pis: pis.map((row) => ({ ...row, items: row.items.map((item) => ({ ...item })) })),
    claims: claims.map((row) => ({ ...row })),
    customers: customers.map((row) => ({ ...row })),
    leads: leads.map((row) => ({ ...row })),
    vendors,
    purchaseOrders: purchaseOrders.map((row) => ({
      ...row,
      lines: row.lines.map((line) => ({ ...line })),
    })),
    receipts: [
      {
        id: "RCP-01",
        poId: "PO-2026-042",
        date: daysAgo(2),
        acceptedBy: "Warehouse team",
        lines: [{ lineId: "POL-421", itemType: "packaging", itemId: "PKG-BOX-S", qty: 600 }],
      },
      {
        id: "RCP-02",
        poId: "PO-2026-044",
        date: daysAgo(20),
        acceptedBy: "Warehouse team",
        lines: [
          { lineId: "POL-441", itemType: "packaging", itemId: "PKG-BAG", qty: 2_000 },
          { lineId: "POL-442", itemType: "packaging", itemId: "PKG-CARD", qty: 3_000 },
        ],
      },
    ],
  };
}
