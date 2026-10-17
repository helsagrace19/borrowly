/**
 * Pure borrowing logic: lifecycle phases, blocked dates and validation.
 *
 * Kept free of React so the rules stay easy to read and test, and so the
 * same functions can drive both the UI and the prototype's simulations.
 */

import type { BorrowRequest, Item, LoanPhase } from "../types";
import { addDays, daysBetween, dueEpoch, eachDayInclusive, todayISO } from "./dates";

export const ACTIVE_PHASES: LoanPhase[] = [
  "requested",
  "approved",
  "collected",
  "overdue",
  "return-pending",
];

export function isActivePhase(phase: LoanPhase): boolean {
  return ACTIVE_PHASES.includes(phase);
}

/** A return the owner has not confirmed, closed by the borrower instead. */
export function isUnconfirmedClose(request: BorrowRequest): boolean {
  return Boolean(request.resolvedWithoutConfirmationAt && !request.confirmedAt);
}

/** The date the item is currently due back, taking extensions into account. */
export function deadlineOf(request: BorrowRequest): string {
  if (request.extension && request.extension.status === "approved") {
    return request.extension.newReturnDate;
  }
  return request.returnDate;
}

export function phaseOf(request: BorrowRequest, now: number): LoanPhase {
  if (request.status === "declined") return "declined";
  if (request.status === "cancelled") return "cancelled";
  if (request.status === "pending") return "requested";

  // From here the owner has approved the request.
  if (request.confirmedAt) return "returned";
  if (request.handedBackAt) {
    return request.resolvedWithoutConfirmationAt ? "returned" : "return-pending";
  }
  if (request.collectedAt) {
    return now > dueEpoch(deadlineOf(request)) ? "overdue" : "collected";
  }
  return "approved";
}

export function phaseLabel(phase: LoanPhase): string {
  switch (phase) {
    case "requested":
      return "Waiting for approval";
    case "approved":
      return "Approved — ready to collect";
    case "collected":
      return "With you now";
    case "overdue":
      return "Overdue";
    case "return-pending":
      return "Awaiting confirmation";
    case "returned":
      return "Returned";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
  }
}

/** Days a loan has been overdue. `0` when it is not late. */
export function overdueDays(request: BorrowRequest, now: number): number {
  const overdue = Math.floor((now - dueEpoch(deadlineOf(request))) / 86_400_000);
  return overdue > 0 ? overdue : 0;
}

/** How late a loan is, as "1 day" / "3 days", or null when it is on time. */
export function overdueAmount(request: BorrowRequest, now: number): string | null {
  const late = overdueDays(request, now);
  if (late <= 0) return null;
  return late === 1 ? "1 day" : `${late} days`;
}

/**
 * A request that is still in flight for this item: waiting, approved,
 * with the borrower, or awaiting return confirmation. Finished loans
 * (returned, declined, cancelled) no longer block a new request.
 *
 * Only the borrower's own outgoing requests count — a neighbour's incoming
 * request on your listing is not something you can block yourself with.
 */
export function requestForItem(
  requests: BorrowRequest[],
  itemId: string,
  now: number,
): BorrowRequest | undefined {
  return requests.find(
    (request) =>
      request.itemId === itemId &&
      request.direction === "outgoing" &&
      isActivePhase(phaseOf(request, now)),
  );
}

export type RequestEligibility = {
  allowed: boolean;
  reason?: string;
  /** The request that is getting in the way, when there is one. */
  blocking?: BorrowRequest;
};

export function canRequestItem(
  item: Item,
  requests: BorrowRequest[],
  now: number,
  selfOwnerId?: string,
): RequestEligibility {
  if (selfOwnerId && item.ownerId === selfOwnerId) {
    return {
      allowed: false,
      reason: "This is your own listing. Manage it from My Listings.",
    };
  }

  const existing = requestForItem(requests, item.id, now);
  if (existing) {
    const phase = phaseOf(existing, now);
    if (phase === "requested") {
      return {
        allowed: false,
        reason: "You already have a request waiting for approval.",
        blocking: existing,
      };
    }
    return {
      allowed: false,
      reason:
        phase === "return-pending"
          ? "You've handed this back and are waiting for the owner to confirm."
          : "This item is already with you.",
      blocking: existing,
    };
  }

  if (item.availability === "unavailable") {
    return {
      allowed: false,
      reason: item.unavailableNote ?? "This item isn't available right now.",
    };
  }

  return { allowed: true };
}

/**
 * Dates the borrower cannot pick: days already promised to someone else.
 * Past days are handled separately so the calendar can grey them out too.
 */
export function bookedDatesFor(item: Item): Set<string> {
  const blocked = new Set<string>();
  item.bookedRanges.forEach((range) => {
    eachDayInclusive(range.from, range.to).forEach((day) => blocked.add(day));
  });
  return blocked;
}

export type ReservationSource = "booking" | "loan" | "incoming";

/** A confirmed claim on an item's calendar, from any direction. */
export type Reservation = {
  from: string;
  to: string;
  source: ReservationSource;
  /** The request behind it, when there is one. */
  request?: BorrowRequest;
};

/**
 * The single source of truth for "when is this item out of circulation".
 *
 * Deliberately conservative: only promises that have actually been agreed
 * count. A pending request does not block anything, because the owner has
 * not said yes yet.
 */
export function reservationsFor(item: Item, requests: BorrowRequest[]): Reservation[] {
  const reservations: Reservation[] = item.bookedRanges.map((range) => ({
    from: range.from,
    to: range.to,
    source: "booking" as const,
  }));

  requests.forEach((request) => {
    if (request.itemId !== item.id) return;
    if (request.status === "cancelled" || request.status === "declined") return;

    if (request.direction === "incoming") {
      // Only an agreed request holds the item for a neighbour, and only until
      // the owner marks it as back.
      if (request.status === "approved" && !request.confirmedAt) {
        reservations.push({
          from: request.startDate,
          to: request.returnDate,
          source: "incoming",
          request,
        });
      }
      return;
    }

    // Outgoing: the item is only gone while it is genuinely with the
    // borrower. Once handed back it is home again, confirmed or not.
    if (!request.collectedAt || request.handedBackAt) return;
    reservations.push({
      from: toISODateFrom(request.collectedAt),
      to: request.returnDate,
      source: "loan",
      request,
    });
  });

  return reservations;
}

/** Local ISO date for a timestamp, used when a loan is already under way. */
function toISODateFrom(timestamp: number): string {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Every day the item is with someone else, for the calendar and validation. */
export function unavailableDatesFor(item: Item, requests: BorrowRequest[]): Set<string> {
  const blocked = new Set<string>();
  reservationsFor(item, requests).forEach((reservation) => {
    eachDayInclusive(reservation.from, reservation.to).forEach((day) => blocked.add(day));
  });
  return blocked;
}

/** The reservation covering `day`, if the item is spoken for. */
export function reservationOn(
  item: Item,
  requests: BorrowRequest[],
  day: string = todayISO(),
): Reservation | undefined {
  return reservationsFor(item, requests).find(
    (reservation) =>
      daysBetween(reservation.from, day) >= 0 && daysBetween(day, reservation.to) >= 0,
  );
}

/**
 * The soonest window of `durationDays` that is completely free, used so the
 * request form never opens on dates that clash with someone else's booking.
 */
export function firstAvailableRange(
  item: Item,
  requests: BorrowRequest[],
  durationDays: number,
  from: string = todayISO(),
): { startDate: string; returnDate: string } {
  const blocked = unavailableDatesFor(item, requests);
  const duration = Math.max(1, durationDays);

  for (let offset = 0; offset < 60; offset += 1) {
    const start = addDays(from, offset);
    const end = addDays(start, duration);
    const free = eachDayInclusive(start, end).every((day) => !blocked.has(day));
    if (free) return { startDate: start, returnDate: end };
  }

  return { startDate: from, returnDate: addDays(from, duration) };
}

export type RangeErrors = {
  start?: string;
  return?: string;
  form?: string;
};

export type RangeValidation = {
  ok: boolean;
  errors: RangeErrors;
  days: number;
};

export type ValidateRangeInput = {
  item: Item;
  ownerName: string;
  startDate: string;
  returnDate: string;
  requests: BorrowRequest[];
};

export function validateRange({
  item,
  ownerName,
  startDate,
  returnDate,
  requests,
}: ValidateRangeInput): RangeValidation {
  const errors: RangeErrors = {};
  const today = todayISO();

  if (!startDate) {
    errors.start = "Choose a start date.";
  } else if (daysBetween(today, startDate) < 0) {
    errors.start = "That start date has already passed.";
  }

  if (!returnDate) {
    errors.return = "Choose a return date.";
  } else if (startDate && daysBetween(startDate, returnDate) < 1) {
    errors.return = "The return date has to be at least one day after the start.";
  }

  const days = startDate && returnDate ? daysBetween(startDate, returnDate) : 0;

  if (!errors.return && item.maxDays !== null && days > item.maxDays) {
    errors.return =
      item.maxDays === 1
        ? `${ownerName} lends this for one day at a time.`
        : `${ownerName} lends this for up to ${item.maxDays} days.`;
  }

  if (!errors.start && !errors.return && startDate && returnDate) {
    const blocked = unavailableDatesFor(item, requests);
    const clash = eachDayInclusive(startDate, returnDate).find((day) => blocked.has(day));
    if (clash) {
      errors.form = "Part of that range is already booked by someone else.";
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, days };
}

/** Default message a borrower can edit before sending. */
export function defaultMessage(item: Item, ownerFirstName: string): string {
  return `Hi ${ownerFirstName}, I'd like to borrow your ${item.name.toLowerCase()}. I can collect it from the ${item.handoffPlace.toLowerCase()} and I'll bring it back in the same condition.`;
}

export function firstNameOf(name: string): string {
  return name.split(" ")[0];
}

/** Short, honest reply text used by the prototype's simulations. */
export function simulatedReply(
  intent: "approve" | "decline" | "extend" | "confirm" | "message",
  itemName: string,
): string {
  switch (intent) {
    case "approve":
      return `All yours — ${itemName.toLowerCase()} is ready whenever you are. Just knock or message me here.`;
    case "decline":
      return `So sorry, I need the ${itemName.toLowerCase()} myself this week. Ask me again after the weekend?`;
    case "extend":
      return `No problem at all, keep it a bit longer. Thanks for asking rather than guessing.`;
    case "confirm":
      return `Got it back, thank you! Everything looks fine. Hope it was useful.`;
    case "message":
      return `Thanks for the heads up — that works for me.`;
  }
}
