import {
  formatZonedDate,
  formatZonedTime,
  zonedDateTimeToIso,
} from "./date-time";
import type { TaskResponse, TaskUpdateInput } from "./types";

export interface TaskDueDraft {
  date: string;
  time: string;
  isRecurring: boolean;
}

export function getTaskDueDraft(
  task: Pick<TaskResponse, "due_at" | "recurrence">,
  timeZone: string,
): TaskDueDraft {
  return {
    date: formatZonedDate(task.due_at, timeZone),
    time: formatZonedTime(task.due_at, timeZone),
    isRecurring: task.recurrence !== "one_off",
  };
}

export function buildTaskDueUpdate(
  task: Pick<TaskResponse, "due_at" | "recurrence">,
  draft: TaskDueDraft,
  timeZone: string,
): TaskUpdateInput | null {
  const dueAt = zonedDateTimeToIso(draft.date, draft.time, timeZone);
  const update: TaskUpdateInput = {};

  if (new Date(task.due_at).getTime() !== new Date(dueAt).getTime()) {
    update.due_at = dueAt;
  }

  if (draft.isRecurring !== (task.recurrence !== "one_off")) {
    update.recurrence = draft.isRecurring ? "regular" : "one_off";
  }

  return Object.keys(update).length === 0 ? null : update;
}
