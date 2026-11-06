import type { ReactElement } from "react";

import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { Collapsible } from "~/components/ui/collapsible";
import { SelectField } from "~/components/ui/select-field";
import type { SelectOption } from "~/components/ui/select-field";
import { Switch } from "~/components/ui/switch";
import { TimeInput } from "~/components/ui/time-input";
import { isValidTime } from "~/lib/tasks/date-time";
import type { DueUnit } from "~/lib/tasks/quick-task-schema";

const DEFAULT_SCHEDULED_TIME = "14:00";

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
  amountInput: string;
  onChange: (patch: Partial<ReminderDraft>) => void;
  onAmountInputChange: (value: string) => void;
  onApply: (value: ReminderDraft) => void;
  onToggleHaptic?: () => void;
}

export function normalizeReminderDraft(draft: ReminderDraft): ReminderDraft {
  if (isValidTime(draft.scheduledTime)) {
    return draft;
  }

  return { ...draft, scheduledTime: DEFAULT_SCHEDULED_TIME };
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
  amountInput,
  onChange,
  onAmountInputChange,
  onApply,
  onToggleHaptic,
}: RemindersStepProps): ReactElement {
  const parsedAmount = parseAmount(amountInput);
  const isScheduledTimeValid = isValidTime(value.scheduledTime);
  const isApplyDisabled =
    (value.remindersEnabled && value.beforeDueEnabled && parsedAmount === null) ||
    (value.remindersEnabled && value.scheduledEnabled && !isScheduledTimeValid);

  function handleRemindersEnabledChange(checked: boolean) {
    onChange({ remindersEnabled: checked });
    onToggleHaptic?.();
  }

  function handleBeforeDueEnabledChange(checked: boolean) {
    onChange({ beforeDueEnabled: checked });
    onToggleHaptic?.();
  }

  function handleScheduledEnabledChange(checked: boolean) {
    onChange({ scheduledEnabled: checked });
    onToggleHaptic?.();
  }

  function handleApply() {
    if (isApplyDisabled) {
      return;
    }

    onApply(
      normalizeReminderDraft({
        ...value,
        beforeDueAmount: parsedAmount ?? 1,
      }),
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-[59px] items-center justify-between gap-[15px]">
        <span className="text-[16px] text-app-text">Автонапоминания</span>
        <Switch
          checked={value.remindersEnabled}
          label="Автонапоминания"
          onCheckedChange={handleRemindersEnabledChange}
        />
      </div>
      <Collapsible open={value.remindersEnabled}>
        <div className="flex flex-col gap-[5px] pt-[15px]">
          <p className="text-[13px] uppercase text-app-text-secondary">
            НАСТРОЙКИ
          </p>
          <div className="flex flex-col gap-[15px]">
            <div className="flex flex-col">
              <div className="flex h-7 items-center justify-between gap-[15px]">
                <span className="text-[16px] text-app-text">
                  До срока задачи
                </span>
                <Switch
                  checked={value.beforeDueEnabled}
                  className="-my-2"
                  label="До срока задачи"
                  onCheckedChange={handleBeforeDueEnabledChange}
                />
              </div>
              <Collapsible open={value.beforeDueEnabled}>
                <div className="flex flex-col gap-[5px] pt-[10px]">
                  <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                    За сколько до завершения задачи напомнить
                  </p>
                  <div className="flex flex-wrap items-start gap-[15px]">
                    <input
                      aria-label="За сколько до завершения задачи напомнить"
                      className="h-12 w-[114px] shrink-0 rounded-[28px] bg-app-track p-0 text-center text-[15px] font-semibold text-app-accent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
                      inputMode="numeric"
                      onChange={(event) =>
                        onAmountInputChange(
                          event.target.value.replace(/\D/g, ""),
                        )
                      }
                      type="text"
                      value={amountInput}
                    />
                    <div className="w-[215px] max-w-full shrink-0">
                      <SelectField
                        ariaLabel="Единица времени"
                        onChange={(beforeDueUnit) =>
                          onChange({ beforeDueUnit })
                        }
                        options={REMINDER_UNIT_OPTIONS}
                        value={value.beforeDueUnit}
                      />
                    </div>
                  </div>
                  <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                    Напоминание будет выслано в чат с Milly один раз до её
                    завершения.
                  </p>
                </div>
              </Collapsible>
            </div>
            <div className="flex flex-col">
              <div className="flex h-7 items-center justify-between gap-[15px]">
                <span className="text-[16px] text-app-text">
                  По расписанию
                </span>
                <Switch
                  checked={value.scheduledEnabled}
                  className="-my-2"
                  label="По расписанию"
                  onCheckedChange={handleScheduledEnabledChange}
                />
              </div>
              <Collapsible open={value.scheduledEnabled}>
                <div className="flex flex-col gap-[5px] pt-[10px]">
                  <div className="flex flex-wrap items-end gap-[15px]">
                    <div className="flex w-[215px] max-w-full shrink-0 flex-col gap-[5px]">
                      <span className="px-[15px] text-[13px] text-app-text-secondary">
                        Повторять
                      </span>
                      <SelectField
                        ariaLabel="Повторять"
                        onChange={(scheduledIntervalDays) =>
                          onChange({ scheduledIntervalDays })
                        }
                        options={REMINDER_INTERVAL_OPTIONS}
                        value={value.scheduledIntervalDays}
                      />
                    </div>
                    <div className="flex w-[114px] shrink-0 flex-col gap-[5px]">
                      <span className="px-[15px] text-[13px] text-app-text-secondary">
                        Время
                      </span>
                      <TimeInput
                        ariaLabel="Время"
                        onChange={(scheduledTime) =>
                          onChange({ scheduledTime })
                        }
                        size="compact"
                        value={value.scheduledTime}
                      />
                    </div>
                  </div>
                  {isScheduledTimeValid ? null : (
                    <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                      Укажите время
                    </p>
                  )}
                  <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                    Напоминание по расписанию будет высылаться в чат с Milly
                    каждый заданный промежуток времени.
                  </p>
                </div>
              </Collapsible>
            </div>
          </div>
        </div>
      </Collapsible>
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
