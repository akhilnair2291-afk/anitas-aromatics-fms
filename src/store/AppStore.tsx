import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { addDays, todayISO } from "@/lib/format";
import { createSeedState } from "@/lib/seed";
import { nextId, repeatStatusFor, WAREHOUSE, DEMO_POOL } from "@/lib/selectors";
import type {
  AppState,
  Lead,
  LeadStage,
  POStatus,
  Role,
} from "@/lib/types";

const STORAGE_KEY = "anitas-fms-demo-v1";

export type AppAction =
  | { type: "set-role"; role: Role }
  | { type: "create-pi"; orderId: string }
  | { type: "dispatch-pi"; piId: string }
  | { type: "receive-po"; poId: string; quantities: Record<string, number> }
  | { type: "update-po-status"; poId: string; status: POStatus }
  | { type: "revise-po-date"; poId: string; date: string }
  | { type: "issue-demo"; skuId: string; qty: number; issuedTo: string }
  | { type: "consume-demo"; issueId: string; qty: number }
  | { type: "return-demo"; issueId: string; qty: number }
  | { type: "issue-packaging"; itemId: string; locationId: string; qty: number; purpose: string }
  | { type: "add-lead"; lead: Omit<Lead, "id" | "createdAt"> }
  | { type: "update-lead"; id: string; patch: Partial<Lead> }
  | { type: "advance-lead"; id: string; stage: LeadStage }
  | { type: "import-instagram" }
  | { type: "mark-repeat"; customerId: string }
  | { type: "generate-claim"; distributorId: string; period: string; schemeRate: number; damageRate: number }
  | { type: "approve-claim"; claimId: string }
  | { type: "reset" };

function adjustStock(state: AppState, skuId: string, locationId: string, onHandDelta: number, reservedDelta = 0): AppState {
  const existing = state.stock.find((row) => row.skuId === skuId && row.locationId === locationId);
  if (!existing) {
    return {
      ...state,
      stock: [
        ...state.stock,
        {
          skuId,
          locationId,
          onHand: Math.max(0, onHandDelta),
          reserved: Math.max(0, reservedDelta),
        },
      ],
    };
  }
  return {
    ...state,
    stock: state.stock.map((row) =>
      row === existing
        ? {
            ...row,
            onHand: Math.max(0, row.onHand + onHandDelta),
            reserved: Math.max(0, row.reserved + reservedDelta),
          }
        : row,
    ),
  };
}

function adjustPackaging(state: AppState, itemId: string, locationId: string, delta: number): AppState {
  const existing = state.packagingStock.find(
    (row) => row.itemId === itemId && row.locationId === locationId,
  );
  if (!existing) {
    return {
      ...state,
      packagingStock: [...state.packagingStock, { itemId, locationId, onHand: Math.max(0, delta) }],
    };
  }
  return {
    ...state,
    packagingStock: state.packagingStock.map((row) =>
      row === existing ? { ...row, onHand: Math.max(0, row.onHand + delta) } : row,
    ),
  };
}

function addMovement(
  state: AppState,
  movement: Omit<AppState["movements"][number], "id">,
): AppState {
  const id = nextId("MOV-", state.movements.map((row) => row.id));
  return { ...state, movements: [{ id, ...movement }, ...state.movements] };
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "set-role":
      return { ...state, role: action.role };

    case "create-pi": {
      const order = state.orders.find((row) => row.id === action.orderId);
      if (!order || order.piId) return state;

      const items = order.items.map((item) => {
        const warehouse = state.stock.find(
          (row) => row.skuId === item.skuId && row.locationId === WAREHOUSE,
        );
        const available = Math.min(
          item.qty,
          Math.max(0, (warehouse?.onHand ?? 0) - (warehouse?.reserved ?? 0)),
        );
        return {
          skuId: item.skuId,
          qty: item.qty,
          available,
          shortfall: item.qty - available,
          rate: item.rate,
        };
      });

      const piId = nextId("PI-", state.pis.map((row) => row.id));
      const pi = {
        id: piId,
        orderId: order.id,
        customer: order.customer,
        date: todayISO(),
        items,
        status: "Draft" as const,
      };

      let next = { ...state, pis: [pi, ...state.pis] };
      items.forEach((item) => {
        if (item.available > 0) {
          next = adjustStock(next, item.skuId, WAREHOUSE, 0, item.available);
        }
      });

      const hasShortfall = items.some((item) => item.shortfall > 0);
      const hasAvailable = items.some((item) => item.available > 0);
      const status = !hasShortfall
        ? "PI drafted"
        : hasAvailable
          ? "Partially available"
          : "Backorder";
      next = {
        ...next,
        orders: next.orders.map((row) =>
          row.id === order.id ? { ...row, status, piId } : row,
        ),
      };
      return next;
    }

    case "dispatch-pi": {
      const pi = state.pis.find((row) => row.id === action.piId);
      if (!pi || pi.status === "Dispatched") return state;

      let next: AppState = {
        ...state,
        pis: state.pis.map((row) =>
          row.id === pi.id
            ? { ...row, status: "Dispatched" as const, dispatchedDate: todayISO() }
            : row,
        ),
      };
      const order = state.orders.find((row) => row.id === pi.orderId);

      pi.items.forEach((item) => {
        if (item.available <= 0) return;
        next = adjustStock(next, item.skuId, WAREHOUSE, -item.available, -item.available);
        next = addMovement(next, {
          date: todayISO(),
          type: "Dispatch",
          itemType: "sku",
          itemId: item.skuId,
          from: WAREHOUSE,
          qty: item.available,
          reference: pi.id,
          note: `Dispatched to ${pi.customer}`,
        });
      });

      const shortfall = pi.items.some((item) => item.shortfall > 0);
      if (order) {
        next = {
          ...next,
          orders: next.orders.map((row) =>
            row.id === order.id
              ? { ...row, status: shortfall ? "Backorder" : "Fulfilled" }
              : row,
          ),
        };
      }
      return next;
    }

    case "receive-po": {
      const po = state.purchaseOrders.find((row) => row.id === action.poId);
      if (!po) return state;

      let next = state;
      const receiptLines: AppState["receipts"][number]["lines"] = [];

      po.lines.forEach((line) => {
        const requested = action.quantities[line.id] ?? 0;
        const pending = Math.max(0, line.qtyOrdered - line.qtyReceived);
        const accepted = Math.max(0, Math.min(requested, pending));
        if (accepted <= 0) return;

        if (line.itemType === "sku") {
          next = adjustStock(next, line.itemId, WAREHOUSE, accepted);
        } else {
          next = adjustPackaging(next, line.itemId, WAREHOUSE, accepted);
        }
        next = addMovement(next, {
          date: todayISO(),
          type: "Inward",
          itemType: line.itemType,
          itemId: line.itemId,
          to: WAREHOUSE,
          qty: accepted,
          reference: po.poNumber,
          note: "Accepted goods receipt",
        });
        receiptLines.push({
          lineId: line.id,
          itemType: line.itemType,
          itemId: line.itemId,
          qty: accepted,
        });
      });

      if (receiptLines.length === 0) return state;

      const updatedLines = po.lines.map((line) => {
        const accepted =
          receiptLines.find((entry) => entry.lineId === line.id)?.qty ?? 0;
        return { ...line, qtyReceived: line.qtyReceived + accepted };
      });
      const complete = updatedLines.every((line) => line.qtyReceived >= line.qtyOrdered);

      next = {
        ...next,
        purchaseOrders: next.purchaseOrders.map((row) =>
          row.id === po.id
            ? {
                ...row,
                lines: updatedLines,
                status: complete ? "Received" : "Partially received",
                lastUpdated: todayISO(),
              }
            : row,
        ),
        receipts: [
          {
            id: nextId("RCP-", next.receipts.map((row) => row.id)),
            poId: po.id,
            date: todayISO(),
            acceptedBy: "Warehouse team",
            lines: receiptLines,
          },
          ...next.receipts,
        ],
      };
      return next;
    }

    case "update-po-status":
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.map((po) =>
          po.id === action.poId
            ? { ...po, status: action.status, lastUpdated: todayISO() }
            : po,
        ),
      };

    case "revise-po-date":
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.map((po) =>
          po.id === action.poId
            ? { ...po, revisedDelivery: action.date, lastUpdated: todayISO() }
            : po,
        ),
      };

    case "issue-demo": {
      const atWarehouse = state.stock.find(
        (row) => row.skuId === action.skuId && row.locationId === WAREHOUSE,
      )?.onHand ?? 0;
      const qty = Math.min(action.qty, atWarehouse);
      if (qty <= 0) return state;

      const issueId = nextId("DM-", state.demoIssues.map((row) => row.id));
      let next = adjustStock(state, action.skuId, WAREHOUSE, -qty);
      next = adjustStock(next, action.skuId, DEMO_POOL, qty);
      next = addMovement(next, {
        date: todayISO(),
        type: "Demo issue",
        itemType: "sku",
        itemId: action.skuId,
        from: WAREHOUSE,
        to: DEMO_POOL,
        qty,
        reference: issueId,
        note: action.issuedTo,
      });
      return {
        ...next,
        demoIssues: [
          {
            id: issueId,
            date: todayISO(),
            skuId: action.skuId,
            issuedTo: action.issuedTo,
            qtyIssued: qty,
            qtyConsumed: 0,
            qtyReturned: 0,
            status: "Outstanding",
          },
          ...next.demoIssues,
        ],
      };
    }

    case "consume-demo": {
      const issue = state.demoIssues.find((row) => row.id === action.issueId);
      if (!issue) return state;
      const outstanding = Math.max(
        0,
        issue.qtyIssued - issue.qtyConsumed - issue.qtyReturned,
      );
      const qty = Math.min(action.qty, outstanding);
      if (qty <= 0) return state;

      let next = adjustStock(state, issue.skuId, DEMO_POOL, -qty);
      next = {
        ...next,
        demoIssues: next.demoIssues.map((row) => {
          if (row.id !== issue.id) return row;
          const qtyConsumed = row.qtyConsumed + qty;
          const closed = qtyConsumed + row.qtyReturned >= row.qtyIssued;
          return { ...row, qtyConsumed, status: closed ? "Closed" : "Outstanding" };
        }),
      };
      return addMovement(next, {
        date: todayISO(),
        type: "Consumption",
        itemType: "sku",
        itemId: issue.skuId,
        from: DEMO_POOL,
        qty,
        reference: issue.id,
        note: "Demo consumed",
      });
    }

    case "return-demo": {
      const issue = state.demoIssues.find((row) => row.id === action.issueId);
      if (!issue) return state;
      const outstanding = Math.max(
        0,
        issue.qtyIssued - issue.qtyConsumed - issue.qtyReturned,
      );
      const qty = Math.min(action.qty, outstanding);
      if (qty <= 0) return state;

      let next = adjustStock(state, issue.skuId, DEMO_POOL, -qty);
      next = adjustStock(next, issue.skuId, WAREHOUSE, qty);
      next = {
        ...next,
        demoIssues: next.demoIssues.map((row) => {
          if (row.id !== issue.id) return row;
          const qtyReturned = row.qtyReturned + qty;
          const closed = row.qtyConsumed + qtyReturned >= row.qtyIssued;
          return { ...row, qtyReturned, status: closed ? "Closed" : "Outstanding" };
        }),
      };
      return addMovement(next, {
        date: todayISO(),
        type: "Demo return",
        itemType: "sku",
        itemId: issue.skuId,
        from: DEMO_POOL,
        to: WAREHOUSE,
        qty,
        reference: issue.id,
        note: "Returned from demo",
      });
    }

    case "issue-packaging": {
      const row = state.packagingStock.find(
        (entry) => entry.itemId === action.itemId && entry.locationId === action.locationId,
      );
      const qty = Math.min(action.qty, row?.onHand ?? 0);
      if (qty <= 0) return state;
      let next = adjustPackaging(state, action.itemId, action.locationId, -qty);
      next = addMovement(next, {
        date: todayISO(),
        type: "Consumption",
        itemType: "packaging",
        itemId: action.itemId,
        from: action.locationId,
        qty,
        reference: action.purpose,
      });
      return {
        ...next,
        packagingIssues: [
          {
            id: nextId("PKI-", next.packagingIssues.map((row) => row.id)),
            date: todayISO(),
            itemId: action.itemId,
            locationId: action.locationId,
            qty,
            purpose: action.purpose,
          },
          ...next.packagingIssues,
        ],
      };
    }

    case "add-lead": {
      const id = nextId("LEAD-", state.leads.map((row) => row.id));
      return {
        ...state,
        leads: [
          {
            ...action.lead,
            id,
            createdAt: todayISO(),
            lastContact: todayISO(),
          },
          ...state.leads,
        ],
      };
    }

    case "update-lead":
      return {
        ...state,
        leads: state.leads.map((lead) =>
          lead.id === action.id ? { ...lead, ...action.patch } : lead,
        ),
      };

    case "advance-lead":
      return {
        ...state,
        leads: state.leads.map((lead) =>
          lead.id === action.id
            ? { ...lead, stage: action.stage, lastContact: todayISO() }
            : lead,
        ),
      };

    case "import-instagram": {
      const imported = state.leads.filter((lead) => lead.source === "Instagram").length;
      const names = ["Tara Wellness", "Nina's Aroma", "Sattva Living", "Aarohi Studio", "Bloom Room"];
      const name = names[imported % names.length];
      const id = nextId("LEAD-", state.leads.map((row) => row.id));
      const owner = imported % 2 === 0 ? "Neha Sharma" : "Rohan Mehta";
      const lead: Lead = {
        id,
        name,
        source: "Instagram",
        phone: "+91 90000 2" + `${imported}`.padStart(4, "0"),
        owner,
        stage: "New",
        createdAt: todayISO(),
        lastContact: todayISO(),
        nextAction: "Send welcome DM and qualify requirement",
        expectedValue: 3_500 + imported * 1_250,
        expectedClose: addDays(todayISO(), 12 + imported * 2),
        notes: "Imported from Instagram lead form.",
      };
      return { ...state, leads: [lead, ...state.leads] };
    }

    case "mark-repeat": {
      const customer = state.customers.find((row) => row.id === action.customerId);
      if (!customer) return state;
      const updated = {
        ...customer,
        lastOrderDate: todayISO(),
        reorderDue: addDays(todayISO(), 45),
        lastOrderValue: customer.lastOrderValue,
      };
      return {
        ...state,
        customers: state.customers.map((row) =>
          row.id === customer.id
            ? { ...updated, repeatStatus: repeatStatusFor(updated) }
            : row,
        ),
      };
    }

    case "generate-claim": {
      const distributor = state.distributors.find(
        (row) => row.locationId === action.distributorId,
      );
      if (!distributor) return state;
      const amount =
        (distributor.salesValue * (action.schemeRate + action.damageRate)) / 100;
      return {
        ...state,
        claims: [
          {
            id: nextId("CLM-", state.claims.map((row) => row.id)),
            distributorId: action.distributorId,
            period: action.period,
            salesValue: distributor.salesValue,
            schemeRate: action.schemeRate,
            damageRate: action.damageRate,
            amount,
            status: "Pending review",
            generatedOn: todayISO(),
          },
          ...state.claims,
        ],
      };
    }

    case "approve-claim":
      return {
        ...state,
        claims: state.claims.map((claim) =>
          claim.id === action.claimId ? { ...claim, status: "Approved" } : claim,
        ),
      };

    case "reset":
      return createSeedState();

    default:
      return state;
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.skus?.length || !parsed.stock?.length) return createSeedState();
    return parsed;
  } catch {
    return createSeedState();
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private browsing; the demo still works in memory.
    }
  }, [state]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch,
      resetDemo: () => {
        localStorage.removeItem(STORAGE_KEY);
        dispatch({ type: "reset" });
      },
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
