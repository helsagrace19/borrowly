import { useEffect, useMemo, useState } from "react";

import { calendarGrid, daysBetween, formatLong, fromISODate, monthLabel, todayISO } from "../lib/dates";
import { IconButton } from "./Button";
import { Sheet } from "./Sheet";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type CalendarSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Currently chosen day, highlighted as selected. */
  value: string | null;
  /** Earliest selectable day. */
  minDate: string;
  /** Days that cannot be chosen, e.g. already booked by a neighbour. */
  blocked: Set<string>;
  onSelect: (iso: string) => void;
  /** Shown under the grid, e.g. "Marta lends this for up to 5 days." */
  hint?: string;
  /** Start of the range being edited, drawn with an "in range" tint. */
  rangeStart?: string | null;
};

export function CalendarSheet({
  open,
  onClose,
  title,
  value,
  minDate,
  blocked,
  onSelect,
  hint,
  rangeStart,
}: CalendarSheetProps) {
  const today = todayISO();
  const [viewMonth, setViewMonth] = useState(() => fromISODate(value ?? minDate));

  useEffect(() => {
    if (open) setViewMonth(fromISODate(value ?? minDate));
  }, [open, value, minDate]);

  const cells = useMemo(() => calendarGrid(viewMonth), [viewMonth]);
  const minMonthIndex = fromISODate(minDate).getFullYear() * 12 + fromISODate(minDate).getMonth();
  const viewIndex = viewMonth.getFullYear() * 12 + viewMonth.getMonth();
  const canGoBack = viewIndex > minMonthIndex;

  const shiftMonth = (delta: number) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <Sheet onClose={onClose} open={open} title={title}>
      <div className="calendar">
        <div className="calendar-head">
          <IconButton
            disabled={!canGoBack}
            label="Previous month"
            name="back"
            onClick={() => shiftMonth(-1)}
            size={18}
          />
          <strong aria-live="polite">{monthLabel(viewMonth)}</strong>
          <IconButton label="Next month" name="arrowRight" onClick={() => shiftMonth(1)} size={18} />
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((cell) => {
            const isPast = daysBetween(today, cell.iso) < 0;
            const isBeforeMin = daysBetween(minDate, cell.iso) < 0;
            const isBlocked = blocked.has(cell.iso);
            const disabled = isPast || isBeforeMin || isBlocked;
            const selected = cell.iso === value;
            const inRange =
              !!rangeStart && !selected && daysBetween(rangeStart, cell.iso) > 0 && !disabled;

            const classes = [
              "calendar-day",
              cell.inMonth ? "" : "outside",
              disabled ? "disabled" : "",
              selected ? "selected" : "",
              inRange ? "in-range" : "",
              cell.iso === today ? "today" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                aria-label={`${formatLong(cell.iso)}${isBlocked ? ", already booked" : ""}`}
                aria-pressed={selected}
                className={classes}
                disabled={disabled}
                key={cell.iso}
                onClick={() => onSelect(cell.iso)}
                type="button"
              >
                {fromISODate(cell.iso).getDate()}
              </button>
            );
          })}
        </div>

        <div className="calendar-legend">
          <span>
            <i className="legend-dot blocked" /> Booked by a neighbour
          </span>
          <span>
            <i className="legend-dot selected" /> Selected
          </span>
        </div>

        {hint ? <p className="calendar-hint">{hint}</p> : null}
      </div>
    </Sheet>
  );
}
