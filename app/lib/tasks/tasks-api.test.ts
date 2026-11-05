import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "~/lib/api/client";
import { createSeries, createTask } from "./tasks-api";
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
