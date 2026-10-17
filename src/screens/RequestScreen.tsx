import { useEffect, useMemo, useRef, useState } from "react";

import { Screen, ScreenBody, StickyAction, TopBar } from "../components/AppShell";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { CalendarSheet } from "../components/CalendarSheet";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ItemImage } from "../components/ItemImage";
import { FieldLabel, InlineError, Notice } from "../components/Layout";
import { PriceBreakdown } from "../components/Price";
import { borrower, getOwner, selfOwnerId } from "../data/catalogue";
import { addDays, daysBetween, describeRange, eachDayInclusive, formatLong, todayISO } from "../lib/dates";
import { canRequestItem, firstAvailableRange, firstNameOf, validateRange } from "../lib/loan";
import { locationLine } from "../lib/location";
import { costForRange, formatNaira } from "../lib/pricing";
import { useNow } from "../lib/useNow";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";
import { useToast } from "../state/toast";

const MESSAGE_LIMIT = 400;

export function RequestScreen({ itemId }: { itemId: string }) {
  const { push, back, goToTab } = useNavigation();
  const { requests, draftFor, setDraft, submitRequest, unavailableDates, itemById } = useBorrowly();
  const { showToast } = useToast();
  const now = useNow();

  const [picker, setPicker] = useState<null | "start" | "return">(null);
  const [attempted, setAttempted] = useState(false);
  const submitted = useRef(false);

  const item = itemById(itemId);
  const draft = draftFor(itemId);

  const ownerName = item ? getOwner(item.ownerId).name : "the owner";
  const firstName = firstNameOf(ownerName);

  const eligibility = useMemo(
    () => (item ? canRequestItem(item, requests, now, selfOwnerId) : { allowed: false }),
    [item, requests, now],
  );

  const validation = useMemo(() => {
    if (!item) return { ok: false, errors: {}, days: 0 };
    return validateRange({
      item,
      ownerName,
      startDate: draft.startDate,
      returnDate: draft.returnDate,
      requests,
    });
  }, [item, ownerName, draft.startDate, draft.returnDate, requests]);

  const blockedDates = useMemo(() => unavailableDates(itemId), [unavailableDates, itemId]);

  // If the suggested dates clash with a booking, open on the soonest free
  // window instead of showing the form already in an error state.
  const initialised = useRef(false);
  useEffect(() => {
    if (!item || initialised.current) return;
    initialised.current = true;

    const clashes = eachDayInclusive(draft.startDate, draft.returnDate).some((day) =>
      blockedDates.has(day),
    );
    if (!clashes) return;

    const duration = Math.max(1, daysBetween(draft.startDate, draft.returnDate));
    const free = firstAvailableRange(item, requests, duration);
    setDraft(itemId, { startDate: free.startDate, returnDate: free.returnDate });
  }, [item, requests, draft.startDate, draft.returnDate, blockedDates, itemId, setDraft]);

  if (!item) {
    return (
      <Screen>
        <TopBar onBack={back} title="Request to borrow" />
        <ScreenBody>
          <EmptyState icon="alert" title="That item is no longer listed">
            Head back to Discover to find something else nearby.
          </EmptyState>
          <Button onClick={() => goToTab({ name: "discover" })} variant="secondary">
            Back to Discover
          </Button>
        </ScreenBody>
      </Screen>
    );
  }

  const owner = getOwner(item.ownerId);
  const duration = Math.max(1, daysBetween(draft.startDate, draft.returnDate));
  const cost = costForRange(item, draft.startDate, draft.returnDate);
  const maxDuration = item.maxDays;

  const applyStart = (iso: string) => {
    const wanted = maxDuration === null ? duration : Math.min(Math.max(duration, 1), maxDuration);
    setDraft(itemId, { startDate: iso, returnDate: addDays(iso, wanted) });
    setPicker(null);
  };

  const handleSubmit = () => {
    setAttempted(true);

    if (!eligibility.allowed) {
      showToast(eligibility.reason ?? "This item can't be requested right now.", { tone: "warning" });
      return;
    }
    if (!validation.ok) {
      showToast("Please check the dates before sending", { tone: "warning" });
      return;
    }
    if (submitted.current) return;
    submitted.current = true;

    const request = submitRequest({
      itemId,
      startDate: draft.startDate,
      returnDate: draft.returnDate,
      message: draft.message.trim(),
    });
    push({ name: "confirmation", requestId: request.id });
  };

  const showStartError = attempted ? validation.errors.start : undefined;
  const showReturnError = attempted ? validation.errors.return : undefined;

  return (
    <Screen>
      <TopBar onBack={back} title="Request to borrow" />

      <ScreenBody>
        <div className="item-summary">
          <ItemImage alt={item.name} fallbackLabel={item.name} src={item.photo} />
          <div className="summary-copy">
            <strong>{item.name}</strong>
            <span>
              from {owner.name} · {owner.distance}
            </span>
            <small>{item.handoffPlace}</small>
          </div>
        </div>

        {!eligibility.allowed ? (
          <>
            <Notice icon="info" tone="warning" title="You can't request this right now">
              {eligibility.reason}
            </Notice>
            <Button onClick={() => goToTab({ name: "borrowing", tab: "requests" })} variant="secondary">
              View my requests
            </Button>
          </>
        ) : null}

        <section className="form-section">
          <FieldLabel hint={maxDuration ? `Up to ${maxDuration} ${maxDuration === 1 ? "day" : "days"}` : "Agree with the owner"}>
            When will you borrow it?
          </FieldLabel>

          <button className="input-box" onClick={() => setPicker("start")} type="button">
            <span className="input-icon">
              <Icon name="calendar" size={18} />
            </span>
            <span className="input-copy">
              <small>START</small>
              <strong>{formatLong(draft.startDate)}</strong>
            </span>
            <Icon name="arrowRight" size={17} />
          </button>
          {showStartError ? <InlineError>{showStartError}</InlineError> : null}

          <button className="input-box" onClick={() => setPicker("return")} type="button">
            <span className="input-icon">
              <Icon name="clock" size={18} />
            </span>
            <span className="input-copy">
              <small>RETURN</small>
              <strong>{formatLong(draft.returnDate)}</strong>
            </span>
            <Icon name="arrowRight" size={17} />
          </button>
          {showReturnError ? <InlineError>{showReturnError}</InlineError> : null}

          <div className="quick-row">
            <span>Start</span>
            <Chip onClick={() => applyStart(todayISO())} selected={draft.startDate === todayISO()}>
              Today
            </Chip>
            <Chip
              onClick={() => applyStart(addDays(todayISO(), 1))}
              selected={draft.startDate === addDays(todayISO(), 1)}
            >
              Tomorrow
            </Chip>
            <Chip
              onClick={() => applyStart(addDays(todayISO(), 3))}
              selected={draft.startDate === addDays(todayISO(), 3)}
            >
              In 3 days
            </Chip>
          </div>

          <div className="range-summary">
            <Icon name="check" size={16} />
            <span>
              <strong>{describeRange(draft.startDate, draft.returnDate)}</strong>
              <small>
                {formatLong(draft.startDate)} → {formatLong(draft.returnDate)}
              </small>
            </span>
          </div>
        </section>

        <section className="form-section">
          <FieldLabel hint="Borrowing fee only">What it costs</FieldLabel>
          <PriceBreakdown item={item} startDate={draft.startDate} returnDate={draft.returnDate} />
          <p className="helper-text">
            {cost.isPaid || cost.depositRequired
              ? `Agreed directly with ${firstName} when you collect — Borrowly does not take payments.`
              : "Nothing to pay."}
          </p>
        </section>

        <section className="form-section">
          <FieldLabel
            hint={`${draft.message.length}/${MESSAGE_LIMIT}`}
            htmlFor="request-message"
          >
            Message to {firstName}
          </FieldLabel>
          <textarea
            id="request-message"
            maxLength={MESSAGE_LIMIT}
            onChange={(event) =>
              setDraft(itemId, { message: event.target.value, messageTouched: true })
            }
            rows={4}
            value={draft.message}
          />
          <p className="helper-text">
            Say what you need it for and when you can collect. {firstName} sees this with your
            request.
          </p>
        </section>

        {validation.errors.form ? <InlineError>{validation.errors.form}</InlineError> : null}

        <Notice icon="shield" title="The borrowing promise">
          Look after the item, bring it back by the return date, and let {firstName} know early if
          something changes. Normal wear is expected — damage is not.
        </Notice>

        <div className="owner-strip">
          <Avatar owner={owner} size={30} />
          <span>
            You're asking <strong>{owner.name}</strong> ·{" "}
            {locationLine(item, owner, borrower.location)}
          </span>
        </div>
      </ScreenBody>

      <StickyAction>
        <div className="action-summary">
          <span>
            {cost.totalBeforeHandoff > 0 ? "Before handoff" : "Saved on this device only"}
          </span>
          <strong>
            {cost.totalBeforeHandoff > 0
              ? formatNaira(cost.totalBeforeHandoff)
              : `${describeRange(draft.startDate, draft.returnDate)} · Free`}
          </strong>
        </div>
        <Button disabled={!eligibility.allowed} icon="arrowRight" onClick={handleSubmit}>
          Send request
        </Button>
      </StickyAction>

      <CalendarSheet
        blocked={blockedDates}
        hint={
          maxDuration
            ? `${firstName} lends this for up to ${maxDuration} ${maxDuration === 1 ? "day" : "days"}.`
            : `${firstName} hasn't set a standard loan length, so just pick a reasonable date.`
        }
        minDate={todayISO()}
        onClose={() => setPicker(null)}
        onSelect={(iso) => {
          setDraft(itemId, { returnDate: iso });
          setPicker(null);
        }}
        open={picker === "return"}
        rangeStart={draft.startDate}
        title="Return date"
        value={draft.returnDate}
      />

      <CalendarSheet
        blocked={blockedDates}
        hint={
          maxDuration
            ? `Pick a start date — the return will default to ${maxDuration} ${maxDuration === 1 ? "day" : "days"} later.`
            : "Pick a start date."
        }
        minDate={todayISO()}
        onClose={() => setPicker(null)}
        onSelect={applyStart}
        open={picker === "start"}
        title="Start date"
        value={draft.startDate}
      />
    </Screen>
  );
}
