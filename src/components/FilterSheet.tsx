import { Sheet } from "./Sheet";
import { Button } from "./Button";
import type { QuickFilter } from "../types";

const PRICE: { id: QuickFilter; label: string; hint: string }[] = [
  { id: "all", label: "Any price", hint: "Free and paid" },
  { id: "free", label: "Free to borrow", hint: "No daily fee" },
  { id: "cheap", label: "Under ₦1,000 a day", hint: "Cheaper paid listings" },
  { id: "paid", label: "Paid only", hint: "A daily fee applies" },
];

const AVAILABILITY = [
  { id: "any", label: "Any time", hint: "Including items that are away" },
  { id: "now", label: "Available now", hint: "Lendable straight away" },
] as const;

/**
 * Price and availability. Distance and city live in the location sheet, and
 * categories in the category sheet, so no two controls show the same thing.
 */
export function FilterSheet({
  open,
  onClose,
  quick,
  availableOnly,
  onApply,
  onClear,
  matchCount,
}: {
  open: boolean;
  onClose: () => void;
  quick: QuickFilter;
  availableOnly: boolean;
  onApply: (patch: { quick?: QuickFilter; availableOnly?: boolean }) => void;
  onClear: () => void;
  matchCount: number;
}) {
  const anyActive = quick !== "all" || availableOnly;

  return (
    <Sheet
      footer={
        <Button icon="search" onClick={onClose}>
          Show {matchCount} {matchCount === 1 ? "item" : "items"}
        </Button>
      }
      onClose={onClose}
      open={open}
      title="Filters"
    >
      {anyActive ? (
        <button className="filter-clear" onClick={onClear} type="button">
          Clear price and availability
        </button>
      ) : null}

      <div className="field-label static">Price</div>
      <div className="issue-options" role="radiogroup" aria-label="Price">
        {PRICE.map((option) => (
          <button
            aria-checked={quick === option.id}
            className={quick === option.id ? "issue-option selected" : "issue-option"}
            key={option.id}
            onClick={() => onApply({ quick: option.id })}
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

      <div className="field-label static">Availability</div>
      <div className="issue-options" role="radiogroup" aria-label="Availability">
        {AVAILABILITY.map((option) => {
          const selected = option.id === "now" ? availableOnly : !availableOnly;
          return (
            <button
              aria-checked={selected}
              className={selected ? "issue-option selected" : "issue-option"}
              key={option.id}
              onClick={() => onApply({ availableOnly: option.id === "now" })}
              role="radio"
              type="button"
            >
              <span className="radio-dot" aria-hidden="true" />
              <span className="option-copy">
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
