import { useState } from "react";
import type { ReactElement } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Calendar } from "~/components/tasks/quick-add/calendar";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { Switch } from "~/components/ui/switch";
import { TimeInput } from "~/components/ui/time-input";
import { formatDueHint, getZonedNow, isValidTime } from "~/lib/tasks/date-time";

const MIN_DATE = "2025-01-01";
const MAX_DATE = "2100-12-31";
const HINT_TRANSITION = { duration: 0.18, ease: "easeOut" } as const;

export interface DueStepValue {
  date: string;
  time: string;
  isRecurring: boolean;
}

export interface DueStepProps {
  date: string;
  time: string;
  isRecurring: boolean;
  timeZone: string;
  now: Date;
  onApply: (value: DueStepValue) => void;
  onToggleHaptic?: () => void;
}

function formatZonedToday(now: Date, timeZone: string): string {
  const { year, month, day } = getZonedNow(now, timeZone);

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

export function DueStep({
  date,
  time,
  isRecurring,
  timeZone,
  now,
  onApply,
  onToggleHaptic,
}: DueStepProps): ReactElement {
  const [selectedDate, setSelectedDate] = useState(date);
  const [selectedTime, setSelectedTime] = useState(time);
  const [recurring, setRecurring] = useState(isRecurring);

  const hint = formatDueHint(
    selectedDate,
    selectedTime,
    timeZone,
    now,
    recurring,
  );
  const hintKey = recurring ? "recurring" : hint;
  const today = formatZonedToday(now, timeZone);
  const isTimeValid = isValidTime(selectedTime);

  function handleRecurringChange(checked: boolean) {
    setRecurring(checked);
    onToggleHaptic?.();
  }

  return (
    <div className="flex flex-col">
      <Calendar
        maxDate={MAX_DATE}
        minDate={MIN_DATE}
        onSelect={setSelectedDate}
        today={today}
        value={selectedDate}
      />
      <div className="mt-[15px] flex min-h-11 items-center justify-between gap-[15px] border-b border-app-stroke">
        <span className="text-[16px] text-app-text">Время</span>
        <TimeInput onChange={setSelectedTime} value={selectedTime} />
      </div>
      {isTimeValid ? null : (
        <p className="pt-[5px] text-[13px] leading-[1.4] text-app-text-secondary">
          Укажите время
        </p>
      )}
      <div className="flex min-h-[50px] items-center justify-between gap-[15px] border-b border-app-stroke">
        <span className="text-[16px] text-app-text">Регулярная задача</span>
        <Switch
          checked={recurring}
          label="Регулярная задача"
          onCheckedChange={handleRecurringChange}
        />
      </div>
      <div
        aria-live="polite"
        className="min-h-[18px] pt-[10px] text-[13px] leading-[1.4] text-app-text-secondary"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            initial={{ opacity: 0, y: 6 }}
            key={hintKey}
            transition={HINT_TRANSITION}
          >
            {hint}
          </motion.p>
        </AnimatePresence>
      </div>
      <BottomSheetPrimaryAction
        className="mt-[15px]"
        disabled={!isTimeValid}
        onClick={() =>
          onApply({
            date: selectedDate,
            time: selectedTime,
            isRecurring: recurring,
          })
        }
      >
        Готово
      </BottomSheetPrimaryAction>
    </div>
  );
}
