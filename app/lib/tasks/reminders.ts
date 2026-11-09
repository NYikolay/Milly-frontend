import { isValidTime } from "./date-time";
import { pluralizeRu } from "./pluralize";
import type { DueUnit } from "./quick-task-schema";
import type { ReminderInput, TaskResponse, TaskUpdateInput } from "./types";

export interface ReminderRuleDraft {
  beforeDueEnabled: boolean;
  beforeDueAmount: number;
  beforeDueUnit: DueUnit;
  scheduledEnabled: boolean;
  scheduledIntervalDays: number;
  scheduledTime: string;
}

export type TaskRemindersDraft = ReminderRuleDraft & {
  remindersEnabled: boolean;
};

export type ReminderDraft = TaskRemindersDraft;

export const DEFAULT_REMINDER_TIME = "14:00";

export const MAX_REMINDER_OFFSET_MINUTES = 525600;

export const TASK_REMINDERS_SAVE_ERROR =
  "Не удалось сохранить напоминания. Попробуйте ещё раз.";

export const REMINDER_UNIT_OPTIONS: { value: DueUnit; label: string }[] = [
  { value: "minutes", label: "Минут" },
  { value: "hours", label: "Часов" },
  { value: "days", label: "Дней" },
];

export const REMINDER_INTERVAL_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Каждый день" },
  { value: 2, label: "Каждые 2 дня" },
  { value: 3, label: "Каждые 3 дня" },
  { value: 4, label: "Каждые 4 дня" },
  { value: 7, label: "Каждую неделю" },
];

const DUE_UNIT_MINUTES: Record<DueUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
};

const MS_PER_MINUTE = 60_000;

export function isBeforeDueInPast(
  dueAt: string,
  amount: number,
  unit: DueUnit,
  now: number,
): boolean {
  if (!Number.isInteger(amount) || amount < 0) {
    return false;
  }

  const dueTime = Date.parse(dueAt);

  if (Number.isNaN(dueTime)) {
    return false;
  }

  return dueTime - amount * DUE_UNIT_MINUTES[unit] * MS_PER_MINUTE <= now;
}

function splitOffsetMinutes(offsetMinutes: number): {
  amount: number;
  unit: DueUnit;
} {
  if (offsetMinutes === 0) return { amount: 0, unit: "minutes" };
  if (offsetMinutes % 1440 === 0) {
    return { amount: offsetMinutes / 1440, unit: "days" };
  }
  if (offsetMinutes % 60 === 0) {
    return { amount: offsetMinutes / 60, unit: "hours" };
  }

  return { amount: offsetMinutes, unit: "minutes" };
}

export function getTaskRemindersDraft(
  task: Pick<TaskResponse, "reminders_enabled" | "reminders">,
): TaskRemindersDraft {
  const beforeDue = task.reminders.find((rule) => rule.kind === "before_due");
  const scheduled = task.reminders.find((rule) => rule.kind === "scheduled");
  const { amount, unit } = splitOffsetMinutes(beforeDue?.offset_minutes ?? 60);
  const scheduledTime = scheduled?.time_of_day?.slice(0, 5) ?? "";

  return {
    remindersEnabled: task.reminders_enabled,
    beforeDueEnabled: beforeDue?.enabled ?? false,
    beforeDueAmount: amount,
    beforeDueUnit: unit,
    scheduledEnabled: scheduled?.enabled ?? false,
    scheduledIntervalDays: scheduled?.interval_days ?? 1,
    scheduledTime: isValidTime(scheduledTime)
      ? scheduledTime
      : DEFAULT_REMINDER_TIME,
  };
}

export function buildReminderRules(draft: ReminderRuleDraft): ReminderInput[] {
  const reminders: ReminderInput[] = [];

  if (draft.beforeDueEnabled) {
    const offsetMinutes =
      draft.beforeDueAmount * DUE_UNIT_MINUTES[draft.beforeDueUnit];

    reminders.push({
      kind: "before_due",
      enabled: true,
      offset_minutes: Math.min(
        Math.max(0, offsetMinutes),
        MAX_REMINDER_OFFSET_MINUTES,
      ),
    });
  }

  if (draft.scheduledEnabled) {
    reminders.push({
      kind: "scheduled",
      enabled: true,
      interval_days: draft.scheduledIntervalDays,
      time_of_day: `${draft.scheduledTime}:00`,
    });
  }

  return reminders;
}

export function buildTaskRemindersUpdate(
  draft: TaskRemindersDraft,
): TaskUpdateInput | null {
  if (!draft.beforeDueEnabled && !draft.scheduledEnabled) {
    return { reminders_enabled: false, reminders: [] };
  }

  if (!draft.remindersEnabled) {
    return { reminders_enabled: false };
  }

  if (
    draft.beforeDueEnabled &&
    (!Number.isInteger(draft.beforeDueAmount) || draft.beforeDueAmount < 0)
  ) {
    return null;
  }

  if (draft.scheduledEnabled && !isValidTime(draft.scheduledTime)) {
    return null;
  }

  return { reminders_enabled: true, reminders: buildReminderRules(draft) };
}

export function canSaveRemindersUpdate(
  input: TaskUpdateInput | null,
  dueAt: string,
  draft: ReminderRuleDraft,
  now: number,
): input is TaskUpdateInput {
  if (!input) {
    return false;
  }

  const includesBeforeDue = input.reminders?.some(
    (rule) => rule.kind === "before_due",
  );

  return (
    !includesBeforeDue ||
    !isBeforeDueInPast(dueAt, draft.beforeDueAmount, draft.beforeDueUnit, now)
  );
}

export function getReminderIntervalOptions(
  intervalDays: number,
): { value: number; label: string }[] {
  if (
    REMINDER_INTERVAL_OPTIONS.some((option) => option.value === intervalDays)
  ) {
    return [...REMINDER_INTERVAL_OPTIONS];
  }

  return [
    ...REMINDER_INTERVAL_OPTIONS,
    {
      value: intervalDays,
      label: `Каждые ${intervalDays} ${pluralizeRu(intervalDays, "день", "дня", "дней")}`,
    },
  ];
}

export function parseReminderAmount(input: string): number | null {
  if (!/^\d+$/.test(input)) {
    return null;
  }

  const amount = Number.parseInt(input, 10);

  if (
    !Number.isSafeInteger(amount) ||
    amount > MAX_REMINDER_OFFSET_MINUTES
  ) {
    return null;
  }

  return amount;
}
