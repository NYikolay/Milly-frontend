import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import chevronLeftIcon from "~/assets/icons/chevron-left.svg";
import chevronRightIcon from "~/assets/icons/chevron-right.svg";
import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";
import {
  formatMonthTitle,
  getMonthGrid,
  isDateInRange,
} from "~/lib/tasks/date-time";
import type { MonthCell } from "~/lib/tasks/date-time";

const DEFAULT_MIN_DATE = "2025-01-01";
const DEFAULT_MAX_DATE = "2100-12-31";
const WEEKDAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
const DAYS_PER_WEEK = 7;

interface MonthView {
  year: number;
  month: number;
}

export interface CalendarProps {
  value: string;
  today?: string;
  minDate?: string;
  maxDate?: string;
  onSelect: (date: string) => void;
  className?: string;
}

function toMonth(date: string): MonthView {
  const [year, month] = date.split("-").map(Number);

  return { year, month };
}

function compareMonths(left: MonthView, right: MonthView): number {
  return left.year * 12 + left.month - (right.year * 12 + right.month);
}

function shiftMonth(view: MonthView, delta: number): MonthView {
  const index = view.year * 12 + (view.month - 1) + delta;

  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  };
}

function chunkWeeks(cells: MonthCell[]): MonthCell[][] {
  const weeks: MonthCell[][] = [];

  for (let index = 0; index < cells.length; index += DAYS_PER_WEEK) {
    weeks.push(cells.slice(index, index + DAYS_PER_WEEK));
  }

  return weeks;
}

const NAVIGATION_BUTTON_CLASSES =
  "flex size-11 -m-[10px] items-center justify-center rounded-full text-app-accent active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

export function Calendar({
  value,
  today,
  minDate = DEFAULT_MIN_DATE,
  maxDate = DEFAULT_MAX_DATE,
  onSelect,
  className,
}: CalendarProps): ReactElement {
  const [view, setView] = useState<MonthView>(() => toMonth(value));

  useEffect(() => {
    setView((current) => {
      const next = toMonth(value);
      return compareMonths(current, next) === 0 ? current : next;
    });
  }, [value]);

  const title = formatMonthTitle(view.year, view.month);
  const weeks = chunkWeeks(getMonthGrid(view.year, view.month));
  const minView = toMonth(minDate);
  const maxView = toMonth(maxDate);
  const canGoPrevious = compareMonths(view, minView) > 0;
  const canGoNext = compareMonths(view, maxView) < 0;

  function handleSelect(cell: MonthCell) {
    if (!isDateInRange(cell.date, minDate, maxDate)) {
      return;
    }

    if (!cell.inCurrentMonth) {
      setView(toMonth(cell.date));
    }

    onSelect(cell.date);
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        <button
          aria-label="Предыдущий месяц"
          className={NAVIGATION_BUTTON_CLASSES}
          disabled={!canGoPrevious}
          onClick={() => setView((current) => shiftMonth(current, -1))}
          type="button"
        >
          <AssetIcon className="size-6" src={chevronLeftIcon} />
        </button>
        <h3 className="text-[17px] font-semibold leading-[1.4] text-app-text">
          {title}
        </h3>
        <button
          aria-label="Следующий месяц"
          className={NAVIGATION_BUTTON_CLASSES}
          disabled={!canGoNext}
          onClick={() => setView((current) => shiftMonth(current, 1))}
          type="button"
        >
          <AssetIcon className="size-6" src={chevronRightIcon} />
        </button>
      </div>
      <div aria-label={title} className="mt-4" role="grid">
        <div className="grid grid-cols-7" role="row">
          {WEEKDAYS.map((weekday) => (
            <span
              className="flex h-[18px] items-center justify-center text-[11px] text-app-text-secondary"
              key={weekday}
              role="columnheader"
            >
              {weekday}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div className="grid grid-cols-7" key={week[0]?.date} role="row">
            {week.map((cell) => {
              const isSelected = cell.date === value;
              const isDisabled = !isDateInRange(cell.date, minDate, maxDate);

              return (
                <button
                  aria-current={cell.date === today ? "date" : undefined}
                  aria-selected={isSelected}
                  className={cn(
                    "mx-auto flex h-9 w-12 max-w-full items-center justify-center rounded-[25px] text-[15px] transition-colors active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed",
                    isSelected
                      ? "bg-app-accent font-semibold text-white"
                      : cell.inCurrentMonth
                        ? "text-app-text"
                        : "text-app-stroke",
                    isDisabled && "opacity-40",
                  )}
                  disabled={isDisabled}
                  key={cell.date}
                  onClick={() => handleSelect(cell)}
                  role="gridcell"
                  type="button"
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
