import { useMemo } from "react";

import { BottomNav, Screen, ScreenBody, TopBar } from "../components/AppShell";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { useNow } from "../lib/useNow";
import { phaseOf } from "../lib/loan";
import type { BorrowingTab } from "../state/navigation";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";
import { ClosedCard, HistoryCard, LoanCard, PendingCard } from "./LoanCards";

const TABS: { id: BorrowingTab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "requests", label: "Requests" },
  { id: "history", label: "History" },
];

export function BorrowingScreen({ tab }: { tab: BorrowingTab }) {
  const { goToTab } = useNavigation();
  const { requests, seedDemoBorrowing } = useBorrowly();
  const now = useNow();

  const groups = useMemo(() => {
    const withPhase = requests
      // Only requests you made. Neighbours' requests on your listings live in
      // My Listings, not in your borrowing.
      .filter((request) => request.direction === "outgoing")
      .map((request) => ({ request, phase: phaseOf(request, now) }))
      .sort((a, b) => b.request.createdAt - a.request.createdAt);

    return {
      active: withPhase.filter((entry) =>
        ["approved", "collected", "overdue", "return-pending"].includes(entry.phase),
      ),
      requests: withPhase.filter((entry) =>
        ["requested", "declined", "cancelled"].includes(entry.phase),
      ),
      history: withPhase.filter((entry) => entry.phase === "returned"),
    };
  }, [requests, now]);

  const counts: Record<BorrowingTab, number> = {
    active: groups.active.length,
    requests: groups.requests.length,
    history: groups.history.length,
  };

  return (
    <Screen>
      <TopBar title="My borrowing" />

      <ScreenBody padded={false}>
        <div className="segmented" role="tablist" aria-label="Borrowing views">
          {TABS.map((entry) => (
            <button
              aria-selected={tab === entry.id}
              className={tab === entry.id ? "selected" : ""}
              key={entry.id}
              onClick={() => goToTab({ name: "borrowing", tab: entry.id })}
              role="tab"
              type="button"
            >
              {entry.label}
              {counts[entry.id] > 0 ? <span>{counts[entry.id]}</span> : null}
            </button>
          ))}
        </div>

        <div className="tab-body">
          {tab === "active" ? (
            <>
              {groups.active.length === 0 ? (
                <EmptyState
                  action={
                    <div className="stacked-actions">
                      <Button icon="search" onClick={() => goToTab({ name: "discover" })}>
                        Find something to borrow
                      </Button>
                      <Button icon="sparkle" onClick={seedDemoBorrowing} variant="secondary">
                        Load a demo borrowing
                      </Button>
                    </div>
                  }
                  icon="book"
                  title="Nothing borrowed right now"
                >
                  When a neighbour approves a request, the loan appears here with its return date.
                </EmptyState>
              ) : (
                <div className="loan-list">
                  {groups.active.map((entry) => (
                    <LoanCard
                      key={entry.request.id}
                      now={now}
                      phase={entry.phase}
                      request={entry.request}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}

          {tab === "requests" ? (
            <>
              {groups.requests.length === 0 ? (
                <EmptyState
                  action={
                    <Button icon="search" onClick={() => goToTab({ name: "discover" })} variant="secondary">
                      Browse items nearby
                    </Button>
                  }
                  icon="inbox"
                  title="No requests yet"
                >
                  Requests you send show up here until the owner answers.
                </EmptyState>
              ) : (
                <div className="loan-list">
                  {groups.requests.map((entry) =>
                    entry.phase === "requested" ? (
                      <PendingCard key={entry.request.id} request={entry.request} />
                    ) : (
                      <ClosedCard key={entry.request.id} phase={entry.phase} request={entry.request} />
                    ),
                  )}
                </div>
              )}
            </>
          ) : null}

          {tab === "history" ? (
            <>
              {groups.history.length === 0 ? (
                <EmptyState
                  icon="clock"
                  title="Nothing completed yet"
                >
                  Borrowings you have returned — and that the owner has confirmed — are kept here.
                </EmptyState>
              ) : (
                <>
                  <div className="loan-list">
                    {groups.history.map((entry) => (
                      <HistoryCard key={entry.request.id} request={entry.request} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>

        <div className="tab-footnote">
          <Icon name="plus" size={14} />
          <span>
            Got something of your own to share?{" "}
            <button className="mini-link" onClick={() => goToTab({ name: "my-listings" })} type="button">
              Lend an item
            </button>
          </span>
        </div>
      </ScreenBody>

      <BottomNav active="borrowing" />
    </Screen>
  );
}
