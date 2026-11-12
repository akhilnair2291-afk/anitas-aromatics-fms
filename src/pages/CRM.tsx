import { useState } from "react";
import {
  RiAddLine,
  RiArrowRightUpLine,
  RiCheckLine,
  RiCloseLine,
  RiContactsBook3Line,
  RiInstagramLine,
  RiLineChartLine,
  RiMoneyRupeeCircleLine,
  RiRepeatLine,
  RiUserAddLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
import { Input } from "@/components/base/input/input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/base/modal/modal";
import { SearchField } from "@/components/base/search-field/search-field";
import { Select, SelectItem } from "@/components/base/select/select";
import { Tab, TabList, TabPanel, Tabs } from "@/components/base/tabs/tabs";
import { Textarea } from "@/components/base/textarea/textarea";
import { toast } from "@/components/base/toast/toast";
import { useApp } from "@/store/AppStore";
import {
  addDays,
  daysFromToday,
  dueLabel,
  formatMoney,
  formatNumber,
  formatShortDate,
  todayISO,
} from "@/lib/format";
import {
  monthKey,
  monthLabel,
  projectedSales,
  repeatStatusFor,
  STAGE_PROBABILITY,
  weightedPipeline,
} from "@/lib/selectors";
import type { Lead, LeadSource, LeadStage } from "@/lib/types";
import {
  Bar,
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

const CRM_TABS = ["pipeline", "repeat", "forecast"];

const STAGES: LeadStage[] = ["New", "Contacted", "Interested", "Converted", "Lost"];

const NEXT_STAGE: Partial<Record<LeadStage, LeadStage>> = {
  New: "Contacted",
  Contacted: "Interested",
  Interested: "Converted",
  Lost: "New",
};

const STAGE_HINT: Record<LeadStage, string> = {
  New: "Imported or just added — first touch pending",
  Contacted: "Intro sent, requirement being qualified",
  Interested: "Pricing or samples shared, decision pending",
  Converted: "Order placed, hand over to billing",
  Lost: "No response or not a fit — revisit later",
};

const OWNERS = ["Neha Sharma", "Rohan Mehta"];

export function CRMPage({
  tab,
  onTabChange,
}: {
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  const { state, dispatch } = useApp();
  const activeTab = CRM_TABS.includes(tab) ? tab : "pipeline";
  const [addOpen, setAddOpen] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  const openLeads = state.leads.filter((lead) => !["Converted", "Lost"].includes(lead.stage));
  const pipeline = weightedPipeline(openLeads);
  const dueCustomers = state.customers.filter(
    (customer) => repeatStatusFor(customer) !== "On track",
  );
  const repeatValue = dueCustomers.reduce((sum, customer) => sum + customer.lastOrderValue, 0);
  const forecast = projectedSales(state);
  const thisMonth = forecast.reduce((sum, row) => sum + row.thisMonth, 0);
  const nextMonth = forecast.reduce((sum, row) => sum + row.nextMonth, 0);

  const importLeads = () => {
    dispatch({ type: "import-instagram" });
    toast("Instagram leads imported", {
      description: "New records were added to the pipeline and assigned to a salesperson.",
      status: "success",
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="CRM"
        title="Lead pipeline, repeat orders & forecast"
        description="Pull Instagram and Meta enquiries into one pipeline, keep offline visits current, track repeat-order timing and project sales by salesperson."
        actions={
          <>
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiInstagramLine}
              onClick={importLeads}
            >
              Import Instagram leads
            </Button>
            <Button size="small" leadingIcon={RiUserAddLine} onClick={() => setAddOpen(true)}>
              Add offline lead
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Open leads"
          value={formatNumber(openLeads.length)}
          caption={`${state.leads.length} total in pipeline`}
          icon={RiContactsBook3Line}
        />
        <Metric
          label="Weighted pipeline"
          value={formatMoney(pipeline, true)}
          caption="Probability applied by stage"
          icon={RiMoneyRupeeCircleLine}
        />
        <Metric
          label="Repeat orders due"
          value={formatNumber(dueCustomers.length)}
          caption={`${formatMoney(repeatValue, true)} of repeat value`}
          icon={RiRepeatLine}
          tone="accent"
        />
        <Metric
          label={`Projected ${monthLabel(monthKey(todayISO()))}`}
          value={formatMoney(thisMonth, true)}
          caption={`Next month ${formatMoney(nextMonth, true)}`}
          icon={RiLineChartLine}
        />
      </div>

      <Tabs selectedKey={activeTab} onSelectionChange={(key) => onTabChange(String(key))}>
        <TabList aria-label="CRM views">
          <Tab id="pipeline" count={openLeads.length}>Lead pipeline</Tab>
          <Tab id="repeat" count={dueCustomers.length}>Repeat orders</Tab>
          <Tab id="forecast">Forecast</Tab>
        </TabList>
        <TabPanel id="pipeline">
          <PipelineTab
            onOpenLead={(id) => setLeadId(id)}
            onAddLead={() => setAddOpen(true)}
            onImport={importLeads}
          />
        </TabPanel>
        <TabPanel id="repeat">
          <RepeatTab />
        </TabPanel>
        <TabPanel id="forecast">
          <ForecastTab />
        </TabPanel>
      </Tabs>

      {addOpen ? (
        <AddLeadModal onClose={() => setAddOpen(false)} />
      ) : null}
      {leadId ? (
        <LeadDetailModal key={leadId} leadId={leadId} onClose={() => setLeadId(null)} />
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- pipeline */

function PipelineTab({
  onOpenLead,
  onAddLead,
  onImport,
}: {
  onOpenLead: (id: string) => void;
  onAddLead: () => void;
  onImport: () => void;
}) {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("all");
  const [source, setSource] = useState("all");

  const filtered = state.leads.filter((lead) => {
    const haystack = `${lead.name} ${lead.phone} ${lead.owner} ${lead.nextAction}`.toLowerCase();
    return (
      haystack.includes(query.trim().toLowerCase()) &&
      (owner === "all" || lead.owner === owner) &&
      (source === "all" || lead.source === source)
    );
  });

  const advance = (lead: Lead) => {
    const next = NEXT_STAGE[lead.stage];
    if (!next) return;
    dispatch({ type: "advance-lead", id: lead.id, stage: next });
    toast(`Lead moved to ${next}`, {
      description: `${lead.name} · last contact updated to today.`,
      status: next === "Converted" ? "success" : "information",
    });
  };

  const maxColumnValue = Math.max(
    ...STAGES.map((stage) =>
      filtered
        .filter((lead) => lead.stage === stage)
        .reduce((sum, lead) => sum + lead.expectedValue, 0),
    ),
    1,
  );

  return (
    <div className="flex flex-col gap-4">
      <Callout
        title="One pipeline for online and offline enquiries"
        action={
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="secondary" size="xs" leadingIcon={RiInstagramLine} onClick={onImport}>
              Import leads
            </Button>
            <Button size="xs" leadingIcon={RiAddLine} onClick={onAddLead}>
              Add lead
            </Button>
          </div>
        }
      >
        Instagram and Meta lead forms import into <strong>New</strong> with an owner and expected value. Shop visits
        and phone enquiries are added manually and share the same stages, so follow-up stays in one place.
      </Callout>

      <Card className="p-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
          <SearchField
            aria-label="Search leads"
            placeholder="Search name, phone, owner or next action…"
            value={query}
            onChange={setQuery}
          />
          <Select
            aria-label="Filter by owner"
            selectedKey={owner}
            onSelectionChange={(key) => setOwner(String(key))}
          >
            <SelectItem id="all" textValue="All owners">All owners</SelectItem>
            {OWNERS.map((person) => (
              <SelectItem key={person} id={person} textValue={person}>{person}</SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Filter by source"
            selectedKey={source}
            onSelectionChange={(key) => setSource(String(key))}
          >
            <SelectItem id="all" textValue="All sources">All sources</SelectItem>
            {["Instagram", "Meta", "Offline", "Referral"].map((option) => (
              <SelectItem key={option} id={option} textValue={option}>{option}</SelectItem>
            ))}
          </Select>
        </div>
        <p className="mt-2 text-caption-1-medium text-text-tertiary">
          Showing {filtered.length} of {state.leads.length} leads · weighted value{" "}
          {formatMoney(weightedPipeline(filtered.filter((lead) => !["Converted", "Lost"].includes(lead.stage))))}
        </p>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No leads match these filters"
          description="Clear the search or import a fresh set of Instagram leads."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {STAGES.map((stage) => {
            const columnLeads = filtered.filter((lead) => lead.stage === stage);
            const columnValue = columnLeads.reduce((sum, lead) => sum + lead.expectedValue, 0);
            return (
              <section
                key={stage}
                aria-label={`${stage} leads`}
                className="flex min-w-0 flex-col gap-2 rounded-3xl border border-border-button-default bg-background-secondary-default p-2.5"
              >
                <div className="flex flex-col gap-1 px-1 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <StatusChip status={stage} />
                    <span className="text-caption-1-semibold text-text-tertiary tabular-nums">
                      {columnLeads.length}
                    </span>
                  </div>
                  <p className="text-caption-1-medium text-text-tertiary">
                    {formatMoney(columnValue, true)} expected ·{" "}
                    {Math.round(STAGE_PROBABILITY[stage] * 100)}% weight
                  </p>
                  <Bar value={columnValue} max={maxColumnValue} className="mt-0.5" />
                </div>

                <div className="flex flex-col gap-2">
                  {columnLeads.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border-button-default px-3 py-6 text-center text-caption-1-medium text-text-tertiary">
                      No leads
                    </p>
                  ) : (
                    columnLeads.map((lead) => {
                      const next = NEXT_STAGE[lead.stage];
                      return (
                        <article
                          key={lead.id}
                          className="flex flex-col gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-body-medium text-text-primary">{lead.name}</p>
                              <p className="truncate text-caption-1-medium text-text-tertiary">{lead.phone}</p>
                            </div>
                            <Chip variant="caption" color="soft">{lead.source}</Chip>
                          </div>

                          <p className="line-clamp-2 text-body-regular text-text-secondary">{lead.nextAction}</p>

                          <div className="flex items-center justify-between gap-2 text-caption-1-medium text-text-tertiary">
                            <span className="truncate">{lead.owner}</span>
                            <span className="shrink-0 tabular-nums">{formatMoney(lead.expectedValue, true)}</span>
                          </div>
                          <p className="text-caption-1-medium text-text-tertiary">
                            {lead.stage === "Converted"
                              ? `Converted · last contact ${formatShortDate(lead.lastContact)}`
                              : `Close ${formatShortDate(lead.expectedClose)} · contacted ${formatShortDate(lead.lastContact)}`}
                          </p>

                          <div className="flex items-center justify-between gap-1 border-t border-separator-border pt-2">
                            <Button variant="ghost" size="xs" onClick={() => onOpenLead(lead.id)}>
                              Open
                            </Button>
                            {next ? (
                              <Button
                                variant="ghost"
                                size="xs"
                                trailingIcon={lead.stage === "Lost" ? RiRepeatLine : RiArrowRightUpLine}
                                onClick={() => advance(lead)}
                              >
                                {lead.stage === "Lost" ? "Reopen" : `To ${next}`}
                              </Button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Card className="p-4">
        <SectionHeader
          title="Stage rules"
          description="Stages and default conversion weights used by the forecast."
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {STAGES.map((stage) => (
            <div key={stage} className="rounded-2xl bg-background-primary-default p-3">
              <div className="flex items-center justify-between gap-2">
                <StatusChip status={stage} />
                <span className="text-caption-1-semibold text-text-tertiary tabular-nums">
                  {Math.round(STAGE_PROBABILITY[stage] * 100)}%
                </span>
              </div>
              <p className="mt-1.5 text-caption-1-medium text-text-tertiary">{STAGE_HINT[stage]}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ modal */

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("Offline");
  const [stage, setStage] = useState<LeadStage>("New");
  const [owner, setOwner] = useState(OWNERS[0]);
  const [nextAction, setNextAction] = useState("Call to understand requirement");
  const [expectedValue, setExpectedValue] = useState("5000");
  const [expectedClose, setExpectedClose] = useState(addDays(todayISO(), 14));
  const [notes, setNotes] = useState("");

  const save = () => {
    if (!name.trim() || !phone.trim()) {
      toast("Add a name and phone number", {
        description: "Both are needed so the team can follow up.",
        status: "error",
      });
      return;
    }
    dispatch({
      type: "add-lead",
      lead: {
        name: name.trim(),
        phone: phone.trim(),
        source,
        stage,
        owner,
        lastContact: todayISO(),
        nextAction: nextAction.trim() || "Follow up with lead",
        expectedValue: Number(expectedValue) || 0,
        expectedClose,
        notes: notes.trim() || undefined,
      },
    });
    toast("Lead added to the pipeline", {
      description: `${name.trim()} · ${source} · owned by ${owner}.`,
      status: "success",
    });
    onClose();
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="md">
      <ModalHeader
        title="Add an offline lead"
        description="Record a shop visit, phone enquiry or referral. It joins the same pipeline as imported leads."
      />
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Name" value={name} onChange={setName} placeholder="Customer or business name" />
            <Input label="Phone" value={phone} onChange={setPhone} placeholder="+91 …" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Source" selectedKey={source} onSelectionChange={(key) => setSource(String(key) as LeadSource)}>
              {["Offline", "Referral", "Instagram", "Meta"].map((option) => (
                <SelectItem key={option} id={option} textValue={option}>{option}</SelectItem>
              ))}
            </Select>
            <Select label="Stage" selectedKey={stage} onSelectionChange={(key) => setStage(String(key) as LeadStage)}>
              {STAGES.map((option) => (
                <SelectItem key={option} id={option} textValue={option}>{option}</SelectItem>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Owner" selectedKey={owner} onSelectionChange={(key) => setOwner(String(key))}>
              {OWNERS.map((person) => (
                <SelectItem key={person} id={person} textValue={person}>{person}</SelectItem>
              ))}
            </Select>
            <Input
              label="Expected value (₹)"
              type="number"
              value={expectedValue}
              onChange={setExpectedValue}
              hint="Used in the weighted forecast."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Expected close"
              type="date"
              value={expectedClose}
              onChange={(value) => setExpectedClose(value || addDays(todayISO(), 14))}
            />
            <Input label="Next action" value={nextAction} onChange={setNextAction} />
          </div>
          <Textarea
            label="Notes"
            rows={2}
            value={notes}
            onChange={setNotes}
            placeholder="Products discussed, visit context, sample sent…"
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button leadingIcon={RiUserAddLine} onClick={save}>Add lead</Button>
      </ModalFooter>
    </Modal>
  );
}

function LeadDetailModal({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const lead = state.leads.find((row) => row.id === leadId);
  const [stage, setStage] = useState<LeadStage>(lead?.stage ?? "New");
  const [nextAction, setNextAction] = useState(lead?.nextAction ?? "");
  const [notes, setNotes] = useState(lead?.notes ?? "");

  if (!lead) return null;

  const converted = stage === "Converted";

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="md">
      <ModalHeader
        title={lead.name}
        description={`${lead.id} · ${lead.source} · owner ${lead.owner} · created ${formatShortDate(lead.createdAt)}`}
      />
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-background-secondary-default p-3">
              <p className="text-caption-1-medium text-text-tertiary">Expected value</p>
              <p className="text-body-medium text-text-primary tabular-nums">{formatMoney(lead.expectedValue)}</p>
            </div>
            <div className="rounded-xl bg-background-secondary-default p-3">
              <p className="text-caption-1-medium text-text-tertiary">Expected close</p>
              <p className="text-body-medium text-text-primary">{formatShortDate(lead.expectedClose)}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-background-secondary-default p-3">
              <p className="text-caption-1-medium text-text-tertiary">Phone</p>
              <p className="text-body-medium text-text-primary">{lead.phone}</p>
            </div>
            <div className="rounded-xl bg-background-secondary-default p-3">
              <p className="text-caption-1-medium text-text-tertiary">Last contact</p>
              <p className="text-body-medium text-text-primary">
                {formatShortDate(lead.lastContact)}
                <span className="ms-1 text-caption-1-medium text-text-tertiary">
                  ({dueLabel(lead.lastContact)})
                </span>
              </p>
            </div>
          </div>
          <Select label="Stage" selectedKey={stage} onSelectionChange={(key) => setStage(String(key) as LeadStage)}>
            {STAGES.map((option) => (
              <SelectItem key={option} id={option} textValue={option}>{option}</SelectItem>
            ))}
          </Select>
          <Input label="Next action" value={nextAction} onChange={setNextAction} />
          <Textarea label="Notes" rows={3} value={notes} onChange={setNotes} />
          {converted ? (
            <Callout title="Ready for billing">
              Converted leads can be created as a Rupyz order, then turned into a draft PI from Billing → Orders.
            </Callout>
          ) : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button
          variant="ghost"
          leadingIcon={RiCheckLine}
          onClick={() => {
            dispatch({ type: "update-lead", id: lead.id, patch: { lastContact: todayISO() } });
            toast("Contact logged", {
              description: `${lead.name} marked as contacted today.`,
              status: "success",
            });
          }}
        >
          Log contact
        </Button>
        <Button
          onClick={() => {
            dispatch({
              type: "update-lead",
              id: lead.id,
              patch: {
                stage,
                nextAction: nextAction.trim() || "Follow up with lead",
                notes: notes.trim() || undefined,
                lastContact: stage !== lead.stage ? todayISO() : lead.lastContact,
              },
            });
            toast("Lead updated", {
              description: `${lead.name} is now ${stage}.`,
              status: "success",
            });
            onClose();
          }}
        >
          Save changes
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/* ------------------------------------------------------------------ repeat */

function RepeatTab() {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const rows = state.customers
    .map((customer) => ({
      ...customer,
      effectiveStatus: repeatStatusFor(customer),
      days: daysFromToday(customer.reorderDue),
    }))
    .filter((customer) => {
      const haystack = `${customer.name} ${customer.city} ${customer.type} ${customer.phone}`.toLowerCase();
      return (
        haystack.includes(query.trim().toLowerCase()) &&
        (status === "all" || customer.effectiveStatus === status)
      );
    })
    .sort((a, b) => a.days - b.days);

  const overdue = state.customers.filter((customer) => repeatStatusFor(customer) === "Overdue");
  const dueSoon = state.customers.filter((customer) => repeatStatusFor(customer) === "Due soon");
  const onTrack = state.customers.filter((customer) => repeatStatusFor(customer) === "On track");
  const dueValue = [...overdue, ...dueSoon].reduce(
    (sum, customer) => sum + customer.lastOrderValue,
    0,
  );

  const columns: DataColumn<(typeof rows)[number]>[] = [
    {
      id: "customer",
      header: "Customer",
      isRowHeader: true,
      cell: (customer) => (
        <div className="min-w-0">
          <p className="truncate text-body-medium text-text-primary">{customer.name}</p>
          <p className="truncate text-caption-1-medium text-text-tertiary">
            {customer.city} · {customer.type}
          </p>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      cell: (customer) => (
        <span className="whitespace-nowrap text-body-regular text-text-secondary">{customer.phone}</span>
      ),
    },
    {
      id: "last",
      header: "Last order",
      cell: (customer) => (
        <div>
          <p className="text-body-regular text-text-primary">{formatShortDate(customer.lastOrderDate)}</p>
          <p className="text-caption-1-medium text-text-tertiary">{formatMoney(customer.lastOrderValue)}</p>
        </div>
      ),
    },
    {
      id: "due",
      header: "Re-order due",
      cell: (customer) => (
        <div>
          <p className="text-body-regular text-text-primary">{formatShortDate(customer.reorderDue)}</p>
          <p className="text-caption-1-medium text-text-tertiary">{dueLabel(customer.reorderDue)}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (customer) => <StatusChip status={customer.effectiveStatus} />,
    },
    {
      id: "action",
      header: "",
      cell: (customer) => (
        <Button
          variant={customer.effectiveStatus === "Overdue" ? "secondary" : "ghost"}
          size="xs"
          leadingIcon={RiRepeatLine}
          onClick={() => {
            dispatch({ type: "mark-repeat", customerId: customer.id });
            toast("Repeat order recorded", {
              description: `${customer.name} moved to on track · next re-order in 45 days.`,
              status: "success",
            });
          }}
        >
          Mark reordered
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Overdue" value={overdue.length} caption="Reorder date passed" icon={RiCloseLine} tone="accent" />
        <Metric label="Due soon" value={dueSoon.length} caption="Within the next 10 days" icon={RiRepeatLine} />
        <Metric label="On track" value={onTrack.length} caption="Next reorder is further out" icon={RiCheckLine} />
        <Metric
          label="Repeat value due"
          value={formatMoney(dueValue, true)}
          caption="Based on last order value"
          icon={RiMoneyRupeeCircleLine}
        />
      </div>

      <Callout title="How repeat status is calculated">
        Each customer has a re-order cycle based on their last order. Status becomes <strong>Due soon</strong> ten
        days before the re-order date and <strong>Overdue</strong> after it. Marking a repeat order records today as
        the last order and pushes the next re-order date out by 45 days.
      </Callout>

      <Card className="p-4">
        <SectionHeader
          title="Customer re-order tracker"
          description="Last order, reorder date and repeat status for existing customers."
          actions={<Chip variant="subtle" color="soft">{rows.length} customers</Chip>}
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <SearchField
            aria-label="Search customers"
            placeholder="Search customer, city or phone…"
            value={query}
            onChange={setQuery}
            className="sm:max-w-sm"
          />
          <Select
            aria-label="Filter repeat status"
            selectedKey={status}
            onSelectionChange={(key) => setStatus(String(key))}
            className="w-full sm:w-[200px]"
          >
            <SelectItem id="all" textValue="All statuses">All statuses</SelectItem>
            {["Overdue", "Due soon", "On track"].map((option) => (
              <SelectItem key={option} id={option} textValue={option}>{option}</SelectItem>
            ))}
          </Select>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
          <DataTable
            label="Customer re-order tracker"
            columns={columns}
            rows={rows}
            empty={<EmptyState title="No customers match" description="Try another search or status filter." />}
          />
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- forecast */

function ForecastTab() {
  const { state } = useApp();
  const [month, setMonth] = useState<"this" | "next">("this");

  const people = projectedSales(state);
  const thisKey = monthKey(todayISO());
  const nextKey = monthKey(addDays(todayISO(), 32));
  const activeKey = month === "this" ? thisKey : nextKey;

  const rows = people
    .map((person) => ({
      ...person,
      id: person.person,
      active: month === "this" ? person.thisMonth : person.nextMonth,
    }))
    .sort((a, b) => b.active - a.active);

  const total = rows.reduce((sum, row) => sum + row.active, 0);
  const repeatDue = state.customers
    .filter((customer) => repeatStatusFor(customer) !== "On track" && monthKey(customer.reorderDue) === activeKey)
    .reduce((sum, customer) => sum + customer.lastOrderValue, 0);

  const convertedValue = state.leads
    .filter((lead) => lead.stage === "Converted")
    .reduce((sum, lead) => sum + lead.expectedValue, 0);

  const columns: DataColumn<(typeof rows)[number]>[] = [
    {
      id: "person",
      header: "Salesperson",
      isRowHeader: true,
      cell: (row) => (
        <div>
          <p className="text-body-medium text-text-primary">{row.person}</p>
          <p className="text-caption-1-medium text-text-tertiary">
            {row.openLeads} open · {row.converted} converted
          </p>
        </div>
      ),
    },
    {
      id: "this",
      header: monthLabel(thisKey),
      align: "end",
      cell: (row) => (
        <span className={month === "this" ? "font-medium text-text-primary" : "text-text-secondary"}>
          {formatMoney(row.thisMonth)}
        </span>
      ),
    },
    {
      id: "next",
      header: monthLabel(nextKey),
      align: "end",
      cell: (row) => (
        <span className={month === "next" ? "font-medium text-text-primary" : "text-text-secondary"}>
          {formatMoney(row.nextMonth)}
        </span>
      ),
    },
    {
      id: "active",
      header: `${formatShortDate(month === "this" ? todayISO() : addDays(todayISO(), 32))} basis`,
      align: "end",
      cell: (row) => (
        <span className="text-body-medium text-text-primary tabular-nums">{formatMoney(row.active)}</span>
      ),
    },
    {
      id: "action",
      header: "",
      cell: (row) => (
        <Button
          variant="ghost"
          size="xs"
          trailingIcon={RiArrowRightUpLine}
          onClick={() =>
            toast("Forecast detail", {
              description: `${row.person}: ${row.openLeads} open leads, ${row.converted} converted. Weighted value ${formatMoney(row.active)}.`,
              status: "information",
            })
          }
        >
          Detail
        </Button>
      ),
    },
  ];

  const stageRows = STAGES.filter((stage) => stage !== "Lost").map((stage) => {
    const stageLeads = state.leads.filter((lead) => lead.stage === stage);
    const value = stageLeads.reduce((sum, lead) => sum + lead.expectedValue, 0);
    return {
      id: stage,
      stage,
      count: stageLeads.length,
      value,
      weighted: value * STAGE_PROBABILITY[stage],
    };
  });
  const maxStageValue = Math.max(...stageRows.map((row) => row.value), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label={`Weighted ${monthLabel(activeKey)}`}
          value={formatMoney(total, true)}
          caption="Open pipeline × stage probability"
          icon={RiLineChartLine}
        />
        <Metric
          label="Repeat orders in period"
          value={formatMoney(repeatDue, true)}
          caption="Due or overdue customer value"
          icon={RiRepeatLine}
        />
        <Metric
          label="Converted business"
          value={formatMoney(convertedValue, true)}
          caption="Expected value of converted leads"
          icon={RiCheckLine}
        />
        <Metric
          label="Open leads"
          value={formatNumber(state.leads.filter((lead) => !["Converted", "Lost"].includes(lead.stage)).length)}
          caption="Across all owners"
          icon={RiContactsBook3Line}
          tone="accent"
        />
      </div>

      <Callout title="Forecast method">
        Projected sales = lead expected value × stage probability (New 10%, Contacted 25%, Interested 50%, Converted
        100%, Lost 0%), grouped by salesperson and expected close month. Repeat-order value is shown separately
        because it comes from existing customers rather than the open pipeline.
      </Callout>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-4">
          <SectionHeader
            title="Projected sales by salesperson"
            description={`${monthLabel(activeKey)} · weighted pipeline`}
            actions={
              <div className="flex gap-1">
                <Button
                  variant={month === "this" ? "primary" : "secondary"}
                  size="xs"
                  onClick={() => setMonth("this")}
                >
                  This month
                </Button>
                <Button
                  variant={month === "next" ? "primary" : "secondary"}
                  size="xs"
                  onClick={() => setMonth("next")}
                >
                  Next month
                </Button>
              </div>
            }
          />
          <div className="mt-3 overflow-hidden rounded-2xl bg-background-primary-default">
            <DataTable
              label="Projected sales by salesperson"
              columns={columns}
              rows={rows}
              empty={<EmptyState title="No forecast data" description="Add leads with expected values to build a forecast." />}
            />
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-background-secondary-default px-3 py-2">
            <span className="text-body-medium text-text-secondary">Total weighted pipeline</span>
            <span className="text-title-3-semibold text-text-primary tabular-nums">{formatMoney(total)}</span>
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader
            title="Pipeline by stage"
            description="Expected value and weighted contribution."
          />
          <div className="mt-3 flex flex-col gap-3">
            {stageRows.map((row) => (
              <div key={row.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusChip status={row.stage} />
                    <span className="text-caption-1-medium text-text-tertiary">{row.count} leads</span>
                  </div>
                  <span className="text-caption-1-semibold text-text-primary tabular-nums">
                    {formatMoney(row.value, true)}
                  </span>
                </div>
                <Bar value={row.value} max={maxStageValue} />
                <p className="text-caption-1-medium text-text-tertiary">
                  Weighted {formatMoney(row.weighted, true)} at {Math.round(STAGE_PROBABILITY[row.stage] * 100)}%
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-separator-border pt-3">
            <p className="text-caption-1-medium text-text-tertiary">Forecast month</p>
            <p className="text-body-medium text-text-primary">
              {monthLabel(activeKey)} · leads closing in this month
            </p>
            <p className="mt-1 text-caption-1-medium text-text-tertiary">
              Month key {activeKey} · close dates come from each lead record.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
