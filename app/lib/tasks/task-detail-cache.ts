import { applyCompletionFields, hasCompletionChanged } from "./completion-cache";
import type { LabelRef, Priority, TaskResponse } from "./types";

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

export function applyTaskDetailPriority(
  task: TaskResponse | undefined,
  priority: Priority,
): TaskResponse | undefined {
  if (!task || task.priority === priority) return task;

  return { ...task, priority };
}

export function applyTaskDetailProject(
  task: TaskResponse | undefined,
  projectId: number | null,
): TaskResponse | undefined {
  if (!task || task.project_id === projectId) return task;

  return { ...task, project_id: projectId };
}

function hasSameLabels(
  current: readonly LabelRef[],
  next: readonly LabelRef[],
): boolean {
  return (
    current.length === next.length &&
    current.every(
      (label, index) =>
        label.id === next[index].id && label.name === next[index].name,
    )
  );
}

export function applyTaskDetailLabels(
  task: TaskResponse | undefined,
  labels: readonly LabelRef[],
): TaskResponse | undefined {
  if (!task || hasSameLabels(task.labels, labels)) return task;

  return { ...task, labels: [...labels] };
}
