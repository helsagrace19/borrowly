import { useEffect, useState } from "react";

import { addDays, describeRange, formatLong } from "../lib/dates";
import { deadlineOf } from "../lib/loan";
import { compareCosts, formatNaira } from "../lib/pricing";
import { getOwner } from "../data/catalogue";
import type { BorrowRequest } from "../types";
import { useBorrowly } from "../state/store";
import { useToast } from "../state/toast";
import { Button } from "./Button";
import { CalendarSheet } from "./CalendarSheet";
import { FieldLabel, InlineError, Notice } from "./Layout";
import { Pill } from "./Pill";
import { Sheet } from "./Sheet";

const DEFAULT_REASON = "Something came up and I need it a little longer.";

/** First day from `from` onwards that is not already promised to someone else. */
function firstFreeDate(from: string, blocked: Set<string>): string {
  for (let offset = 0; offset < 31; offset += 1) {
    const candidate = addDays(from, offset);
    if (!blocked.has(candidate)) return candidate;
  }
  return from;
}

type ExtensionSheetProps = {
  open: boolean;
  onClose: () => void;
  request: BorrowRequest;
  /** Days already blocked for this item, so the new date cannot clash. */
  blocked: Set<string>;
};

export function ExtensionSheet({ open, onClose, request, blocked }: ExtensionSheetProps) {
  const { requestExtension, withdrawExtension, itemById } = useBorrowly();
  const { showToast } = useToast();
  const currentDeadline = deadlineOf(request);
  const owner = getOwner(request.ownerId);
  const firstName = owner.name.split(" ")[0];
  const item = itemById(request.itemId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [newDate, setNewDate] = useState(() => firstFreeDate(addDays(currentDeadline, 2), blocked));
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [error, setError] = useState<string | null>(null);

  const pending = request.extension?.status === "pending";

  // The revised estimate follows the date picker, using the shared billing rule.
  const change = item ? compareCosts(item, request.startDate, currentDeadline, newDate) : null;

  // Reopen the sheet with a sensible, clash-free suggestion every time.
  useEffect(() => {
    if (!open) return;
    setNewDate(firstFreeDate(addDays(currentDeadline, 2), blocked));
    setError(null);
  }, [open, currentDeadline, blocked]);

  const submit = () => {
    if (newDate <= currentDeadline) {
      setError("Pick a date after the current return date.");
      return;
    }
    if (blocked.has(newDate)) {
      setError("Someone else has booked the item on that date.");
      return;
    }
    setError(null);
    requestExtension(request.id, newDate, reason.trim());
    showToast(`Asked ${firstName} to keep it longer`);
    onClose();
  };

  return (
    <>
      <Sheet onClose={onClose} open={open} title="Request more time">
        {pending ? (
          <>
            <Notice icon="clock" tone="coral" title={`Waiting on ${firstName}`}>
              You asked to keep it until {formatLong(request.extension?.newReturnDate ?? newDate)}.
              Until {firstName} answers, the original date still stands.
            </Notice>
            <div className="stacked-actions">
              <Button
                onClick={() => {
                  withdrawExtension(request.id);
                  showToast("Extension request withdrawn");
                  onClose();
                }}
                variant="secondary"
              >
                Withdraw the request
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="summary-row">
              <span>Currently due</span>
              <strong>{formatLong(currentDeadline)}</strong>
            </div>

            <FieldLabel>New return date</FieldLabel>
            <button className="input-box" onClick={() => setPickerOpen(true)} type="button">
              <span className="input-copy">
                <small>RETURN BY</small>
                <strong>{formatLong(newDate)}</strong>
              </span>
              <span className="mini-link" aria-hidden="true">
                Change
              </span>
            </button>
            <p className="helper-text">
              That is {describeRange(currentDeadline, newDate)} longer than agreed.
            </p>

            {change && (change.before.isPaid || change.before.depositRequired) ? (
              <div className="price-preview">
                <span className="price-preview-label">Revised estimate</span>
                <div className="price-preview-rows">
                  <span>Borrowing fee</span>
                  <strong>{formatNaira(change.after.borrowFee)}</strong>
                </div>
                {change.after.depositRequired ? (
                  <div className="price-preview-rows">
                    <span>Refundable deposit</span>
                    <strong>{formatNaira(change.after.deposit)}</strong>
                  </div>
                ) : null}
                <div className="price-preview-rows total">
                  <span>Before handoff</span>
                  <strong>{formatNaira(change.after.totalBeforeHandoff)}</strong>
                </div>
                <p className="price-hint">
                  {change.extraFee > 0
                    ? `${formatNaira(change.extraFee)} more than the agreed fee. `
                    : "No change to the agreed fee. "}
                  Nothing is charged until {firstName} accepts.
                </p>
              </div>
            ) : null}

            <FieldLabel htmlFor="extension-reason">Why do you need longer?</FieldLabel>
            <textarea
              id="extension-reason"
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              value={reason}
            />

            {error ? <InlineError>{error}</InlineError> : null}

            <Notice icon="info">
              {firstName} can say no. The original return date stays in place until they answer.
            </Notice>

            <div className="stacked-actions">
              <Button icon="send" onClick={submit}>
                Send the request
              </Button>
              <Button onClick={onClose} variant="plain">
                Not now
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <CalendarSheet
        blocked={blocked}
        hint={`Your current return date is ${formatLong(currentDeadline)}.`}
        minDate={addDays(currentDeadline, 1)}
        onClose={() => setPickerOpen(false)}
        onSelect={(iso) => {
          setNewDate(iso);
          setPickerOpen(false);
        }}
        open={pickerOpen}
        title="Keep it until"
        value={newDate}
      />
    </>
  );
}

type IssueSheetProps = {
  open: boolean;
  onClose: () => void;
  request: BorrowRequest;
};

const ISSUE_KINDS: { id: "damaged" | "late" | "no-response" | "other"; label: string }[] = [
  { id: "damaged", label: "Something is damaged" },
  { id: "late", label: "I can't return it on time" },
  { id: "no-response", label: "No reply from the owner" },
  { id: "other", label: "Something else" },
];

export function IssueSheet({ open, onClose, request }: IssueSheetProps) {
  const { reportIssue } = useBorrowly();
  const { showToast } = useToast();
  const owner = getOwner(request.ownerId);
  const firstName = owner.name.split(" ")[0];

  const [kind, setKind] = useState<"damaged" | "late" | "no-response" | "other">("damaged");
  const [note, setNote] = useState("");

  return (
    <Sheet onClose={onClose} open={open} title="Report a problem">
      <p className="muted-copy">
        This is a note to yourself and, in a real build, to {firstName}. Nothing is sent from here.
      </p>

      <div className="issue-options" role="group" aria-label="What went wrong">
        {ISSUE_KINDS.map((option) => (
          <button
            aria-pressed={kind === option.id}
            className={kind === option.id ? "issue-option selected" : "issue-option"}
            key={option.id}
            onClick={() => setKind(option.id)}
            type="button"
          >
            <span className="radio-dot" aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>

      <FieldLabel htmlFor="issue-note">Add a short note</FieldLabel>
      <textarea
        id="issue-note"
        onChange={(event) => setNote(event.target.value)}
        placeholder="What happened? Be as brief or as detailed as you like."
        rows={3}
        value={note}
      />

      {request.issue ? (
        <Pill tone="warning" icon="flag">
          You already reported this
        </Pill>
      ) : null}

      <div className="stacked-actions">
        <Button
          icon="flag"
          onClick={() => {
            reportIssue(request.id, { reportedAt: Date.now(), kind, note: note.trim() });
            showToast("Problem noted", { detail: "We'll keep this with the borrowing." });
            onClose();
          }}
          variant="secondary"
        >
          Save the note
        </Button>
        <Button onClick={onClose} variant="plain">
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}
