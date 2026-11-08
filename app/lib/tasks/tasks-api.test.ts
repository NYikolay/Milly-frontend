import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "~/lib/api/client";
import {
  completeTask,
  createSeries,
  createTask,
  deleteTask,
  fetchTask,
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

  it("fetches tasks with a search query", async () => {
    apiRequestMock.mockResolvedValue({ items: [], next_cursor: null });

    await fetchTasks({
      date: "2026-11-06",
      status: "all",
      limit: 100,
      q: "report",
    });

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/tasks?date=2026-11-06&status=all&limit=100&q=report",
      { signal: undefined },
    );
  });

  it("omits an empty search query", async () => {
    apiRequestMock.mockResolvedValue({ items: [], next_cursor: null });

    await fetchTasks({ q: "" });

    expect(apiRequestMock).toHaveBeenCalledWith("/tasks", {
      signal: undefined,
    });
  });

  it("serializes repeated project and priority filters", async () => {
    await fetchTasks({
      date: "2026-11-08",
      project_ids: [3, 1],
      priorities: ["neither", "urgent_important"],
      status: "open",
      recurrence: "regular",
      limit: 100,
      q: "созвон",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/tasks?date=2026-11-08&project_ids=1&project_ids=3&priorities=neither&priorities=urgent_important&status=open&recurrence=regular&limit=100&q=%D1%81%D0%BE%D0%B7%D0%B2%D0%BE%D0%BD",
      { signal: undefined },
    );
  });

  it("omits empty repeated filters and recurrence=all", async () => {
    await fetchTasks({
      date: "2026-11-08",
      project_ids: [],
      priorities: [],
      status: "all",
      recurrence: "all",
      limit: 100,
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/tasks?date=2026-11-08&status=all&limit=100",
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

describe("task detail API", () => {
  it("fetches a task with GET /tasks/{id}", async () => {
    apiRequestMock.mockResolvedValue({ id: 100 });
    await expect(fetchTask(100)).resolves.toEqual({ id: 100 });
    expect(apiRequestMock).toHaveBeenCalledWith("/tasks/100", {
      signal: undefined,
    });
  });

  it("deletes a task with DELETE /tasks/{id}", async () => {
    apiRequestMock.mockResolvedValue(undefined);
    await expect(deleteTask(100)).resolves.toBeUndefined();
    expect(apiRequestMock).toHaveBeenCalledWith("/tasks/100", {
      method: "DELETE",
      signal: undefined,
    });
  });
});
