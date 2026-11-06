import type { TaskResponse, TodayProgressResponse } from "./types";

export interface TodayTasksData {
  tasks: TaskResponse[];
  progress: TodayProgressResponse;
}

export function todayTasksQueryKey(timeZone: string, date: string) {
  return ["tasks", "today", timeZone, date] as const;
}

export function applyTaskCompletion(
  data: TodayTasksData | undefined,
  taskId: number,
  completedAt: string | null,
): TodayTasksData | undefined {
  if (!data) return data;

  const current = data.tasks.find((task) => task.id === taskId);

  if (!current) return data;

  const wasCompleted = current.completed_at !== null;
  const isCompleted = completedAt !== null;

  if (wasCompleted === isCompleted) return data;

  const tasks = data.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          completed_at: completedAt,
          updated_at: completedAt ?? task.updated_at,
        }
      : task,
  );
  const completed = Math.min(
    data.progress.total,
    Math.max(0, data.progress.completed + (isCompleted ? 1 : -1)),
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
