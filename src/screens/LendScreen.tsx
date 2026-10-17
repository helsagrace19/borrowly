import { useRef, useState } from "react";

import { Screen, ScreenBody, StickyAction, TopBar } from "../components/AppShell";
import { Button, IconButton, TextButton } from "../components/Button";
import { CalendarSheet } from "../components/CalendarSheet";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ItemImage } from "../components/ItemImage";
import { FieldLabel, InfoRow, InlineError, Notice, SectionHeading } from "../components/Layout";
import { Pill } from "../components/Pill";
import { Sheet } from "../components/Sheet";
import { categoryOrder, conditionOptions, handoffOptions, samplePhotos } from "../data/catalogue";
import { addDays, formatLong, formatShort, todayISO } from "../lib/dates";
import { allCities, communitiesOf, neighbourhoodsOf } from "../lib/location";
import {
  DEFAULT_DAILY_FEE,
  costForDays,
  formatNaira,
  formatPricePerDay,
  parseMoney,
} from "../lib/pricing";
import {
  MAX_PHOTOS,
  draftFromItem,
  emptyListingDraft,
  hasErrors,
  validateBasics,
  validateDetails,
  validateHandoff,
  validatePhotos,
  validatePricing,
  type DraftErrors,
  type ListingDraft,
} from "../lib/listing";
import { preparePhoto } from "../lib/image";
import { selfOwnerId } from "../data/catalogue";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";
import { useToast } from "../state/toast";

const MAX_DAYS_CHOICES = [1, 2, 3, 5, 7, 14, 30];

const STEPS = [
  { title: "The item", hint: "What are you lending?" },
  { title: "Photos & rules", hint: "How it looks, and for how long" },
  { title: "Where", hint: "Your area and how you hand it over" },
  { title: "Price", hint: "Free, or charged per day" },
  { title: "Review", hint: "Check the terms, then publish" },
];

export function LendScreen({ itemId }: { itemId?: string }) {
  const { back, push, replace, goToTab } = useNavigation();
  const { itemById, createListing, updateListing } = useBorrowly();
  const { showToast } = useToast();

  const existing = itemId ? itemById(itemId) : undefined;
  const editing = Boolean(existing);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraft>(() =>
    existing ? draftFromItem(existing) : emptyListingDraft(),
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [photoSheet, setPhotoSheet] = useState(false);
  const [datePicker, setDatePicker] = useState(false);
  const [accessoryDraft, setAccessoryDraft] = useState("");
  const [reading, setReading] = useState(false);
  // Money fields are held as text so people can type freely; the draft keeps
  // the parsed naira value.
  const [feeText, setFeeText] = useState(() => String(draft.dailyFee));
  const [depositText, setDepositText] = useState(() =>
    draft.depositAmount > 0 ? String(draft.depositAmount) : "",
  );
  const fileInput = useRef<HTMLInputElement>(null);

  /** The draft expressed as a priceable item, so the shared pricing rules
   *  drive the live preview too. */
  const draftTerms = {
    pricing: { type: draft.pricingType, dailyFee: draft.dailyFee },
    deposit: { required: draft.depositRequired, amount: draft.depositAmount },
  } as const;

  const threeDayEstimate = costForDays(draftTerms, 3);

  const patch = (values: Partial<ListingDraft>) => {
    setDraft((current) => ({ ...current, ...values }));
  };

  /** Which validations belong to each step of the flow. */
  const errorsForStep = (index: number): DraftErrors => {
    if (index === 0) return validateBasics(draft);
    if (index === 1) return { ...validatePhotos(draft), ...validateDetails(draft) };
    if (index === 2) return validateHandoff(draft);
    if (index === 3) return validatePricing(draft);
    return {};
  };

  // A listing id that is not yours (or no longer exists) cannot be edited.
  if (itemId && (!existing || existing.ownerId !== selfOwnerId)) {
    return (
      <Screen>
        <TopBar onBack={back} title="Edit listing" />
        <ScreenBody>
          <EmptyState icon="alert" title="We couldn't find that listing">
            It may have been removed. Your own listings are under My Listings.
          </EmptyState>
          <Button onClick={() => goToTab({ name: "my-listings" })} variant="secondary">
            Go to My Listings
          </Button>
        </ScreenBody>
      </Screen>
    );
  }

  const goNext = () => {
    const found = errorsForStep(step);
    setErrors(found);
    if (hasErrors(found)) {
      showToast("Have a look at the highlighted fields", { tone: "warning" });
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goToStep = (index: number) => {
    setErrors({});
    setStep(index);
  };

  const publish = () => {
    const byStep = [
      validateBasics(draft),
      { ...validatePhotos(draft), ...validateDetails(draft) },
      validateHandoff(draft),
      validatePricing(draft),
    ];
    const all: DraftErrors = {
      ...byStep[0],
      ...byStep[1],
      ...byStep[2],
      ...byStep[3],
    };

    if (hasErrors(all)) {
      setErrors(all);
      const firstBadStep = byStep.findIndex(hasErrors);
      setStep(firstBadStep === -1 ? 0 : firstBadStep);
      showToast("Some details still need attention", { tone: "warning" });
      return;
    }

    if (existing) {
      updateListing(existing.id, draft);
      showToast("Listing updated");
      replace({ name: "my-listings" });
      return;
    }

    const created = createListing(draft);
    push({ name: "listing-published", itemId: created.id });
  };

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setReading(true);

    const room = MAX_PHOTOS - draft.photos.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    const results = await Promise.all(chosen.map((file) => preparePhoto(file)));

    const added = results.filter((result) => result.ok).map((result) => (result as { ok: true; dataUrl: string }).dataUrl);
    const failed = results.filter((result) => !result.ok).map((result) => (result as { ok: false; reason: string }).reason);

    patch({ photos: [...draft.photos, ...added] });
    setReading(false);

    if (files.length > room) {
      showToast(`Maximum of ${MAX_PHOTOS} photos`, { tone: "warning" });
    }
    failed.forEach((reason) => showToast(reason, { tone: "warning" }));
  };

  return (
    <Screen>
      <TopBar
        onBack={step === 0 ? back : () => setStep((current) => current - 1)}
        title={editing ? "Edit listing" : "Lend an item"}
      />

      <div className="stepper">
        <div className="stepper-track" aria-hidden="true">
          {STEPS.map((entry, index) => (
            <span className={index <= step ? "filled" : ""} key={entry.title} />
          ))}
        </div>
        <div className="stepper-copy">
          <strong>
            {step + 1} of {STEPS.length} · {STEPS[step].title}
          </strong>
          <small>{STEPS[step].hint}</small>
        </div>
      </div>

      <ScreenBody>
        {step === 0 ? (
          <>
            <FieldLabel htmlFor="listing-name">What is it?</FieldLabel>
            <input
              className="text-input"
              id="listing-name"
              maxLength={60}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="e.g. Cordless drill, pasta machine, roof box"
              value={draft.name}
            />
            {errors.name ? <InlineError>{errors.name}</InlineError> : null}

            <FieldLabel>Category</FieldLabel>
            <div className="chip-wrap" role="group" aria-label="Category">
              {categoryOrder.map((category) => (
                <Chip
                  key={category}
                  onClick={() => patch({ category })}
                  selected={draft.category === category}
                >
                  {category}
                </Chip>
              ))}
            </div>
            {errors.category ? <InlineError>{errors.category}</InlineError> : null}

            <FieldLabel>Condition</FieldLabel>
            <div className="chip-wrap" role="group" aria-label="Condition">
              {conditionOptions.map((condition) => (
                <Chip
                  key={condition}
                  onClick={() => patch({ condition })}
                  selected={draft.condition === condition}
                >
                  {condition}
                </Chip>
              ))}
            </div>
            {errors.condition ? <InlineError>{errors.condition}</InlineError> : null}

            <FieldLabel hint={`${draft.description.trim().length}/600`} htmlFor="listing-description">
              Describe it
            </FieldLabel>
            <textarea
              id="listing-description"
              maxLength={600}
              onChange={(event) => patch({ description: event.target.value })}
              placeholder="What is it good for, and is there anything a borrower should know? Mentioning a few jobs it suits helps people find it."
              rows={5}
              value={draft.description}
            />
            {errors.description ? <InlineError>{errors.description}</InlineError> : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <FieldLabel hint={`${draft.photos.length} of ${MAX_PHOTOS}`}>Photos</FieldLabel>

            {draft.photos.length > 0 ? (
              <ul className="photo-grid">
                {draft.photos.map((photo, index) => (
                  <li key={`${photo.slice(-24)}-${index}`}>
                    <ItemImage alt={`Photo ${index + 1}`} className="photo-tile" src={photo} />
                    {index === 0 ? <Pill tone="active">Cover</Pill> : null}
                    <IconButton
                      className="photo-remove"
                      label={`Remove photo ${index + 1}`}
                      name="close"
                      onClick={() => patch({ photos: draft.photos.filter((_, i) => i !== index) })}
                      size={16}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="photo-empty">
                <Icon name="box" size={22} />
                <p>Add at least one photo. Neighbours decide from the picture first.</p>
              </div>
            )}

            <div className="row-actions">
              <Button
                disabled={reading || draft.photos.length >= MAX_PHOTOS}
                icon="plus"
                onClick={() => fileInput.current?.click()}
                variant="secondary"
              >
                {reading ? "Reading…" : "Add a photo"}
              </Button>
              <Button
                disabled={draft.photos.length >= MAX_PHOTOS}
                icon="sparkle"
                onClick={() => setPhotoSheet(true)}
                variant="secondary"
              >
                Sample photos
              </Button>
            </div>
            <input
              accept="image/*"
              className="visually-hidden"
              multiple
              onChange={(event) => {
                void addFiles(event.target.files);
                event.target.value = "";
              }}
              ref={fileInput}
              type="file"
            />
            {errors.photos ? <InlineError>{errors.photos}</InlineError> : null}
            <p className="helper-text">
              Uploads are resized and stripped of location data before they are saved.
            </p>

            <FieldLabel hint="Optional">What comes with it?</FieldLabel>
            <div className="accessory-add">
              <input
                aria-label="Add an accessory"
                className="text-input"
                onChange={(event) => setAccessoryDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  const value = accessoryDraft.trim();
                  if (!value || draft.accessories.includes(value)) return;
                  patch({ accessories: [...draft.accessories, value] });
                  setAccessoryDraft("");
                }}
                placeholder="e.g. charger, carry case, spare blade"
                value={accessoryDraft}
              />
              <IconButton
                disabled={!accessoryDraft.trim()}
                label="Add accessory"
                name="plus"
                onClick={() => {
                  const value = accessoryDraft.trim();
                  if (!value || draft.accessories.includes(value)) return;
                  patch({ accessories: [...draft.accessories, value] });
                  setAccessoryDraft("");
                }}
                size={18}
              />
            </div>
            {draft.accessories.length > 0 ? (
              <div className="chip-wrap">
                {draft.accessories.map((accessory) => (
                  <button
                    className="chip removable selected"
                    key={accessory}
                    onClick={() =>
                      patch({ accessories: draft.accessories.filter((entry) => entry !== accessory) })
                    }
                    type="button"
                  >
                    {accessory}
                    <Icon name="close" size={13} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="helper-text">
                Listing the bits that travel with it makes returns much easier to check.
              </p>
            )}

            <FieldLabel>Longest loan</FieldLabel>
            <div className="chip-wrap" role="group" aria-label="Maximum loan length">
              {MAX_DAYS_CHOICES.map((days) => (
                <Chip
                  key={days}
                  onClick={() => patch({ maxDays: days })}
                  selected={draft.maxDays === days}
                >
                  {days === 1 ? "1 day" : `${days} days`}
                </Chip>
              ))}
            </div>
            {errors.maxDays ? <InlineError>{errors.maxDays}</InlineError> : null}

            <FieldLabel>When is it free?</FieldLabel>
            <div className="issue-options" role="radiogroup" aria-label="Availability">
              <button
                aria-checked={draft.availabilityFrom === null}
                className={draft.availabilityFrom === null ? "issue-option selected" : "issue-option"}
                onClick={() => patch({ availabilityFrom: null })}
                role="radio"
                type="button"
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="option-copy">
                  <strong>Available now</strong>
                  <small>Neighbours can ask for any free dates.</small>
                </span>
              </button>
              <button
                aria-checked={draft.availabilityFrom !== null}
                className={draft.availabilityFrom !== null ? "issue-option selected" : "issue-option"}
                onClick={() => {
                  patch({ availabilityFrom: draft.availabilityFrom ?? addDays(todayISO(), 7) });
                  setDatePicker(true);
                }}
                role="radio"
                type="button"
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="option-copy">
                  <strong>Away until a date</strong>
                  <small>
                    {draft.availabilityFrom
                      ? `Listed with “back on ${formatShort(draft.availabilityFrom)}”.`
                      : "Shows a return date instead of hiding it."}
                  </small>
                </span>
              </button>
            </div>
            {draft.availabilityFrom ? (
              <button className="input-box" onClick={() => setDatePicker(true)} type="button">
                <span className="input-icon">
                  <Icon name="calendar" size={18} />
                </span>
                <span className="input-copy">
                  <small>BACK ON</small>
                  <strong>{formatLong(draft.availabilityFrom)}</strong>
                </span>
                <span className="mini-link" aria-hidden="true">
                  Change
                </span>
              </button>
            ) : null}
            {errors.availabilityFrom ? <InlineError>{errors.availabilityFrom}</InlineError> : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <FieldLabel>City</FieldLabel>
            <div className="chip-wrap" role="group" aria-label="City">
              {allCities.map((name) => (
                <Chip
                  key={name}
                  onClick={() => {
                    const firstNeighbourhood = neighbourhoodsOf(name)[0] ?? "";
                    patch({
                      city: name,
                      neighbourhood: firstNeighbourhood,
                      community: communitiesOf(name, firstNeighbourhood)[0] ?? "",
                    });
                  }}
                  selected={draft.city === name}
                >
                  {name}
                </Chip>
              ))}
            </div>
            {errors.city ? <InlineError>{errors.city}</InlineError> : null}

            <FieldLabel>Neighbourhood</FieldLabel>
            <div className="chip-wrap" role="group" aria-label="Neighbourhood">
              {neighbourhoodsOf(draft.city).map((name) => (
                <Chip
                  key={name}
                  onClick={() =>
                    patch({
                      neighbourhood: name,
                      community: communitiesOf(draft.city, name)[0] ?? "",
                    })
                  }
                  selected={draft.neighbourhood === name}
                >
                  {name}
                </Chip>
              ))}
            </div>
            {errors.neighbourhood ? <InlineError>{errors.neighbourhood}</InlineError> : null}

            {communitiesOf(draft.city, draft.neighbourhood).length > 0 ? (
              <>
                <FieldLabel hint="Optional">Building or estate</FieldLabel>
                <div className="chip-wrap" role="group" aria-label="Community">
                  {communitiesOf(draft.city, draft.neighbourhood).map((name) => (
                    <Chip
                      key={name}
                      onClick={() => patch({ community: draft.community === name ? "" : name })}
                      selected={draft.community === name}
                    >
                      {name}
                    </Chip>
                  ))}
                </div>
              </>
            ) : null}

            <FieldLabel>How much of that is public?</FieldLabel>
            <div className="issue-options" role="radiogroup" aria-label="Location visibility">
              <button
                aria-checked={draft.locationVisibility === "community"}
                className={draft.locationVisibility === "community" ? "issue-option selected" : "issue-option"}
                onClick={() => patch({ locationVisibility: "community" })}
                role="radio"
                type="button"
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="option-copy">
                  <strong>Area only</strong>
                  <small>
                    Shows “{draft.community || draft.neighbourhood}” and nothing more specific.
                  </small>
                </span>
              </button>
              <button
                aria-checked={draft.locationVisibility === "floor"}
                className={draft.locationVisibility === "floor" ? "issue-option selected" : "issue-option"}
                onClick={() => patch({ locationVisibility: "floor" })}
                role="radio"
                type="button"
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="option-copy">
                  <strong>Add a little detail</strong>
                  <small>Helps people judge the trip, e.g. “2 floors away” or the street area.</small>
                </span>
              </button>
            </div>

            <FieldLabel>How would you hand it over?</FieldLabel>
            <div className="chip-wrap" role="group" aria-label="Handoff preferences">
              {handoffOptions.map((option) => {
                const selected = draft.handoffPreferences.includes(option);
                return (
                  <Chip
                    key={option}
                    onClick={() =>
                      patch({
                        handoffPreferences: selected
                          ? draft.handoffPreferences.filter((entry) => entry !== option)
                          : [...draft.handoffPreferences, option],
                      })
                    }
                    selected={selected}
                  >
                    {option}
                  </Chip>
                );
              })}
            </div>
            {errors.handoffPreferences ? <InlineError>{errors.handoffPreferences}</InlineError> : null}

            <FieldLabel hint="Private">Where exactly?</FieldLabel>
            <input
              className="text-input"
              onChange={(event) => patch({ handoffPlace: event.target.value })}
              placeholder="e.g. Lobby by the lifts, or flat 2C door"
              value={draft.handoffPlace}
            />
            {errors.handoffPlace ? <InlineError>{errors.handoffPlace}</InlineError> : null}

            <FieldLabel hint="Private · optional">Anything about timing?</FieldLabel>
            <input
              className="text-input"
              onChange={(event) => patch({ handoffNote: event.target.value })}
              placeholder="e.g. Evenings after 6pm work best"
              value={draft.handoffNote}
            />

            <Notice icon="shield" title="Your exact spot stays private">
              Public listings show the neighbourhood at most — never a street address. What you
              type above is shared only once you are arranging a collection.
            </Notice>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <FieldLabel>How do you want to lend it?</FieldLabel>
            <div className="issue-options" role="radiogroup" aria-label="Pricing">
              <button
                aria-checked={draft.pricingType === "free"}
                className={draft.pricingType === "free" ? "issue-option selected" : "issue-option"}
                onClick={() => patch({ pricingType: "free" })}
                role="radio"
                type="button"
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="option-copy">
                  <strong>Free to borrow</strong>
                  <small>Share it for nothing. Neighbours only cover the return.</small>
                </span>
              </button>
              <button
                aria-checked={draft.pricingType === "paid"}
                className={draft.pricingType === "paid" ? "issue-option selected" : "issue-option"}
                onClick={() => patch({ pricingType: "paid" })}
                role="radio"
                type="button"
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="option-copy">
                  <strong>Charge per day</strong>
                  <small>Borrowers see the total for their dates before they ask.</small>
                </span>
              </button>
            </div>

            {draft.pricingType === "paid" ? (
              <>
                <FieldLabel htmlFor="daily-fee" hint="Per borrowing day">
                  Daily fee
                </FieldLabel>
                <div className="money-input">
                  <span aria-hidden="true" className="money-prefix">
                    ₦
                  </span>
                  <input
                    className="text-input"
                    id="daily-fee"
                    inputMode="numeric"
                    onChange={(event) => {
                      setFeeText(event.target.value);
                      patch({ dailyFee: parseMoney(event.target.value) ?? 0 });
                    }}
                    placeholder={String(DEFAULT_DAILY_FEE)}
                    value={feeText}
                  />
                </div>
                {errors.dailyFee ? <InlineError>{errors.dailyFee}</InlineError> : null}
                <p className="helper-text">
                  {formatPricePerDay(draft.dailyFee)} — a 3-day borrow would cost{" "}
                  {formatNaira(costForDays(draftTerms, 3).borrowFee)}.
                </p>
              </>
            ) : null}

            <FieldLabel>Refundable deposit</FieldLabel>
            <div className="issue-options" role="radiogroup" aria-label="Deposit">
              <button
                aria-checked={!draft.depositRequired}
                className={!draft.depositRequired ? "issue-option selected" : "issue-option"}
                onClick={() => patch({ depositRequired: false })}
                role="radio"
                type="button"
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="option-copy">
                  <strong>No deposit</strong>
                  <small>Nothing extra needed before handoff.</small>
                </span>
              </button>
              <button
                aria-checked={draft.depositRequired}
                className={draft.depositRequired ? "issue-option selected" : "issue-option"}
                onClick={() => {
                  patch({ depositRequired: true });
                  if (!depositText) setDepositText("");
                }}
                role="radio"
                type="button"
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="option-copy">
                  <strong>Ask for a refundable deposit</strong>
                  <small>Separate from the fee, and returned on an agreed return.</small>
                </span>
              </button>
            </div>

            {draft.depositRequired ? (
              <>
                <FieldLabel htmlFor="deposit-amount" hint="Refundable">
                  Deposit amount
                </FieldLabel>
                <div className="money-input">
                  <span aria-hidden="true" className="money-prefix">
                    ₦
                  </span>
                  <input
                    className="text-input"
                    id="deposit-amount"
                    inputMode="numeric"
                    onChange={(event) => {
                      setDepositText(event.target.value);
                      patch({ depositAmount: parseMoney(event.target.value) ?? 0 });
                    }}
                    placeholder="e.g. 5000"
                    value={depositText}
                  />
                </div>
                {errors.depositAmount ? <InlineError>{errors.depositAmount}</InlineError> : null}
                <p className="helper-text">
                  Returned when the item comes back in the agreed condition. Borrowly does not hold
                  or refund it.
                </p>
              </>
            ) : null}

            <div className="price-preview">
              <span className="price-preview-label">Example: a 3-day borrow</span>
              <div className="price-preview-rows">
                <span>Borrowing fee</span>
                <strong>
                  {threeDayEstimate.isPaid ? formatNaira(threeDayEstimate.borrowFee) : "Free"}
                </strong>
              </div>
              <div className="price-preview-rows">
                <span>Refundable deposit</span>
                <strong>
                  {threeDayEstimate.depositRequired
                    ? formatNaira(threeDayEstimate.deposit)
                    : "None"}
                </strong>
              </div>
              <div className="price-preview-rows total">
                <span>Before handoff</span>
                <strong>{formatNaira(threeDayEstimate.totalBeforeHandoff)}</strong>
              </div>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <div className="review-card">
              <div className="review-head">
                <ItemImage alt={draft.name || "Listing photo"} fallbackLabel={draft.name} src={draft.photos[0] ?? samplePhotos[0].src} />
                <div className="review-copy">
                  <h2>{draft.name || "Untitled item"}</h2>
                  <p>
                    {draft.category || "No category"} · {draft.condition}
                  </p>
                  <small>
                    {[draft.community, draft.neighbourhood, draft.city].filter(Boolean).join(" · ")}{" "}
                    · {draft.locationVisibility === "community" ? "Area only" : "With detail"}
                  </small>
                </div>
              </div>
            </div>

            <div className="review-block">
              <SectionHeading title="Description" action={<TextButton onClick={() => goToStep(0)}>Edit</TextButton>} />
              <p className="muted-copy">{draft.description || "Nothing written yet."}</p>
            </div>

            <div className="review-block">
              <SectionHeading title="Loan rules" action={<TextButton onClick={() => goToStep(1)}>Edit</TextButton>} />
              <InfoRow
                detail={`${draft.photos.length} photo${draft.photos.length === 1 ? "" : "s"}`}
                icon="box"
                title="Photos"
              />
              <InfoRow
                detail={
                  draft.accessories.length > 0
                    ? draft.accessories.join(", ")
                    : "Nothing listed — just the item itself"
                }
                icon="check"
                title="Included"
              />
              <InfoRow
                detail={`Up to ${draft.maxDays} ${draft.maxDays === 1 ? "day" : "days"} at a time`}
                icon="clock"
                title="Longest loan"
              />
              <InfoRow
                detail={
                  draft.availabilityFrom
                    ? `Listed as “back on ${formatShort(draft.availabilityFrom)}”`
                    : "Lendable straight away"
                }
                icon="calendar"
                title="Availability"
              />
            </div>

            <div className="review-block">
              <SectionHeading
                title="Terms"
                action={<TextButton onClick={() => goToStep(3)}>Edit</TextButton>}
              />
              <InfoRow
                detail={
                  draft.pricingType === "paid"
                    ? `${formatPricePerDay(draft.dailyFee)} · 3 days = ${formatNaira(costForDays(draftTerms, 3).borrowFee)}`
                    : "No borrowing fee"
                }
                icon="star"
                title="Borrowing fee"
              />
              <InfoRow
                detail={
                  draft.depositRequired
                    ? `${formatNaira(draft.depositAmount)} refundable on return`
                    : "No deposit asked for"
                }
                icon="shield"
                title="Security deposit"
              />
            </div>

            <div className="review-block">
              <SectionHeading title="Handoff & visibility" action={<TextButton onClick={() => goToStep(2)}>Edit</TextButton>} />
              <InfoRow detail={draft.handoffPreferences.join(", ")} icon="home" title="Handoff options" />
              <InfoRow detail={draft.handoffPlace || "Not set"} icon="mapPin" title="Private spot" />
              {draft.handoffNote ? (
                <InfoRow detail={draft.handoffNote} icon="clock" title="Timing note" />
              ) : null}
            </div>

            <Notice icon="info" title="How you get paid">
              Borrowers pay the fee and any deposit directly to you at handoff. Borrowly does not
              take a cut.
            </Notice>
          </>
        ) : null}
      </ScreenBody>

      <StickyAction>
        <div className="action-summary">
          <span>
            {step === 0 ? "Step 1" : `Step ${step + 1}`} of {STEPS.length}
          </span>
          <strong>
            {step === STEPS.length - 1
              ? editing
                ? "Save changes"
                : "Visible in Discover"
              : STEPS[step].title}
          </strong>
        </div>
        {step === STEPS.length - 1 ? (
          <Button icon={editing ? "check" : "send"} onClick={publish}>
            {editing ? "Save changes" : "Publish listing"}
          </Button>
        ) : (
          <Button icon="arrowRight" onClick={goNext}>
            Continue
          </Button>
        )}
      </StickyAction>

      <Sheet onClose={() => setPhotoSheet(false)} open={photoSheet} title="Sample photos">
        <p className="muted-copy">
          No photo handy? Pick a stand-in for now — you can replace it any time.
        </p>
        <ul className="sample-grid">
          {samplePhotos.map((sample) => (
            <li key={sample.id}>
              <button
                className="sample-tile"
                onClick={() => {
                  if (draft.photos.length >= MAX_PHOTOS) return;
                  patch({ photos: [...draft.photos, sample.src] });
                  setPhotoSheet(false);
                }}
                type="button"
              >
                <ItemImage alt={sample.label} className="photo-tile" src={sample.src} />
                <span>{sample.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <CalendarSheet
        blocked={new Set<string>()}
        hint="Your listing stays visible, with the date borrowers can collect from."
        minDate={addDays(todayISO(), 1)}
        onClose={() => setDatePicker(false)}
        onSelect={(iso) => {
          patch({ availabilityFrom: iso });
          setDatePicker(false);
        }}
        open={datePicker}
        title="Back on"
        value={draft.availabilityFrom}
      />
    </Screen>
  );
}
