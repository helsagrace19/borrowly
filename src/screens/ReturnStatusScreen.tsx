import { useState } from "react";

import { Screen, ScreenBody, StickyAction, TopBar } from "../components/AppShell";
import { Button } from "../components/Button";
import { IssueSheet } from "../components/BorrowingSheets";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ItemImage } from "../components/ItemImage";
import { InfoRow, Notice, SectionHeading } from "../components/Layout";
import { Pill } from "../components/Pill";
import { getOwner } from "../data/catalogue";
import { formatLong, formatTimestamp } from "../lib/dates";
import { deadlineOf, isUnconfirmedClose, phaseOf } from "../lib/loan";
import { useNow } from "../lib/useNow";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";
import { useToast } from "../state/toast";

export function ReturnStatusScreen({ requestId }: { requestId: string }) {
  const { back, push, goToTab } = useNavigation();
  const { requestById, nudgeReturn, resolveUnconfirmed, itemById } = useBorrowly();
  const { showToast } = useToast();
  const now = useNow();
  const [showHelp, setShowHelp] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  const request = requestById(requestId);

  if (!request) {
    return (
      <Screen>
        <TopBar onBack={back} title="Return" />
        <ScreenBody>
          <EmptyState icon="alert" title="We couldn't find that borrowing">
            Your active borrowings are listed under the Borrowing tab.
          </EmptyState>
        </ScreenBody>
      </Screen>
    );
  }

  const item = itemById(request.itemId);
  const owner = getOwner(request.ownerId);
  const firstName = owner.name.split(" ")[0];
  const phase = phaseOf(request, now);
  const done = phase === "returned";
  const unconfirmed = isUnconfirmedClose(request);
  const deadline = deadlineOf(request);

  const timeline = [
    { label: "Request sent", at: request.createdAt },
    { label: `${firstName} approved`, at: request.decidedAt },
    { label: "You collected it", at: request.collectedAt },
    { label: "You handed it back", at: request.handedBackAt },
    {
      label: unconfirmed ? "Closed without confirmation" : `${firstName} confirmed receipt`,
      at: request.confirmedAt ?? request.resolvedWithoutConfirmationAt,
    },
  ];

  return (
    <Screen>
      <TopBar onBack={back} title={done ? "Return complete" : "Waiting on confirmation"} />

      <ScreenBody>
        <div className="confirmation-content">
          <div className={done ? "success-mark" : "success-mark waiting"}>
            <Icon name={done ? "check" : "clock"} size={30} />
          </div>

          <h1 className="confirmation-title">
            {done
              ? unconfirmed
                ? "Closed on your side"
                : `Returned — thanks, ${firstName} confirmed`
              : `Handed back to ${firstName}?`}
          </h1>

          <p>
            {done
              ? unconfirmed
                ? `${firstName} never confirmed receipt, so you closed it after handing it back.`
                : `Confirmed ${formatTimestamp(request.confirmedAt ?? Date.now())}. The loan is finished and nothing further is owed.`
              : `You marked it returned on ${formatTimestamp(request.handedBackAt ?? Date.now())}. Now ${firstName} needs to confirm they have it.`}
          </p>

          {!done ? (
            <Pill icon="clock" tone="pending">
              Awaiting {firstName}'s confirmation
            </Pill>
          ) : null}
        </div>

        {item ? (
          <div className="item-summary compact">
            <ItemImage alt={item.name} fallbackLabel={item.name} src={item.photo} />
            <div className="summary-copy">
              <strong>{item.name}</strong>
              <span>
                from {owner.name} · {owner.distance}
              </span>
              <small>Agreed return date {formatLong(deadline)}</small>
            </div>
          </div>
        ) : null}

        <section className="detail-section">
          <SectionHeading title="How it went" />
          <ol className="timeline">
            {timeline.map((step) => (
              <li className={step.at ? "done" : ""} key={step.label}>
                <span className="timeline-mark" aria-hidden="true">
                  {step.at ? <Icon name="check" size={12} /> : null}
                </span>
                <span className="timeline-copy">
                  <strong>{step.label}</strong>
                  <small>{step.at ? formatTimestamp(step.at) : "Still pending"}</small>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {request.returnChecklist ? (
          <section className="detail-section">
            <SectionHeading title="What you confirmed" />
            <InfoRow
              detail={
                request.returnChecklist.condition === "issue"
                  ? "You flagged a problem for the owner"
                  : request.returnChecklist.condition === "minor-wear"
                    ? "Normal wear from use"
                    : "Exactly as borrowed"
              }
              icon={request.returnChecklist.condition === "issue" ? "alert" : "checkCircle"}
              title="Condition"
            />
            {item && item.accessories.length > 0 ? (
              <InfoRow
                detail={`${request.returnChecklist.accessories.length} of ${item.accessories.length} confirmed`}
                icon="box"
                title="Accessories"
              />
            ) : null}
            {request.returnChecklist.notes ? (
              <InfoRow detail={request.returnChecklist.notes} icon="message" title="Your note" />
            ) : null}
            {request.returnHandoff.date ? (
              <InfoRow
                detail={request.returnHandoff.place}
                icon="calendar"
                title={`Handover ${formatLong(request.returnHandoff.date)}${
                  request.returnHandoff.slot ? ` · ${request.returnHandoff.slot}` : ""
                }`}
              />
            ) : null}
          </section>
        ) : null}

        {!done ? (
          <>
            <Notice icon="info" tone="coral" title="Why nothing has changed yet">
              Confirming a return is the owner's action. Borrowly has no owner account, so this
              waiting state is what you would see until {firstName} taps confirm.
            </Notice>

            <div className="stacked-actions">
              <Button
                icon="bell"
                onClick={() => {
                  nudgeReturn(request.id);
                  showToast(`Reminder sent to ${firstName}`, {
                    detail: "They'll see it next time they open Borrowly.",
                  });
                }}
                variant="secondary"
              >
                {request.nudges > 0
                  ? `Send another reminder (${request.nudges})`
                  : `Send ${firstName} a reminder`}
              </Button>
              <Button
                icon="message"
                onClick={() =>
                  push({
                    name: "thread",
                    ownerId: owner.id,
                    itemId: request.itemId,
                    requestId: request.id,
                  })
                }
                variant="secondary"
              >
                Message {firstName}
              </Button>
            </div>

            <div className="help-block">
              <button className="help-toggle" onClick={() => setShowHelp((value) => !value)} type="button">
                <Icon name="help" size={16} />
                Still not confirmed?
                <Icon name={showHelp ? "chevronUp" : "chevronDown"} size={16} />
              </button>

              {showHelp || request.nudges > 0 ? (
                <div className="help-body">
                  <p className="muted-copy">
                    Give it a couple of days — people check their phones at different speeds. If it
                    stays unanswered, you can close the loan on your side so it does not sit open
                    forever. It will be marked as closed without confirmation, and you can still
                    message {firstName} about it afterwards.
                  </p>
                  <div className="stacked-actions">
                    <Button
                      icon="flag"
                      onClick={() => setIssueOpen(true)}
                      variant="plain"
                    >
                      Report a problem instead
                    </Button>
                    <Button
                      icon="check"
                      onClick={() => {
                        resolveUnconfirmed(request.id);
                        showToast("Closed on your side", {
                          detail: `Marked as closed without ${firstName}'s confirmation.`,
                        });
                      }}
                      variant="secondary"
                    >
                      Close it on my side
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="stacked-actions">
            <Button icon="search" onClick={() => goToTab({ name: "discover" })} variant="secondary">
              Borrow something else
            </Button>
            <Button onClick={() => goToTab({ name: "borrowing", tab: "history" })}>
              See my borrowing history
            </Button>
          </div>
        )}
      </ScreenBody>

      {!done ? (
        <StickyAction>
          <div className="action-summary">
            <span>Borrower side complete</span>
            <strong>Waiting on {firstName}</strong>
          </div>
          <Button onClick={() => goToTab({ name: "borrowing", tab: "active" })} variant="secondary">
            Back to my borrowing
          </Button>
        </StickyAction>
      ) : null}

      <IssueSheet onClose={() => setIssueOpen(false)} open={issueOpen} request={request} />
    </Screen>
  );
}
