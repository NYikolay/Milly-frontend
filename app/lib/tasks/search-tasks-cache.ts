import type { TaskListResponse } from "./types";

export function searchTasksQueryKey(
  timeZone: string,
  date: string,
  query: string,
) {
  return ["tasks", "search", timeZone, date, query] as const;
}

export function applySearchTaskCompletion(
  data: TaskListResponse | undefined,
  taskId: number,
  completedAt: string | null,
): TaskListResponse | undefined {
  if (!data) return data;

  const current = data.items.find((task) => task.id === taskId);

  if (!current) return data;

  const wasCompleted = current.completed_at !== null;
  const isCompleted = completedAt !== null;

  if (wasCompleted === isCompleted) return data;

  return {
    ...data,
    items: data.items.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completed_at: completedAt,
            updated_at: completedAt ?? task.updated_at,
          }
        : task,
    ),
  };
}
