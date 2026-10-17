import type { ReactNode } from "react";

import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export function SectionHeading({
  title,
  action,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <strong>{title}</strong>
        {subtitle ? <span className="section-sub">{subtitle}</span> : null}
      </div>
      {action}
    </div>
  );
}

export function InfoRow({
  icon,
  title,
  detail,
  trailing,
  accent = false,
}: {
  icon: IconName;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={accent ? "info-row accent" : "info-row"}>
      <span className="info-icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="info-copy">
        <strong>{title}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      {trailing ? <span className="info-trailing">{trailing}</span> : null}
    </div>
  );
}

export function Notice({
  icon = "info",
  title,
  children,
  tone = "sage",
}: {
  icon?: IconName;
  title?: string;
  children: ReactNode;
  tone?: "sage" | "coral" | "warning";
}) {
  return (
    <div className={`notice ${tone}`} role="note">
      <Icon name={icon} size={17} />
      <span>
        {title ? <strong>{title}</strong> : null}
        {children}
      </span>
    </div>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p className="inline-error" role="alert">
      <Icon name="alert" size={15} />
      <span>{children}</span>
    </p>
  );
}

export function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <label className="field-label" htmlFor={htmlFor}>
      <span>{children}</span>
      {hint ? <em>{hint}</em> : null}
    </label>
  );
}
