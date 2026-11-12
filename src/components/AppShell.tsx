import { useState, type ComponentType, type ReactNode } from "react";
import {
  RiArrowRightSLine,
  RiCheckboxMultipleLine,
  RiContactsBook3Line,
  RiDashboardLine,
  RiFileList3Line,
  RiLeafLine,
  RiLogoutBoxRLine,
  RiRestartLine,
  RiStackLine,
  RiTruckLine,
} from "@remixicon/react";
import { AlertDialog } from "@/components/base/modal/modal";
import { Select, SelectItem } from "@/components/base/select/select";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { Badge } from "@/components/base/badges/badge";
import { Button } from "@/components/base/buttons/button";
import { useApp } from "@/store/AppStore";
import { cx } from "@/utils/cx";
import {
  poFollowUp,
  poIsOverdue,
  visiblePages,
} from "@/lib/selectors";
import type { PageKey, Role } from "@/lib/types";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

const NAV: { key: PageKey; label: string; icon: IconComponent }[] = [
  { key: "dashboard", label: "Overview", icon: RiDashboardLine },
  { key: "inventory", label: "Inventory", icon: RiStackLine },
  { key: "purchase-orders", label: "Purchase orders", icon: RiTruckLine },
  { key: "billing", label: "Billing", icon: RiFileList3Line },
  { key: "crm", label: "CRM", icon: RiContactsBook3Line },
  { key: "requirements", label: "Requirements", icon: RiCheckboxMultipleLine },
];

const ROLES: Role[] = ["Admin", "Sales", "Warehouse", "Trainer"];

const PAGE_TITLES: Record<PageKey, string> = {
  dashboard: "Overview",
  inventory: "Inventory",
  "purchase-orders": "Purchase orders",
  billing: "Billing",
  crm: "CRM",
  requirements: "Requirements",
};

function NavItem({
  label,
  icon: Icon,
  selected,
  badge,
  onClick,
}: {
  label: string;
  icon: IconComponent;
  selected: boolean;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "page" : undefined}
      className={cx(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-2lg p-2 text-start transition-colors duration-150",
        selected
          ? "bg-linear-to-b from-accent-500 to-accent-600 shadow-nav-selected"
          : "hover:bg-background-secondary-hover",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon
          className={cx(
            "size-5 shrink-0",
            selected ? "text-white" : "text-foreground-icon-secondary",
          )}
          aria-hidden
        />
        <span
          className={cx(
            "truncate text-body-medium",
            selected ? "text-white" : "text-text-secondary",
          )}
        >
          {label}
        </span>
      </span>
      {badge}
    </button>
  );
}

export function AppShell({
  page,
  onNavigate,
  children,
}: {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}) {
  const { state, dispatch, resetDemo } = useApp();
  const [resetOpen, setResetOpen] = useState(false);
  const allowed = visiblePages(state.role);
  const duePos = state.purchaseOrders.filter((po) => poFollowUp(po) !== null).length;
  const openPis = state.pis.filter((pi) => pi.status === "Draft").length;
  const overduePos = state.purchaseOrders.filter(poIsOverdue).length;

  const badgeFor = (key: PageKey): ReactNode => {
    if (key === "purchase-orders" && duePos > 0) {
      return (
        <Badge color={page === key ? "primary" : "neutral"}>{duePos}</Badge>
      );
    }
    if (key === "billing" && openPis > 0) {
      return (
        <Badge color={page === key ? "primary" : "neutral"}>{openPis}</Badge>
      );
    }
    return undefined;
  };

  const navigate = (key: PageKey) => {
    if (allowed.includes(key)) onNavigate(key);
  };

  return (
    <div className="min-h-svh bg-background-full p-3 text-text-primary lg:p-4">
      <div className="mx-auto flex w-full max-w-[1600px] gap-4">
        <aside className="sticky top-4 hidden h-[calc(100svh-2rem)] w-[260px] shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-border-button-white bg-background-secondary-default p-3 shadow-sidebar lg:flex">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto [scrollbar-width:none]">
            <div className="flex items-center gap-2.5 p-1">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2lg bg-linear-to-b from-accent-500 to-accent-600 shadow-nav-selected">
                <RiLeafLine className="size-5 text-white" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-body-medium text-text-primary">Anita's Aromatics</p>
                <p className="truncate text-caption-1-medium text-text-tertiary">
                  FMS · Inventory demo
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-background-primary-default p-3">
              <p className="text-caption-1-semibold uppercase tracking-[0.12em] text-text-tertiary">
                Signed in as
              </p>
              <p className="mt-1 text-body-medium text-text-primary">{state.role}</p>
              <p className="mt-0.5 text-caption-1-medium text-text-tertiary">
                {allowed.length} of {NAV.length} areas available
              </p>
            </div>

            <nav className="flex flex-col gap-1">
              <p className="px-2 pb-1 text-caption-1-semibold uppercase tracking-[0.12em] text-text-tertiary">
                Workspace
              </p>
              {NAV.map((item) => {
                const enabled = allowed.includes(item.key);
                if (!enabled) return null;
                return (
                  <NavItem
                    key={item.key}
                    label={item.label}
                    icon={item.icon}
                    selected={page === item.key}
                    badge={badgeFor(item.key)}
                    onClick={() => navigate(item.key)}
                  />
                );
              })}
            </nav>

            {overduePos > 0 && allowed.includes("purchase-orders") ? (
              <button
                type="button"
                onClick={() => navigate("purchase-orders")}
                className="rounded-2xl border border-status-rose-background bg-status-rose-background/40 p-3 text-start transition-colors hover:bg-status-rose-background/60"
              >
                <p className="text-body-medium text-status-rose-text">
                  {overduePos} PO{overduePos > 1 ? "s" : ""} overdue
                </p>
                <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                  Open delivery watch to escalate
                </p>
              </button>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-2 pt-3">
            <div className="rounded-2xl bg-background-primary-default p-2">
              <ThemeToggle appearance="sidebar-segmented" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-background-primary-default p-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-100 text-caption-1-semibold text-accent-700 dark:bg-accent-900 dark:text-accent-200">
                AA
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-caption-1-semibold text-text-primary">Demo workspace</p>
                <p className="truncate text-caption-2-medium text-text-tertiary">Local sample data</p>
              </div>
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                leadingIcon={RiRestartLine}
                aria-label="Reset demo data"
                onClick={() => setResetOpen(true)}
              />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex flex-col gap-3 rounded-3xl border border-border-button-default bg-background-secondary-default px-4 py-3 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-2lg bg-linear-to-b from-accent-500 to-accent-600 lg:hidden">
                  <RiLeafLine className="size-4 text-white" aria-hidden />
                </span>
                <div className="flex min-w-0 items-center gap-1.5 text-caption-1-medium text-text-tertiary">
                  <span className="hidden sm:inline">Anita's Aromatics</span>
                  <RiArrowRightSLine className="hidden size-3.5 sm:inline" aria-hidden />
                  <span className="truncate text-text-primary">{PAGE_TITLES[page]}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Select
                  aria-label="Switch demo role"
                  selectedKey={state.role}
                  onSelectionChange={(key) => {
                    if (typeof key === "string") {
                      dispatch({ type: "set-role", role: key as Role });
                    }
                  }}
                  className="w-[138px]"
                  triggerClassName="h-8 py-1.5"
                >
                  {ROLES.map((role) => (
                    <SelectItem key={role} id={role} textValue={role}>
                      {role}
                    </SelectItem>
                  ))}
                </Select>
                <div className="hidden sm:block">
                  <ThemeToggle appearance="segmented" />
                </div>
              </div>
            </div>

            <nav className="-mx-1 flex gap-1 overflow-x-auto pb-0.5 lg:hidden [scrollbar-width:none]">
              {NAV.filter((item) => allowed.includes(item.key)).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.key)}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption-1-semibold transition-colors",
                    page === item.key
                      ? "bg-accent-600 text-white"
                      : "bg-background-primary-default text-text-secondary hover:bg-background-tertiary-default",
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </button>
              ))}
              <Button
                variant="ghost"
                size="xs"
                leadingIcon={RiRestartLine}
                onClick={() => setResetOpen(true)}
                className="shrink-0"
              >
                Reset
              </Button>
            </nav>
          </header>

          <main className="flex min-w-0 flex-col gap-4 pb-8">{children}</main>

          <footer className="flex flex-col gap-1 border-t border-separator-border py-3 text-caption-1-medium text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
            <p>Demo data only · changes persist in this browser</p>
            <p className="flex items-center gap-1">
              <RiLogoutBoxRLine className="size-3.5" aria-hidden />
              Rupyz + Miracle remain systems of record
            </p>
          </footer>
        </div>
      </div>

      <AlertDialog
        isOpen={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset demo data?"
        description="All stock movements, PIs, leads, claims and PO receipts you created will be cleared and the sample data restored."
        confirmLabel="Reset demo"
        onConfirm={resetDemo}
        isDismissable
      />
    </div>
  );
}
