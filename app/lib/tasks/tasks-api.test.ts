import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "~/lib/api/client";
import {
  completeTask,
  createSeries,
  createTask,
  fetchTasks,
  fetchTodayProgress,
  uncompleteTask,
} from "./tasks-api";
import type { SeriesCreateInput, TaskCreateInput } from "./types";

vi.mock("~/lib/api/client", () => ({ apiRequest: vi.fn() }));

const apiRequestMock = vi.mocked(apiRequest);

const taskInput: TaskCreateInput = {
  title: "Позвонить врачу",
  due_at: "2026-11-06T07:00:00.000Z",
  priority: "important_not_urgent",
  label_ids: [3],
  reminders_enabled: true,
  reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
};

const seriesInput: SeriesCreateInput = {
  title: "Зарядка",
  priority: "important_not_urgent",
  frequency: "daily",
  time_of_day: "07:00:00",
  timezone: "Europe/Moscow",
  starts_on: "2026-11-06",
  label_ids: [],
  reminders_enabled: false,
  reminders: [],
};

beforeEach(() => apiRequestMock.mockReset());

describe("tasks API", () => {
  it("creates a one-off task with POST /tasks", async () => {
    apiRequestMock.mockResolvedValue({ id: 100 });
    await createTask(taskInput);
    expect(apiRequestMock).toHaveBeenCalledWith("/tasks", {
      method: "POST",
      body: taskInput,
      signal: undefined,
    });
  });

  it("creates a daily series with POST /task-series", async () => {
    apiRequestMock.mockResolvedValue({ id: 7 });
    await createSeries(seriesInput);
    expect(apiRequestMock).toHaveBeenCalledWith("/task-series", {
      method: "POST",
      body: seriesInput,
      signal: undefined,
    });
  });
});

describe("tasks list API", () => {
  it("fetches tasks with date, status and limit", async () => {
    apiRequestMock.mockResolvedValue({ items: [], next_cursor: null });

    await expect(
      fetchTasks({ date: "2026-11-06", status: "all", limit: 100 }),
    ).resolves.toEqual({ items: [], next_cursor: null });

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/tasks?date=2026-11-06&status=all&limit=100",
      { signal: undefined },
    );
  });

  it("omits empty query parameters", async () => {
    apiRequestMock.mockResolvedValue({ items: [], next_cursor: null });

    await fetchTasks();

    expect(apiRequestMock).toHaveBeenCalledWith("/tasks", {
      signal: undefined,
    });
  });

  it("fetches today progress", async () => {
    apiRequestMock.mockResolvedValue({
      total: 5,
      completed: 2,
      remaining: 3,
    });

    await expect(fetchTodayProgress()).resolves.toEqual({
      total: 5,
      completed: 2,
      remaining: 3,
    });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/tasks/today/progress",
      { signal: undefined },
    );
  });
});

describe("tasks completion API", () => {
  it("completes a task with POST /tasks/{id}/complete", async () => {
    apiRequestMock.mockResolvedValue({ id: 100 });

    await completeTask(100);

    expect(apiRequestMock).toHaveBeenCalledWith("/tasks/100/complete", {
      method: "POST",
      signal: undefined,
    });
  });

  it("uncompletes a task with POST /tasks/{id}/uncomplete", async () => {
    apiRequestMock.mockResolvedValue({ id: 100 });

    await uncompleteTask(100);

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/tasks/100/uncomplete",
      { method: "POST", signal: undefined },
    );
  });
});
