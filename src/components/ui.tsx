import type { ComponentType, ReactNode } from "react";
import {
  RiArrowRightLine,
  RiInboxLine,
  RiInformationLine,
} from "@remixicon/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/components/base/table/table";
import { Chip, type ChipColor } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-separator-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-caption-1-semibold uppercase tracking-[0.14em] text-text-tertiary">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-title-1-semibold text-text-primary">{title}</h1>
        <p className="mt-1 max-w-3xl text-body-regular text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      className={cx(
        "rounded-3xl border border-border-button-default bg-background-secondary-default",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="text-title-3-semibold text-text-primary">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-body-regular text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Metric({
  label,
  value,
  caption,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: IconComponent;
  tone?: "neutral" | "accent";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-medium text-text-secondary">{label}</p>
          <p className="mt-1 text-title-1-semibold text-text-primary tabular-nums">{value}</p>
          {caption ? <p className="mt-1 text-caption-1-medium text-text-tertiary">{caption}</p> : null}
        </div>
        {Icon ? (
          <span
            className={cx(
              "flex size-9 shrink-0 items-center justify-center rounded-2lg",
              tone === "accent"
                ? "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200"
                : "bg-background-tertiary-default text-foreground-icon-secondary",
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}
      </div>
    </Card>
  );
}

const STATUS_COLORS: Record<string, ChipColor> = {
  open: "blue",
  "pi drafted": "cyan",
  "partially available": "yellow",
  backorder: "rose",
  fulfilled: "lime",
  draft: "neutral",
  dispatched: "purple",
  new: "blue",
  contacted: "cyan",
  interested: "yellow",
  converted: "lime",
  lost: "rose",
  "on track": "lime",
  "due soon": "yellow",
  overdue: "rose",
  issued: "neutral",
  acknowledged: "blue",
  "in production": "yellow",
  "partially received": "cyan",
  received: "lime",
  "pending review": "yellow",
  approved: "lime",
  outstanding: "yellow",
  closed: "lime",
  admin: "purple",
  sales: "blue",
  warehouse: "cyan",
  trainer: "yellow",
  high: "rose",
  medium: "yellow",
};

export function StatusChip({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const color = STATUS_COLORS[status.toLowerCase()] ?? "neutral";
  return (
    <Chip variant="bold" color={color} className={className}>
      {status}
    </Chip>
  );
}

export interface DataColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  isRowHeader?: boolean;
  align?: "start" | "end";
}

export function DataTable<T extends { id: string }>({
  label,
  columns,
  rows,
  empty,
  size = "sm",
  onRowAction,
  className,
}: {
  label: string;
  columns: DataColumn<T>[];
  rows: T[];
  empty?: ReactNode;
  size?: "sm" | "md";
  onRowAction?: (row: T) => void;
  className?: string;
}) {
  if (rows.length === 0 && empty) {
    return <div className="px-5 py-10">{empty}</div>;
  }
  return (
    <Table
      aria-label={label}
      size={size}
      containerClassName={className}
      onRowAction={onRowAction ? (key) => {
        const row = rows.find((entry) => entry.id === String(key));
        if (row) onRowAction(row);
      } : undefined}
    >
      <TableHeader>
        {columns.map((column) => (
          <TableColumn
            key={column.id}
            id={column.id}
            isRowHeader={column.isRowHeader}
            className={column.align === "end" ? "text-end" : undefined}
          >
            {column.header}
          </TableColumn>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} id={row.id}>
            {columns.map((column) => (
              <TableCell
                key={`${row.id}-${column.id}`}
                className={column.align === "end" ? "text-end tabular-nums" : undefined}
              >
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = RiInboxLine,
  action,
}: {
  title: string;
  description?: string;
  icon?: IconComponent;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-button-default bg-background-primary-default/50 px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-background-tertiary-default text-foreground-icon-secondary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-body-medium text-text-primary">{title}</p>
        {description ? (
          <p className="mt-0.5 max-w-md text-body-regular text-text-tertiary">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Callout({
  title,
  children,
  action,
  tone = "info",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        tone === "warning"
          ? "border-status-yellow-background bg-status-yellow-background/40"
          : "border-border-button-default bg-background-primary-default",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background-tertiary-default text-foreground-icon-secondary">
          <RiInformationLine className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-body-medium text-text-primary">{title}</p>
          <div className="mt-0.5 text-body-regular text-text-secondary">{children}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

export function Bar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const width = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-background-tertiary-default", className)}>
      <div
        className="h-full rounded-full bg-accent-500 transition-[width] duration-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function LinkAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="xs" trailingIcon={RiArrowRightLine} onClick={onClick}>
      {children}
    </Button>
  );
}
