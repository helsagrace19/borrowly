import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { Icon } from "./Icon";
import { allCities, areaSummary, neighbourhoodsOf } from "../lib/location";
import type { Reach, SearchArea } from "../types";

const REACH_OPTIONS: { id: Reach; label: string; hint: string }[] = [
  { id: "neighbourhood", label: "This neighbourhood", hint: "Closest to you" },
  { id: "city", label: "Whole city", hint: "A short trip" },
  { id: "any", label: "Anywhere", hint: "Every city" },
];

/**
 * Manual search-area picker.
 *
 * Borrowly never asks for GPS permission: everything here is chosen by hand
 * and matched against the neighbourhood each listing declares.
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
  onApply: (area: SearchArea, reach: Reach) => void;
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
      title="Search area"
    >
      <p className="muted-copy">
        {reach === "any"
          ? "You are browsing every city Borrowly knows about."
          : `Browsing ${areaSummary(area, reach).toLowerCase()}.`}{" "}
        Distances are based on each listing's neighbourhood — not your GPS.
      </p>

      <div className="field-label static">Distance</div>
      <div className="issue-options" role="radiogroup" aria-label="Distance">
        {REACH_OPTIONS.map((option) => (
          <button
            aria-checked={reach === option.id}
            className={reach === option.id ? "issue-option selected" : "issue-option"}
            key={option.id}
            onClick={() => onApply(area, option.id)}
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
                onClick={() => onApply({ city: name, neighbourhood: null }, reach)}
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
              onClick={() => onApply({ ...area, neighbourhood: null }, reach)}
              selected={!area.neighbourhood}
            >
              Any in {area.city}
            </Chip>
            {neighbourhoods.map((name) => (
              <Chip
                key={name}
                onClick={() => onApply({ city, neighbourhood: name }, reach)}
                selected={area.neighbourhood === name}
              >
                {name}
              </Chip>
            ))}
          </div>
        </>
      ) : null}

      <div className="notice sage">
        <Icon name="mapPin" size={17} />
        <span>
          <strong>Pickup is local by default</strong>
          Listings show an approximate area only. The exact handoff spot is shared privately once
          you agree a collection.
        </span>
      </div>
    </Sheet>
  );
}
