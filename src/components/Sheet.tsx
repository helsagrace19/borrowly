import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { IconButton } from "./Button";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional sticky footer, e.g. a confirm button. */
  footer?: ReactNode;
};

/**
 * Bottom sheet used for anything that is not a full screen: date picking,
 * messaging, the prototype controls. Closes on Escape or backdrop tap and
 * returns focus to wherever it came from.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    returnFocusRef.current = document.activeElement;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const target = returnFocusRef.current;
      if (target instanceof HTMLElement) target.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-layer">
      <button aria-label="Close" className="sheet-backdrop" onClick={onClose} tabIndex={-1} type="button" />
      <div
        aria-label={title}
        aria-modal="true"
        className="sheet"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="sheet-head">
          <h2>{title}</h2>
          <IconButton label="Close" name="close" onClick={onClose} size={18} />
        </header>
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
