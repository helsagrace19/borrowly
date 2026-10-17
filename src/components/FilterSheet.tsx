import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { Icon } from "./Icon";
import { allCities, neighbourhoodsOf } from "../lib/location";
import type { QuickFilter, Reach, SearchArea } from "../types";

const DISTANCE: { id: Reach; label: string; hint: string }[] = [
  { id: "neighbourhood", label: "Closest to you", hint: "Your neighbourhood only" },
  { id: "city", label: "Whole city", hint: "A short trip" },
  { id: "any", label: "Anywhere", hint: "Every city" },
];

const PRICE: { id: QuickFilter; label: string; hint: string }[] = [
  { id: "all", label: "Any price", hint: "Free and paid" },
  { id: "free", label: "Free to borrow", hint: "No daily fee" },
  { id: "cheap", label: "Under ₦1,000 a day", hint: "Cheaper paid listings" },
  { id: "paid", label: "Paid only", hint: "Daily fee applies" },
];

const AVAILABILITY = [
  { id: "any", label: "Any time", hint: "Including away items" },
  { id: "now", label: "Available now", hint: "Lendable straight away" },
] as const;

/**
 * One dropdown for everything that narrows the feed: distance, area, price
 * and availability. The category chips stay outside because they are the
 * primary way people browse.
 */
export function FilterSheet({
  open,
  onClose,
  area,
  reach,
  quick,
  availableOnly,
  onApply,
  onClear,
  matchCount,
}: {
  open: boolean;
  onClose: () => void;
  area: SearchArea;
  reach: Reach;
  quick: QuickFilter;
  availableOnly: boolean;
  onApply: (patch: {
    area?: SearchArea;
    reach?: Reach;
    quick?: QuickFilter;
    availableOnly?: boolean;
  }) => void;
  onClear: () => void;
  matchCount: number;
}) {
  const city = area.city ?? allCities[0];
  const neighbourhoods = area.city ? neighbourhoodsOf(area.city) : [];
  const anyActive = reach !== "city" || quick !== "all" || availableOnly;

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
          Clear all filters
        </button>
      ) : null}

      <div className="filter-group">
        <div className="field-label static">Distance</div>
        <div className="issue-options" role="radiogroup" aria-label="Distance">
          {DISTANCE.map((option) => (
            <button
              aria-checked={reach === option.id}
              className={reach === option.id ? "issue-option selected" : "issue-option"}
              key={option.id}
              onClick={() => onApply({ reach: option.id })}
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

        {reach !== "any" ? (
          <>
            <div className="field-label static">City</div>
            <div className="chip-wrap" role="group" aria-label="City">
              {allCities.map((name) => (
                <Chip
                  key={name}
                  onClick={() => onApply({ area: { city: name, neighbourhood: null } })}
                  selected={area.city === name}
                >
                  {name}
                </Chip>
              ))}
            </div>
          </>
        ) : null}

        {reach === "neighbourhood" && area.city ? (
          <>
            <div className="field-label static">Neighbourhood</div>
            <div className="chip-wrap" role="group" aria-label="Neighbourhood">
              <Chip
                onClick={() => onApply({ area: { ...area, neighbourhood: null } })}
                selected={!area.neighbourhood}
              >
                Any in {area.city}
              </Chip>
              {neighbourhoods.map((name) => (
                <Chip
                  key={name}
                  onClick={() => onApply({ area: { city, neighbourhood: name } })}
                  selected={area.neighbourhood === name}
                >
                  {name}
                </Chip>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="filter-group">
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
      </div>

      <div className="filter-group">
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
      </div>

      <div className="notice sage">
        <Icon name="mapPin" size={17} />
        <span>
          <strong>Pickup is local by default</strong>
          Distances come from each listing's neighbourhood — never your GPS. The exact handoff spot
          is shared once you agree a collection.
        </span>
      </div>
    </Sheet>
  );
}
