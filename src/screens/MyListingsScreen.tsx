import { useState } from "react";

import { BottomNav, Screen, ScreenBody, TopBar } from "../components/AppShell";
import { Button } from "../components/Button";
import { CalendarSheet } from "../components/CalendarSheet";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ItemImage } from "../components/ItemImage";
import { Notice, SectionHeading } from "../components/Layout";
import { Pill } from "../components/Pill";
import { borrower, getOwner } from "../data/catalogue";
import { addDays, daysBetween, formatShort, todayISO } from "../lib/dates";
import { reservationOn } from "../lib/loan";
import { locationLine } from "../lib/location";
import { listingStatus, summarise } from "../lib/listing";
import { costForRange, formatNaira } from "../lib/pricing";
import { PriceLine } from "../components/Price";
import type { BorrowRequest, Item, ListingStatus } from "../types";
import { useNow } from "../lib/useNow";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";
import { useToast } from "../state/toast";

const STATUS_TONE: Record<ListingStatus, "available" | "warning" | "neutral" | "active"> = {
  available: "available",
  "on-loan": "warning",
  scheduled: "neutral",
  paused: "neutral",
};

export function MyListingsScreen() {
  const { back, push, goToTab, canGoBack } = useNavigation();
  const {
    myListings,
    requests,
    incomingRequestsFor,
    setListingPaused,
    setListingAvailability,
    removeListing,
    decideIncomingRequest,
    completeIncomingRequest,
  } = useBorrowly();
  const { showToast } = useToast();
  const now = useNow();

  const [availabilityFor, setAvailabilityFor] = useState<string | null>(null);

  const counts = myListings.reduce<Record<string, number>>((totals, listing) => {
    const { status } = listingStatus(listing, requests, now);
    totals[status] = (totals[status] ?? 0) + 1;
    return totals;
  }, {});

  const pendingIncoming = requests.filter(
    (request) => request.direction === "incoming" && request.status === "pending",
  );

  return (
    <Screen>
      <TopBar
        action={
          <button className="bar-button" onClick={() => push({ name: "lend" })} type="button">
            <Icon name="plus" size={15} />
            Lend
          </button>
        }
        onBack={canGoBack ? back : undefined}
        title="My listings"
      />

      <ScreenBody>
        {myListings.length === 0 ? (
          <EmptyState
            action={
              <div className="stacked-actions">
                <Button icon="plus" onClick={() => push({ name: "lend" })}>
                  Lend an item
                </Button>
                <Button
                  icon="search"
                  onClick={() => goToTab({ name: "discover" })}
                  variant="secondary"
                >
                  Browse what's nearby
                </Button>
              </div>
            }
            icon="box"
            title="Nothing listed yet"
          >
            Share something you already own. It shows up in Discover right away, and you stay in
            charge of who borrows it and when.
          </EmptyState>
        ) : (
          <>
            <div className="stat-row">
              <div className="stat">
                <strong>{counts.available ?? 0}</strong>
                <span>Available</span>
              </div>
              <div className="stat">
                <strong>{counts["on-loan"] ?? 0}</strong>
                <span>On loan</span>
              </div>
              <div className="stat">
                <strong>{(counts.paused ?? 0) + (counts.scheduled ?? 0)}</strong>
                <span>Away</span>
              </div>
            </div>

            {pendingIncoming.length > 0 ? (
              <Notice
                icon="bell"
                title={`${pendingIncoming.length} request${pendingIncoming.length === 1 ? "" : "s"} waiting on you`}
              >
                Approve or decline them on the item below.
              </Notice>
            ) : null}

            <SectionHeading subtitle="Update anything, any time" title="Your items" />

            <div className="listing-list">
              {myListings.map((listing) => (
                <ListingRow
                  incoming={incomingRequestsFor(listing.id)}
                  item={listing}
                  key={listing.id}
                  now={now}
                  onDecide={(request, decision) => {
                    decideIncomingRequest(request.id, decision);
                    showToast(
                      decision === "approved"
                        ? `Agreed to lend to ${request.borrowerName ?? "your neighbour"}`
                        : "Request declined",
                      {
                        detail:
                          decision === "approved"
                            ? "Those dates are now held on your listing."
                            : "The neighbour sees this in their requests.",
                      },
                    );
                  }}
                  onEdit={() => push({ name: "lend", itemId: listing.id })}
                  onCompleteAgreed={(request) => {
                    completeIncomingRequest(request.id);
                    showToast(`Marked “${listing.name}” as back`, {
                      detail: "Those dates are free again.",
                    });
                  }}
                  onPause={(paused) => {
                    setListingPaused(listing.id, paused);
                    showToast(paused ? "Lending paused" : "Lending resumed", {
                      detail: paused
                        ? "Hidden from Discover until you resume."
                        : "Visible in Discover again.",
                    });
                  }}
                  onRemove={() => {
                    removeListing(listing.id);
                    showToast(`“${listing.name}” removed`, {
                      detail: "Any pending requests for it were withdrawn.",
                    });
                  }}
                  onSetAvailability={() => setAvailabilityFor(listing.id)}
                  onClearAvailability={() => {
                    setListingAvailability(listing.id, null);
                    showToast("Back to lending", {
                      detail: "Your listing is available again straight away.",
                    });
                  }}
                />
              ))}
            </div>
          </>
        )}
      </ScreenBody>

      <BottomNav active="listings" />

      <CalendarSheet
        blocked={new Set<string>()}
        hint="Your listing stays visible, with the date neighbours can collect from."
        minDate={addDays(todayISO(), 1)}
        onClose={() => setAvailabilityFor(null)}
        onSelect={(iso) => {
          if (!availabilityFor) return;
          setListingAvailability(availabilityFor, iso);
          setAvailabilityFor(null);
          showToast(`Listed as back on ${formatShort(iso)}`);
        }}
        open={availabilityFor !== null}
        title="Away until"
        value={null}
      />
    </Screen>
  );
}

function ListingRow({
  item,
  now,
  incoming,
  onEdit,
  onPause,
  onRemove,
  onSetAvailability,
  onClearAvailability,
  onDecide,
  onCompleteAgreed,
}: {
  item: Item;
  now: number;
  incoming: BorrowRequest[];
  onEdit: () => void;
  onPause: (paused: boolean) => void;
  onRemove: () => void;
  onSetAvailability: () => void;
  onClearAvailability: () => void;
  onDecide: (request: BorrowRequest, decision: "approved" | "declined") => void;
  onCompleteAgreed: (request: BorrowRequest) => void;
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const owner = getOwner(item.ownerId);
  const live = incoming.filter((request) => request.status !== "cancelled");
  const pending = live.filter((request) => request.status === "pending");
  const agreed = live.filter((request) => request.status === "approved");

  const status = listingStatus(item, live, now);

  // A loan that is under way must never be invalidated by removing a
  // listing, so removal has to wait until the item is home again.
  const loanInProgress = Boolean(reservationOn(item, live, todayISO()));

  return (
    <article className={`listing-card status-${status.status}`}>
      <div className="listing-head">
        <ItemImage
          alt={item.name}
          className="listing-photo"
          fallbackLabel={item.name}
          src={item.photo}
        />
        <div className="listing-copy">
          <div className="listing-pill-row">
            <Pill dot tone={STATUS_TONE[status.status]}>
              {status.label}
            </Pill>
            {pending.length > 0 ? (
              <Pill icon="bell" tone="pending">
                {pending.length} request{pending.length === 1 ? "" : "s"}
              </Pill>
            ) : null}
          </div>
          <h3>{item.name}</h3>
          <p className="listing-meta">
            {item.category} · up to {item.maxDays} {item.maxDays === 1 ? "day" : "days"} ·{" "}
            {locationLine(item, owner, borrower.location)}
          </p>
          <p className="listing-price">
            <PriceLine item={item} />
          </p>
          <p className="listing-status-copy">{status.detail}</p>
        </div>
      </div>

      {pending.length > 0 ? (
        <div className="incoming-block">
          <SectionHeading subtitle="Approve or decline to reserve your dates" title="Waiting on you" />
          {pending.map((request) => {
            const ask = costForRange(item, request.startDate, request.returnDate);
            return (
              <div className="incoming-row" key={request.id}>
                <div className="incoming-copy">
                  <strong>{request.borrowerName ?? "A neighbour"}</strong>
                  <small>
                    {formatShort(request.startDate)} → {formatShort(request.returnDate)}
                  </small>
                  <p>{request.message}</p>
                  <p className="incoming-price">
                    {ask.isPaid
                      ? `${formatNaira(ask.borrowFee)} for ${ask.days} ${ask.days === 1 ? "day" : "days"}`
                      : "Free borrow"}
                    {ask.depositRequired
                      ? ` · ${formatNaira(ask.deposit)} refundable deposit`
                      : ""}
                  </p>
                </div>
                <div className="incoming-actions">
                  <Button icon="check" onClick={() => onDecide(request, "approved")}>
                    Agree
                  </Button>
                  <Button onClick={() => onDecide(request, "declined")} variant="secondary">
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {agreed.length > 0 ? (
        <div className="incoming-block">
          <SectionHeading subtitle="These dates are held" title="Agreed" />
          {agreed.map((request) => (
            <div className="incoming-row done" key={request.id}>
              <div className="incoming-copy">
                <strong>{request.borrowerName ?? "A neighbour"}</strong>
                <small>
                  {formatShort(request.startDate)} → {formatShort(request.returnDate)} ·{" "}
                  {request.confirmedAt
                    ? "back with you"
                    : daysBetween(todayISO(), request.startDate) > 0
                      ? `starts ${formatShort(request.startDate)}`
                      : daysBetween(request.returnDate, todayISO()) > 0
                        ? "overdue"
                        : "with them now"}
                </small>
              </div>
              {!request.confirmedAt ? (
                <Button
                  icon="check"
                  onClick={() => onCompleteAgreed(request)}
                  variant="secondary"
                >
                  Mark as returned
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="listing-actions">
        <Button icon="edit" onClick={onEdit} variant="secondary">
          Edit listing
        </Button>
        <div className="listing-actions-row">
          <Button
            icon={item.paused ? "refresh" : "clock"}
            onClick={() => onPause(!item.paused)}
            variant="secondary"
          >
            {item.paused ? "Resume" : "Pause"}
          </Button>
          {item.availabilityFrom ? (
            <Button
              icon="check"
              onClick={onClearAvailability}
              variant="secondary"
            >
              I'm back
            </Button>
          ) : (
            <Button icon="calendar" onClick={onSetAvailability} variant="secondary">
              Away until…
            </Button>
          )}
        </div>
      </div>

      {item.availabilityFrom ? (
        <p className="listing-note">
          Listed as back on {formatShort(item.availabilityFrom)}.{" "}
          <button className="mini-link" onClick={onSetAvailability} type="button">
            Change
          </button>
        </p>
      ) : null}

      <p className="listing-summary">{summarise(item.description)}</p>

      {confirmingRemove ? (
        <div className="confirm-inline">
          <p className="muted-copy">
            {loanInProgress
              ? "A neighbour currently has this. You can remove the listing once it is back."
              : pending.length > 0
                ? `Remove “${item.name}”? ${pending.length} pending request${pending.length === 1 ? "" : "s"} will be withdrawn.`
                : `Remove “${item.name}” from your listings?`}
          </p>
          <div className="confirm-actions">
            <Button
              disabled={loanInProgress}
              onClick={() => {
                onRemove();
                setConfirmingRemove(false);
              }}
              variant="danger"
            >
              {loanInProgress ? "On loan — not yet" : "Yes, remove it"}
            </Button>
            <Button onClick={() => setConfirmingRemove(false)} variant="secondary">
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <button
          className="plain-link danger"
          onClick={() => setConfirmingRemove(true)}
          type="button"
        >
          Remove listing
        </button>
      )}
    </article>
  );
}
