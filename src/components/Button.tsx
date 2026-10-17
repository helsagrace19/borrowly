import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icon } from "./Icon";
import type { IconName } from "./Icon";

type Variant = "primary" | "secondary" | "plain" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: IconName;
  trailingIcon?: IconName;
  children: ReactNode;
  /** Stretches the button across the available width. Defaults to true. */
  block?: boolean;
};

const variantClass: Record<Variant, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  plain: "plain-button",
  danger: "danger-button",
};

export function Button({
  variant = "primary",
  icon,
  trailingIcon,
  children,
  block = true,
  className,
  ...rest
}: ButtonProps) {
  const classes = [
    variantClass[variant],
    block ? "is-block" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type="button" {...rest}>
      {icon ? <Icon name={icon} size={17} /> : null}
      <span>{children}</span>
      {trailingIcon ? <Icon name={trailingIcon} size={17} /> : null}
    </button>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  name: IconName;
  label: string;
  size?: number;
  tone?: "ink" | "ghost";
};

export function IconButton({ name, label, size = 20, tone = "ink", className, ...rest }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={["icon-button", tone, className ?? ""].filter(Boolean).join(" ")}
      title={label}
      type="button"
      {...rest}
    >
      <Icon name={name} size={size} />
    </button>
  );
}

/** Small inline text button used for "Change", "Clear" and similar actions. */
export function TextButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={["text-button", className ?? ""].filter(Boolean).join(" ")} type="button" {...rest}>
      {children}
    </button>
  );
}
