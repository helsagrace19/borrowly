import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { borrower, getItem, getOwner, items, selfOwnerId } from "../data/catalogue";
import { addDays, todayISO } from "../lib/dates";
import { createDraft } from "../lib/draft";
import { defaultArea, defaultReach } from "../lib/location";
import {
  applyDraftToListing,
  createListingFromDraft,
  deriveAvailability,
  type ListingDraft,
} from "../lib/listing";
import {
  defaultMessage,
  firstNameOf,
  isActivePhase,
  phaseOf,
  simulatedReply,
  unavailableDatesFor,
} from "../lib/loan";
import { emptyState, loadState, saveState } from "../lib/storage";
import type {
  BorrowRequest,
  Conversation,
  DiscoverFilters,
  Draft,
  ExtensionRequest,
  HandoffAppointment,
  Item,
  IssueReport,
  Message,
  PersistedState,
  ReturnChecklist,
} from "../types";

function uid(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

/**
 * Resolves an item from the live state: the borrower's own listings first,
 * then the seeded catalogue. Components use the provider's `itemById`, which
 * wraps this.
 */
export function findItem(state: PersistedState, id: string): Item | undefined {
  return state.listings.find((listing) => listing.id === id) ?? getItem(id);
}

/** Names used when the prototype simulates a neighbour borrowing from you. */
const NEIGHBOUR_NAMES = [
  "Alex Morgan",
  "Priya Raman",
  "Daniel Okafor",
  "Marta Silva",
  "Jonas Weber",
  "Chen Wei",
];

function conversationKey(ownerId: string, itemId: string): string {
  return `${ownerId}:${itemId}`;
}

function touchConversation(
  state: PersistedState,
  ownerId: string,
  itemId: string,
  requestId: string | null,
  update: (conversation: Conversation) => Conversation,
): Conversation[] {
  const key = conversationKey(ownerId, itemId);
  const existing = state.conversations.find(
    (conversation) => conversationKey(conversation.ownerId, conversation.itemId) === key,
  );

  if (existing) {
    return state.conversations.map((conversation) =>
      conversationKey(conversation.ownerId, conversation.itemId) === key
        ? update(conversation)
        : conversation,
    );
  }

  const created: Conversation = {
    ownerId,
    itemId,
    requestId,
    messages: [],
    unread: 0,
  };
  return [...state.conversations, update(created)];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Action =
  | { type: "request/submit"; request: BorrowRequest; opener: Message }
  | { type: "request/cancel"; id: string }
  | { type: "request/collect"; id: string; at: number }
  | { type: "request/handoff"; id: string; patch: Partial<BorrowRequest["handoff"]> }
  | { type: "request/return-handoff"; id: string; patch: Partial<HandoffAppointment> }
  | { type: "request/extension-request"; id: string; extension: ExtensionRequest; opener: Message }
  | { type: "request/extension-withdraw"; id: string }
  | { type: "request/returned"; id: string; checklist: ReturnChecklist; at: number }
  | { type: "request/resolve-unconfirmed"; id: string; at: number }
  | { type: "request/nudge"; id: string; at: number }
  | { type: "request/issue"; id: string; issue: IssueReport }
  | { type: "request/simulate-approve"; id: string; at: number }
  | { type: "request/simulate-decline"; id: string; at: number; reason: string }
  | { type: "request/simulate-extension"; id: string; decision: "approved" | "declined"; at: number }
  | { type: "request/simulate-confirm"; id: string; at: number }
  | { type: "request/simulate-overdue"; id: string; at: number }
  | { type: "request/simulate-incoming"; request: BorrowRequest }
  | { type: "request/decide-incoming"; id: string; decision: "approved" | "declined"; at: number }
  | { type: "request/complete-incoming"; id: string; at: number }
  | { type: "listing/create"; item: Item }
  | { type: "listing/update"; id: string; draft: ListingDraft; at: number }
  | { type: "listing/pause"; id: string; paused: boolean; at: number }
  | { type: "listing/availability"; id: string; from: string | null; at: number }
  | { type: "listing/remove"; id: string }
  | { type: "draft/set"; itemId: string; patch: Partial<Draft> }
  | { type: "draft/clear"; itemId: string }
  | { type: "message/send"; ownerId: string; itemId: string; requestId: string | null; message: Message }
  | { type: "message/simulate-reply"; ownerId: string; itemId: string; message: Message }
  | { type: "thread/read"; ownerId: string; itemId: string }
  | { type: "demo/seed"; request: BorrowRequest; messages: Message[] }
  | { type: "prototype/reset" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function mapRequest(
  state: PersistedState,
  id: string,
  update: (request: BorrowRequest) => BorrowRequest,
): PersistedState {
  return {
    ...state,
    requests: state.requests.map((request) => (request.id === id ? update(request) : request)),
  };
}

function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case "request/submit": {
      const withRequest: PersistedState = {
        ...state,
        requests: [action.request, ...state.requests],
      };
      return {
        ...withRequest,
        drafts: omitKey(withRequest.drafts, action.request.itemId),
        conversations: touchConversation(
          withRequest,
          action.request.ownerId,
          action.request.itemId,
          action.request.id,
          (conversation) => ({
            ...conversation,
            requestId: action.request.id,
            messages: [...conversation.messages, action.opener],
          }),
        ),
      };
    }

    case "request/cancel":
      return mapRequest(state, action.id, (request) => ({
        ...request,
        status: "cancelled",
      }));

    case "request/collect":
      return mapRequest(state, action.id, (request) => ({
        ...request,
        collectedAt: action.at,
      }));

    case "request/handoff":
      return mapRequest(state, action.id, (request) => ({
        ...request,
        handoff: { ...request.handoff, ...action.patch },
      }));

    case "request/return-handoff":
      return mapRequest(state, action.id, (request) => ({
        ...request,
        returnHandoff: { ...request.returnHandoff, ...action.patch },
      }));

    case "request/extension-request": {
      const withExtension = mapRequest(state, action.id, (request) => ({
        ...request,
        extension: action.extension,
      }));
      const request = withExtension.requests.find((entry) => entry.id === action.id);
      if (!request) return withExtension;
      return {
        ...withExtension,
        conversations: touchConversation(
          withExtension,
          request.ownerId,
          request.itemId,
          request.id,
          (conversation) => ({
            ...conversation,
            messages: [...conversation.messages, action.opener],
          }),
        ),
      };
    }

    case "request/extension-withdraw":
      return mapRequest(state, action.id, (request) => ({ ...request, extension: null }));

    case "request/returned":
      return mapRequest(state, action.id, (request) => ({
        ...request,
        handedBackAt: action.at,
        returnChecklist: action.checklist,
        nudges: 0,
      }));

    case "request/nudge":
      return mapRequest(state, action.id, (request) => ({
        ...request,
        nudges: request.nudges + 1,
      }));

    case "request/resolve-unconfirmed":
      return mapRequest(state, action.id, (request) => ({
        ...request,
        resolvedWithoutConfirmationAt: action.at,
      }));

    case "request/issue":
      return mapRequest(state, action.id, (request) => ({ ...request, issue: action.issue }));

    case "request/simulate-approve": {
      const request = state.requests.find((entry) => entry.id === action.id);
      if (!request) return state;
      const item = findItem(state, request.itemId);
      const next = mapRequest(state, action.id, (entry) => ({
        ...entry,
        status: "approved",
        decidedAt: action.at,
        declineReason: null,
      }));
      return {
        ...next,
        conversations: touchConversation(next, request.ownerId, request.itemId, request.id, (conversation) => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            {
              id: uid("msg"),
              from: "owner",
              body: simulatedReply("approve", item?.name ?? "item"),
              at: action.at,
              simulated: true,
            },
          ],
          unread: conversation.unread + 1,
        })),
      };
    }

    case "request/simulate-decline": {
      const request = state.requests.find((entry) => entry.id === action.id);
      if (!request) return state;
      const item = findItem(state, request.itemId);
      const next = mapRequest(state, action.id, (entry) => ({
        ...entry,
        status: "declined",
        decidedAt: action.at,
        declineReason: action.reason,
      }));
      return {
        ...next,
        conversations: touchConversation(next, request.ownerId, request.itemId, request.id, (conversation) => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            {
              id: uid("msg"),
              from: "owner",
              body: simulatedReply("decline", item?.name ?? "item"),
              at: action.at,
              simulated: true,
            },
          ],
          unread: conversation.unread + 1,
        })),
      };
    }

    case "request/simulate-extension": {
      const request = state.requests.find((entry) => entry.id === action.id);
      if (!request || !request.extension) return state;
      const item = findItem(state, request.itemId);
      const approvedExtension: ExtensionRequest = {
        ...request.extension,
        status: action.decision,
        decidedAt: action.at,
      };
      const next = mapRequest(state, action.id, (entry) => ({
        ...entry,
        extension: approvedExtension,
        returnDate:
          action.decision === "approved" ? approvedExtension.newReturnDate : entry.returnDate,
      }));
      return {
        ...next,
        conversations: touchConversation(next, request.ownerId, request.itemId, request.id, (conversation) => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            {
              id: uid("msg"),
              from: "owner",
              body:
                action.decision === "approved"
                  ? simulatedReply("extend", item?.name ?? "item")
                  : "I'd rather have it back on the original date if that's workable — sorry.",
              at: action.at,
              simulated: true,
            },
          ],
          unread: conversation.unread + 1,
        })),
      };
    }

    case "request/simulate-confirm": {
      const request = state.requests.find((entry) => entry.id === action.id);
      if (!request) return state;
      const item = findItem(state, request.itemId);
      const next = mapRequest(state, action.id, (entry) => ({
        ...entry,
        collectedAt: entry.collectedAt ?? action.at,
        handedBackAt: entry.handedBackAt ?? action.at,
        confirmedAt: action.at,
      }));
      return {
        ...next,
        conversations: touchConversation(next, request.ownerId, request.itemId, request.id, (conversation) => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            {
              id: uid("msg"),
              from: "owner",
              body: simulatedReply("confirm", item?.name ?? "item"),
              at: action.at,
              simulated: true,
            },
          ],
          unread: conversation.unread + 1,
        })),
      };
    }

    case "request/simulate-overdue":
      return mapRequest(state, action.id, (request) => ({
        ...request,
        status: "approved",
        collectedAt: request.collectedAt ?? action.at - 2 * 86_400_000,
        handedBackAt: null,
        confirmedAt: null,
        returnDate: addDays(todayISO(), -2),
        extension: null,
      }));

    case "request/simulate-incoming":
      return { ...state, requests: [action.request, ...state.requests] };

    case "request/decide-incoming":
      return mapRequest(state, action.id, (request) => ({
        ...request,
        status: action.decision,
        decidedAt: action.at,
        declineReason: action.decision === "declined" ? "Owner could not lend it this week" : null,
      }));

    case "request/complete-incoming":
      // The owner has the item back, so the dates are released.
      return mapRequest(state, action.id, (request) => ({
        ...request,
        collectedAt: request.collectedAt ?? action.at,
        handedBackAt: request.handedBackAt ?? action.at,
        confirmedAt: action.at,
      }));

    case "listing/create":
      return { ...state, listings: [action.item, ...state.listings] };

    case "listing/update":
      return {
        ...state,
        listings: state.listings.map((listing) =>
          listing.id === action.id
            ? applyDraftToListing(listing, action.draft, action.at)
            : listing,
        ),
      };

    case "listing/pause":
      return {
        ...state,
        listings: state.listings.map((listing) => {
          if (listing.id !== action.id) return listing;
          const availability = deriveAvailability({
            paused: action.paused,
            availabilityFrom: listing.availabilityFrom,
          });
          return {
            ...listing,
            paused: action.paused,
            availability: availability.value,
            unavailableNote: availability.note,
            updatedAt: action.at,
          };
        }),
      };

    case "listing/availability":
      return {
        ...state,
        listings: state.listings.map((listing) => {
          if (listing.id !== action.id) return listing;
          const availability = deriveAvailability({
            paused: listing.paused,
            availabilityFrom: action.from,
          });
          return {
            ...listing,
            availabilityFrom: action.from,
            availability: availability.value,
            unavailableNote: availability.note,
            updatedAt: action.at,
          };
        }),
      };

    case "listing/remove":
      return {
        ...state,
        listings: state.listings.filter((listing) => listing.id !== action.id),
        // Pending requests for a removed listing cannot be answered any more,
        // so they are withdrawn rather than left dangling.
        requests: state.requests.map((request) =>
          request.itemId === action.id && request.status === "pending"
            ? { ...request, status: "cancelled" as const }
            : request,
        ),
      };

    case "draft/set": {
      const fallback = createDraft(action.itemId);
      const merged: Draft = {
        ...fallback,
        ...state.drafts[action.itemId],
        ...action.patch,
      };
      return { ...state, drafts: { ...state.drafts, [action.itemId]: merged } };
    }

    case "draft/clear":
      return { ...state, drafts: omitKey(state.drafts, action.itemId) };

    case "message/send":
      return {
        ...state,
        conversations: touchConversation(
          state,
          action.ownerId,
          action.itemId,
          action.requestId,
          (conversation) => ({
            ...conversation,
            requestId: action.requestId ?? conversation.requestId,
            messages: [...conversation.messages, action.message],
          }),
        ),
      };

    case "message/simulate-reply":
      return {
        ...state,
        conversations: touchConversation(
          state,
          action.ownerId,
          action.itemId,
          null,
          (conversation) => ({
            ...conversation,
            messages: [...conversation.messages, action.message],
            unread: conversation.unread + 1,
          }),
        ),
      };

    case "thread/read":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.ownerId === action.ownerId && conversation.itemId === action.itemId
            ? { ...conversation, unread: 0 }
            : conversation,
        ),
      };

    case "demo/seed": {
      const key = conversationKey(action.request.ownerId, action.request.itemId);
      const existing = state.conversations.find(
        (conversation) => conversationKey(conversation.ownerId, conversation.itemId) === key,
      );

      return {
        ...state,
        // Pure addition: seeding never removes something you already have.
        requests: [action.request, ...state.requests],
        conversations: existing
          ? state.conversations
          : [
              ...state.conversations,
              {
                ownerId: action.request.ownerId,
                itemId: action.request.itemId,
                requestId: action.request.id,
                messages: action.messages,
                unread: 1,
              },
            ],
      };
    }

    case "prototype/reset":
      // Clearing the demo data must not throw away listings the user made.
      return { ...emptyState(), listings: state.listings };

    default:
      return state;
  }
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type SubmitRequestInput = {
  itemId: string;
  startDate: string;
  returnDate: string;
  message: string;
};

type BorrowlyValue = {
  requests: BorrowRequest[];
  conversations: Conversation[];
  filters: DiscoverFilters;
  setFilters: (patch: Partial<DiscoverFilters>) => void;
  requestById: (id: string) => BorrowRequest | undefined;
  conversationFor: (ownerId: string, itemId: string) => Conversation | undefined;
  draftFor: (itemId: string) => Draft;
  setDraft: (itemId: string, patch: Partial<Draft>) => void;
  resetDraft: (itemId: string) => void;
  submitRequest: (input: SubmitRequestInput) => BorrowRequest;
  cancelRequest: (id: string) => void;
  markCollected: (id: string) => void;
  setHandoff: (id: string, patch: Partial<BorrowRequest["handoff"]>) => void;
  setReturnHandoff: (id: string, patch: Partial<HandoffAppointment>) => void;
  requestExtension: (id: string, newReturnDate: string, reason: string) => void;
  withdrawExtension: (id: string) => void;
  markReturned: (id: string, checklist: ReturnChecklist) => void;
  nudgeReturn: (id: string) => void;
  resolveUnconfirmed: (id: string) => void;
  reportIssue: (id: string, issue: IssueReport) => void;
  sendMessage: (ownerId: string, itemId: string, requestId: string | null, body: string) => void;
  simulateReply: (ownerId: string, itemId: string) => void;
  markThreadRead: (ownerId: string, itemId: string) => void;
  simulateApprove: (id: string) => void;
  simulateDecline: (id: string) => void;
  simulateExtensionDecision: (id: string, decision: "approved" | "declined") => void;
  simulateOwnerConfirm: (id: string) => void;
  simulateOverdue: (id: string) => void;
  seedDemoBorrowing: () => void;
  resetPrototype: () => void;
  unavailableDates: (itemId: string) => Set<string>;

  /** Every item the borrower can see: their listings plus the catalogue. */
  allItems: Item[];
  itemById: (id: string) => Item | undefined;
  /** Listings published from this device. */
  myListings: Item[];
  incomingRequestsFor: (itemId: string) => BorrowRequest[];
  createListing: (draft: ListingDraft) => Item;
  updateListing: (id: string, draft: ListingDraft) => void;
  setListingPaused: (id: string, paused: boolean) => void;
  setListingAvailability: (id: string, from: string | null) => void;
  removeListing: (id: string) => void;
  simulateIncomingRequest: (itemId: string) => boolean;
  decideIncomingRequest: (id: string, decision: "approved" | "declined") => void;
  completeIncomingRequest: (id: string) => void;
};

const BorrowlyContext = createContext<BorrowlyValue | null>(null);

export function BorrowlyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState() ?? emptyState());
  const [filters, setFiltersState] = useState<DiscoverFilters>({
    query: "",
    category: "All",
    availableOnly: false,
    area: defaultArea(borrower.location),
    reach: defaultReach(),
    sort: "recommended",
    quick: "all",
    view: "grid",
  });

  useEffect(() => {
    const outcome = saveState(state);
    if (outcome !== "quota") return;

    // Storage is full, so the newest changes are only in memory. Say so
    // rather than letting the next refresh look like data loss.
    const timer = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("borrowly:storage-full", {
          detail: "This browser is out of space, so your latest changes may not survive a refresh.",
        }),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [state]);

  const allItems = useMemo<Item[]>(
    () => [...state.listings, ...items],
    [state.listings],
  );

  /**
   * The other side of a request answers on its own after a short pause, so the
   * full journey works in a single-account build without any demo controls in
   * the interface. Each transition happens once.
   */
  const settled = useRef<Set<string>>(new Set());
  useEffect(() => {
    const tick = () => {
      const now = Date.now();

      state.requests.forEach((request) => {
        if (request.direction !== "outgoing") return;

        const once = (key: string) => {
          if (settled.current.has(key)) return false;
          settled.current.add(key);
          return true;
        };

        if (request.status === "pending" && now - request.createdAt > 8000) {
          if (once(`${request.id}:approved`)) {
            dispatch({ type: "request/simulate-approve", id: request.id, at: now });
          }
          return;
        }

        if (request.extension?.status === "pending" && now - request.extension.requestedAt > 8000) {
          if (once(`${request.id}:extension`)) {
            dispatch({
              type: "request/simulate-extension",
              id: request.id,
              decision: "approved",
              at: now,
            });
          }
        }

        if (
          request.handedBackAt &&
          !request.confirmedAt &&
          !request.resolvedWithoutConfirmationAt &&
          now - request.handedBackAt > 9000
        ) {
          if (once(`${request.id}:confirmed`)) {
            dispatch({ type: "request/simulate-confirm", id: request.id, at: now });
          }
        }
      });
    };

    tick();
    const interval = window.setInterval(tick, 2000);
    return () => window.clearInterval(interval);
  }, [state.requests]);
  const itemById = useCallback((id: string) => findItem(state, id), [state]);

  const incomingRequestsFor = useCallback(
    (itemId: string) =>
      state.requests.filter(
        (request) => request.itemId === itemId && request.direction === "incoming",
      ),
    [state.requests],
  );

  const setFilters = useCallback((patch: Partial<DiscoverFilters>) => {
    setFiltersState((current) => ({ ...current, ...patch }));
  }, []);

  const requestById = useCallback(
    (id: string) => state.requests.find((request) => request.id === id),
    [state.requests],
  );

  const conversationFor = useCallback(
    (ownerId: string, itemId: string) =>
      state.conversations.find(
        (conversation) => conversation.ownerId === ownerId && conversation.itemId === itemId,
      ),
    [state.conversations],
  );

  const draftFor = useCallback(
    (itemId: string) => state.drafts[itemId] ?? createDraft(itemId),
    [state.drafts],
  );

  const setDraft = useCallback((itemId: string, patch: Partial<Draft>) => {
    dispatch({ type: "draft/set", itemId, patch });
  }, []);

  const resetDraft = useCallback((itemId: string) => {
    dispatch({ type: "draft/clear", itemId });
  }, []);

  const createListing = useCallback<BorrowlyValue["createListing"]>((draft) => {
    const item = createListingFromDraft(draft, Date.now());
    dispatch({ type: "listing/create", item });
    return item;
  }, []);

  const updateListing = useCallback<BorrowlyValue["updateListing"]>((id, draft) => {
    dispatch({ type: "listing/update", id, draft, at: Date.now() });
  }, []);

  const setListingPaused = useCallback<BorrowlyValue["setListingPaused"]>((id, paused) => {
    dispatch({ type: "listing/pause", id, paused, at: Date.now() });
  }, []);

  const setListingAvailability = useCallback<BorrowlyValue["setListingAvailability"]>(
    (id, from) => {
      dispatch({ type: "listing/availability", id, from, at: Date.now() });
    },
    [],
  );

  const removeListing = useCallback((id: string) => {
    dispatch({ type: "listing/remove", id });
  }, []);

  const decideIncomingRequest = useCallback<BorrowlyValue["decideIncomingRequest"]>(
    (id, decision) => {
      dispatch({ type: "request/decide-incoming", id, decision, at: Date.now() });
    },
    [],
  );

  const completeIncomingRequest = useCallback((id: string) => {
    dispatch({ type: "request/complete-incoming", id, at: Date.now() });
  }, []);

  const simulateIncomingRequest = useCallback<BorrowlyValue["simulateIncomingRequest"]>(
    (itemId) => {
      const item = findItem(state, itemId);
      if (!item) return false;

      const now = Date.now();
      const existingIncoming = state.requests.filter(
        (entry) => entry.itemId === itemId && entry.direction === "incoming",
      ).length;

      // Alternate between "can I have it now?" and a trip a few days out, so
      // both the on-loan and the reserved-in-advance states are reachable.
      const start = addDays(todayISO(), existingIncoming % 2 === 0 ? 3 : 0);
      const take = item.maxDays ?? 3;
      const borrower =
        NEIGHBOUR_NAMES[existingIncoming % NEIGHBOUR_NAMES.length];

      const request: BorrowRequest = {
        id: uid("req"),
        itemId,
        ownerId: selfOwnerId,
        direction: "incoming",
        borrowerName: borrower,
        createdAt: now,
        startDate: start,
        returnDate: addDays(start, Math.max(1, Math.min(take, 3))),
        originalReturnDate: addDays(start, Math.max(1, Math.min(take, 3))),
        message: `Hi! Could I borrow your ${item.name.toLowerCase()} for a few days? I can collect it whenever suits you.`,
        status: "pending",
        decidedAt: null,
        declineReason: null,
        collectedAt: null,
        handedBackAt: null,
        confirmedAt: null,
        resolvedWithoutConfirmationAt: null,
        nudges: 0,
        handoff: {
          place: item.handoffPlace,
          note: item.handoffNote,
          proposed: "",
        },
        returnHandoff: {
          date: null,
          slot: null,
          place: item.handoffPlace,
          note: "",
        },
        returnChecklist: null,
        extension: null,
        issue: null,
      };

      dispatch({ type: "request/simulate-incoming", request });
      return true;
    },
    [state],
  );

  const submitRequest = useCallback<BorrowlyValue["submitRequest"]>((input) => {
    const item = findItem(state, input.itemId);
    const ownerId = item?.ownerId ?? "";
    const now = Date.now();
    const request: BorrowRequest = {
      id: uid("req"),
      itemId: input.itemId,
      ownerId,
      direction: "outgoing",
      borrowerName: null,
      createdAt: now,
      startDate: input.startDate,
      returnDate: input.returnDate,
      originalReturnDate: input.returnDate,
      message: input.message,
      status: "pending",
      decidedAt: null,
      declineReason: null,
      collectedAt: null,
      handedBackAt: null,
      confirmedAt: null,
      resolvedWithoutConfirmationAt: null,
      nudges: 0,
      handoff: {
        place: item?.handoffPlace ?? "Main lobby",
        note: item?.handoffNote ?? "",
        proposed: "",
      },
      returnHandoff: {
        date: null,
        slot: null,
        place: item?.handoffPlace ?? "Main lobby",
        note: "",
      },
      returnChecklist: null,
      extension: null,
      issue: null,
    };

    dispatch({
      type: "request/submit",
      request,
      opener: { id: uid("msg"), from: "me", body: input.message, at: now },
    });
    return request;
  }, [state]);

  const cancelRequest = useCallback((id: string) => dispatch({ type: "request/cancel", id }), []);
  const markCollected = useCallback(
    (id: string) => dispatch({ type: "request/collect", id, at: Date.now() }),
    [],
  );
  const setHandoff = useCallback<BorrowlyValue["setHandoff"]>(
    (id, patch) => dispatch({ type: "request/handoff", id, patch }),
    [],
  );
  const setReturnHandoff = useCallback<BorrowlyValue["setReturnHandoff"]>(
    (id, patch) => dispatch({ type: "request/return-handoff", id, patch }),
    [],
  );

  const requestExtension = useCallback<BorrowlyValue["requestExtension"]>(
    (id, newReturnDate, reason) => {
      const now = Date.now();
      const current = state.requests.find((request) => request.id === id);
      const previousReturnDate =
        current?.extension?.status === "approved"
          ? current.extension.newReturnDate
          : (current?.returnDate ?? newReturnDate);
      dispatch({
        type: "request/extension-request",
        id,
        extension: {
          requestedAt: now,
          previousReturnDate,
          newReturnDate,
          status: "pending",
          decidedAt: null,
          reason,
        },
        opener: {
          id: uid("msg"),
          from: "me",
          body: `Would it be alright to keep it until ${newReturnDate}? ${reason}`.trim(),
          at: now,
        },
      });
    },
    [state.requests],
  );

  const withdrawExtension = useCallback(
    (id: string) => dispatch({ type: "request/extension-withdraw", id }),
    [],
  );

  const markReturned = useCallback<BorrowlyValue["markReturned"]>(
    (id, checklist) => dispatch({ type: "request/returned", id, checklist, at: Date.now() }),
    [],
  );

  const nudgeReturn = useCallback(
    (id: string) => dispatch({ type: "request/nudge", id, at: Date.now() }),
    [],
  );

  const resolveUnconfirmed = useCallback(
    (id: string) => dispatch({ type: "request/resolve-unconfirmed", id, at: Date.now() }),
    [],
  );

  const reportIssue = useCallback<BorrowlyValue["reportIssue"]>(
    (id, issue) => dispatch({ type: "request/issue", id, issue }),
    [],
  );

  const sendMessage = useCallback<BorrowlyValue["sendMessage"]>(
    (ownerId, itemId, requestId, body) => {
      dispatch({
        type: "message/send",
        ownerId,
        itemId,
        requestId,
        message: { id: uid("msg"), from: "me", body, at: Date.now() },
      });
    },
    [],
  );

  const simulateReply = useCallback((ownerId: string, itemId: string) => {
    dispatch({
      type: "message/simulate-reply",
      ownerId,
      itemId,
      message: {
        id: uid("msg"),
        from: "owner",
        body: simulatedReply("message", "item"),
        at: Date.now(),
        simulated: true,
      },
    });
  }, []);

  const markThreadRead = useCallback(
    (ownerId: string, itemId: string) => dispatch({ type: "thread/read", ownerId, itemId }),
    [],
  );

  const simulateApprove = useCallback(
    (id: string) => dispatch({ type: "request/simulate-approve", id, at: Date.now() }),
    [],
  );
  const simulateDecline = useCallback(
    (id: string) =>
      dispatch({
        type: "request/simulate-decline",
        id,
        at: Date.now(),
        reason: "Owner needed the item this week",
      }),
    [],
  );
  const simulateExtensionDecision = useCallback<BorrowlyValue["simulateExtensionDecision"]>(
    (id, decision) => dispatch({ type: "request/simulate-extension", id, decision, at: Date.now() }),
    [],
  );
  const simulateOwnerConfirm = useCallback(
    (id: string) => dispatch({ type: "request/simulate-confirm", id, at: Date.now() }),
    [],
  );
  const simulateOverdue = useCallback(
    (id: string) => dispatch({ type: "request/simulate-overdue", id, at: Date.now() }),
    [],
  );

  const seedDemoBorrowing = useCallback(() => {
    const now = Date.now();
    const taken = new Set(
      state.requests
        .filter((request) => isActivePhase(phaseOf(request, now)))
        .map((request) => request.itemId),
    );
    // Only neighbours' items: you cannot borrow your own listing.
    const borrowersChoice = items.filter((candidate) => candidate.ownerId !== selfOwnerId);
    const item =
      borrowersChoice.find(
        (candidate) => candidate.availability === "available" && !taken.has(candidate.id),
      ) ?? borrowersChoice[0];
    if (!item) return;

    const request: BorrowRequest = {
      id: uid("req"),
      itemId: item.id,
      ownerId: item.ownerId,
      direction: "outgoing",
      borrowerName: null,
      createdAt: now - 2 * 86_400_000,
      startDate: addDays(todayISO(), -1),
      returnDate: addDays(todayISO(), 2),
      originalReturnDate: addDays(todayISO(), 2),
      message: defaultMessage(item, firstNameOf(getOwner(item.ownerId).name)),
      status: "approved",
      decidedAt: now - 2 * 86_400_000 + 3_600_000,
      declineReason: null,
      collectedAt: now - 86_400_000,
      handedBackAt: null,
      confirmedAt: null,
      resolvedWithoutConfirmationAt: null,
      nudges: 0,
      handoff: { place: item.handoffPlace, note: item.handoffNote, proposed: "Collected yesterday at 6pm" },
      returnHandoff: { date: null, slot: null, place: item.handoffPlace, note: "" },
      returnChecklist: null,
      extension: null,
      issue: null,
    };

    dispatch({
      type: "demo/seed",
      request,
      messages: [
        {
          id: uid("msg"),
          from: "me",
          body: request.message,
          at: request.createdAt,
        },
        {
          id: uid("msg"),
          from: "owner",
          body: simulatedReply("approve", item.name),
          at: request.createdAt + 3_600_000,
          simulated: true,
        },
      ],
    });
  }, [state.requests]);

  const resetPrototype = useCallback(() => {
    dispatch({ type: "prototype/reset" });
    setFiltersState({
      query: "",
      category: "All",
      availableOnly: false,
      area: defaultArea(borrower.location),
      reach: defaultReach(),
      sort: "recommended",
      quick: "all",
      view: "grid",
    });
  }, []);

  const unavailableDates = useCallback(
    (itemId: string) => {
      const item = getItem(itemId);
      if (!item) return new Set<string>();
      return unavailableDatesFor(item, state.requests);
    },
    [state.requests],
  );

  const value = useMemo<BorrowlyValue>(
    () => ({
      requests: state.requests,
      conversations: state.conversations,
      filters,
      setFilters,
      requestById,
      conversationFor,
      draftFor,
      setDraft,
      resetDraft,
      submitRequest,
      cancelRequest,
      markCollected,
      setHandoff,
      setReturnHandoff,
      requestExtension,
      withdrawExtension,
      markReturned,
      nudgeReturn,
      resolveUnconfirmed,
      reportIssue,
      sendMessage,
      simulateReply,
      markThreadRead,
      simulateApprove,
      simulateDecline,
      simulateExtensionDecision,
      simulateOwnerConfirm,
      simulateOverdue,
      seedDemoBorrowing,
      resetPrototype,
      unavailableDates,
      allItems,
      itemById,
      myListings: state.listings,
      incomingRequestsFor,
      createListing,
      updateListing,
      setListingPaused,
      setListingAvailability,
      removeListing,
      simulateIncomingRequest,
      decideIncomingRequest,
      completeIncomingRequest,
    }),
    [
      state.requests,
      state.conversations,
      state.listings,
      filters,
      setFilters,
      requestById,
      conversationFor,
      draftFor,
      setDraft,
      resetDraft,
      submitRequest,
      cancelRequest,
      markCollected,
      setHandoff,
      setReturnHandoff,
      requestExtension,
      withdrawExtension,
      markReturned,
      nudgeReturn,
      resolveUnconfirmed,
      reportIssue,
      sendMessage,
      simulateReply,
      markThreadRead,
      simulateApprove,
      simulateDecline,
      simulateExtensionDecision,
      simulateOwnerConfirm,
      simulateOverdue,
      seedDemoBorrowing,
      resetPrototype,
      unavailableDates,
      allItems,
      itemById,
      incomingRequestsFor,
      createListing,
      updateListing,
      setListingPaused,
      setListingAvailability,
      removeListing,
      simulateIncomingRequest,
      decideIncomingRequest,
      completeIncomingRequest,
    ],
  );

  return <BorrowlyContext.Provider value={value}>{children}</BorrowlyContext.Provider>;
}

export function useBorrowly(): BorrowlyValue {
  const value = useContext(BorrowlyContext);
  if (!value) throw new Error("useBorrowly must be used inside BorrowlyProvider");
  return value;
}
