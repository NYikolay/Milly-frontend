import { ApiError } from "~/lib/api/errors";

import { formatZonedDate, formatZonedToday } from "./date-time";
import type { TaskResponse } from "./types";

export const TASK_PAST_DUE_MESSAGE =
  "Нельзя вернуть в работу задачу с прошедшей датой. Сначала измените дату задачи.";

const TASK_PAST_DUE_ERROR_MESSAGE = "Task due date is in the past";

export function isDueDateInPast(
  task: Pick<TaskResponse, "due_at">,
  timeZone: string,
  now: Date,
): boolean {
  return (
    formatZonedDate(task.due_at, timeZone) < formatZonedToday(now, timeZone)
  );
}

export function shouldBlockTaskReactivation(
  task: Pick<TaskResponse, "due_at" | "completed_at" | "series_id">,
  nextCompleted: boolean,
  timeZone: string,
  now: Date,
): boolean {
  return (
    !nextCompleted &&
    task.completed_at !== null &&
    task.series_id === null &&
    isDueDateInPast(task, timeZone, now)
  );
}

export function isPastDueUncompleteError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    (error.message === TASK_PAST_DUE_ERROR_MESSAGE ||
      error.description === TASK_PAST_DUE_MESSAGE)
  );
}
