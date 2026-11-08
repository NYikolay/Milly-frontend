import { applyCompletionFields, hasCompletionChanged } from "./completion-cache";
import type { TaskResponse } from "./types";

export function taskDetailQueryKey(taskId: number) {
  return ["tasks", "detail", taskId] as const;
}

export function applyTaskDetailCompletion(
  task: TaskResponse | undefined,
  completedAt: string | null,
): TaskResponse | undefined {
  if (!task || !hasCompletionChanged(task, completedAt)) return task;

  return applyCompletionFields(task, completedAt);
}
