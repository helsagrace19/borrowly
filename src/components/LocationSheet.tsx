import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { allCities, neighbourhoodsOf } from "../lib/location";
import type { Reach, SearchArea } from "../types";

const DISTANCE: { id: Reach; label: string; hint: string }[] = [
  { id: "neighbourhood", label: "Closest to you", hint: "Your neighbourhood only" },
  { id: "city", label: "Whole city", hint: "A short trip" },
  { id: "any", label: "Anywhere", hint: "Every city" },
];

/**
 * Where you are browsing from. Kept separate from Filters so each control
 * does one job: this sheet is distance and area, Filters is price and
 * availability.
 */
export function LocationSheet({
  open,
  onClose,
  area,
  reach,
  onApply,
  matchCount,
}: {
  open: boolean;
  onClose: () => void;
  area: SearchArea;
  reach: Reach;
  onApply: (patch: { area?: SearchArea; reach?: Reach }) => void;
  matchCount: number;
}) {
  const city = area.city ?? allCities[0];
  const neighbourhoods = area.city ? neighbourhoodsOf(area.city) : [];

  return (
    <Sheet
      footer={
        <Button icon="search" onClick={onClose}>
          Show {matchCount} {matchCount === 1 ? "item" : "items"}
        </Button>
      }
      onClose={onClose}
      open={open}
      title="Where are you looking?"
    >
      <p className="muted-copy">
        Distances come from each listing's neighbourhood — never your GPS. The exact handoff spot is
        shared once you agree a collection.
      </p>

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
    </Sheet>
  );
}
