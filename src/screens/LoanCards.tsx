import { useState } from "react";

import { Button } from "../components/Button";
import { ExtensionSheet, IssueSheet } from "../components/BorrowingSheets";
import { Icon } from "../components/Icon";
import { ItemImage } from "../components/ItemImage";
import { InfoRow, Notice, SectionHeading } from "../components/Layout";
import { Pill, ProgressBar } from "../components/Pill";
import { getOwner } from "../data/catalogue";
import {
  DUE_HOUR,
  describeDue,
  describeRange,
  formatLong,
  formatShort,
  formatTimestamp,
} from "../lib/dates";
import { deadlineOf, isUnconfirmedClose, overdueAmount } from "../lib/loan";
import { compareCosts, costForRange, formatNaira } from "../lib/pricing";
import type { BorrowRequest, Item, LoanPhase } from "../types";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";
import { useToast } from "../state/toast";

function StatusStrip({ tone, title, detail }: { tone: string; title: string; detail?: string }) {
  return (
    <div className={`status-strip ${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      <span className="status-copy">
        <strong>{title}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
    </div>
  );
}

function ItemHead({ request, compact = false }: { request: BorrowRequest; compact?: boolean }) {
  const { itemById } = useBorrowly();
  const item = itemById(request.itemId);
  const owner = getOwner(request.ownerId);
  if (!item) return null;

  return (
    <div className={compact ? "item-summary compact" : "item-summary"}>
      <ItemImage alt={item.name} fallbackLabel={item.name} src={item.photo} />
      <div className="summary-copy">
        <strong>{item.name}</strong>
        <span>
          from {owner.name} · {owner.distance}
        </span>
        <small>{item.handoffPlace}</small>
      </div>
    </div>
  );
}

/**
 * What this loan costs, kept next to the loan itself so the agreed terms are
 * never buried. A pending extension shows what the change *would* cost.
 */
function CostSummary({ item, request }: { item: Item; request: BorrowRequest }) {
  const firstName = getOwner(request.ownerId).name.split(" ")[0];
  const current = costForRange(item, request.startDate, deadlineOf(request));
  const pending = request.extension && request.extension.status === "pending" ? request.extension : null;
  const change = pending
    ? compareCosts(item, request.startDate, request.returnDate, pending.newReturnDate)
    : null;

  if (!current.isPaid && !current.depositRequired && !change) return null;

  return (
    <div className="cost-summary">
      <SectionHeading title="Agreed terms" />
      <div className="summary-rows">
        <div className="summary-row">
          <span>Borrowing fee</span>
          <strong>
            {current.isPaid
              ? `${formatNaira(current.borrowFee)} · ${current.days} ${current.days === 1 ? "day" : "days"}`
              : "Free"}
          </strong>
        </div>
        {current.depositRequired ? (
          <div className="summary-row">
            <span>Refundable deposit</span>
            <strong>{formatNaira(current.deposit)}</strong>
          </div>
        ) : null}
        {current.totalBeforeHandoff > 0 ? (
          <div className="summary-row total">
            <span>Before handoff</span>
            <strong>{formatNaira(current.totalBeforeHandoff)}</strong>
          </div>
        ) : null}
      </div>

      {pending && change ? (
        <Notice icon="clock" tone="coral" title={`If extended to ${formatShort(pending.newReturnDate)}`}>
          {change.after.isPaid
            ? `The fee would be ${formatNaira(change.after.borrowFee)}, ${formatNaira(change.extraFee)} more than agreed. This only applies once ${firstName} accepts.`
            : `The dates would move to ${formatShort(pending.newReturnDate)}. No extra fee.`}
        </Notice>
      ) : null}

      {request.extension?.status === "approved" ? (
        <p className="price-hint">
          Includes the extra days from your extension, agreed on{" "}
          {formatShort(request.extension.newReturnDate)}.
        </p>
      ) : null}

      <p className="price-hint">
        {current.totalBeforeHandoff > 0
          ? `Paid straight to ${firstName} when you collect. Borrowly does not take or hold payments.`
          : "Nothing to pay for this loan."}
      </p>
    </div>
  );
}

function Timeline({ request }: { request: BorrowRequest }) {  const steps = [
    { label: "Request sent", at: request.createdAt, done: true },
    { label: "Owner approved", at: request.decidedAt, done: Boolean(request.decidedAt) },
    { label: "Collected", at: request.collectedAt, done: Boolean(request.collectedAt) },
    { label: "Handed back", at: request.handedBackAt, done: Boolean(request.handedBackAt) },
    { label: "Return confirmed", at: request.confirmedAt, done: Boolean(request.confirmedAt) },
  ];

  return (
    <ol className="timeline">
      {steps.map((step) => (
        <li className={step.done ? "done" : ""} key={step.label}>
          <span className="timeline-mark" aria-hidden="true">
            {step.done ? <Icon name="check" size={12} /> : null}
          </span>
          <span className="timeline-copy">
            <strong>{step.label}</strong>
            <small>{step.at ? formatTimestamp(step.at) : "Pending"}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Requests still waiting on the owner, and requests that ended early
// ---------------------------------------------------------------------------

export function PendingCard({ request }: { request: BorrowRequest }) {
  const { push } = useNavigation();
  const { cancelRequest } = useBorrowly();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const owner = getOwner(request.ownerId);
  const firstName = owner.name.split(" ")[0];

  return (
    <article className="loan-card">
      <div className="loan-card-head">
        <Pill dot tone="pending">
          Waiting for approval
        </Pill>
        <span className="loan-card-when">Sent {formatTimestamp(request.createdAt)}</span>
      </div>

      <ItemHead request={request} compact />

      <div className="summary-rows">
        <div className="summary-row">
          <span>Borrow from</span>
          <strong>{formatShort(request.startDate)}</strong>
        </div>
        <div className="summary-row">
          <span>Return by</span>
          <strong>{formatShort(request.returnDate)}</strong>
        </div>
        <div className="summary-row">
          <span>Length</span>
          <strong>{describeRange(request.startDate, request.returnDate)}</strong>
        </div>
      </div>

      <p className="muted-copy">
        {firstName} hasn't replied yet. You can play their reply from the prototype controls.
      </p>

      <div className="card-actions">
        <Button
          icon="message"
          onClick={() =>
            push({ name: "thread", ownerId: owner.id, itemId: request.itemId, requestId: request.id })
          }
          variant="secondary"
        >
          Message {firstName}
        </Button>
        <Button onClick={() => push({ name: "item", itemId: request.itemId })} variant="secondary">
          View the item
        </Button>
      </div>

      {confirming ? (
        <div className="confirm-inline">
          <p className="muted-copy">Cancel the request to {firstName}?</p>
          <div className="confirm-actions">
            <Button
              onClick={() => {
                cancelRequest(request.id);
                showToast("Request cancelled");
              }}
              variant="danger"
            >
              Yes, cancel
            </Button>
            <Button onClick={() => setConfirming(false)} variant="secondary">
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <button className="plain-link danger" onClick={() => setConfirming(true)} type="button">
          Cancel request
        </button>
      )}
    </article>
  );
}

export function ClosedCard({ request, phase }: { request: BorrowRequest; phase: LoanPhase }) {
  const { push } = useNavigation();
  const owner = getOwner(request.ownerId);
  const declined = phase === "declined";

  return (
    <article className="loan-card muted">
      <div className="loan-card-head">
        <Pill icon={declined ? "close" : "info"} tone="neutral">
          {declined ? "Declined" : "Cancelled"}
        </Pill>
        <span className="loan-card-when">
          {request.decidedAt ? formatTimestamp(request.decidedAt) : formatTimestamp(request.createdAt)}
        </span>
      </div>

      <ItemHead request={request} compact />

      <p className="muted-copy">
        {declined
          ? `${owner.name} couldn't lend this one${request.declineReason ? ` — “${request.declineReason}”` : ""}. Try a different date, or ask someone else in the building.`
          : "You withdrew this request before it was answered."}
      </p>

      <div className="card-actions">
        <Button icon="refresh" onClick={() => push({ name: "request", itemId: request.itemId })} variant="secondary">
          {declined ? "Ask again with new dates" : "Request it again"}
        </Button>
        <Button onClick={() => push({ name: "item", itemId: request.itemId })} variant="secondary">
          View the item
        </Button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Live loans
// ---------------------------------------------------------------------------

export function LoanCard({ request, phase, now }: { request: BorrowRequest; phase: LoanPhase; now: number }) {
  const { push } = useNavigation();
  const { markCollected, cancelRequest, unavailableDates, itemById } = useBorrowly();
  const { showToast } = useToast();
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const item = itemById(request.itemId);
  const owner = getOwner(request.ownerId);
  const firstName = owner.name.split(" ")[0];
  const deadline = deadlineOf(request);
  const due = describeDue(deadline, request.collectedAt, now);
  const blocked = unavailableDates(request.itemId);
  const openThread = () =>
    push({ name: "thread", ownerId: owner.id, itemId: request.itemId, requestId: request.id });

  if (!item) return null;

  return (
    <article className={`loan-card phase-${phase}`}>
      {phase === "approved" ? (
        <StatusStrip
          tone="approved"
          title="Approved — arrange the handover"
          detail={`${firstName} said yes. Borrowing starts when you collect it.`}
        />
      ) : null}

      {phase === "collected" ? (
        <StatusStrip
          tone="active"
          title="With you now"
          detail={`${due.label} · return by ${formatShort(deadline)} at 8:00 PM`}
        />
      ) : null}

      {phase === "overdue" ? (
        <StatusStrip
          tone="overdue"
          title={`${overdueAmount(request, now) ?? "1 day"} overdue`}
          detail={`${firstName} is expecting it back. A quick message goes a long way.`}
        />
      ) : null}

      {phase === "return-pending" ? (
        <StatusStrip
          tone="returning"
          title="Handed back — waiting on confirmation"
          detail={`You marked it returned. Only ${firstName} can confirm receipt.`}
        />
      ) : null}

      <ItemHead request={request} compact />

      {phase === "approved" ? (
        <>
          <div className="handoff-block">
            <SectionHeading title="Collection" />
            <InfoRow detail={item.handoffNote} icon="home" title={request.handoff.place} />
            <InfoRow
              detail={`${describeRange(request.startDate, request.returnDate)} planned`}
              icon="calendar"
              title={`From ${formatShort(request.startDate)}`}
            />
          </div>

          <Notice icon="info">
            Mark it as collected the moment it is in your hands. That is what starts the return
            clock, not the date you agreed.
          </Notice>

          <CostSummary item={item} request={request} />

          <div className="card-actions">
            <Button icon="check" onClick={() => markCollected(request.id)}>
              I've collected it
            </Button>
            <Button icon="message" onClick={openThread} variant="secondary">
              Message {firstName}
            </Button>
          </div>

          {confirmingCancel ? (
            <div className="confirm-inline">
              <p className="muted-copy">
                Cancel before collecting? {firstName} already said yes, so it is worth a message.
              </p>
              <div className="confirm-actions">
                <Button
                  onClick={() => {
                    cancelRequest(request.id);
                    showToast("Request cancelled before collection");
                  }}
                  variant="danger"
                >
                  Yes, cancel
                </Button>
                <Button onClick={() => setConfirmingCancel(false)} variant="secondary">
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="plain-link danger"
              onClick={() => setConfirmingCancel(true)}
              type="button"
            >
              Cancel before collecting
            </button>
          )}
        </>
      ) : null}

      {phase === "collected" || phase === "overdue" ? (
        <>
          <div className={`due-panel ${due.tone}`}>
            <span>{due.tone === "overdue" ? "OVERDUE BY" : "DUE IN"}</span>
            <strong>{due.amount}</strong>
            <small>
              Return by {formatLong(deadline)} at {DUE_HOUR % 12}:00 PM
            </small>
            <ProgressBar tone={due.tone === "overdue" ? "warning" : "coral"} value={due.progress} />
          </div>

          <div className="handoff-block">
            <SectionHeading
              subtitle="Not the same as the deadline"
              title="Return appointment"
            />
            {request.returnHandoff.date && request.returnHandoff.slot ? (
              <InfoRow
                detail={request.returnHandoff.place}
                icon="calendar"
                title={`${formatLong(request.returnHandoff.date)} · ${request.returnHandoff.slot}`}
                trailing={
                  <button
                    className="mini-link"
                    onClick={() => push({ name: "return", requestId: request.id })}
                    type="button"
                  >
                    Change
                  </button>
                }
              />
            ) : (
              <Notice icon="clock" tone="coral" title="No handover time yet">
                Pick a time that suits you both — it can be earlier than the deadline.
              </Notice>
            )}
            <InfoRow detail={request.handoff.place} icon="home" title="Where" />
          </div>

          <CostSummary item={item} request={request} />

          {request.extension ? (
            <div className="extension-block">
              {request.extension.status === "pending" ? (
                <Notice icon="clock" tone="coral" title="Extension requested">
                  You asked to keep it until {formatLong(request.extension.newReturnDate)}. The
                  original date still stands until {firstName} answers.
                </Notice>
              ) : null}
              {request.extension.status === "approved" ? (
                <Notice icon="checkCircle" title="Extension approved">
                  New return date: {formatLong(request.extension.newReturnDate)}.
                </Notice>
              ) : null}
              {request.extension.status === "declined" ? (
                <Notice icon="alert" tone="warning" title="Extension declined">
                  {firstName} needs it back on the original date — {formatLong(request.returnDate)}.
                </Notice>
              ) : null}
            </div>
          ) : null}

          {request.issue ? (
            <Notice icon="flag" tone="warning" title="You reported a problem">
              Saved {formatTimestamp(request.issue.reportedAt)}. {request.issue.note}
            </Notice>
          ) : null}

          <div className="card-actions">
            <Button icon="arrowRight" onClick={() => push({ name: "return", requestId: request.id })}>
              Start return
            </Button>
            <Button icon="message" onClick={openThread} variant="secondary">
              Message {firstName}
            </Button>
            {request.extension?.status !== "pending" && request.extension?.status !== "approved" ? (
              <Button icon="clock" onClick={() => setExtensionOpen(true)} variant="secondary">
                Request more time
              </Button>
            ) : null}
          </div>

          <div className="inline-links">
            <button className="plain-link" onClick={() => setIssueOpen(true)} type="button">
              Report a problem
            </button>
            <button
              className="plain-link"
              onClick={() => push({ name: "item", itemId: request.itemId })}
              type="button"
            >
              View the item
            </button>
          </div>
        </>
      ) : null}

      {phase === "return-pending" ? (
        <>
          <Timeline request={request} />

          <Notice icon="info" tone="coral" title="Only the owner can confirm">
            Marking it returned tells Borrowly you handed it back. It does not mean {firstName} has
            received it.
          </Notice>

          <div className="card-actions">
            <Button
              icon="arrowRight"
              onClick={() => push({ name: "return-status", requestId: request.id })}
            >
              View return status
            </Button>
            <Button icon="message" onClick={openThread} variant="secondary">
              Message {firstName}
            </Button>
          </div>
        </>
      ) : null}

      <ExtensionSheet
        blocked={blocked}
        onClose={() => setExtensionOpen(false)}
        open={extensionOpen}
        request={request}
      />
      <IssueSheet onClose={() => setIssueOpen(false)} open={issueOpen} request={request} />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Finished loans
// ---------------------------------------------------------------------------

export function HistoryCard({ request }: { request: BorrowRequest }) {
  const { push } = useNavigation();
  const { itemById } = useBorrowly();
  const item = itemById(request.itemId);
  const owner = getOwner(request.ownerId);
  const unconfirmed = isUnconfirmedClose(request);
  const deadline = deadlineOf(request);

  const finishedAt = request.confirmedAt ?? request.resolvedWithoutConfirmationAt ?? request.handedBackAt;
  const onTime = finishedAt ? finishedAt <= new Date(`${deadline}T23:59:59`).getTime() : false;

  return (
    <article className="loan-card muted">
      <div className="loan-card-head">
        <Pill icon={unconfirmed ? "help" : "checkCircle"} tone={onTime ? "done" : "neutral"}>
          {unconfirmed ? "Closed without confirmation" : "Returned"}
        </Pill>
        <span className="loan-card-when">{finishedAt ? formatTimestamp(finishedAt) : ""}</span>
      </div>

      <ItemHead request={request} compact />

      <div className="summary-rows">
        <div className="summary-row">
          <span>Borrowed</span>
          <strong>{formatShort(request.startDate)}</strong>
        </div>
        <div className="summary-row">
          <span>Returned</span>
          <strong>{formatShort(deadline)}</strong>
        </div>
        <div className="summary-row">
          <span>Condition</span>
          <strong>
            {request.returnChecklist?.condition === "issue"
              ? "Reported an issue"
              : request.returnChecklist?.condition === "minor-wear"
                ? "Minor wear"
                : "As borrowed"}
          </strong>
        </div>
      </div>

      {unconfirmed ? (
        <Notice icon="help" tone="warning" title="No confirmation received">
          You closed this on your side after handing it back. {owner.name} never confirmed receipt
          in the prototype.
        </Notice>
      ) : null}

      <div className="card-actions">
        <Button icon="refresh" onClick={() => push({ name: "item", itemId: request.itemId })} variant="secondary">
          View {item?.name ?? "the item"}
        </Button>
        <Button icon="message" onClick={() => push({ name: "thread", ownerId: owner.id, itemId: request.itemId, requestId: request.id })} variant="secondary">
          Message {owner.name.split(" ")[0]}
        </Button>
      </div>
    </article>
  );
}
