import { useMemo, useState } from "react";

import { Screen, ScreenBody, StickyAction, TopBar } from "../components/AppShell";
import { Button } from "../components/Button";
import { CalendarSheet } from "../components/CalendarSheet";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ItemImage } from "../components/ItemImage";
import { FieldLabel, InfoRow, InlineError, Notice, SectionHeading } from "../components/Layout";
import { getOwner } from "../data/catalogue";
import { HANDOFF_SLOTS, describeDue, formatLong, todayISO } from "../lib/dates";
import { deadlineOf, overdueDays } from "../lib/loan";
import { useNow } from "../lib/useNow";
import type { ReturnCondition } from "../types";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";
import { useToast } from "../state/toast";

const CONDITION_OPTIONS: { id: ReturnCondition; label: string; hint: string }[] = [
  {
    id: "same",
    label: "Exactly as I borrowed it",
    hint: "Cleaned, complete and working.",
  },
  {
    id: "minor-wear",
    label: "Normal wear from using it",
    hint: "Scuffs or marks you would expect from a normal borrow.",
  },
  {
    id: "issue",
    label: "Something is wrong with it",
    hint: "Damaged, not working, or a part is missing.",
  },
];

export function ReturnScreen({ requestId }: { requestId: string }) {
  const { back, replace, goToTab } = useNavigation();
  const { requestById, markReturned, setReturnHandoff, itemById } = useBorrowly();
  const { showToast } = useToast();
  const now = useNow();

  const request = requestById(requestId);
  const item = request ? itemById(request.itemId) : undefined;

  const [condition, setCondition] = useState<ReturnCondition | null>(null);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const deadline = request ? deadlineOf(request) : todayISO();
  const due = request ? describeDue(deadline, request.collectedAt, now) : null;
  const blocked = useMemo(() => new Set<string>(), []);

  if (!request || !item) {
    return (
      <Screen>
        <TopBar onBack={back} title="Return item" />
        <ScreenBody>
          <EmptyState icon="alert" title="We couldn't find that borrowing">
            Your active borrowings are listed under the Borrowing tab.
          </EmptyState>
        </ScreenBody>
      </Screen>
    );
  }

  const owner = getOwner(request.ownerId);
  const firstName = owner.name.split(" ")[0];
  const alreadyHandedBack = Boolean(request.handedBackAt);

  // Returning only makes sense once the item is physically with the borrower.
  if (!request.collectedAt || alreadyHandedBack) {
    return (
      <Screen>
        <TopBar onBack={back} title="Return item" />
        <ScreenBody>
          <EmptyState
            icon="info"
            title={alreadyHandedBack ? "This one is already on its way back" : "You haven't collected this yet"}
          >
            {alreadyHandedBack
              ? `You marked it returned. ${firstName} still needs to confirm receipt.`
              : `Mark it as collected on the Borrowing screen once the ${item.name.toLowerCase()} is in your hands.`}
          </EmptyState>
          <div className="stacked-actions">
            {alreadyHandedBack ? (
              <Button onClick={() => replace({ name: "return-status", requestId: request.id })}>
                View return status
              </Button>
            ) : (
              <Button onClick={back}>Go back</Button>
            )}
            <Button onClick={() => goToTab({ name: "borrowing", tab: "active" })} variant="plain">
              My borrowing
            </Button>
          </div>
        </ScreenBody>
      </Screen>
    );
  }

  const missingAccessories = item.accessories.filter((label) => !accessories.includes(label));
  const conditionError = attempted && !condition ? "Let us know what condition it is in." : undefined;
  const accessoryError =
    attempted && missingAccessories.length > 0 && condition !== "issue"
      ? `Tick everything you're handing back, or choose “Something is wrong” and tell ${firstName} what's missing.`
      : undefined;

  const handleSubmit = () => {
    setAttempted(true);
    if (!condition) {
      showToast("Confirm the condition first", { tone: "warning" });
      return;
    }
    if (missingAccessories.length > 0 && condition !== "issue") {
      showToast("Some accessories aren't confirmed", { tone: "warning" });
      return;
    }

    markReturned(request.id, {
      condition,
      accessories,
      notes: notes.trim(),
      completedAt: Date.now(),
    });
    showToast("Marked as handed back", {
      detail: `${firstName} will confirm receipt.`,
    });
    replace({ name: "return-status", requestId: request.id });
  };

  return (
    <Screen>
      <TopBar onBack={back} title="Return item" />

      <ScreenBody>
        <div className="item-summary compact">
          <ItemImage alt={item.name} fallbackLabel={item.name} src={item.photo} />
          <div className="summary-copy">
            <strong>{item.name}</strong>
            <span>
              from {owner.name} · {owner.distance}
            </span>
            <small>{request.handoff.place}</small>
          </div>
        </div>

        <h1 className="section-title">Ready to return it?</h1>
        <p className="muted-copy">
          Check it over, confirm the handover time, then mark it returned. Handing back early is
          always fine.
        </p>

        <div className={`deadline-strip ${due?.tone ?? "ok"}`}>
          <Icon name="clock" size={17} />
          <span>
            <strong>
              {due?.tone === "overdue" ? "You're past the deadline" : `Due ${formatLong(deadline)}`}
            </strong>
            <small>
              {due?.tone === "overdue"
                ? `${overdueDays(request, now)} day${overdueDays(request, now) === 1 ? "" : "s"} overdue · message ${firstName} if you need to`
                : `That is the deadline, not the handover time — they can be different.`}
            </small>
          </span>
        </div>

        <section className="form-section">
          <FieldLabel hint="Required">What condition is it in?</FieldLabel>
          <div className="issue-options" role="radiogroup" aria-label="Condition of the item">
            {CONDITION_OPTIONS.map((option) => (
              <button
                aria-checked={condition === option.id}
                className={condition === option.id ? "issue-option selected" : "issue-option"}
                key={option.id}
                onClick={() => setCondition(option.id)}
                role="radio"
                type="button"
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
              </button>
            ))}
          </div>
          {conditionError ? <InlineError>{conditionError}</InlineError> : null}
        </section>

        <section className="form-section">
          <SectionHeading title="What's going back" subtitle="Tick each thing you're handing over" />
          {item.accessories.length > 0 ? (
            <div className="checklist">
              {item.accessories.map((label) => {
                const checked = accessories.includes(label);
                return (
                  <label key={label}>
                    <input
                      checked={checked}
                      onChange={() =>
                        setAccessories((current) =>
                          current.includes(label)
                            ? current.filter((entry) => entry !== label)
                            : [...current, label],
                        )
                      }
                      type="checkbox"
                    />
                    <span className="check-copy">
                      <strong>{label}</strong>
                      <small>{checked ? "Going back" : "Not confirmed yet"}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="muted-copy">
              {firstName} didn't list any accessories with this item, so there is nothing extra to
              count.
            </p>
          )}
          {accessoryError ? <InlineError>{accessoryError}</InlineError> : null}
        </section>

        <section className="form-section">
          <FieldLabel htmlFor="return-notes" hint="Optional">
            Anything to tell {firstName}?
          </FieldLabel>
          <textarea
            id="return-notes"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. I took the case apart to clean it, or the blade needs a sharpen."
            rows={3}
            value={notes}
          />
        </section>

        <section className="form-section">
          <SectionHeading title="Return appointment" subtitle="Separate from the deadline" />
          <button className="input-box" onClick={() => setPickerOpen(true)} type="button">
            <span className="input-icon">
              <Icon name="calendar" size={18} />
            </span>
            <span className="input-copy">
              <small>HANDOVER</small>
              <strong>
                {request.returnHandoff.date
                  ? `${formatLong(request.returnHandoff.date)}${
                      request.returnHandoff.slot ? ` · ${request.returnHandoff.slot}` : ""
                    }`
                  : "Not arranged yet"}
              </strong>
            </span>
            <Icon name="arrowRight" size={17} />
          </button>

          {request.returnHandoff.date ? (
            <div className="quick-row">
              <span>Time</span>
              {HANDOFF_SLOTS.map((slot) => (
                <Chip
                  key={slot}
                  onClick={() => setReturnHandoff(request.id, { slot })}
                  selected={request.returnHandoff.slot === slot}
                >
                  {slot}
                </Chip>
              ))}
            </div>
          ) : null}

          <InfoRow detail={request.handoff.place} icon="home" title="Handover spot" />
        </section>

        <div className="return-summary">
          <SectionHeading title="What you're confirming" />
          <div className="summary-row">
            <span>Item</span>
            <strong>{item.name}</strong>
          </div>
          <div className="summary-row">
            <span>Going back</span>
            <strong>
              {condition
                ? CONDITION_OPTIONS.find((option) => option.id === condition)?.label
                : "Not confirmed"}
            </strong>
          </div>
          <div className="summary-row">
            <span>Accessories</span>
            <strong>
              {item.accessories.length === 0
                ? "None listed"
                : `${accessories.length} of ${item.accessories.length}`}
            </strong>
          </div>
          <div className="summary-row">
            <span>Appointment</span>
            <strong>
              {request.returnHandoff.date
                ? `${formatLong(request.returnHandoff.date)}${request.returnHandoff.slot ? ` · ${request.returnHandoff.slot}` : ""}`
                : "Not arranged"}
            </strong>
          </div>
          <div className="summary-row">
            <span>Deadline</span>
            <strong>{formatLong(deadline)}</strong>
          </div>
        </div>

        <Notice icon="info" title="Marking it returned isn't the end">
          You are telling Borrowly you handed it back. {firstName} then confirms they received it.
        </Notice>
      </ScreenBody>

      <StickyAction>
        <div className="action-summary">
          <span>Borrower confirms</span>
          <strong>{firstName} confirms back</strong>
        </div>
        <Button icon="check" onClick={handleSubmit}>
          Mark as returned
        </Button>
      </StickyAction>

      <CalendarSheet
        blocked={blocked}
        hint={`The deadline is ${formatLong(deadline)} — you can hand it back earlier.`}
        minDate={todayISO()}
        onClose={() => setPickerOpen(false)}
        onSelect={(iso) => {
          setReturnHandoff(request.id, { date: iso, slot: request.returnHandoff.slot ?? "6:30 PM" });
          setPickerOpen(false);
        }}
        open={pickerOpen}
        title="When will you hand it back?"
        value={request.returnHandoff.date}
      />
    </Screen>
  );
}
