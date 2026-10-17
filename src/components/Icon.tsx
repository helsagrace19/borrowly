import type { ReactNode } from "react";

/**
 * Hand-drawn line icons matching the Borrowly visual language.
 *
 * The project already used inline SVG paths for its icon set, so this keeps
 * that approach (and the same 1.8 stroke weight) rather than adding an
 * icon dependency for a handful of glyphs.
 */

export type IconName =
  | "alert"
  | "arrowRight"
  | "back"
  | "bell"
  | "book"
  | "box"
  | "calendar"
  | "check"
  | "checkCircle"
  | "chevronDown"
  | "chevronUp"
  | "clock"
  | "close"
  | "edit"
  | "filter"
  | "flag"
  | "grid"
  | "help"
  | "home"
  | "inbox"
  | "info"
  | "list"
  | "mapPin"
  | "message"
  | "plus"
  | "refresh"
  | "search"
  | "send"
  | "shield"
  | "sparkle"
  | "star"
  | "trash"
  | "user"
  | "users";

const paths: Record<IconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 4 2.9 19.4h18.2L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 16.9h.01" />
    </>
  ),
  arrowRight: <path d="m9.5 6 6 6-6 6" />,
  back: <path d="m14.5 6-6 6 6 6" />,
  bell: (
    <>
      <path d="M12 3.5A5.5 5.5 0 0 0 6.5 9v3.2L5 15.5h14l-1.5-3.3V9A5.5 5.5 0 0 0 12 3.5Z" />
      <path d="M10 18.4a2 2 0 0 0 4 0" />
    </>
  ),
  book: (
    <>
      <path d="M5.5 4.5h11a2 2 0 0 1 2 2v13.8H7.5a2 2 0 0 1-2-2V4.5Z" />
      <path d="M5.5 17.2h13" />
      <path d="M9 8.5h6" />
      <path d="M9 12h3.5" />
    </>
  ),
  box: (
    <>
      <path d="M3.6 8.2 12 3.6l8.4 4.6v7.6L12 20.4l-8.4-4.6V8.2Z" />
      <path d="M3.6 8.2 12 12.8l8.4-4.6" />
      <path d="M12 12.8v7.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.2" width="17" height="15.3" rx="2.2" />
      <path d="M8.2 3.4v3.4M15.8 3.4v3.4M3.5 10.2h17" />
    </>
  ),
  check: <path d="m5 12.6 4.6 4.6L19.2 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m8.3 12.3 2.6 2.6 4.9-5.6" />
    </>
  ),
  chevronDown: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  chevronUp: <path d="m6.5 14.5 5.5-5.5 5.5 5.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.2V12l3.4 2" />
    </>
  ),
  close: <path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" />,
  edit: (
    <>
      <path d="M4 20h4.2L19.5 8.7l-4.2-4.2L4 15.8V20Z" />
      <path d="m14.4 5.4 4.2 4.2" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7.5h16M4 16.5h16" />
      <circle cx="9.5" cy="7.5" r="2.2" />
      <circle cx="15" cy="16.5" r="2.2" />
    </>
  ),
  flag: (
    <>
      <path d="M6.4 20.5V4.2h11.9l-2.5 4 2.5 4H6.4" />
    </>
  ),
  grid: (
    <>
      <rect height="6.4" rx="1.6" width="6.4" x="4" y="4" />
      <rect height="6.4" rx="1.6" width="6.4" x="13.6" y="4" />
      <rect height="6.4" rx="1.6" width="6.4" x="4" y="13.6" />
      <rect height="6.4" rx="1.6" width="6.4" x="13.6" y="13.6" />
    </>
  ),
  list: (
    <>
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h16" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.7 9.6a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .8-1 1.5v.7" />
      <path d="M12 17.1h.01" />
    </>
  ),
  home: (
    <>
      <path d="m3.6 11 8.4-7 8.4 7" />
      <path d="M6.2 9.7V20h11.6V9.7" />
      <path d="M10 20v-5.4h4V20" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13.6 6.6 5.2h10.8L20 13.6v5.2H4v-5.2Z" />
      <path d="M4 13.6h4.3l1.3 2.4h4.8l1.3-2.4H20" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11.2v5" />
      <path d="M12 8.1h.01" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 20.8s6.8-5.9 6.8-10.8a6.8 6.8 0 1 0-13.6 0c0 4.9 6.8 10.8 6.8 10.8Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  message: (
    <>
      <path d="M4 6.2A2.2 2.2 0 0 1 6.2 4h11.6A2.2 2.2 0 0 1 20 6.2v7.1a2.2 2.2 0 0 1-2.2 2.2H9.6L4 19.6V6.2Z" />
    </>
  ),
  plus: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  refresh: (
    <>
      <path d="M19.6 12a7.6 7.6 0 1 1-2.2-5.4" />
      <path d="M19.6 4.6V10h-5.4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.6 15.6 4.6 4.6" />
    </>
  ),
  send: (
    <>
      <path d="M20 4 4 11.1l6.3 2.6L13 20l7-16Z" />
      <path d="m10.3 13.7 4.1-4.1" />
    </>
  ),
  shield: <path d="M12 3.4 5.2 6.2v5c0 4.8 2.9 7.8 6.8 9.6 3.9-1.8 6.8-4.8 6.8-9.6v-5L12 3.4Zm-3.2 8.9 2.2 2.2 4.3-5" />,
  sparkle: (
    <>
      <path d="M12 3.6l1.9 4.9 4.9 1.9-4.9 1.9L12 17.2l-1.9-4.9L5.2 10.4l4.9-1.9L12 3.6Z" />
      <path d="M18.4 15.6l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </>
  ),
  star: <path d="M12 3.8l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8L12 3.8Z" />,
  trash: (
    <>
      <path d="M4.8 7h14.4" />
      <path d="M9.6 7V4.8h4.8V7" />
      <path d="m6.6 7 .9 13h9l.9-13" />
      <path d="M10.5 11v5.6M13.5 11v5.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="4" />
      <path d="M4.6 20.4c0-3.8 3.3-6.4 7.4-6.4s7.4 2.6 7.4 6.4" />
    </>
  ),
  users: (
    <>
      <circle cx="9.4" cy="8.4" r="3.7" />
      <path d="M2.8 20.2c0-3.5 2.9-5.9 6.6-5.9s6.6 2.4 6.6 5.9" />
      <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.6" />
      <path d="M17.6 14.6c2.2.6 3.6 2.4 3.6 5.6" />
    </>
  ),
};

export type IconProps = {
  name: IconName;
  size?: number;
  /** Applies `fill` for glyphs that read better solid, such as the star. */
  filled?: boolean;
  strokeWidth?: number;
  className?: string;
};

export function Icon({ name, size = 18, filled = false, strokeWidth = 1.8, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className ? `icon ${className}` : "icon"}
      fill={filled ? "currentColor" : "none"}
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
        {paths[name]}
      </g>
    </svg>
  );
}

/** Icon inside a circular tinted plate, used for empty states and info rows. */
export function IconBadge({
  name,
  tone = "sage",
  size = 20,
}: {
  name: IconName;
  tone?: "sage" | "coral" | "ink";
  size?: number;
}) {
  return (
    <span className={`icon-badge ${tone}`}>
      <Icon name={name} size={size} />
    </span>
  );
}
