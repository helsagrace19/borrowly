import { useEffect, useMemo, useState } from "react";

import { BottomNav, Screen, ScreenBody, TopBar } from "../components/AppShell";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { CardSkeleton, EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ItemCard, ItemTile } from "../components/ItemCard";
import { FilterSheet } from "../components/FilterSheet";
import { Sheet } from "../components/Sheet";
import { activeCategories, borrower, getOwner, selfOwnerId } from "../data/catalogue";
import { describeDue, formatShort } from "../lib/dates";
import { areaSummary, locationLine, matchesArea, proximityRank } from "../lib/location";
import { isActivePhase, phaseLabel, phaseOf } from "../lib/loan";
import { costForDays } from "../lib/pricing";
import { useNow } from "../lib/useNow";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";
import type { Item, ItemSort } from "../types";

const SORTS: { id: ItemSort; label: string; hint: string }[] = [
  { id: "recommended", label: "Recommended", hint: "Closest and ready to borrow" },
  { id: "closest", label: "Closest first", hint: "Your building, then your area" },
  { id: "price-asc", label: "Price: low to high", hint: "Free listings first" },
  { id: "price-desc", label: "Price: high to low", hint: "Paid listings first" },
  { id: "newest", label: "Recently listed", hint: "Newest listings first" },
];

const PAGE_SIZE = 12;

function dailyFeeOf(item: Item): number {
  return costForDays(item, 1).isPaid ? item.pricing.dailyFee : 0;
}

export function DiscoverScreen() {
  const { push } = useNavigation();
  const { filters, setFilters, requests, conversations, allItems } = useBorrowly();
  const now = useNow();
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), 420);
    return () => window.clearTimeout(id);
  }, []);

  // Paused listings are hidden from borrowers entirely.
  const available = useMemo(() => allItems.filter((item) => !item.paused), [allItems]);

  const inArea = useMemo(
    () => available.filter((item) => matchesArea(item, filters.area, filters.reach)),
    [available, filters.area, filters.reach],
  );

  const results = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    const filtered = inArea
      .filter((item) => filters.category === "All" || item.category === filters.category)
      .filter((item) => {
        if (!query) return true;
        const owner = getOwner(item.ownerId);
        return [
          item.name,
          item.category,
          item.summary,
          item.description,
          owner.name,
          item.location.city,
          item.location.neighbourhood,
          item.location.community,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .filter((item) => {
        switch (filters.quick) {
          case "free":
            return !costForDays(item, 1).isPaid;
          case "paid":
            return costForDays(item, 1).isPaid;
          case "cheap":
            return dailyFeeOf(item) < 1000;
          default:
            return true;
        }
      })
      .filter((item) => !filters.availableOnly || item.availability === "available");

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (filters.sort) {
        case "price-asc":
          return dailyFeeOf(a) - dailyFeeOf(b) || a.name.localeCompare(b.name);
        case "price-desc":
          return dailyFeeOf(b) - dailyFeeOf(a) || a.name.localeCompare(b.name);
        case "closest":
          return (
            proximityRank(a, borrower.location) - proximityRank(b, borrower.location) ||
            a.name.localeCompare(b.name)
          );
        case "newest":
          return b.createdAt - a.createdAt || a.name.localeCompare(b.name);
        default:
          return (
            Number(b.availability === "available") - Number(a.availability === "available") ||
            proximityRank(a, borrower.location) - proximityRank(b, borrower.location) ||
            b.createdAt - a.createdAt
          );
      }
    });

    return sorted;
  }, [inArea, filters]);

  // Reset paging whenever the result set changes shape.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [
    filters.query,
    filters.category,
    filters.quick,
    filters.sort,
    filters.area,
    filters.reach,
    filters.availableOnly,
  ]);

  const unread = conversations.reduce((total, conversation) => total + conversation.unread, 0);

  const live = useMemo(
    () =>
      requests
        .filter((request) => request.direction === "outgoing")
        .map((request) => ({ request, phase: phaseOf(request, now) }))
        .filter((entry) => isActivePhase(entry.phase)),
    [requests, now],
  );

  const banner = useMemo(() => {
    const entry = live[0];
    if (!entry) return null;
    const item = allItems.find((candidate) => candidate.id === entry.request.itemId);
    const owner = getOwner(entry.request.ownerId);
    const itemName = item?.name ?? "Item";

    if (entry.phase === "collected" || entry.phase === "overdue") {
      const due = describeDue(entry.request.returnDate, entry.request.collectedAt, now);
      return {
        heading: phaseLabel(entry.phase),
        detail: `${itemName} from ${owner.name} · ${due.label.toLowerCase()} · due ${formatShort(entry.request.returnDate)}`,
      };
    }
    if (entry.phase === "return-pending") {
      return {
        heading: phaseLabel(entry.phase),
        detail: `${itemName} · waiting for ${owner.name} to confirm`,
      };
    }
    if (entry.phase === "approved") {
      return {
        heading: phaseLabel(entry.phase),
        detail: `${itemName} from ${owner.name} · collection arranged in your chat`,
      };
    }
    return {
      heading: phaseLabel(entry.phase),
      detail: `${itemName} from ${owner.name} · awaiting their reply`,
    };
  }, [live, allItems, now]);

  const searchActive = filters.query.trim().length > 0;
  // The chosen area is not a "filter" — it is where you are browsing from.
  const filtering =
    searchActive ||
    filters.category !== "All" ||
    filters.quick !== "all" ||
    filters.sort !== "recommended";

  const areaActive = filters.reach !== "any";

  const activeFilterCount =
    (filters.reach !== "city" ? 1 : 0) +
    (filters.quick !== "all" ? 1 : 0) +
    (filters.availableOnly ? 1 : 0);

  const clearFilters = () =>
    setFilters({
      area: { city: borrower.location.city, neighbourhood: null },
      reach: "city",
      quick: "all",
      availableOnly: false,
      category: "All",
      query: "",
      sort: "recommended",
    });

  const shown = results.slice(0, visible);
  const remaining = results.length - shown.length;

  const tile = (item: Item) => {
    const owner = getOwner(item.ownerId);
    return (
      <ItemTile
        item={item}
        key={item.id}
        locationText={locationLine(item, owner, borrower.location)}
        note={
          item.availability === "unavailable"
            ? (item.unavailableNote ?? "Not available right now")
            : undefined
        }
        onOpen={() => push({ name: "item", itemId: item.id })}
        owner={owner}
        ours={item.ownerId === selfOwnerId}
      />
    );
  };

  const activeSort = SORTS.find((entry) => entry.id === filters.sort) ?? SORTS[0];

  const row = (item: Item) => {
    const owner = getOwner(item.ownerId);
    return (
      <ItemCard
        item={item}
        key={item.id}
        locationText={locationLine(item, owner, borrower.location)}
        note={
          item.availability === "unavailable"
            ? (item.unavailableNote ?? "Not available right now")
            : undefined
        }
        onOpen={() => push({ name: "item", itemId: item.id })}
        owner={owner}
        ours={item.ownerId === selfOwnerId}
      />
    );
  };

  return (
    <Screen>
      <TopBar
        action={
          <button className="inbox-button" onClick={() => push({ name: "inbox" })} type="button">
            <Icon name="inbox" size={17} />
            <span>Inbox</span>
            {unread > 0 ? <em className="inbox-dot" aria-label={`${unread} unread`} /> : null}
          </button>
        }
        title="Borrowly"
        wordmark
      />

      <ScreenBody>
        <div className="intro discover-intro">
          <span className="eyebrow">
            {areaSummary(filters.area, filters.reach).toUpperCase()} · {inArea.length}{" "}
            {inArea.length === 1 ? "ITEM" : "ITEMS"}
          </span>
          <h1 className="page-heading">What do you need?</h1>
        </div>

        <div className="search-field">
          <Icon name="search" size={18} />
          <label className="visually-hidden" htmlFor="discover-search">
            Search items
          </label>
          <input
            autoComplete="off"
            id="discover-search"
            onChange={(event) => setFilters({ query: event.target.value })}
            placeholder="Search drills, tents, baking…"
            type="search"
            value={filters.query}
          />
          {filters.query ? (
            <button
              aria-label="Clear search"
              className="search-clear"
              onClick={() => setFilters({ query: "" })}
              type="button"
            >
              <Icon name="close" size={16} />
            </button>
          ) : null}
        </div>

        <div className="filter-scroll">
          <button className="filter-pill filters" onClick={() => setFiltersOpen(true)} type="button">
            <Icon name="filter" size={15} />
            Filters
            {activeFilterCount > 0 ? <em className="filter-count">{activeFilterCount}</em> : null}
            <Icon name="chevronDown" size={13} />
          </button>

          {filters.reach !== "city" || filters.area.neighbourhood ? (
            <button
              className="filter-pill selected"
              onClick={clearFilters}
              type="button"
            >
              <Icon name="mapPin" size={14} />
              {areaSummary(filters.area, filters.reach)}
              <Icon name="close" size={13} />
            </button>
          ) : (
            <button className="filter-pill" onClick={() => setFiltersOpen(true)} type="button">
              <Icon name="mapPin" size={14} />
              {areaSummary(filters.area, filters.reach)}
            </button>
          )}

          {filters.quick !== "all" ? (
            <button
              className="filter-pill selected"
              onClick={() => setFilters({ quick: "all" })}
              type="button"
            >
              {filters.quick === "free"
                ? "Free to borrow"
                : filters.quick === "paid"
                  ? "Paid only"
                  : "Under ₦1,000 a day"}
              <Icon name="close" size={13} />
            </button>
          ) : null}

          {filters.availableOnly ? (
            <button
              className="filter-pill selected"
              onClick={() => setFilters({ availableOnly: false })}
              type="button"
            >
              Available now
              <Icon name="close" size={13} />
            </button>
          ) : null}
        </div>

        <div className="chip-row" role="group" aria-label="Filter by category">
          <Chip onClick={() => setFilters({ category: "All" })} selected={filters.category === "All"}>
            All
          </Chip>
          {activeCategories.map((category) => (
            <Chip
              key={category}
              onClick={() => setFilters({ category })}
              selected={filters.category === category}
            >
              {category}
            </Chip>
          ))}
        </div>

        {banner ? (
          <button
            className="live-banner"
            onClick={() => push({ name: "borrowing", tab: "active" })}
            type="button"
          >
            <span className="live-icon">
              <Icon name="book" size={18} />
            </span>
            <span className="live-copy">
              <strong>{banner.heading}</strong>
              <small>{banner.detail}</small>
            </span>
            <Icon name="arrowRight" size={17} />
          </button>
        ) : null}

        <div className="results-bar">
          <strong>
            {results.length} {results.length === 1 ? "item" : "items"}
            {filtering ? " found" : " to borrow"}
          </strong>
          <div className="results-tools">
            <button className="sort-button" onClick={() => setSortOpen(true)} type="button">
              <Icon name="filter" size={14} />
              <span className="sort-label">{activeSort.label}</span>
            </button>
            <div className="view-toggle" role="group" aria-label="Layout">
              <button
                aria-label="Grid view"
                aria-pressed={filters.view === "grid"}
                className={filters.view === "grid" ? "on" : ""}
                onClick={() => setFilters({ view: "grid" })}
                title="Grid view"
                type="button"
              >
                <Icon name="grid" size={15} />
              </button>
              <button
                aria-label="List view"
                aria-pressed={filters.view === "list"}
                className={filters.view === "list" ? "on" : ""}
                onClick={() => setFilters({ view: "list" })}
                title="List view"
                type="button"
              >
                <Icon name="list" size={15} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="item-grid">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : null}
        {!loading && results.length === 0 ? (
          <EmptyState
            action={
              <div className="stacked-actions">
                {areaActive ? (
                  <Button
                    onClick={() =>
                      setFilters({ area: { city: null, neighbourhood: null }, reach: "any" })
                    }
                    variant="secondary"
                  >
                    Widen to anywhere
                  </Button>
                ) : null}
                {filtering ? (
                  <Button
                    onClick={() =>
                      setFilters({
                        query: "",
                        category: "All",
                        quick: "all",
                        availableOnly: false,
                        sort: "recommended",
                      })
                    }
                    variant="secondary"
                  >
                    Clear filters
                  </Button>
                ) : null}
                <Button icon="plus" onClick={() => push({ name: "lend" })} variant="secondary">
                  Lend the first item
                </Button>
              </div>
            }
            icon="search"
            title={
              searchActive
                ? `Nothing matched “${filters.query}”`
                : areaActive
                  ? `Nothing in ${areaSummary(filters.area, filters.reach).toLowerCase()} yet`
                  : "Nothing listed yet"
            }
          >
            {searchActive
              ? "No one nearby has listed that yet. Try a different word, or widen your search area."
              : areaActive
                ? "Widen the area, or be the first to list something here."
                : "Nobody has listed an item yet — you could be first."}
          </EmptyState>
        ) : null}

        {!loading && results.length > 0 ? (
          <section>
            {filters.view === "grid" ? (
              <div className="item-grid">{shown.map((item) => tile(item))}</div>
            ) : (
              <div className="item-list">{shown.map((item) => row(item))}</div>
            )}

            {remaining > 0 ? (
              <div className="load-more">
                <Button onClick={() => setVisible((count) => count + PAGE_SIZE)} variant="secondary">
                  Show {Math.min(remaining, PAGE_SIZE)} more
                </Button>
                <span>
                  Showing {shown.length} of {results.length}
                </span>
              </div>
            ) : (
              <p className="results-end">
                That's all {results.length} {results.length === 1 ? "item" : "items"} in this area.
              </p>
            )}
          </section>
        ) : null}

        <button className="lend-strip" onClick={() => push({ name: "lend" })} type="button">
          <span className="lend-cta-icon">
            <Icon name="plus" size={18} />
          </span>
          <span className="lend-cta-copy">
            <strong>Lend an item</strong>
            <small>Free or paid — you set the terms</small>
          </span>
          <Icon name="arrowRight" size={17} />
        </button>
      </ScreenBody>

      <BottomNav active="discover" />

      <FilterSheet
        area={filters.area}
        availableOnly={filters.availableOnly}
        matchCount={results.length}
        onApply={(patch) => setFilters(patch)}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
        open={filtersOpen}
        quick={filters.quick}
        reach={filters.reach}
      />

      <Sheet onClose={() => setSortOpen(false)} open={sortOpen} title="Sort by">
        <div className="issue-options" role="radiogroup" aria-label="Sort by">
          {SORTS.map((entry) => (
            <button
              aria-checked={filters.sort === entry.id}
              className={filters.sort === entry.id ? "issue-option selected" : "issue-option"}
              key={entry.id}
              onClick={() => {
                setFilters({ sort: entry.id });
                setSortOpen(false);
              }}
              role="radio"
              type="button"
            >
              <span className="radio-dot" aria-hidden="true" />
              <span className="option-copy">
                <strong>{entry.label}</strong>
                <small>{entry.hint}</small>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </Screen>
  );
}
