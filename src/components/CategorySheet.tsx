import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { categoryOrder } from "../data/catalogue";
import type { Category } from "../types";

/**
 * Category picker. Replaces a long chip row: on a phone it turned into a
 * horizontal scroller that hid half the categories off-screen.
 */
export function CategorySheet({
  open,
  onClose,
  value,
  counts,
  onSelect,
  matchCount,
}: {
  open: boolean;
  onClose: () => void;
  value: Category | "All";
  /** How many items sit in each category within the current area. */
  counts: Partial<Record<Category, number>>;
  onSelect: (category: Category | "All") => void;
  matchCount: number;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);

  const options: { id: Category | "All"; label: string; count: number }[] = [
    { id: "All", label: "All categories", count: total },
    ...categoryOrder
      .filter((category) => (counts[category] ?? 0) > 0 || category === value)
      .map((category) => ({
        id: category,
        label: category,
        count: counts[category] ?? 0,
      })),
  ];

  return (
    <Sheet
      footer={
        <Button icon="search" onClick={onClose}>
          Show {matchCount} {matchCount === 1 ? "item" : "items"}
        </Button>
      }
      onClose={onClose}
      open={open}
      title="Categories"
    >
      <div className="issue-options" role="radiogroup" aria-label="Category">
        {options.map((option) => (
          <button
            aria-checked={value === option.id}
            className={value === option.id ? "issue-option selected" : "issue-option"}
            key={option.id}
            onClick={() => {
              onSelect(option.id);
              onClose();
            }}
            role="radio"
            type="button"
          >
            <span className="radio-dot" aria-hidden="true" />
            <span className="option-copy">
              <strong>{option.label}</strong>
            </span>
            <span className="option-count">{option.count}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
