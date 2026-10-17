import { borrower, selfOwnerId } from "../data/catalogue";
import { todayISO } from "./dates";
import { isValidDailyFee, safeDepositAmount } from "./pricing";
import type { BorrowRequest, Item, PersistedState } from "../types";

const STORAGE_KEY = "borrowly.prototype.state.v1";
const STATE_VERSION = 3;

/** Fallback location for records written before locations were structured. */
const borrowerLocation = borrower.location;

export type SaveOutcome = "ok" | "quota" | "unavailable";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

/**
 * Rebuilds a request from stored data, filling in anything a previous
 * version did not have. Malformed entries are dropped rather than crashing
 * the app on load.
 */
function normalizeRequest(raw: unknown): BorrowRequest | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const itemId = str(raw.itemId);
  const ownerId = str(raw.ownerId);
  if (!id || !itemId || !ownerId) return null;

  const startDate = str(raw.startDate, todayISO());
  const returnDate = str(raw.returnDate, startDate);

  const handoff = isRecord(raw.handoff) ? raw.handoff : {};
  const returnHandoff = isRecord(raw.returnHandoff) ? raw.returnHandoff : {};
  const checklist = isRecord(raw.returnChecklist) ? raw.returnChecklist : null;
  const extension = isRecord(raw.extension) ? raw.extension : null;
  const issue = isRecord(raw.issue) ? raw.issue : null;

  return {
    id,
    itemId,
    ownerId,
    direction: raw.direction === "incoming" ? "incoming" : "outgoing",
    borrowerName: typeof raw.borrowerName === "string" ? raw.borrowerName : null,
    createdAt: num(raw.createdAt, Date.now()),
    startDate,
    returnDate,
    originalReturnDate: str(raw.originalReturnDate, returnDate),
    message: str(raw.message),
    status:
      raw.status === "approved" || raw.status === "declined" || raw.status === "cancelled"
        ? raw.status
        : "pending",
    decidedAt: typeof raw.decidedAt === "number" ? raw.decidedAt : null,
    declineReason: typeof raw.declineReason === "string" ? raw.declineReason : null,
    collectedAt: typeof raw.collectedAt === "number" ? raw.collectedAt : null,
    handedBackAt: typeof raw.handedBackAt === "number" ? raw.handedBackAt : null,
    confirmedAt: typeof raw.confirmedAt === "number" ? raw.confirmedAt : null,
    resolvedWithoutConfirmationAt:
      typeof raw.resolvedWithoutConfirmationAt === "number"
        ? raw.resolvedWithoutConfirmationAt
        : null,
    nudges: num(raw.nudges, 0),
    handoff: {
      place: str(handoff.place),
      note: str(handoff.note),
      proposed: str(handoff.proposed),
    },
    returnHandoff: {
      date: typeof returnHandoff.date === "string" ? returnHandoff.date : null,
      slot: typeof returnHandoff.slot === "string" ? returnHandoff.slot : null,
      place: str(returnHandoff.place),
      note: str(returnHandoff.note),
    },
    returnChecklist: checklist
      ? {
          condition:
            checklist.condition === "minor-wear" || checklist.condition === "issue"
              ? checklist.condition
              : "same",
          accessories: strArray(checklist.accessories),
          notes: str(checklist.notes),
          completedAt: num(checklist.completedAt, Date.now()),
        }
      : null,
    extension: extension
      ? {
          requestedAt: num(extension.requestedAt, Date.now()),
          previousReturnDate: str(extension.previousReturnDate, returnDate),
          newReturnDate: str(extension.newReturnDate, returnDate),
          status:
            extension.status === "approved" || extension.status === "declined"
              ? extension.status
              : "pending",
          decidedAt: typeof extension.decidedAt === "number" ? extension.decidedAt : null,
          reason: str(extension.reason),
        }
      : null,
    issue: issue
      ? {
          reportedAt: num(issue.reportedAt, Date.now()),
          kind:
            issue.kind === "late" || issue.kind === "no-response" || issue.kind === "other"
              ? issue.kind
              : "damaged",
          note: str(issue.note),
        }
      : null,
  };
}

/** Rebuilds a stored listing, dropping entries without a usable photo. */
function normalizeListing(raw: unknown): Item | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const name = str(raw.name);
  if (!id || !name) return null;

  const photos = strArray(raw.photos);
  const photo = str(raw.photo, photos[0] ?? "");
  if (!photo) return null;

  // Location moved from a flat `community` string to a structured object.
  // Old records keep working; anything missing falls back to the borrower's
  // own area rather than inventing a place.
  const rawLocation = isRecord(raw.location) ? raw.location : {};
  const location: Item["location"] = {
    city: str(rawLocation.city, borrowerLocation.city),
    neighbourhood: str(rawLocation.neighbourhood, borrowerLocation.neighbourhood),
    community: str(rawLocation.community, str(raw.community, borrowerLocation.community)),
  };

  // Pricing: anything missing or malformed becomes free lending.
  const rawPricing = isRecord(raw.pricing) ? raw.pricing : {};
  const pricedAsPaid = rawPricing.type === "paid";
  const storedFee = typeof rawPricing.dailyFee === "number" ? rawPricing.dailyFee : undefined;
  const pricing: Item["pricing"] =
    pricedAsPaid && storedFee !== undefined && isValidDailyFee(storedFee)
      ? { type: "paid", dailyFee: storedFee }
      : { type: "free", dailyFee: 0 };

  // Deposit: only counts if it is switched on *and* holds a valid amount.
  const rawDeposit = isRecord(raw.deposit) ? raw.deposit : {};
  const wantedDeposit = rawDeposit.required === true;
  const storedDeposit =
    typeof rawDeposit.amount === "number" ? safeDepositAmount(rawDeposit.amount) : 0;
  const deposit: Item["deposit"] =
    wantedDeposit && storedDeposit > 0
      ? { required: true, amount: storedDeposit }
      : { required: false, amount: 0 };

  return {
    id,
    name,
    category: (str(raw.category, "Home") as Item["category"]) ?? "Home",
    ownerId: str(raw.ownerId, selfOwnerId),
    photo,
    photos: photos.length > 0 ? photos : [photo],
    condition: str(raw.condition, "Good"),
    summary: str(raw.summary),
    description: str(raw.description),
    accessories: strArray(raw.accessories),
    maxDays: typeof raw.maxDays === "number" && Number.isFinite(raw.maxDays) ? raw.maxDays : null,
    handoffPlace: str(raw.handoffPlace),
    handoffNote: str(raw.handoffNote),
    handoffPreferences: strArray(raw.handoffPreferences),
    availability: raw.availability === "unavailable" ? "unavailable" : "available",
    unavailableNote: typeof raw.unavailableNote === "string" ? raw.unavailableNote : undefined,
    bookedRanges: Array.isArray(raw.bookedRanges)
      ? raw.bookedRanges
          .filter(isRecord)
          .map((range) => ({ from: str(range.from), to: str(range.to) }))
          .filter((range) => range.from && range.to)
      : [],
    tags: strArray(raw.tags),
    origin: "user",
    location,
    locationVisibility: raw.locationVisibility === "community" ? "community" : "floor",
    pricing,
    deposit,
    availabilityFrom: typeof raw.availabilityFrom === "string" ? raw.availabilityFrom : null,
    paused: bool(raw.paused),
    createdAt: num(raw.createdAt, Date.now()),
    updatedAt: num(raw.updatedAt, Date.now()),
  };
}

function dedupeById<T extends { id: string }>(entries: T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

/**
 * Rebuilds persisted state from storage, tolerating anything unexpected.
 * A previous version of the app simply had no listings, and that is fine.
 */
export function normalizeState(raw: unknown): PersistedState {
  const source = isRecord(raw) ? raw : {};

  const requests = dedupeById(
    (Array.isArray(source.requests) ? source.requests : [])
      .map(normalizeRequest)
      .filter((entry): entry is BorrowRequest => entry !== null),
  );

  const listings = dedupeById(
    (Array.isArray(source.listings) ? source.listings : [])
      .map(normalizeListing)
      .filter((entry): entry is Item => entry !== null),
  );

  const drafts: PersistedState["drafts"] = {};
  if (isRecord(source.drafts)) {
    Object.entries(source.drafts).forEach(([key, value]) => {
      if (!isRecord(value)) return;
      drafts[key] = {
        startDate: str(value.startDate, todayISO()),
        returnDate: str(value.returnDate, todayISO()),
        message: str(value.message),
        messageTouched: bool(value.messageTouched),
      };
    });
  }

  const conversations = (Array.isArray(source.conversations) ? source.conversations : [])
    .filter(isRecord)
    .map((conversation) => ({
      ownerId: str(conversation.ownerId),
      itemId: str(conversation.itemId),
      requestId: typeof conversation.requestId === "string" ? conversation.requestId : null,
      unread: num(conversation.unread, 0),
      messages: (Array.isArray(conversation.messages) ? conversation.messages : [])
        .filter(isRecord)
        .map((message) => ({
          id: str(message.id, `msg_${Math.random().toString(36).slice(2, 8)}`),
          from: message.from === "owner" ? ("owner" as const) : ("me" as const),
          body: str(message.body),
          at: num(message.at, Date.now()),
          simulated: bool(message.simulated),
        })),
    }))
    .filter((conversation) => conversation.ownerId && conversation.itemId);

  return {
    version: STATE_VERSION,
    requests,
    drafts,
    conversations,
    listings,
  };
}

export function emptyState(): PersistedState {
  return { version: STATE_VERSION, requests: [], drafts: {}, conversations: [], listings: [] };
}

/** Prototype state lives in localStorage so a refresh keeps your work. */
export function loadState(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): SaveOutcome {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return "ok";
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED"
      ? "quota"
      : "unavailable";
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing useful to do if storage is unavailable.
  }
}

export { STATE_VERSION };
