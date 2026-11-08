import { applyCompletionFields, hasCompletionChanged } from "./completion-cache";
import { normalizeCompleted } from "./today-tasks";
import type { TaskResponse, TodayProgressResponse } from "./types";

export interface TodayTasksData {
  tasks: TaskResponse[];
  progress: TodayProgressResponse;
}

export function todayTasksQueryKey(timeZone: string, date: string) {
  return ["tasks", "today", timeZone, date] as const;
}

export function todayProgressQueryKey(timeZone: string, date: string) {
  return ["tasks", "today", "progress", timeZone, date] as const;
}

export function applyTaskCompletion(
  data: TodayTasksData | undefined,
  taskId: number,
  completedAt: string | null,
): TodayTasksData | undefined {
  if (!data) return data;

  const current = data.tasks.find((task) => task.id === taskId);

  if (!current) return data;

  if (!hasCompletionChanged(current, completedAt)) return data;

  const tasks = data.tasks.map((task) =>
    task.id === taskId ? applyCompletionFields(task, completedAt) : task,
  );
  const completed = normalizeCompleted(
    data.progress.total,
    data.progress.completed + (completedAt !== null ? 1 : -1),
  );

  return {
    tasks,
    progress: {
      ...data.progress,
      completed,
      remaining: data.progress.total - completed,
    },
  };
}
