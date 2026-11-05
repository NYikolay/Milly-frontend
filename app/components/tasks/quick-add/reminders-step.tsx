import { useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { AnimatePresence, motion } from "motion/react";

import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { SelectField } from "~/components/ui/select-field";
import type { SelectOption } from "~/components/ui/select-field";
import { Switch } from "~/components/ui/switch";
import { TimeInput } from "~/components/ui/time-input";
import type { DueUnit } from "~/lib/tasks/quick-task-schema";

const SETTINGS_TRANSITION = { duration: 0.22, ease: "easeOut" } as const;

export const REMINDER_UNIT_OPTIONS: SelectOption<DueUnit>[] = [
  { value: "minutes", label: "Минут" },
  { value: "hours", label: "Часов" },
  { value: "days", label: "Дней" },
];

export const REMINDER_INTERVAL_OPTIONS: SelectOption<number>[] = [
  { value: 1, label: "Каждый день" },
  { value: 2, label: "Каждые 2 дня" },
  { value: 3, label: "Каждые 3 дня" },
  { value: 4, label: "Каждые 4 дня" },
  { value: 7, label: "Каждую неделю" },
];

export interface ReminderDraft {
  remindersEnabled: boolean;
  beforeDueEnabled: boolean;
  beforeDueAmount: number;
  beforeDueUnit: DueUnit;
  scheduledEnabled: boolean;
  scheduledIntervalDays: number;
  scheduledTime: string;
}

export interface RemindersStepProps {
  value: ReminderDraft;
  onApply: (value: ReminderDraft) => void;
  onToggleHaptic?: () => void;
}

function parseAmount(input: string): number | null {
  if (!/^\d+$/.test(input)) {
    return null;
  }

  const amount = Number.parseInt(input, 10);

  return Number.isSafeInteger(amount) && amount >= 1 ? amount : null;
}

export function RemindersStep({
  value,
  onApply,
  onToggleHaptic,
}: RemindersStepProps): ReactElement {
  const [remindersEnabled, setRemindersEnabled] = useState(
    value.remindersEnabled,
  );
  const [beforeDueEnabled, setBeforeDueEnabled] = useState(
    value.beforeDueEnabled,
  );
  const [beforeDueAmountInput, setBeforeDueAmountInput] = useState(() =>
    String(value.beforeDueAmount),
  );
  const [beforeDueUnit, setBeforeDueUnit] = useState<DueUnit>(
    value.beforeDueUnit,
  );
  const [scheduledEnabled, setScheduledEnabled] = useState(
    value.scheduledEnabled,
  );
  const [scheduledIntervalDays, setScheduledIntervalDays] = useState(
    value.scheduledIntervalDays,
  );
  const [scheduledTime, setScheduledTime] = useState(value.scheduledTime);

  const parsedAmount = parseAmount(beforeDueAmountInput);
  const isApplyDisabled =
    remindersEnabled && beforeDueEnabled && parsedAmount === null;

  function handleRemindersEnabledChange(checked: boolean) {
    setRemindersEnabled(checked);
    onToggleHaptic?.();
  }

  function handleBeforeDueEnabledChange(checked: boolean) {
    setBeforeDueEnabled(checked);
    onToggleHaptic?.();
  }

  function handleScheduledEnabledChange(checked: boolean) {
    setScheduledEnabled(checked);
    onToggleHaptic?.();
  }

  function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
    setBeforeDueAmountInput(event.target.value.replace(/\D/g, ""));
  }

  function handleApply() {
    if (isApplyDisabled) {
      return;
    }

    onApply({
      remindersEnabled,
      beforeDueEnabled,
      beforeDueAmount: parsedAmount ?? 1,
      beforeDueUnit,
      scheduledEnabled,
      scheduledIntervalDays,
      scheduledTime,
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-[59px] items-center justify-between gap-[15px]">
        <span className="text-[16px] text-app-text">Автонапоминания</span>
        <Switch
          checked={remindersEnabled}
          label="Автонапоминания"
          onCheckedChange={handleRemindersEnabledChange}
        />
      </div>
      <AnimatePresence initial={false}>
        {remindersEnabled ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={SETTINGS_TRANSITION}
          >
            <div className="flex flex-col gap-[15px] pt-[15px]">
              <p className="text-[13px] uppercase text-app-text-secondary">
                НАСТРОЙКИ
              </p>
              <div className="flex flex-col gap-[10px]">
                <div className="flex min-h-[50px] items-center justify-between gap-[15px]">
                  <span className="text-[16px] text-app-text">
                    До срока задачи
                  </span>
                  <Switch
                    checked={beforeDueEnabled}
                    label="До срока задачи"
                    onCheckedChange={handleBeforeDueEnabledChange}
                  />
                </div>
                {beforeDueEnabled ? (
                  <>
                    <p className="text-[13px] leading-[1.4] text-app-text-secondary">
                      За сколько до завершения задачи напомнить
                    </p>
                    <div className="flex flex-wrap items-center gap-[10px]">
                      <input
                        aria-label="За сколько до завершения задачи напомнить"
                        className="h-12 w-[114px] shrink-0 rounded-[24px] bg-app-track p-0 text-center text-[17px] font-semibold text-app-accent outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
                        inputMode="numeric"
                        onChange={handleAmountChange}
                        type="text"
                        value={beforeDueAmountInput}
                      />
                      <div className="w-[215px] max-w-full shrink-0">
                        <SelectField
                          ariaLabel="Единица времени"
                          onChange={setBeforeDueUnit}
                          options={REMINDER_UNIT_OPTIONS}
                          value={beforeDueUnit}
                        />
                      </div>
                    </div>
                    <p className="text-[13px] leading-[1.4] text-app-text-secondary">
                      Напоминание будет выслано в чат с Milly один раз до её
                      завершения.
                    </p>
                  </>
                ) : null}
              </div>
              <div className="flex flex-col gap-[10px]">
                <div className="flex min-h-[50px] items-center justify-between gap-[15px]">
                  <span className="text-[16px] text-app-text">
                    По расписанию
                  </span>
                  <Switch
                    checked={scheduledEnabled}
                    label="По расписанию"
                    onCheckedChange={handleScheduledEnabledChange}
                  />
                </div>
                {scheduledEnabled ? (
                  <>
                    <div className="flex flex-wrap items-end gap-[10px]">
                      <div className="flex w-[215px] max-w-full shrink-0 flex-col gap-[5px]">
                        <span className="text-[13px] text-app-text-secondary">
                          Повторять
                        </span>
                        <SelectField
                          ariaLabel="Повторять"
                          onChange={setScheduledIntervalDays}
                          options={REMINDER_INTERVAL_OPTIONS}
                          value={scheduledIntervalDays}
                        />
                      </div>
                      <div className="flex w-[114px] shrink-0 flex-col gap-[5px]">
                        <span className="text-[13px] text-app-text-secondary">
                          Время
                        </span>
                        <TimeInput
                          ariaLabel="Время"
                          className="h-12"
                          onChange={setScheduledTime}
                          value={scheduledTime}
                        />
                      </div>
                    </div>
                    <p className="text-[13px] leading-[1.4] text-app-text-secondary">
                      Напоминание по расписанию будет высылаться в чат с Milly
                      каждый заданный промежуток времени.
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <BottomSheetPrimaryAction
        className="mt-[15px]"
        disabled={isApplyDisabled}
        onClick={handleApply}
      >
        Применить
      </BottomSheetPrimaryAction>
    </div>
  );
}
