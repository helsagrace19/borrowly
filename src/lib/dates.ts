/**
 * Date helpers.
 *
 * All borrowing dates are handled as ISO `YYYY-MM-DD` strings in the
 * borrower's local timezone. Comparing via `Date.UTC` avoids the
 * off-by-one-day bugs that appear around daylight-saving switches.
 */

/** The hour of day a loan is due back, local time. */
export const DUE_HOUR = 20;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(value: string, amount: number): string {
  const date = fromISODate(value);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

/** Whole days from `a` to `b`. Negative when `b` is before `a`. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const aUtc = Date.UTC(ay, am - 1, ad);
  const bUtc = Date.UTC(by, bm - 1, bd);
  return Math.round((bUtc - aUtc) / 86_400_000);
}

export function formatLong(value: string): string {
  const date = fromISODate(value);
  return `${DAYS_LONG[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatShort(value: string): string {
  const date = fromISODate(value);
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatDayMonth(value: string): string {
  const date = fromISODate(value);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatMonthYear(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function monthLabel(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/** Epoch milliseconds a loan is due, at 8:00 PM local time on `value`. */
export function dueEpoch(value: string): number {
  const date = fromISODate(value);
  date.setHours(DUE_HOUR, 0, 0, 0);
  return date.getTime();
}

export type DueTone = "ok" | "soon" | "due-today" | "overdue";

export type DueInfo = {
  tone: DueTone;
  /** e.g. "2 days", "9 hours", "3 days ago" */
  amount: string;
  /** e.g. "2 days left", "Overdue by 3 days" */
  label: string;
  /** 0 → just started, 1 → exactly at the deadline. */
  progress: number;
};

/**
 * Turns a deadline into something a person can read at a glance.
 * `startedAt` is used only for the progress bar.
 */
export function describeDue(deadline: string, startedAt: number | null, now: number): DueInfo {
  const deadlineMs = dueEpoch(deadline);
  const remainingMs = deadlineMs - now;
  const hours = Math.round(remainingMs / 3_600_000);
  const days = Math.round(remainingMs / 86_400_000);

  const from = startedAt ?? now;
  const total = Math.max(deadlineMs - from, 1);
  const progress = Math.min(Math.max((now - from) / total, 0), 1);

  if (remainingMs < 0) {
    // Floor so a loan is never described as less overdue than it is, and stays
    // consistent with `overdueDays`.
    const overdue = Math.max(1, Math.floor(Math.abs(remainingMs) / 86_400_000));
    return {
      tone: "overdue",
      amount: overdue === 1 ? "1 day" : `${overdue} days`,
      label: overdue === 1 ? "Overdue by 1 day" : `Overdue by ${overdue} days`,
      progress: 1,
    };
  }

  if (remainingMs < 86_400_000) {
    const rounded = Math.max(hours, 1);
    return {
      tone: "due-today",
      amount: `${rounded} ${rounded === 1 ? "hour" : "hours"}`,
      label: rounded === 1 ? "Due in 1 hour" : `Due in ${rounded} hours`,
      progress,
    };
  }

  return {
    tone: days <= 1 ? "soon" : "ok",
    amount: days === 1 ? "1 day" : `${days} days`,
    label: days === 1 ? "1 day left" : `${days} days left`,
    progress,
  };
}

/** "3 days" / "1 day" / "Same day" for a date range. */
export function describeRange(from: string, to: string): string {
  const nights = daysBetween(from, to);
  if (nights <= 0) return "Same day";
  return nights === 1 ? "1 day" : `${nights} days`;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${minutes} ${suffix}`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const iso = toISODate(date);
  const diff = daysBetween(iso, todayISO());
  if (diff === 0) return `Today at ${formatTime(timestamp)}`;
  if (diff === 1) return `Yesterday at ${formatTime(timestamp)}`;
  return `${formatShort(iso)} at ${formatTime(timestamp)}`;
}

export type CalendarCell = {
  iso: string;
  inMonth: boolean;
};

/** Six weeks of days covering the given month, for a stable calendar height. */
export function calendarGrid(month: Date): CalendarCell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - first.getDay());

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ iso: toISODate(date), inMonth: date.getMonth() === monthIndex });
  }
  return cells;
}

export function eachDayInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const total = daysBetween(from, to);
  for (let i = 0; i <= total; i += 1) out.push(addDays(from, i));
  return out;
}

export const HANDOFF_SLOTS = [
  "8:00 AM",
  "12:30 PM",
  "5:00 PM",
  "6:30 PM",
  "8:00 PM",
] as const;
