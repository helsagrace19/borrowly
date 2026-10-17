import type { ReactNode } from "react";

import { Icon } from "./Icon";
import type { IconName } from "./Icon";

type PillTone = "available" | "unavailable" | "pending" | "active" | "done" | "warning" | "neutral";

export function Pill({
  tone = "neutral",
  icon,
  children,
  dot = false,
}: {
  tone?: PillTone;
  icon?: IconName;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={`pill ${tone}`}>
      {dot ? <i className="pill-dot" aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}

/** Availability badge used on cards and the item page. */
export function AvailabilityPill({ available }: { available: boolean }) {
  return (
    <Pill dot tone={available ? "available" : "unavailable"}>
      {available ? "Available" : "Unavailable"}
    </Pill>
  );
}

export function ProgressBar({ value, tone = "ink" }: { value: number; tone?: "ink" | "coral" | "warning" }) {
  const clamped = Math.min(Math.max(value, 0), 1);
  return (
    <div className="progress" role="presentation">
      <span className={tone} style={{ width: `${Math.round(clamped * 100)}%` }} />
    </div>
  );
}
