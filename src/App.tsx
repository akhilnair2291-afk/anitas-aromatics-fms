import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/base/toast/toast";
import { AppProvider, useApp } from "@/store/AppStore";
import { visiblePages } from "@/lib/selectors";
import type { PageKey } from "@/lib/types";
import { DashboardPage } from "@/pages/Dashboard";
import { InventoryPage } from "@/pages/Inventory";
import { PurchaseOrdersPage } from "@/pages/PurchaseOrders";
import { BillingPage } from "@/pages/Billing";
import { CRMPage } from "@/pages/CRM";
import { RequirementsPage } from "@/pages/Requirements";

function Workspace() {
  const { state } = useApp();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [tab, setTab] = useState("");

  const allowed = visiblePages(state.role) as PageKey[];
  const allowedKey = allowed.join(",");
  const activePage = allowed.includes(page) ? page : allowed[0];

  useEffect(() => {
    if (!allowed.includes(page)) {
      setPage(allowed[0] ?? "dashboard");
      setTab("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedKey, page]);

  const navigate = (next: PageKey, nextTab?: string) => {
    setPage(next);
    setTab(nextTab ?? "");
  };

  return (
    <AppShell page={activePage} onNavigate={(next) => navigate(next)}>
      {activePage === "dashboard" ? (
        <DashboardPage onNavigate={navigate} />
      ) : null}
      {activePage === "inventory" ? (
        <InventoryPage tab={tab} onTabChange={setTab} onNavigate={navigate} />
      ) : null}
      {activePage === "purchase-orders" ? (
        <PurchaseOrdersPage tab={tab} onTabChange={setTab} />
      ) : null}
      {activePage === "billing" ? (
        <BillingPage tab={tab} onTabChange={setTab} />
      ) : null}
      {activePage === "crm" ? (
        <CRMPage tab={tab} onTabChange={setTab} />
      ) : null}
      {activePage === "requirements" ? (
        <RequirementsPage onNavigate={navigate} />
      ) : null}
    </AppShell>
  );
}

function App() {
  return (
    <AppProvider>
      <Workspace />
      <Toaster />
    </AppProvider>
  );
}

export default App;
