import { ApiError } from "~/lib/api/errors";

import type { TaskResponse } from "./types";

export const TASK_PAST_DUE_MESSAGE =
  "Нельзя вернуть в работу задачу с прошедшей датой. Сначала измените дату задачи.";

const TASK_PAST_DUE_ERROR_MESSAGE = "Task due date is in the past";

export function isDueTimeInPast(
  task: Pick<TaskResponse, "due_at">,
  now: Date,
): boolean {
  return new Date(task.due_at).getTime() <= now.getTime();
}

export function shouldBlockTaskReactivation(
  task: Pick<TaskResponse, "due_at" | "completed_at">,
  nextCompleted: boolean,
  now: Date,
): boolean {
  return (
    !nextCompleted &&
    task.completed_at !== null &&
    isDueTimeInPast(task, now)
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
