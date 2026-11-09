import { zonedDateTimeToIso } from "./date-time";
import type { QuickTaskDraft } from "./quick-task-schema";
import { buildReminderRules } from "./reminders";
import type {
  ReminderInput,
  SeriesCreateInput,
  TaskCreateInput,
} from "./types";

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

  const reminders = buildReminderRules(draft);

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
    project_id: draft.projectId,
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
    project_id: draft.projectId,
    label_ids: dedupeLabelIds(draft.labelIds),
    reminders_enabled: enabled,
    reminders,
  };
}
