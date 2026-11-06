import type { ReactElement } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Calendar } from "~/components/tasks/quick-add/calendar";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { Switch } from "~/components/ui/switch";
import { TimeInput } from "~/components/ui/time-input";
import {
  formatDueHint,
  formatZonedToday,
  isValidTime,
} from "~/lib/tasks/date-time";

const MAX_DATE = "2100-12-31";
const HINT_TRANSITION = { duration: 0.18, ease: "easeOut" } as const;

export interface DueStepValue {
  date: string;
  time: string;
  isRecurring: boolean;
}

export interface DueStepProps {
  value: DueStepValue;
  timeZone: string;
  now: Date;
  onChange: (patch: Partial<DueStepValue>) => void;
  onApply: (value: DueStepValue) => void;
  onToggleHaptic?: () => void;
}

export function DueStep({
  value,
  timeZone,
  now,
  onChange,
  onApply,
  onToggleHaptic,
}: DueStepProps): ReactElement {
  const today = formatZonedToday(now, timeZone);
  const selectedDate = value.date < today ? today : value.date;

  const hint = formatDueHint(
    selectedDate,
    value.time,
    timeZone,
    now,
    value.isRecurring,
  );
  const hintKey = value.isRecurring ? "recurring" : hint;
  const isTimeValid = isValidTime(value.time);

  function handleRecurringChange(checked: boolean) {
    onChange({ isRecurring: checked });
    onToggleHaptic?.();
  }

  return (
    <div className="flex flex-col">
      <Calendar
        maxDate={MAX_DATE}
        minDate={today}
        onSelect={(date) => onChange({ date })}
        today={today}
        value={selectedDate}
      />
      <div className="mt-[15px] border-t border-app-stroke pt-[17px]">
        <div className="flex min-h-11 items-center justify-between gap-[15px]">
          <span className="text-[16px] text-app-text">Время</span>
          <TimeInput
            onChange={(time) => onChange({ time })}
            value={value.time}
          />
        </div>
        {isTimeValid ? null : (
          <p className="pt-[5px] text-[13px] leading-[1.4] text-app-text-secondary">
            Укажите время
          </p>
        )}
      </div>
      <div className="mt-[15px] flex min-h-[50px] items-center justify-between gap-[15px]">
        <span className="text-[16px] text-app-text">Регулярная задача</span>
        <Switch
          checked={value.isRecurring}
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
            time: value.time,
            isRecurring: value.isRecurring,
          })
        }
      >
        Готово
      </BottomSheetPrimaryAction>
    </div>
  );
}
