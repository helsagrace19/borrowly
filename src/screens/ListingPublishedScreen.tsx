import { BottomNav, Screen, ScreenBody, StickyAction, TopBar } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ItemImage } from "../components/ItemImage";
import { InfoRow, Notice } from "../components/Layout";
import { Pill } from "../components/Pill";
import { borrower, getOwner } from "../data/catalogue";
import { formatShort } from "../lib/dates";
import { summarise } from "../lib/listing";
import { locationLine, fullLocation } from "../lib/location";
import { formatNaira, priceLabel } from "../lib/pricing";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";

/** Shown once a listing has been created, before the borrower moves on. */
export function ListingPublishedScreen({ itemId }: { itemId: string }) {
  const { goToTab, push, replace } = useNavigation();
  const { itemById } = useBorrowly();
  const item = itemById(itemId);

  if (!item) {
    return (
      <Screen>
        <TopBar title="Published" />
        <ScreenBody>
          <EmptyState icon="alert" title="That listing is no longer here">
            It may have been removed. Your other listings are under My Listings.
          </EmptyState>
          <Button onClick={() => goToTab({ name: "my-listings" })} variant="secondary">
            Go to My Listings
          </Button>
        </ScreenBody>
      </Screen>
    );
  }

  const owner = getOwner(item.ownerId);

  return (
    <Screen>
      <TopBar title="Listing published" />

      <ScreenBody>
        <div className="confirmation-content">
          <div className="success-mark">
            <Icon name="check" size={32} />
          </div>
          <h1 className="confirmation-title">“{item.name}” is live</h1>
          <p>
            It is now findable in Discover around {item.location.neighbourhood}, ready for someone
            nearby to ask for.
          </p>
        </div>

        <div className="confirmation-card">
          <div className="item-summary compact">
            <ItemImage alt={item.name} fallbackLabel={item.name} src={item.photo} />
            <div className="summary-copy">
              <strong>{item.name}</strong>
              <span>
                {item.category} · {item.condition}
              </span>
              <small>{summarise(item.description)}</small>
            </div>
          </div>
          <div className="summary-row">
            <span>Area</span>
            <strong>{fullLocation(item.location)}</strong>
          </div>
          <div className="summary-row">
            <span>Visible to borrowers as</span>
            <strong>{locationLine(item, owner, borrower.location)}</strong>
          </div>
          <div className="summary-row">
            <span>Borrowing fee</span>
            <strong>{priceLabel(item)}</strong>
          </div>
          {item.deposit.required ? (
            <div className="summary-row">
              <span>Refundable deposit</span>
              <strong>{formatNaira(item.deposit.amount)}</strong>
            </div>
          ) : null}
          <div className="summary-row">
            <span>Longest loan</span>
            <strong>{item.maxDays} {item.maxDays === 1 ? "day" : "days"}</strong>
          </div>
          <div className="summary-row">
            <span>Availability</span>
            <strong>
              {item.availabilityFrom ? `Back on ${formatShort(item.availabilityFrom)}` : "Available now"}
            </strong>
          </div>
          <div className="status-row">
            <Icon name="clock" size={17} />
            <span>
              <strong>No requests yet</strong>
              <small>You'll see anything you receive under My Listings.</small>
            </span>
          </div>
        </div>

        <div className="detail-section">
          <InfoRow
            detail="Public listings show your neighbourhood at most. The exact spot is shared once you agree a collection."
            icon="shield"
            title="Your handoff spot stays private"
          />
          <InfoRow
            detail={`Right now it reads as “${locationLine(item, owner, borrower.location)}”.`}
            icon="mapPin"
            title="Approximate location"
          />
        </div>

        <Notice icon="info" title="How you get paid">
          Borrowers pay the fee and any deposit directly to you at handoff. Borrowly does not take a
          cut.
        </Notice>

        <div className="stacked-actions">
          <Button icon="search" onClick={() => goToTab({ name: "discover" })} variant="secondary">
            See it in Discover
          </Button>
          <Button icon="book" onClick={() => replace({ name: "my-listings" })}>
            Manage my listings
          </Button>
          <button
            className="plain-link"
            onClick={() => push({ name: "lend" })}
            type="button"
          >
            Lend something else
          </button>
        </div>

        <div className="publish-preview">
          <Pill tone="available" dot>
            Published
          </Pill>
          <span>
            Anyone browsing {item.location.neighbourhood} in Discover can find it now.
          </span>
        </div>
      </ScreenBody>

      <StickyAction>
        <div className="action-summary">
          <span>Listing published</span>
          <strong>Visible in Discover</strong>
        </div>
        <Button icon="arrowRight" onClick={() => replace({ name: "my-listings" })}>
          Manage my listings
        </Button>
      </StickyAction>

      <BottomNav active="listings" />
    </Screen>
  );
}
