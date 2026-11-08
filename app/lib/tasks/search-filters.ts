import type { Priority, TaskListQuery, TaskResponse } from "./types";

export type SearchStatusFilter = "all" | "open" | "completed";
export type SearchRecurrenceFilter = "all" | "regular" | "one_off";
export type SearchStatusValue = Exclude<SearchStatusFilter, "all">;
export type SearchRecurrenceValue = Exclude<SearchRecurrenceFilter, "all">;

export type FiltersStep =
  | "all"
  | "project"
  | "labels"
  | "priority"
  | "status"
  | "recurrence"
  | "date";

export interface FilterChoiceOption<T extends string> {
  value: T;
  label: string;
}

export interface SearchTaskFilters {
  date: string | null;
  projectIds: number[];
  priorities: Priority[];
  status: SearchStatusFilter;
  recurrence: SearchRecurrenceFilter;
  labelIds: number[];
}

export const STATUS_FILTER_OPTIONS: readonly FilterChoiceOption<SearchStatusValue>[] = [
  { value: "completed", label: "Выполненные" },
  { value: "open", label: "Не выполненные" },
] as const;

export const RECURRENCE_FILTER_OPTIONS: readonly FilterChoiceOption<SearchRecurrenceValue>[] = [
  { value: "regular", label: "Ежедневные" },
  { value: "one_off", label: "Разовые" },
] as const;

export function createDefaultSearchFilters(): SearchTaskFilters {
  return {
    date: null,
    projectIds: [],
    priorities: [],
    status: "all",
    recurrence: "all",
    labelIds: [],
  };
}

export function resolveFilterDate(filters: SearchTaskFilters, today: string): string {
  return filters.date ?? today;
}

export function buildSearchTaskListQuery(
  filters: SearchTaskFilters,
  today: string,
  query: string,
): TaskListQuery {
  return {
    date: resolveFilterDate(filters, today),
    project_ids: filters.projectIds,
    priorities: filters.priorities,
    status: filters.status,
    recurrence: filters.recurrence,
    limit: 100,
    q: query.trim() === "" ? undefined : query.trim(),
  };
}

export function normalizeFilterDate(date: string, today: string): string | null {
  return date === today ? null : date;
}

export function isDateFilterActive(filters: SearchTaskFilters): boolean {
  return filters.date !== null;
}

export function isProjectFilterActive(filters: SearchTaskFilters): boolean {
  return filters.projectIds.length > 0;
}

export function isLabelsFilterActive(filters: SearchTaskFilters): boolean {
  return filters.labelIds.length > 0;
}

export function isPriorityFilterActive(filters: SearchTaskFilters): boolean {
  return filters.priorities.length > 0;
}

export function isStatusFilterActive(filters: SearchTaskFilters): boolean {
  return filters.status !== "all";
}

export function isRecurrenceFilterActive(filters: SearchTaskFilters): boolean {
  return filters.recurrence !== "all";
}

export function countActiveFilterGroups(filters: SearchTaskFilters): number {
  return [
    isProjectFilterActive(filters),
    isLabelsFilterActive(filters),
    isPriorityFilterActive(filters),
    isStatusFilterActive(filters),
    isRecurrenceFilterActive(filters),
    isDateFilterActive(filters),
  ].filter(Boolean).length;
}

export function canonicalizeSearchFilters(filters: SearchTaskFilters): SearchTaskFilters {
  return {
    ...filters,
    projectIds: Array.from(new Set(filters.projectIds)).sort((a, b) => a - b),
    priorities: Array.from(new Set(filters.priorities)).sort(),
    labelIds: Array.from(new Set(filters.labelIds)).sort((a, b) => a - b),
  };
}

export function searchFiltersFingerprint(filters: SearchTaskFilters): string {
  return `p:${filters.projectIds.join(",")}|pr:${filters.priorities.join(",")}|s:${filters.status}|r:${filters.recurrence}|l:${filters.labelIds.join(",")}`;
}

export function toggleSelection<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function toggleOptionalValue<T extends string>(
  current: T | "all",
  value: T,
): T | "all" {
  return current === value ? "all" : value;
}

export function pruneMissingIds(
  selected: number[],
  available: readonly number[],
): number[] {
  const availableIds = new Set(available);
  const result: number[] = [];

  for (const id of selected) {
    if (!availableIds.has(id) || result.includes(id)) {
      continue;
    }
    result.push(id);
  }

  return result;
}

export function matchesStatusFilter(
  task: TaskResponse,
  status: SearchStatusFilter,
): boolean {
  if (status === "open") {
    return task.completed_at === null;
  }

  if (status === "completed") {
    return task.completed_at !== null;
  }

  return true;
}

export function matchesLabelFilter(
  task: Pick<TaskResponse, "labels">,
  labelIds: number[],
): boolean {
  if (labelIds.length === 0) {
    return true;
  }

  const taskLabelIds = new Set(task.labels.map((label) => label.id));
  return labelIds.every((id) => taskLabelIds.has(id));
}

export function filterTasksForDisplay(
  tasks: TaskResponse[],
  filters: SearchTaskFilters,
): TaskResponse[] {
  return tasks.filter(
    (task) =>
      matchesStatusFilter(task, filters.status) &&
      matchesLabelFilter(task, filters.labelIds),
  );
}

export function formatProjectsFound(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;

  if (mod100 >= 11 && mod100 <= 14) {
    return `Найдено ${count} проектов`;
  }

  if (mod10 === 1) {
    return `Найдено ${count} проект`;
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return `Найдено ${count} проекта`;
  }

  return `Найдено ${count} проектов`;
}
