import type { ReactNode } from "react";

import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={24} />
      </span>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

/** First-paint skeleton for the Discover list. */
export function CardSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <span className="skeleton-thumb" />
      <span className="skeleton-lines">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
