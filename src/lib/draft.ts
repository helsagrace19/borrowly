import { addDays, todayISO } from "./dates";
import { defaultMessage, firstNameOf } from "./loan";
import { getItem, getOwner } from "../data/catalogue";
import type { Draft } from "../types";

/**
 * The starting draft for an item, used by the request form.
 *
 * Kept out of the store module so that file only exports React components —
 * which is what keeps fast refresh working during development.
 */
export function createDraft(itemId: string): Draft {
  const item = getItem(itemId);
  const start = todayISO();
  const maxDays = item?.maxDays ?? null;
  const returnDate = addDays(start, maxDays === null ? 2 : Math.min(maxDays, 3));
  const ownerName = item ? firstNameOf(getOwner(item.ownerId).name) : "there";

  return {
    startDate: start,
    returnDate,
    message: item ? defaultMessage(item, ownerName) : "",
    messageTouched: false,
  };
}
