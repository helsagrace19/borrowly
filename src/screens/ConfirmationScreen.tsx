import { useState } from "react";

import { BottomNav, Screen, ScreenBody, TopBar } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ItemImage } from "../components/ItemImage";
import { SectionHeading } from "../components/Layout";
import { PriceBreakdown } from "../components/Price";
import { Pill } from "../components/Pill";
import { getOwner } from "../data/catalogue";
import { describeRange, formatShort, formatTimestamp } from "../lib/dates";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";
import { useToast } from "../state/toast";

export function ConfirmationScreen({ requestId }: { requestId: string }) {
  const { back, goToTab, push } = useNavigation();
  const { requestById, cancelRequest, itemById } = useBorrowly();
  const { showToast } = useToast();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const request = requestById(requestId);

  if (!request) {
    return (
      <Screen>
        <TopBar title="Request sent" />
        <ScreenBody>
          <EmptyState icon="alert" title="We couldn't find that request">
            It may have been cleared. Your other requests are still under Borrowing.
          </EmptyState>
          <Button onClick={() => goToTab({ name: "discover" })} variant="secondary">
            Back to Discover
          </Button>
        </ScreenBody>
      </Screen>
    );
  }

  const item = itemById(request.itemId);
  const owner = getOwner(request.ownerId);
  const firstName = owner.name.split(" ")[0];
  const cancelled = request.status === "cancelled";

  const handleCancel = () => {
    cancelRequest(request.id);
    showToast("Request cancelled", {
      detail: `${firstName} will see that you withdrew it.`,
    });
    goToTab({ name: "borrowing", tab: "requests" });
  };

  return (
    <Screen>
      <TopBar
        onBack={back}
        title={cancelled ? "Request cancelled" : "Request sent"}
      />

      <ScreenBody>
        <div className="confirmation-content">
          <div className={cancelled ? "success-mark cancelled" : "success-mark"}>
            <Icon name={cancelled ? "close" : "check"} size={32} />
          </div>

          <h1 className="confirmation-title">
            {cancelled ? `Request to ${firstName} cancelled` : `Request sent to ${firstName}`}
          </h1>

          <p>
            {cancelled
              ? `You withdrew your request for the ${item?.name.toLowerCase() ?? "item"}. Nothing was sent to ${firstName}.`
              : `Now the friendly waiting bit. ${firstName} usually replies within a few hours — in a real build, that is.`}
          </p>

          <div className="confirmation-card">
            <div className="item-summary compact">
              {item ? (
                <ItemImage alt={item.name} fallbackLabel={item.name} src={item.photo} />
              ) : null}
              <div className="summary-copy">
                <strong>{item?.name ?? "Item"}</strong>
                <span>
                  from {owner.name} · {owner.distance}
                </span>
                <small>{describeRange(request.startDate, request.returnDate)}</small>
              </div>
            </div>

            <div className="summary-row">
              <span>Borrow from</span>
              <strong>{formatShort(request.startDate)}</strong>
            </div>
            <div className="summary-row">
              <span>Return by</span>
              <strong>{formatShort(request.returnDate)}</strong>
            </div>
            <div className="summary-row">
              <span>Handover</span>
              <strong>{request.handoff.place}</strong>
            </div>

            {!cancelled ? (
              <div className="status-row">
                <Icon name="clock" size={17} />
                <span>
                  <strong>Waiting for {firstName}'s approval</strong>
                  <small>Request saved {formatTimestamp(request.createdAt)}</small>
                </span>
              </div>
            ) : null}
          </div>

          {!cancelled && item ? (
            <section className="detail-section">
              <SectionHeading title="What you asked for" subtitle="Estimates agreed with the owner" />
              <PriceBreakdown
                item={item}
                returnDate={request.returnDate}
                startDate={request.startDate}
              />
            </section>
          ) : null}

          {!cancelled ? (
            <>
              <div className="next-steps">
                <h2>What happens next</h2>
                <ol>
                  <li>
                    <span>1</span>
                    <p>
                      <strong>{firstName} sees your message.</strong> You will get a reply in the
                      Inbox once they answer.
                    </p>
                  </li>
                  <li>
                    <span>2</span>
                    <p>
                      <strong>You agree a handover time.</strong> Pickup is usually the{" "}
                      {request.handoff.place.toLowerCase()}.
                    </p>
                  </li>
                  <li>
                    <span>3</span>
                    <p>
                      <strong>Borrowing starts when you collect it.</strong> The return date only
                      counts from then.
                    </p>
                  </li>
                </ol>
              </div>

              <div className="stacked-actions">
                <Button
                  icon="message"
                  onClick={() =>
                    push({ name: "thread", ownerId: owner.id, itemId: request.itemId, requestId: request.id })
                  }
                  variant="secondary"
                >
                  Message {firstName}
                </Button>
                <Button onClick={() => goToTab({ name: "borrowing", tab: "requests" })}>
                  View my request
                </Button>

                {confirmingCancel ? (
                  <div className="confirm-inline">
                    <Pill tone="warning" icon="alert">
                      Cancel this request?
                    </Pill>
                    <p className="muted-copy">
                      {firstName} has not replied yet, so there is nothing to undo on their side.
                    </p>
                    <div className="confirm-actions">
                      <Button onClick={handleCancel} variant="danger">
                        Yes, cancel it
                      </Button>
                      <Button onClick={() => setConfirmingCancel(false)} variant="secondary">
                        Keep the request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button className="plain-link danger" onClick={() => setConfirmingCancel(true)} type="button">
                    Cancel this request
                  </button>
                )}

                <button className="plain-link" onClick={() => goToTab({ name: "discover" })} type="button">
                  Back to Discover
                </button>
              </div>
            </>
          ) : (
            <div className="stacked-actions">
              <Button onClick={() => goToTab({ name: "discover" })} variant="secondary">
                Back to Discover
              </Button>
            </div>
          )}
        </div>
      </ScreenBody>

      <BottomNav active="borrowing" />
    </Screen>
  );
}
