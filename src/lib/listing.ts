/**
 * Listing rules: drafts, validation, publishing, availability display.
 *
 * Pure functions only, so the create/edit flow, the My Listings screen and
 * the prototype's simulations all agree on the same rules.
 */

import { borrower, conditionOptions, selfOwnerId } from "../data/catalogue";
import type {
  BorrowRequest,
  Category,
  Item,
  ListingStatus,
  LocationVisibility,
  PricingType,
} from "../types";
import { daysBetween, formatShort, todayISO } from "./dates";
import { reservationOn, reservationsFor } from "./loan";
import {
  DEFAULT_DAILY_FEE,
  isValidDailyFee,
  isValidDepositAmount,
  safeDailyFee,
  safeDepositAmount,
} from "./pricing";

export type ListingDraft = {
  name: string;
  category: Category | "";
  condition: string;
  description: string;
  /** Data URLs or bundled asset URLs. First one is the primary photo. */
  photos: string[];
  accessories: string[];
  maxDays: number;
  /** `null` means available right now. */
  availabilityFrom: string | null;
  city: string;
  neighbourhood: string;
  community: string;
  locationVisibility: LocationVisibility;
  handoffPreferences: string[];
  handoffPlace: string;
  handoffNote: string;
  pricingType: PricingType;
  /** Always held, even when free, so switching to Paid starts at ₦500. */
  dailyFee: number;
  depositRequired: boolean;
  depositAmount: number;
};

export const MAX_PHOTOS = 6;

export function emptyListingDraft(): ListingDraft {
  return {
    name: "",
    category: "",
    condition: conditionOptions[1],
    description: "",
    photos: [],
    accessories: [],
    maxDays: 3,
    availabilityFrom: null,
    city: borrower.location.city,
    neighbourhood: borrower.location.neighbourhood,
    community: borrower.location.community,
    locationVisibility: "floor",
    handoffPreferences: ["Lobby handover"],
    handoffPlace: "",
    handoffNote: "",
    pricingType: "free",
    dailyFee: DEFAULT_DAILY_FEE,
    depositRequired: false,
    depositAmount: 0,
  };
}

/** Loads an existing listing back into an editable draft. */
export function draftFromItem(item: Item): ListingDraft {
  return {
    name: item.name,
    category: item.category,
    condition: item.condition,
    description: item.description,
    photos: item.photos.length > 0 ? [...item.photos] : [item.photo],
    accessories: [...item.accessories],
    maxDays: item.maxDays ?? 3,
    availabilityFrom: item.availabilityFrom,
    city: item.location.city,
    neighbourhood: item.location.neighbourhood,
    community: item.location.community,
    locationVisibility: item.locationVisibility,
    handoffPreferences: [...item.handoffPreferences],
    handoffPlace: item.handoffPlace,
    handoffNote: item.handoffNote,
    pricingType: item.pricing.type,
    dailyFee: item.pricing.type === "paid" ? item.pricing.dailyFee : DEFAULT_DAILY_FEE,
    depositRequired: item.deposit.required,
    depositAmount: item.deposit.required ? item.deposit.amount : 0,
  };
}

export type DraftErrors = Partial<Record<keyof ListingDraft | "form", string>>;

const NAME_MIN = 3;
const DESCRIPTION_MIN = 20;

export function validateBasics(draft: ListingDraft): DraftErrors {
  const errors: DraftErrors = {};

  const name = draft.name.trim();
  if (name.length < NAME_MIN) {
    errors.name = `Give it a name of at least ${NAME_MIN} characters.`;
  }
  if (!draft.category) {
    errors.category = "Pick the category that fits best.";
  }
  if (draft.description.trim().length < DESCRIPTION_MIN) {
    errors.description = `Add a few words about it — at least ${DESCRIPTION_MIN} characters.`;
  }
  if (!draft.condition) {
    errors.condition = "Say what condition it is in.";
  }

  return errors;
}

export function validatePhotos(draft: ListingDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.photos.length === 0) {
    errors.photos = "Add at least one photo so neighbours know what they are borrowing.";
  }
  return errors;
}

export function validateDetails(draft: ListingDraft): DraftErrors {
  const errors: DraftErrors = {};

  if (!Number.isFinite(draft.maxDays) || draft.maxDays < 1 || draft.maxDays > 30) {
    errors.maxDays = "Choose a maximum loan of between 1 and 30 days.";
  }
  if (draft.availabilityFrom && daysBetween(todayISO(), draft.availabilityFrom) < 0) {
    errors.availabilityFrom = "Pick a date in the future, or choose available now.";
  }

  return errors;
}

export function validateHandoff(draft: ListingDraft): DraftErrors {
  const errors: DraftErrors = {};

  if (!draft.city) {
    errors.city = "Choose the city the item is in.";
  }
  if (!draft.neighbourhood) {
    errors.neighbourhood = "Choose the neighbourhood borrowers should search in.";
  }
  if (!draft.handoffPlace.trim()) {
    errors.handoffPlace = "Say where you would hand it over. Only you can see this.";
  }
  if (draft.handoffPreferences.length === 0) {
    errors.handoffPreferences = "Pick at least one way you are happy to hand things over.";
  }

  return errors;
}

/**
 * Money rules. A free listing never carries a fee; a paid one needs a real
 * amount. A deposit only counts when it is switched on and valid.
 */
export function validatePricing(draft: ListingDraft): DraftErrors {
  const errors: DraftErrors = {};

  if (draft.pricingType === "paid" && !isValidDailyFee(draft.dailyFee)) {
    errors.dailyFee = "Set a daily fee between ₦1 and ₦500,000.";
  }
  if (draft.depositRequired && !isValidDepositAmount(draft.depositAmount)) {
    errors.depositAmount = "Set a deposit between ₦1 and ₦5,000,000, or turn the deposit off.";
  }

  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Stable, readable ids so a listing can be recognised in storage. */
export function newListingId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `listing_${random}`;
}

/** A short one-line summary derived from the description. */
export function summarise(description: string): string {
  const firstSentence = description.trim().split(/(?<=[.!?])\s/)[0] ?? description.trim();
  const cleaned = firstSentence.replace(/\s+/g, " ");
  return cleaned.length > 96 ? `${cleaned.slice(0, 93).trimEnd()}…` : cleaned;
}

/** Search terms derived from the listing so it is findable straight away. */
export function deriveTags(draft: ListingDraft): string[] {
  const words =
    `${draft.name} ${draft.category} ${draft.condition} ${draft.handoffPreferences.join(" ")} ${draft.neighbourhood} ${draft.city} ${draft.community}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);

  return [...new Set(words)].slice(0, 24);
}

/** Turns the draft's money fields into the stored pricing shape. */
function pricingFromDraft(draft: ListingDraft): Item["pricing"] {
  if (draft.pricingType !== "paid") return { type: "free", dailyFee: 0 };
  return { type: "paid", dailyFee: safeDailyFee(draft.dailyFee) };
}

function depositFromDraft(draft: ListingDraft): Item["deposit"] {
  if (!draft.depositRequired) return { required: false, amount: 0 };
  const amount = safeDepositAmount(draft.depositAmount);
  return amount > 0 ? { required: true, amount } : { required: false, amount: 0 };
}

function locationFromDraft(draft: ListingDraft): Item["location"] {
  return {
    city: draft.city,
    neighbourhood: draft.neighbourhood,
    community: draft.community,
  };
}

/** Builds a brand new listing from a validated draft. */
export function createListingFromDraft(draft: ListingDraft, now: number): Item {
  const availability = deriveAvailability(draft);

  return {
    id: newListingId(),
    name: draft.name.trim(),
    category: draft.category as Category,
    ownerId: selfOwnerId,
    photo: draft.photos[0],
    photos: [...draft.photos],
    condition: draft.condition,
    summary: summarise(draft.description),
    description: draft.description.trim(),
    accessories: [...draft.accessories],
    maxDays: draft.maxDays,
    handoffPlace: draft.handoffPlace.trim(),
    handoffNote: draft.handoffNote.trim(),
    handoffPreferences: [...draft.handoffPreferences],
    availability: availability.value,
    unavailableNote: availability.note,
    // Seeded items carry fixed bookings; user listings are reserved purely
    // through agreed requests, so this stays empty.
    bookedRanges: [],
    tags: deriveTags(draft),
    origin: "user",
    location: locationFromDraft(draft),
    locationVisibility: draft.locationVisibility,
    pricing: pricingFromDraft(draft),
    deposit: depositFromDraft(draft),
    availabilityFrom: draft.availabilityFrom,
    paused: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Applies edited fields to an existing listing.
 *
 * Identity, ownership, creation time and any bookings are carried over
 * untouched, so a confirmed loan can never be invalidated by an edit.
 */
export function applyDraftToListing(item: Item, draft: ListingDraft, now: number): Item {
  const availability = deriveAvailability({ ...draft, paused: item.paused });

  return {
    ...item,
    name: draft.name.trim(),
    category: draft.category as Category,
    photo: draft.photos[0] ?? item.photo,
    photos: draft.photos.length > 0 ? [...draft.photos] : item.photos,
    condition: draft.condition,
    summary: summarise(draft.description),
    description: draft.description.trim(),
    accessories: [...draft.accessories],
    maxDays: draft.maxDays,
    handoffPlace: draft.handoffPlace.trim(),
    handoffNote: draft.handoffNote.trim(),
    handoffPreferences: [...draft.handoffPreferences],
    availability: availability.value,
    unavailableNote: availability.note,
    tags: deriveTags(draft),
    location: locationFromDraft(draft),
    locationVisibility: draft.locationVisibility,
    pricing: pricingFromDraft(draft),
    deposit: depositFromDraft(draft),
    availabilityFrom: draft.availabilityFrom,
    updatedAt: now,
  };
}

/** Recomputes the public availability flag from pause + "away until". */
export function deriveAvailability(draft: {
  paused?: boolean;
  availabilityFrom: string | null;
}): { value: "available" | "unavailable"; note?: string } {
  const away = draft.availabilityFrom;
  if (away && daysBetween(todayISO(), away) > 0) {
    return { value: "unavailable", note: `Back on ${formatShort(away)}` };
  }
  return { value: "available" };
}

export type ListingStatusInfo = {
  status: ListingStatus;
  label: string;
  detail: string;
};

/**
 * Availability of one of your own listings, derived from pause state and the
 * agreed reservations that already exist for it.
 */
export function listingStatus(
  item: Item,
  requests: BorrowRequest[],
  now: number,
): ListingStatusInfo {
  if (item.paused) {
    return {
      status: "paused",
      label: "Paused",
      detail: "Hidden from Discover until you resume lending.",
    };
  }

  const reservation = reservationOn(item, requests, todayISO());
  if (reservation) {
    if (reservation.source === "incoming" && reservation.request?.borrowerName) {
      return {
        status: "on-loan",
        label: "On loan",
        detail: `${reservation.request.borrowerName} has it until ${formatShort(reservation.to)}.`,
      };
    }
    return {
      status: "on-loan",
      label: "On loan",
      detail: `Spoken for until ${formatShort(reservation.to)}.`,
    };
  }

  if (item.availabilityFrom && daysBetween(todayISO(), item.availabilityFrom) > 0) {
    return {
      status: "scheduled",
      label: "Away",
      detail: `Visible now, lendable from ${formatShort(item.availabilityFrom)}.`,
    };
  }

  // Free today, but something is already promised for later.
  const upcoming = reservationsFor(item, requests)
    .filter((reservation) => daysBetween(todayISO(), reservation.from) > 0)
    .sort((a, b) => a.from.localeCompare(b.from))[0];

  if (upcoming) {
    return {
      status: "available",
      label: "Available",
      detail: `Free now. Next held ${formatShort(upcoming.from)} → ${formatShort(upcoming.to)}.`,
    };
  }

  return {
    status: "available",
    label: "Available",
    detail: "Ready for a neighbour to ask for.",
  };
}

/**
 * The exact handoff spot stays private until the two people are actually
 * coordinating — that is, once a request exists for the item.
 */
export function handoffRevealed(request: BorrowRequest | undefined): boolean {
  return Boolean(request);
}

export function handoffPlaceholder(item: Item): string {
  return item.origin === "user" ? "Shared once you agree" : "Arranged when you agree a time";
}
