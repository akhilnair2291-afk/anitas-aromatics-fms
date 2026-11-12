import { useState, type ComponentType } from "react";
import {
  RiArrowRightUpLine,
  RiCheckLine,
  RiCheckboxMultipleLine,
  RiExternalLinkLine,
  RiFileList3Line,
  RiStackLine,
  RiContactsBook3Line,
  RiTruckLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
import { SearchField } from "@/components/base/search-field/search-field";
import { moduleOrder, requirements, type RequirementItem } from "@/data/requirements";
import type { ModuleKey, PageKey } from "@/lib/types";
import {
  Callout,
  Card,
  EmptyState,
  Metric,
  PageHeader,
  SectionHeader,
  StatusChip,
} from "@/components/ui";
import { cx } from "@/utils/cx";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

const MODULE_META: Record<
  ModuleKey,
  { label: string; description: string; icon: IconComponent }
> = {
  inventory: {
    label: "Inventory",
    description: "Consolidated, distributor, demo, combo, dispatch and packaging stock across every location.",
    icon: RiStackLine,
  },
  billing: {
    label: "Billing",
    description: "Rupyz orders to draft proforma invoices, shortfall handling and distributor claim statements.",
    icon: RiFileList3Line,
  },
  crm: {
    label: "CRM",
    description: "Instagram and Meta leads, offline enquiries, repeat-order tracking and projected sales.",
    icon: RiContactsBook3Line,
  },
  vendor: {
    label: "Vendor POs",
    description: "PO register, production status, committed delivery, partial receipts and stock linkage.",
    icon: RiTruckLine,
  },
};

export function RequirementsPage({
  onNavigate,
}: {
  onNavigate: (page: PageKey, tab?: string) => void;
}) {
  const [module, setModule] = useState<ModuleKey | "all">("all");
  const [query, setQuery] = useState("");

  const high = requirements.filter((item) => item.priority === "High").length;
  const medium = requirements.filter((item) => item.priority === "Medium").length;

  const matches = (item: RequirementItem) => {
    const haystack = `${item.id} ${item.process} ${item.automation} ${item.data} ${item.outcome} ${item.where} ${item.demo}`.toLowerCase();
    return (
      (module === "all" || item.module === module) &&
      haystack.includes(query.trim().toLowerCase())
    );
  };

  const visible = requirements.filter(matches);
  const visibleModules = moduleOrder.filter((key) =>
    module === "all" ? true : key === module,
  );

  return (
    <>
      <PageHeader
        eyebrow="Traceability"
        title="Requirement coverage"
        description="Every requirement from the Anita's Aromatics automation sheet, mapped to the demo screen where it can be exercised. Each link opens the exact page and tab."
        actions={
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiCheckboxMultipleLine}
            onClick={() => onNavigate("dashboard")}
          >
            Open overview
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Requirements covered"
          value={`${requirements.length} / ${requirements.length}`}
          caption="All modules demo-ready"
          icon={RiCheckboxMultipleLine}
        />
        <Metric label="Modules" value={moduleOrder.length} caption="Inventory · Billing · CRM · Vendor" icon={RiStackLine} />
        <Metric label="High priority" value={high} caption={`${medium} medium priority`} icon={RiCheckLine} tone="accent" />
        <Metric label="Demo steps" value={requirements.length} caption="One walkthrough per requirement" icon={RiArrowRightUpLine} />
      </div>

      <Callout title="Scope reminder">
        The demo is a JavaScript web app with sample data. <strong>Rupyz</strong> remains the order system of record and{" "}
        <strong>Miracle</strong> remains the billing system of record. This app consolidates stock, PI preparation,
        CRM and vendor follow-up around them rather than replacing either system.
      </Callout>

      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={module === "all" ? "primary" : "secondary"}
              size="xs"
              onClick={() => setModule("all")}
            >
              All modules · {requirements.length}
            </Button>
            {moduleOrder.map((key) => (
              <Button
                key={key}
                variant={module === key ? "primary" : "secondary"}
                size="xs"
                leadingIcon={MODULE_META[key].icon}
                onClick={() => setModule(key)}
              >
                {MODULE_META[key].label} · {requirements.filter((item) => item.module === key).length}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchField
              aria-label="Search requirements"
              placeholder="Search requirement, data source or demo step…"
              value={query}
              onChange={setQuery}
              className="sm:max-w-md"
            />
            <p className="text-caption-1-medium text-text-tertiary">
              Showing {visible.length} of {requirements.length} requirements
            </p>
          </div>
        </div>
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          title="No requirements match"
          description="Try a different module or search term."
        />
      ) : (
        visibleModules.map((key) => {
          const items = visible.filter((item) => item.module === key);
          if (items.length === 0) return null;
          const meta = MODULE_META[key];
          return (
            <Card key={key} className="p-4">
              <SectionHeader
                title={
                  <span className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-2lg bg-background-primary-default text-foreground-icon-secondary">
                      <meta.icon className="size-4" aria-hidden />
                    </span>
                    {meta.label}
                  </span>
                }
                description={meta.description}
                actions={<Chip variant="subtle" color="soft">{items.length} requirements</Chip>}
              />
              <div className="mt-3 grid gap-2 xl:grid-cols-2">
                {items.map((item) => (
                  <RequirementCard key={item.id} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </Card>
          );
        })
      )}
    </>
  );
}

function RequirementCard({
  item,
  onNavigate,
}: {
  item: RequirementItem;
  onNavigate: (page: PageKey, tab?: string) => void;
}) {
  return (
    <article
      className={cx(
        "flex flex-col gap-3 rounded-2xl border p-4",
        item.priority === "High"
          ? "border-border-button-default bg-background-primary-default"
          : "border-border-button-default bg-background-primary-default/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip variant="caption" color="soft">{item.id}</Chip>
            <StatusChip status={item.priority} />
            <Chip variant="caption" color="gray">{item.moduleLabel}</Chip>
          </div>
          <h3 className="mt-2 text-body-medium text-text-primary">{item.process}</h3>
        </div>
        <Button
          variant="ghost"
          size="xs"
          trailingIcon={RiExternalLinkLine}
          onClick={() => onNavigate(item.page, item.tab)}
          className="shrink-0"
        >
          Open demo
        </Button>
      </div>

      <p className="text-body-regular text-text-secondary">{item.automation}</p>

      <div className="rounded-xl border border-separator-border bg-background-secondary-default p-3">
        <p className="text-caption-1-semibold uppercase tracking-[0.12em] text-text-tertiary">Try this</p>
        <p className="mt-1 text-body-regular text-text-secondary">{item.demo}</p>
        <p className="mt-2 flex items-center gap-1 text-caption-1-medium text-text-tertiary">
          <RiArrowRightUpLine className="size-3.5 shrink-0" aria-hidden />
          {item.where}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-caption-1-medium text-text-tertiary">Data used</p>
          <p className="text-caption-1-medium text-text-secondary">{item.data}</p>
        </div>
        <div>
          <p className="text-caption-1-medium text-text-tertiary">Outcome</p>
          <p className="text-caption-1-medium text-text-secondary">{item.outcome}</p>
        </div>
      </div>
    </article>
  );
}
