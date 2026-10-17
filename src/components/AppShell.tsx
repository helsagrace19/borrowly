import type { ReactNode } from "react";

import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { IconButton } from "./Button";
import { phaseOf } from "../lib/loan";
import { useNow } from "../lib/useNow";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";

/**
 * The prototype runs edge to edge on a phone, and inside a device frame on
 * a larger screen so it still reads as a mobile app.
 */
export function DeviceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-frame">
      <div className="app-device">
        <div aria-hidden="true" className="status-bar">
          <span>9:41</span>
          <span className="status-icons">
            <i className="status-signal" />
            <i className="status-wifi" />
            <i className="status-battery" />
          </span>
        </div>
        <div className="app-viewport" id="main">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Screen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={["screen", className ?? ""].filter(Boolean).join(" ")}>{children}</div>;
}

export function ScreenBody({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <main className={["screen-body", padded ? "padded" : "", className ?? ""].filter(Boolean).join(" ")}>
      {children}
    </main>
  );
}

export function TopBar({
  title,
  onBack,
  action,
  wordmark = false,
  center = true,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
  wordmark?: boolean;
  center?: boolean;
}) {
  return (
    <header className={center ? "top-bar" : "top-bar start"}>
      <div className="top-side">
        {onBack ? <IconButton label="Go back" name="back" onClick={onBack} size={19} /> : null}
      </div>
      <div className={wordmark ? "top-title wordmark" : "top-title"}>
        {title}
        {wordmark ? <i aria-hidden="true" /> : null}
      </div>
      <div className="top-side top-action">{action}</div>
    </header>
  );
}

export function StickyAction({ children }: { children: ReactNode }) {
  return <div className="sticky-action">{children}</div>;
}

export type NavTab = "discover" | "borrowing" | "listings" | "profile";

/**
 * Primary navigation. Counts are derived here so every screen shows the same
 * badges, and the tab → route mapping lives in one place.
 */
export function BottomNav({ active }: { active: NavTab }) {
  const { goToTab } = useNavigation();
  const { requests } = useBorrowly();
  const now = useNow();

  const borrowingCount = requests.filter(
    (request) =>
      request.direction === "outgoing" &&
      ["requested", "approved", "collected", "overdue", "return-pending"].includes(
        phaseOf(request, now),
      ),
  ).length;

  const listingsCount = requests.filter(
    (request) => request.direction === "incoming" && request.status === "pending",
  ).length;

  const tabs: { id: NavTab; label: string; icon: IconName }[] = [
    { id: "discover", label: "Discover", icon: "search" },
    { id: "borrowing", label: "Borrowing", icon: "book" },
    { id: "listings", label: "Listings", icon: "box" },
    { id: "profile", label: "Profile", icon: "user" },
  ];

  const routeFor = (tab: NavTab) => {
    if (tab === "discover") return { name: "discover" } as const;
    if (tab === "borrowing") return { name: "borrowing", tab: "active" } as const;
    if (tab === "listings") return { name: "my-listings" } as const;
    return { name: "profile" } as const;
  };

  const countFor = (tab: NavTab) =>
    tab === "borrowing" ? borrowingCount : tab === "listings" ? listingsCount : 0;

  return (
    <nav aria-label="Primary" className="bottom-nav">
      {tabs.map((tab) => {
        const count = countFor(tab.id);
        return (
          <button
            aria-current={active === tab.id ? "page" : undefined}
            className={active === tab.id ? "nav-item active" : "nav-item"}
            key={tab.id}
            onClick={() => goToTab(routeFor(tab.id))}
            type="button"
          >
            <span className="nav-icon">
              <Icon name={tab.icon} size={19} />
              {count > 0 ? <em className="nav-count">{count}</em> : null}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
