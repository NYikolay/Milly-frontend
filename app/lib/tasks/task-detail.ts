import type { LabelResponse } from "~/lib/labels/types";

import {
  formatDueChip,
  formatZonedDate,
  formatZonedDateTime,
  formatZonedTime,
} from "./date-time";
import { PRIORITY_OPTIONS } from "./priority";
import type {
  LabelRef,
  Priority,
  ReminderResponse,
  TaskResponse,
} from "./types";

function pluralizeRu(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;

  return many;
}

function formatBeforeDue(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "В момент срока";

  if (offsetMinutes < 60) {
    return `За ${offsetMinutes} ${pluralizeRu(offsetMinutes, "минуту", "минуты", "минут")}`;
  }

  if (offsetMinutes < 1440 && offsetMinutes % 60 === 0) {
    const hours = offsetMinutes / 60;

    return `За ${hours} ${pluralizeRu(hours, "час", "часа", "часов")}`;
  }

  if (offsetMinutes >= 1440 && offsetMinutes % 1440 === 0) {
    const days = offsetMinutes / 1440;

    return `За ${days} ${pluralizeRu(days, "день", "дня", "дней")}`;
  }

  return `За ${offsetMinutes} ${pluralizeRu(offsetMinutes, "минуту", "минуты", "минут")}`;
}

function formatScheduled(rule: ReminderResponse): string {
  const time = rule.time_of_day?.slice(0, 5).trim() ?? "";

  if (time.length === 0) return "По расписанию";
  if (rule.interval_days === 1) return `Каждый день в ${time}`;
  if (rule.interval_days !== null && rule.interval_days >= 2) {
    return `Каждые ${rule.interval_days} ${pluralizeRu(rule.interval_days, "день", "дня", "дней")} в ${time}`;
  }

  return "По расписанию";
}

export function formatTaskDueValue(
  task: Pick<TaskResponse, "due_at">,
  timeZone: string,
  now: Date,
): string {
  return formatDueChip(
    formatZonedDate(task.due_at, timeZone),
    formatZonedTime(task.due_at, timeZone),
    timeZone,
    now,
  );
}

export function formatTaskCreatedAt(
  createdAt: string,
  timeZone: string,
): string {
  return formatZonedDateTime(createdAt, timeZone);
}

export function formatTaskReminderSummary(
  task: Pick<TaskResponse, "reminders_enabled" | "reminders">,
): string {
  if (!task.reminders_enabled) return "Нет";

  const enabled = task.reminders.filter((rule) => rule.enabled);

  if (enabled.length === 0) return "Нет";

  const [first, ...rest] = enabled;
  const summary =
    first.kind === "before_due"
      ? first.offset_minutes !== null
        ? formatBeforeDue(first.offset_minutes)
        : "До срока"
      : formatScheduled(first);

  return rest.length > 0 ? `${summary} + ${rest.length}` : summary;
}

export function formatTaskLabelsSummary(labels: readonly LabelRef[]): string {
  const [first, ...rest] = labels;

  if (!first) return "Нет";

  return rest.length > 0 ? `${first.name} + ${rest.length}` : first.name;
}

export function findTaskLabelColor(
  labels: readonly LabelRef[],
  labelColors: readonly LabelResponse[],
): string | null {
  const first = labels[0];

  if (!first) return null;

  const match = labelColors.find((item) => item.id === first.id);

  return match ? match.color.hex : null;
}

export function formatTaskPriority(priority: Priority): string {
  const option = PRIORITY_OPTIONS.find((item) => item.value === priority);

  return option ? option.label : priority;
}
