import { zonedDateTimeToIso } from "./date-time";
import type { DueUnit, QuickTaskDraft } from "./quick-task-schema";
import type {
  ReminderInput,
  SeriesCreateInput,
  TaskCreateInput,
} from "./types";

const MAX_OFFSET_MINUTES = 525600;

const DUE_UNIT_MINUTES: Record<DueUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
};

function dedupeLabelIds(labelIds: number[]): number[] {
  return [...new Set(labelIds)];
}

function toTimeOfDay(time: string): string {
  return `${time}:00`;
}

export function buildReminderInputs(draft: QuickTaskDraft): {
  enabled: boolean;
  reminders: ReminderInput[];
} {
  if (!draft.remindersEnabled) {
    return { enabled: false, reminders: [] };
  }

  const reminders: ReminderInput[] = [];

  if (draft.beforeDueEnabled) {
    const offsetMinutes =
      draft.beforeDueAmount * DUE_UNIT_MINUTES[draft.beforeDueUnit];

    reminders.push({
      kind: "before_due",
      enabled: true,
      offset_minutes: Math.min(Math.max(1, offsetMinutes), MAX_OFFSET_MINUTES),
    });
  }

  if (draft.scheduledEnabled) {
    reminders.push({
      kind: "scheduled",
      enabled: true,
      interval_days: draft.scheduledIntervalDays,
      time_of_day: toTimeOfDay(draft.scheduledTime),
    });
  }

  if (reminders.length === 0) {
    return { enabled: false, reminders: [] };
  }

  return { enabled: true, reminders };
}

export function toTaskCreateInput(
  draft: QuickTaskDraft,
  timeZone: string,
): TaskCreateInput {
  const { enabled, reminders } = buildReminderInputs(draft);

  return {
    title: draft.title.trim(),
    due_at: zonedDateTimeToIso(draft.dueDate, draft.dueTime, timeZone),
    priority: draft.priority,
    label_ids: dedupeLabelIds(draft.labelIds),
    reminders_enabled: enabled,
    reminders,
  };
}

export function toSeriesCreateInput(
  draft: QuickTaskDraft,
  timeZone: string,
): SeriesCreateInput {
  const { enabled, reminders } = buildReminderInputs(draft);

  return {
    title: draft.title.trim(),
    priority: draft.priority,
    frequency: "daily",
    time_of_day: toTimeOfDay(draft.dueTime),
    timezone: timeZone,
    starts_on: draft.dueDate,
    label_ids: dedupeLabelIds(draft.labelIds),
    reminders_enabled: enabled,
    reminders,
  };
}
