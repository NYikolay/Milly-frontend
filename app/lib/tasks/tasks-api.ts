import { apiRequest } from "~/lib/api/client";

import type {
  SeriesCreateInput,
  SeriesResponse,
  TaskCreateInput,
  TaskResponse,
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
