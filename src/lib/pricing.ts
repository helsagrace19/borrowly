/**
 * Pricing rules.
 *
 * One billing rule, expressed once: a paid listing charges its daily fee for
 * every borrowing day. Everything that shows money — the listing form, the
 * item page, the request summary, extensions and active borrowing — goes
 * through here so the numbers can never disagree.
 */

import type { Deposit, Item, Pricing } from "../types";
import { daysBetween } from "./dates";

export const CURRENCY = "₦";
export const DEFAULT_DAILY_FEE = 500;
export const MAX_DAILY_FEE = 500_000;
export const MAX_DEPOSIT_AMOUNT = 5_000_000;

/** `₦1,500` — whole naira, grouped for reading. */
export function formatNaira(amount: number): string {
  if (!Number.isFinite(amount)) return `${CURRENCY}0`;
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${CURRENCY}${digits}`;
}

export function formatPricePerDay(amount: number): string {
  return `${formatNaira(amount)}/day`;
}

/**
 * Reads a money amount a person typed. Accepts `500`, `1,500`, `₦500` and
 * `500.00`; anything else is rejected rather than guessed at.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

export function isValidDailyFee(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 1 && value <= MAX_DAILY_FEE;
}

export function isValidDepositAmount(value: number): boolean {
  return (
    Number.isFinite(value) && Number.isInteger(value) && value >= 1 && value <= MAX_DEPOSIT_AMOUNT
  );
}

/** Coerces anything stored or typed into a safe fee. */
export function safeDailyFee(value: unknown): number {
  return typeof value === "number" && isValidDailyFee(value) ? value : DEFAULT_DAILY_FEE;
}

export function safeDepositAmount(value: unknown): number {
  return typeof value === "number" && isValidDepositAmount(value) ? value : 0;
}

/**
 * Billable days between two dates. Uses the same day-count as the rest of
 * the app, and never returns a negative or fractional number.
 */
export function billedDays(startISO: string, returnISO: string): number {
  if (!startISO || !returnISO) return 0;
  const diff = daysBetween(startISO, returnISO);
  return diff > 0 ? diff : 0;
}

export type CostBreakdown = {
  days: number;
  isPaid: boolean;
  dailyFee: number;
  /** Naira owed for the borrowing period, excluding any deposit. */
  borrowFee: number;
  depositRequired: boolean;
  deposit: number;
  /** What may be needed before handoff: the fee plus the refundable deposit. */
  totalBeforeHandoff: number;
};

export type PriceableItem = Pick<Item, "pricing" | "deposit">;

export function costForDays(item: PriceableItem, days: number): CostBreakdown {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.round(days) : 0;

  const isPaid = item.pricing.type === "paid" && isValidDailyFee(item.pricing.dailyFee);
  const dailyFee = isPaid ? item.pricing.dailyFee : 0;

  const depositRequired = item.deposit.required && isValidDepositAmount(item.deposit.amount);
  const deposit = depositRequired ? item.deposit.amount : 0;

  const borrowFee = isPaid ? dailyFee * safeDays : 0;

  return {
    days: safeDays,
    isPaid,
    dailyFee,
    borrowFee,
    depositRequired,
    deposit,
    totalBeforeHandoff: borrowFee + deposit,
  };
}

/** Cost for a specific date range, using the shared day-count rule. */
export function costForRange(
  item: PriceableItem,
  startISO: string,
  returnISO: string,
): CostBreakdown {
  return costForDays(item, billedDays(startISO, returnISO));
}

export type CostComparison = {
  before: CostBreakdown;
  after: CostBreakdown;
  extraDays: number;
  /** Extra borrowing fee the longer period would add. */
  extraFee: number;
  /** Change to the amount needed before handoff, deposit included. */
  difference: number;
};

/** What a change of return date does to the money, used for extensions. */
export function compareCosts(
  item: PriceableItem,
  startISO: string,
  previousReturnISO: string,
  newReturnISO: string,
): CostComparison {
  const before = costForRange(item, startISO, previousReturnISO);
  const after = costForRange(item, startISO, newReturnISO);

  return {
    before,
    after,
    extraDays: after.days - before.days,
    extraFee: after.borrowFee - before.borrowFee,
    difference: after.totalBeforeHandoff - before.totalBeforeHandoff,
  };
}

/** The headline terms, as they read on a card or a listing. */
export function priceLabel(item: PriceableItem): string {
  const { isPaid, dailyFee } = costForDays(item, 1);
  return isPaid ? formatPricePerDay(dailyFee) : "Free to borrow";
}

/** A shorter version for tight spots, e.g. a card badge. */
export function shortPriceLabel(item: PriceableItem): string {
  const { isPaid, dailyFee } = costForDays(item, 1);
  return isPaid ? formatPricePerDay(dailyFee) : "Free";
}

export function depositLabel(item: PriceableItem): string | null {
  const { depositRequired, deposit } = costForDays(item, 1);
  return depositRequired ? formatNaira(deposit) : null;
}

/** Worked examples shown on the item page, where no dates are chosen yet. */
export function feeExamples(item: PriceableItem, days: number[] = [1, 3, 7]): {
  days: number;
  amount: number;
}[] {
  return days.map((day) => ({ days: day, amount: costForDays(item, day).borrowFee }));
}

/** A blank, valid pricing configuration. */
export function freePricing(): Pricing {
  return { type: "free", dailyFee: 0 };
}

export function paidPricing(dailyFee: number = DEFAULT_DAILY_FEE): Pricing {
  return { type: "paid", dailyFee: safeDailyFee(dailyFee) };
}

export function noDeposit(): Deposit {
  return { required: false, amount: 0 };
}
