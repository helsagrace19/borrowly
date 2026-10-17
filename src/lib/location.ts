/**
 * Places and search areas.
 *
 * Borrowly has no geolocation and no geocoded data, so nothing here invents
 * coordinates or distances. Discovery works from the city/neighbourhood that
 * each listing declares, plus a manually chosen search area.
 */

import type { ItemLocation, Item, Owner, Reach, SearchArea } from "../types";

export type Neighbourhood = {
  name: string;
  /** Named buildings or estates within the neighbourhood. */
  communities: string[];
};

export type City = {
  name: string;
  neighbourhoods: Neighbourhood[];
};

/** Sample places used by the prototype's catalogue and pickers. */
export const places: City[] = [
  {
    name: "Lagos",
    neighbourhoods: [
      { name: "Yaba", communities: ["Maple House", "Cedar Court"] },
      { name: "Surulere", communities: ["Harmony Court"] },
      { name: "Lekki Phase 1", communities: ["Palm Grove Estate"] },
    ],
  },
  {
    name: "Abuja",
    neighbourhoods: [
      { name: "Wuse II", communities: ["Riverbank Court"] },
      { name: "Garki", communities: ["Unity Close"] },
    ],
  },
  {
    name: "Port Harcourt",
    neighbourhoods: [
      { name: "GRA Phase 2", communities: ["Boma Court"] },
      { name: "Trans Amadi", communities: ["Shell Close"] },
    ],
  },
];

export const allCities = places.map((city) => city.name);

export function cityByName(name: string): City | undefined {
  return places.find((city) => city.name === name);
}

export function neighbourhoodsOf(city: string): string[] {
  return cityByName(city)?.neighbourhoods.map((entry) => entry.name) ?? [];
}

export function communitiesOf(city: string, neighbourhood: string): string[] {
  const found = cityByName(city)?.neighbourhoods.find((entry) => entry.name === neighbourhood);
  return found?.communities ?? [];
}

/** Where the app starts browsing: the borrower's own city, not their building. */
export function defaultArea(borrower: ItemLocation): SearchArea {
  return { city: borrower.city, neighbourhood: null };
}

export function defaultReach(): Reach {
  return "city";
}

/** Does an item fall inside the chosen area and reach? */
export function matchesArea(item: Item, area: SearchArea, reach: Reach): boolean {
  if (reach === "any" || !area.city) return true;

  if (item.location.city !== area.city) return false;

  if (reach === "city") return true;

  // Neighbourhood reach. Without a chosen neighbourhood we cannot be
  // narrower than the city, so fall back to it rather than hiding everything.
  if (!area.neighbourhood) return true;
  return item.location.neighbourhood === area.neighbourhood;
}

export function sameCommunity(a: ItemLocation, b: ItemLocation): boolean {
  return a.city === b.city && a.neighbourhood === b.neighbourhood && a.community === b.community;
}

export function sameNeighbourhood(a: ItemLocation, b: ItemLocation): boolean {
  return a.city === b.city && a.neighbourhood === b.neighbourhood;
}

export function sameCity(a: ItemLocation, b: ItemLocation): boolean {
  return a.city === b.city;
}

/**
 * How close a listing is to the viewer, as a sortable rank.
 * 0 = same building, 1 = same neighbourhood, 2 = same city, 3 = further.
 */
export function proximityRank(item: Item, viewer: ItemLocation): number {
  if (sameCommunity(item.location, viewer)) return 0;
  if (sameNeighbourhood(item.location, viewer)) return 1;
  if (sameCity(item.location, viewer)) return 2;
  return 3;
}

/** Full, public location for a listing. Never includes a street or door. */
export function fullLocation(location: ItemLocation): string {
  const parts = [location.community, location.neighbourhood, location.city].filter(Boolean);
  return parts.join(" · ");
}

/**
 * The short location line on cards and item pages.
 *
 * Respects the owner's visibility choice: "community" hides the
 * neighbourhood, "floor" allows the building-relative wording when the
 * viewer is in the same building.
 */
export function locationLine(item: Item, owner: Owner, viewer: ItemLocation): string {
  const { location } = item;

  if (item.locationVisibility === "community") {
    return sameCity(location, viewer)
      ? location.community || location.neighbourhood
      : `${location.community || location.neighbourhood}, ${location.city}`;
  }

  if (sameCommunity(location, viewer)) return owner.distance;
  if (sameNeighbourhood(location, viewer)) return "Same neighbourhood";
  if (sameCity(location, viewer)) return location.neighbourhood;
  return `${location.neighbourhood}, ${location.city}`;
}

/** Human label for the current search area, used on the Discover control. */
export function areaSummary(area: SearchArea, reach: Reach): string {
  if (reach === "any" || !area.city) return "Anywhere";
  if (reach === "neighbourhood" && area.neighbourhood) return area.neighbourhood;
  return `All of ${area.city}`;
}

/** Where a listing can be collected from, at the coarse level. */
export function collectionArea(location: ItemLocation): string {
  return `${location.neighbourhood}, ${location.city}`;
}
