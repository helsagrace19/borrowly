import { useEffect, useState } from "react";

/**
 * A clock the UI can re-render against, so countdowns and overdue states
 * stay honest without a manual refresh. One tick a minute is plenty for
 * deadlines measured in days.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
