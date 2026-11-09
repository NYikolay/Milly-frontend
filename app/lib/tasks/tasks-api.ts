import { apiRequest } from "~/lib/api/client";

import type {
  SeriesCreateInput,
  SeriesResponse,
  TaskCreateInput,
  TaskListQuery,
  TaskListResponse,
  TaskResponse,
  TaskUpdateInput,
  TodayProgressResponse,
} from "./types";

export function createTask(
  input: TaskCreateInput,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>("/tasks", {
    method: "POST",
    body: input,
    signal,
  });
}

export function createSeries(
  input: SeriesCreateInput,
  signal?: AbortSignal,
): Promise<SeriesResponse> {
  return apiRequest<SeriesResponse>("/task-series", {
    method: "POST",
    body: input,
    signal,
  });
}

function buildTaskListPath(query: TaskListQuery): string {
  const params = new URLSearchParams();

  if (query.date !== undefined) params.set("date", query.date);
  if (query.project_ids !== undefined && query.project_ids.length > 0) {
    for (const projectId of [...query.project_ids].sort((a, b) => a - b)) {
      params.append("project_ids", String(projectId));
    }
  }
  if (query.priorities !== undefined && query.priorities.length > 0) {
    for (const priority of [...query.priorities].sort()) {
      params.append("priorities", priority);
    }
  }
  if (query.status !== undefined) params.set("status", query.status);
  if (query.recurrence !== undefined && query.recurrence !== "all") {
    params.set("recurrence", query.recurrence);
  }
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.cursor !== undefined) params.set("cursor", query.cursor);
  if (query.q !== undefined && query.q !== "") params.set("q", query.q);

  const search = params.toString();

  return search === "" ? "/tasks" : `/tasks?${search}`;
}

export function fetchTasks(
  query: TaskListQuery = {},
  signal?: AbortSignal,
): Promise<TaskListResponse> {
  return apiRequest<TaskListResponse>(buildTaskListPath(query), {
    signal,
  });
}

export function fetchTask(
  taskId: number,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${taskId}`, { signal });
}

export function updateTask(
  taskId: number,
  input: TaskUpdateInput,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: input,
    signal,
  });
}

export function deleteTask(
  taskId: number,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest<void>(`/tasks/${taskId}`, {
    method: "DELETE",
    signal,
  });
}

export function fetchTodayProgress(
  signal?: AbortSignal,
): Promise<TodayProgressResponse> {
  return apiRequest<TodayProgressResponse>("/tasks/today/progress", {
    signal,
  });
}

export function completeTask(
  taskId: number,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${taskId}/complete`, {
    method: "POST",
    signal,
  });
}

export function uncompleteTask(
  taskId: number,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${taskId}/uncomplete`, {
    method: "POST",
    signal,
  });
}
