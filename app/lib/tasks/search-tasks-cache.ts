import { applyCompletionFields, hasCompletionChanged } from "./completion-cache";
import {
  canonicalizeSearchFilters,
  searchFiltersFingerprint,
  type SearchTaskFilters,
} from "./search-filters";
import type { TaskListResponse } from "./types";

export function searchTasksQueryKey(
  timeZone: string,
  date: string,
  query: string,
  filters: SearchTaskFilters,
) {
  return [
    "tasks",
    "search",
    timeZone,
    date,
    query,
    searchFiltersFingerprint(canonicalizeSearchFilters(filters)),
  ] as const;
}

export function applySearchTaskCompletion(
  data: TaskListResponse | undefined,
  taskId: number,
  completedAt: string | null,
): TaskListResponse | undefined {
  if (!data) return data;

  const current = data.items.find((task) => task.id === taskId);

  if (!current) return data;

  if (!hasCompletionChanged(current, completedAt)) return data;

  return {
    ...data,
    items: data.items.map((task) =>
      task.id === taskId ? applyCompletionFields(task, completedAt) : task,
    ),
  };
}
