import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * A tiny in-app navigation stack.
 *
 * The prototype deliberately avoids a routing dependency — there are no
 * URLs to share, and a stack matches how a native app behaves. Tab
 * switches reset the stack so "back" never lands on a different tab.
 */

export type BorrowingTab = "active" | "requests" | "history";

export type Route =
  | { name: "discover" }
  | { name: "item"; itemId: string }
  | { name: "request"; itemId: string }
  | { name: "confirmation"; requestId: string }
  | { name: "borrowing"; tab: BorrowingTab }
  | { name: "return"; requestId: string }
  | { name: "return-status"; requestId: string }
  | { name: "inbox" }
  | { name: "thread"; ownerId: string; itemId: string; requestId: string | null }
  | { name: "profile" }
  /** Publish a new listing, or edit an existing one when `itemId` is set. */
  | { name: "lend"; itemId?: string }
  | { name: "listing-published"; itemId: string }
  | { name: "my-listings" };

type NavigationValue = {
  route: Route;
  canGoBack: boolean;
  depth: number;
  push: (route: Route) => void;
  replace: (route: Route) => void;
  back: () => void;
  /** Switches root tab and clears the stack. */
  goToTab: (route: Route) => void;
  /** Number of screens pushed on top of the current tab. */
  reset: () => void;
};

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: "discover" }]);

  const push = useCallback((route: Route) => {
    setStack((current) => [...current, route]);
  }, []);

  const replace = useCallback((route: Route) => {
    setStack((current) => [...current.slice(0, -1), route]);
  }, []);

  const back = useCallback(() => {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);

  const goToTab = useCallback((route: Route) => {
    setStack([route]);
  }, []);

  const reset = useCallback(() => {
    setStack((current) => current.slice(0, 1));
  }, []);

  const value = useMemo<NavigationValue>(
    () => ({
      route: stack[stack.length - 1],
      canGoBack: stack.length > 1,
      depth: stack.length - 1,
      push,
      replace,
      back,
      goToTab,
      reset,
    }),
    [stack, push, replace, back, goToTab, reset],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationValue {
  const value = useContext(NavigationContext);
  if (!value) throw new Error("useNavigation must be used inside NavigationProvider");
  return value;
}
