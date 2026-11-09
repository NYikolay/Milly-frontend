import type { TaskResponse } from "./types";

export function isTaskOverdue(
  task: Pick<TaskResponse, "due_at" | "completed_at">,
  now: Date,
): boolean {
  return (
    task.completed_at === null &&
    new Date(task.due_at).getTime() < now.getTime()
  );
}
