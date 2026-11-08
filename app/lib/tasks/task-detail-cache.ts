import type { TaskResponse } from "./types";

export function taskDetailQueryKey(taskId: number) {
  return ["tasks", "detail", taskId] as const;
}

export function applyTaskDetailCompletion(
  task: TaskResponse | undefined,
  completedAt: string | null,
): TaskResponse | undefined {
  if (!task) return task;

  const wasCompleted = task.completed_at !== null;
  const isCompleted = completedAt !== null;

  if (wasCompleted === isCompleted) return task;

  return {
    ...task,
    completed_at: completedAt,
    updated_at: completedAt ?? task.updated_at,
  };
}
