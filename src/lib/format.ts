const DAY_MS = 86_400_000;

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function addDays(iso: string, days: number): string {
  const date = fromISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

export function daysAgo(days: number): string {
  return addDays(todayISO(), -days);
}

export function daysAhead(days: number): string {
  return addDays(todayISO(), days);
}

/** Positive when `iso` is in the future, negative when in the past. */
export function daysFromToday(iso: string): number {
  return Math.round((fromISO(iso).getTime() - fromISO(todayISO()).getTime()) / DAY_MS);
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
});

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return dateFormatter.format(fromISO(iso));
}

export function formatShortDate(iso?: string): string {
  if (!iso) return "—";
  return shortDateFormatter.format(fromISO(iso));
}

const numberFormatter = new Intl.NumberFormat("en-IN");

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

export function formatMoney(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
    if (Math.abs(value) >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
    if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  }
  return `₹${numberFormatter.format(Math.round(value))}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function dueLabel(iso: string): string {
  const days = daysFromToday(iso);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days}d`;
  if (days === -1) return "Overdue by 1d";
  return `Overdue by ${Math.abs(days)}d`;
}
