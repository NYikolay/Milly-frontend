import type { TaskResponse } from "./types";

export function hasCompletionChanged(
  task: Pick<TaskResponse, "completed_at">,
  completedAt: string | null,
): boolean {
  return (task.completed_at !== null) !== (completedAt !== null);
}

export function applyCompletionFields(
  task: TaskResponse,
  completedAt: string | null,
): TaskResponse {
  return {
    ...task,
    completed_at: completedAt,
    updated_at: completedAt ?? task.updated_at,
  };
}

export function replaceTaskInList(
  tasks: TaskResponse[],
  updatedTask: TaskResponse,
): TaskResponse[] {
  return tasks.map((task) =>
    task.id === updatedTask.id ? updatedTask : task,
  );
}
