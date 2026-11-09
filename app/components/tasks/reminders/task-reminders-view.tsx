import { useState } from "react";
import type { ReactElement } from "react";

import { SelectField } from "~/components/ui/select-field";
import { Switch } from "~/components/ui/switch";
import { TimeInput } from "~/components/ui/time-input";
import { isValidTime } from "~/lib/tasks/date-time";
import type { DueUnit } from "~/lib/tasks/quick-task-schema";
import {
  buildTaskRemindersUpdate,
  canSaveRemindersUpdate,
  getReminderIntervalOptions,
  getTaskRemindersDraft,
  isBeforeDueInPast,
  parseReminderAmount,
  REMINDER_UNIT_OPTIONS,
} from "~/lib/tasks/reminders";
import type { TaskRemindersDraft } from "~/lib/tasks/reminders";
import type { TaskResponse, TaskUpdateInput } from "~/lib/tasks/types";

export function enableRemindersDraft(
  draft: TaskRemindersDraft,
  amountInput: string,
): TaskRemindersDraft {
  if (draft.beforeDueEnabled || draft.scheduledEnabled) {
    return { ...draft, remindersEnabled: true };
  }

  return {
    ...draft,
    remindersEnabled: true,
    beforeDueEnabled: true,
    beforeDueAmount:
      parseReminderAmount(amountInput) === null ? 1 : draft.beforeDueAmount,
  };
}

export interface TaskRemindersViewProps {
  task: TaskResponse;
  error: string | null;
  onSave: (input: TaskUpdateInput) => void;
  onRetry: () => void;
  onToggleHaptic?: () => void;
  now?: number;
}

export function TaskRemindersView({
  task,
  error,
  onSave,
  onRetry,
  onToggleHaptic,
  now,
}: TaskRemindersViewProps): ReactElement {
  const [draft, setDraft] = useState<TaskRemindersDraft>(() =>
    getTaskRemindersDraft(task),
  );
  const [amountInput, setAmountInput] = useState(() =>
    String(getTaskRemindersDraft(task).beforeDueAmount),
  );
  const currentTime = now ?? Date.now();

  function commit(next: TaskRemindersDraft) {
    setDraft(next);

    const input = buildTaskRemindersUpdate(next);

    if (!canSaveRemindersUpdate(input, task.due_at, next, now ?? Date.now())) {
      return;
    }

    onSave(input);
  }

  function handleMasterChange(checked: boolean) {
    onToggleHaptic?.();

    if (!checked) {
      commit({ ...draft, remindersEnabled: false });
      return;
    }

    if (
      !draft.beforeDueEnabled &&
      !draft.scheduledEnabled &&
      parseReminderAmount(amountInput) === null
    ) {
      setAmountInput("1");
    }

    commit(enableRemindersDraft(draft, amountInput));
  }

  function handleBeforeDueEnabledChange(checked: boolean) {
    onToggleHaptic?.();

    const next = { ...draft, beforeDueEnabled: checked };

    commit({
      ...next,
      remindersEnabled:
        checked || next.scheduledEnabled ? next.remindersEnabled : false,
    });
  }

  function handleScheduledEnabledChange(checked: boolean) {
    onToggleHaptic?.();

    const next = { ...draft, scheduledEnabled: checked };

    commit({
      ...next,
      remindersEnabled:
        checked || next.beforeDueEnabled ? next.remindersEnabled : false,
    });
  }

  function handleAmountChange(value: string) {
    const digits = value.replace(/\D/g, "");

    setAmountInput(digits);

    const amount = parseReminderAmount(digits);

    if (amount === null) {
      setDraft({ ...draft, beforeDueAmount: -1 });
      return;
    }

    if (amount !== draft.beforeDueAmount) {
      commit({ ...draft, beforeDueAmount: amount });
      return;
    }

    setDraft({ ...draft, beforeDueAmount: amount });
  }

  function handleUnitChange(unit: DueUnit) {
    onToggleHaptic?.();

    if (unit !== draft.beforeDueUnit) {
      commit({ ...draft, beforeDueUnit: unit });
    }
  }

  function handleIntervalChange(days: number) {
    onToggleHaptic?.();

    if (days !== draft.scheduledIntervalDays) {
      commit({ ...draft, scheduledIntervalDays: days });
    }
  }

  function handleTimeChange(value: string) {
    setDraft({ ...draft, scheduledTime: value });

    if (isValidTime(value) && value !== draft.scheduledTime) {
      commit({ ...draft, scheduledTime: value });
    }
  }

  const isAmountValid = parseReminderAmount(amountInput) !== null;
  const isTimeValid = isValidTime(draft.scheduledTime);
  const isBeforeDuePast =
    draft.beforeDueEnabled &&
    isAmountValid &&
    isBeforeDueInPast(
      task.due_at,
      draft.beforeDueAmount,
      draft.beforeDueUnit,
      currentTime,
    );

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="px-[15px] py-[15px]">
        <h1 className="break-words text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">
          Автоматические напоминания
        </h1>
      </div>

      <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
        Milly напомнит о задаче в Telegram по заданным правилам.
      </p>

      {error ? (
        <div className="flex flex-col gap-[5px] px-[15px]" role="alert">
          <p className="text-[13px] leading-[1.4] text-app-destructive">
            {error}
          </p>
          <button
            className="self-start text-[15px] font-semibold text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70"
            onClick={onRetry}
            type="button"
          >
            Повторить
          </button>
        </div>
      ) : null}

      <div className="flex h-[58px] items-center justify-between gap-[30px] rounded-[25px] bg-app-card px-[15px]">
        <span className="text-[15px] leading-[1.3] text-app-text">
          Автонапоминания
        </span>
        <Switch
          checked={draft.remindersEnabled}
          label="Автонапоминания"
          onCheckedChange={handleMasterChange}
        />
      </div>

      {draft.remindersEnabled ? (
        <div className="flex flex-col gap-2 pb-[15px] pt-[15px]">
          <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary uppercase">
            НАСТРОЙКИ
          </p>

          <div className="flex flex-col gap-[23px]">
            <div className="flex flex-col gap-[5px]">
              <div className="flex flex-col gap-[15px] rounded-[25px] bg-app-card p-[15px]">
                <div className="flex h-7 items-center justify-between gap-[30px]">
                  <span className="text-[15px] leading-[1.3] text-app-text">
                    До срока задачи
                  </span>
                  <Switch
                    checked={draft.beforeDueEnabled}
                    className="-my-2"
                    label="До срока задачи"
                    onCheckedChange={handleBeforeDueEnabledChange}
                  />
                </div>

                {draft.beforeDueEnabled ? (
                  <div className="flex flex-col gap-[5px]">
                    <span className="text-[13px] leading-[1.4] text-app-text-secondary">
                      За сколько до завершения задачи напомнить
                    </span>
                    <div className="flex flex-wrap items-start gap-[15px]">
                      <input
                        aria-invalid={!isAmountValid || undefined}
                        aria-label="За сколько до завершения задачи напомнить"
                        className="h-12 w-[114px] shrink-0 rounded-[28px] bg-app-track p-0 text-center text-[15px] font-semibold text-app-accent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
                        inputMode="numeric"
                        onChange={(event) =>
                          handleAmountChange(event.target.value)
                        }
                        type="text"
                        value={amountInput}
                      />
                      <div className="w-[215px] max-w-full shrink-0">
                        <SelectField
                          ariaLabel="Единица времени"
                          onChange={handleUnitChange}
                          options={REMINDER_UNIT_OPTIONS}
                          value={draft.beforeDueUnit}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {draft.beforeDueEnabled && !isAmountValid ? (
                <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                  Укажите количество
                </p>
              ) : null}

              {isBeforeDuePast ? (
                <p className="px-[15px] text-[13px] leading-[1.4] text-app-destructive">
                  Напоминание уже прошло
                </p>
              ) : null}

              {draft.beforeDueEnabled ? (
                <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                  Напоминание будет выслано в чат с Milly один раз до её
                  завершения.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-[5px]">
              <div className="flex flex-col gap-[15px] rounded-[25px] bg-app-card p-[15px]">
                <div className="flex h-7 items-center justify-between gap-[30px]">
                  <span className="text-[15px] leading-[1.3] text-app-text">
                    По расписанию
                  </span>
                  <Switch
                    checked={draft.scheduledEnabled}
                    className="-my-2"
                    label="По расписанию"
                    onCheckedChange={handleScheduledEnabledChange}
                  />
                </div>

                {draft.scheduledEnabled ? (
                  <div className="flex flex-wrap items-end gap-[15px]">
                    <div className="flex w-[215px] max-w-full shrink-0 flex-col gap-[5px]">
                      <span className="text-[13px] leading-[1.4] text-app-text-secondary">
                        Повторять
                      </span>
                      <SelectField
                        ariaLabel="Повторять"
                        onChange={handleIntervalChange}
                        options={getReminderIntervalOptions(
                          draft.scheduledIntervalDays,
                        )}
                        value={draft.scheduledIntervalDays}
                      />
                    </div>
                    <div className="flex w-[114px] shrink-0 flex-col gap-[5px]">
                      <span className="text-[13px] leading-[1.4] text-app-text-secondary">
                        Время
                      </span>
                      <TimeInput
                        ariaLabel="Время"
                        onChange={handleTimeChange}
                        size="compact"
                        value={draft.scheduledTime}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {draft.scheduledEnabled && !isTimeValid ? (
                <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                  Укажите время
                </p>
              ) : null}

              {draft.scheduledEnabled ? (
                <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                  Напоминание по расписанию будет высылаться в чат с Milly
                  каждый заданный промежуток времени.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
          Включите автонапоминания для настройки.
        </p>
      )}
    </div>
  );
}
