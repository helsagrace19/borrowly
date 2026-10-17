import { useMemo, useState } from "react";

import { Screen, ScreenBody, StickyAction, TopBar } from "../components/AppShell";
import { Avatar } from "../components/Avatar";
import { Button, TextButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ItemImage } from "../components/ItemImage";
import { InfoRow, Notice, SectionHeading } from "../components/Layout";
import { AvailabilityPill, Pill } from "../components/Pill";
import { COMMUNITY, borrower, getOwner, selfOwnerId } from "../data/catalogue";
import { formatDayMonth } from "../lib/dates";
import { canRequestItem, phaseOf, requestForItem } from "../lib/loan";
import { locationLine, fullLocation } from "../lib/location";
import { handoffPlaceholder } from "../lib/listing";
import { formatPricePerDay } from "../lib/pricing";
import { PriceTerms } from "../components/Price";
import { useNow } from "../lib/useNow";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";

export function ItemDetailsScreen({ itemId }: { itemId: string }) {
  const { push, back, goToTab } = useNavigation();
  const { requests, itemById } = useBorrowly();
  const now = useNow();
  const [showRatingHelp, setShowRatingHelp] = useState(false);

  const item = itemById(itemId);
  const eligibility = useMemo(
    () => (item ? canRequestItem(item, requests, now, selfOwnerId) : { allowed: false }),
    [item, requests, now],
  );

  if (!item) {
    return (
      <Screen>
        <TopBar onBack={back} title="Item details" />
        <ScreenBody>
          <EmptyState icon="alert" title="We couldn't find that item">
            It may have been removed. Head back to Discover to see what is nearby.
          </EmptyState>
          <Button onClick={() => goToTab({ name: "discover" })} variant="secondary">
            Back to Discover
          </Button>
        </ScreenBody>
      </Screen>
    );
  }

  const owner = getOwner(item.ownerId);
  const available = item.availability === "available";
  const blocked = eligibility.blocking;
  const blockedPhase = blocked ? phaseOf(blocked, now) : null;
  const ours = item.ownerId === selfOwnerId;
  // The exact handoff spot is only shared once the two people are in contact.
  const existingRequest = requestForItem(requests, item.id, now);
  const showHandoffSpot = Boolean(existingRequest) || ours;

  return (
    <Screen>
      <TopBar onBack={back} title={ours ? "Your listing" : "Item details"} />

      <ScreenBody padded={false}>
        <ItemImage
          alt={`${item.name} photographed at home by ${owner.name}`}
          className="hero"
          fallbackLabel={item.name}
          focal="center 55%"
          src={item.photo}
        />

        <div className="details-body">
          <div className="detail-pill-row">
            <AvailabilityPill available={available} />
            {ours ? <Pill icon="user" tone="neutral">Your listing</Pill> : null}
          </div>
          <h1 className="detail-title">{item.name}</h1>
          <p className="meta">
            {item.category} · {locationLine(item, owner, borrower.location)} ·{" "}
            {item.pricing.type === "paid" ? "Paid" : "Free to borrow"}
          </p>

          <div className="owner-card">
            <Avatar owner={owner} size={42} />
            <div className="owner-copy">
              <strong>{owner.name}</strong>
              <span>
                <Icon filled name="star" size={13} />
                {owner.rating.toFixed(1)} from {owner.ratingCount} neighbours · {owner.lends} returns
              </span>
            </div>
          </div>

          <TextButton onClick={() => setShowRatingHelp((current) => !current)}>
            {showRatingHelp ? "Hide how ratings work" : "How ratings and history work"}
          </TextButton>

          {showRatingHelp ? (
            <div className="explainer">
              <p>
                <strong>Rating</strong> is the average of scores neighbours gave after a borrow —
                mostly about how straightforward the handover was.
              </p>
              <p>
                <strong>Returns</strong> counts completed lends that came back on time. It is a
                small number here because {COMMUNITY} is a small building.
              </p>
              <p>
                Borrowly does not verify identity and does not run any background checks. What you
                see is a neighbour's history in this building, nothing more.
              </p>
            </div>
          ) : null}

          <section className="detail-section">
            <SectionHeading title="About this item" />
            <p>{item.description}</p>
          </section>

          <section className="detail-section">
            <SectionHeading title="The terms" subtitle="What borrowing this costs" />
            <PriceTerms item={item} />
          </section>

          <div className="rules">
            <InfoRow detail={item.condition} icon="box" title="Condition" />
            <InfoRow
              detail={item.maxDays ? `${item.maxDays} ${item.maxDays === 1 ? "day" : "days"} maximum` : "Not set yet"}
              icon="clock"
              title="Loan length"
            />
            <InfoRow
              detail={showHandoffSpot ? item.handoffNote : handoffPlaceholder(item)}
              icon="home"
              title={showHandoffSpot ? item.handoffPlace : "Handoff details"}
            />
            <InfoRow
              detail={
                item.handoffPreferences.length > 0
                  ? item.handoffPreferences.join(", ")
                  : "Arrange in the chat"
              }
              icon="users"
              title="How it is handed over"
            />
            <InfoRow
              detail={fullLocation(item.location)}
              icon="mapPin"
              title="Approximate area"
            />
            <InfoRow
              detail={item.pricing.type === "paid" ? formatPricePerDay(item.pricing.dailyFee) : "No borrowing fee"}
              icon="star"
              title="Cost"
            />
          </div>

          <section className="detail-section">
            <SectionHeading
              subtitle={item.accessories.length > 0 ? "Please bring these back too" : undefined}
              title="Included"
            />
            {item.accessories.length > 0 ? (
              <ul className="accessory-list">
                {item.accessories.map((accessory) => (
                  <li key={accessory}>
                    <Icon name="check" size={15} />
                    {accessory}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-copy">Nothing else comes with it — just the item itself.</p>
            )}
          </section>

          {owner.note ? (
            <Notice icon="message" title={`A note from ${owner.name.split(" ")[0]}`}>
              {owner.note}
            </Notice>
          ) : null}

          {item.bookedRanges.length > 0 ? (
            <section className="detail-section">
              <SectionHeading title="Already booked" />
              <ul className="booked-list">
                {item.bookedRanges.map((range) => (
                  <li key={`${range.from}-${range.to}`}>
                    <Icon name="calendar" size={15} />
                    {formatDayMonth(range.from)} – {formatDayMonth(range.to)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {item.maxDays === null ? (
            <Notice icon="info" tone="warning" title="A detail is missing">
              {owner.name.split(" ")[0]} hasn't set a standard loan length for this one, so agree a
              return date in your message.
            </Notice>
          ) : null}

          {!showHandoffSpot ? (
            <Notice icon="shield" title="Your neighbour's exact spot is private">
              {owner.name.split(" ")[0]} shares the collection point once you have agreed a
              handover, so nobody has to publish their front door.
            </Notice>
          ) : null}

          {item.origin === "user" ? (
            <Notice icon="info" title="Your listing">
              You are looking at your own item the way a neighbour sees it. Manage availability and
              requests from My Listings.
            </Notice>
          ) : null}
        </div>
      </ScreenBody>

      <StickyAction>
        {ours ? (
          <>
            <div className="action-summary">
              <span>Your listing</span>
              <strong>{available ? "Visible in Discover" : "Not lending right now"}</strong>
            </div>
            <Button icon="edit" onClick={() => push({ name: "lend", itemId: item.id })}>
              Edit listing
            </Button>
            <Button icon="book" onClick={() => goToTab({ name: "my-listings" })} variant="secondary">
              My listings
            </Button>
          </>
        ) : eligibility.allowed ? (
          <>
            <div className="action-summary">
              <span>
                {item.pricing.type === "paid"
                  ? formatPricePerDay(item.pricing.dailyFee)
                  : "No borrowing fee"}
              </span>
              <strong>
                {item.maxDays ? `Up to ${item.maxDays} ${item.maxDays === 1 ? "day" : "days"}` : "Agree a date"}
              </strong>
            </div>
            <Button icon="arrowRight" onClick={() => push({ name: "request", itemId: item.id })}>
              Request to borrow
            </Button>
          </>
        ) : (
          <>
            <Notice icon="info" tone="warning">
              {eligibility.reason}
            </Notice>
            {blocked && blockedPhase === "requested" ? (
              <Button onClick={() => goToTab({ name: "borrowing", tab: "requests" })} variant="secondary">
                View my request
              </Button>
            ) : null}
            {blocked && blockedPhase !== "requested" ? (
              <Button onClick={() => goToTab({ name: "borrowing", tab: "active" })} variant="secondary">
                Go to my borrowing
              </Button>
            ) : null}
            {!blocked ? (
              <Button disabled variant="secondary">
                Not available right now
              </Button>
            ) : null}
          </>
        )}
      </StickyAction>
    </Screen>
  );
}
