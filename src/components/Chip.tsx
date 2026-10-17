import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  children: ReactNode;
};

export function Chip({ selected = false, children, className, ...rest }: ChipProps) {
  return (
    <button
      aria-pressed={selected}
      className={["chip", selected ? "selected" : "", className ?? ""].filter(Boolean).join(" ")}
      type="button"
      {...rest}
    >
      {children}
    </button>
  );
}
