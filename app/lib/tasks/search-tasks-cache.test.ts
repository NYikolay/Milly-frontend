import { describe, expect, it } from "vitest";

import {
  applySearchTaskCompletion,
  searchTasksQueryKey,
} from "./search-tasks-cache";
import type { TaskListResponse, TaskResponse } from "./types";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-06T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-06T07:00:00.000Z",
    updated_at: "2026-11-06T07:00:00.000Z",
    ...overrides,
  };
}

function data(): TaskListResponse {
  return {
    items: [
      task({ id: 1 }),
      task({ id: 2, completed_at: "2026-11-06T09:00:00.000Z" }),
    ],
    next_cursor: "next-page",
  };
}

describe("searchTasksQueryKey", () => {
  it("keeps the search key under the tasks prefix", () => {
    expect(searchTasksQueryKey("Europe/Moscow", "2026-11-06", "отчёт")).toEqual(
      ["tasks", "search", "Europe/Moscow", "2026-11-06", "отчёт"],
    );
  });
});

describe("applySearchTaskCompletion", () => {
  it("completes a task and preserves the cursor", () => {
    const next = applySearchTaskCompletion(
      data(),
      1,
      "2026-11-06T10:00:00.000Z",
    );

    expect(next?.items[0].completed_at).toBe("2026-11-06T10:00:00.000Z");
    expect(next?.items[0].updated_at).toBe("2026-11-06T10:00:00.000Z");
    expect(next?.next_cursor).toBe("next-page");
  });

  it("uncompletes a task", () => {
    expect(
      applySearchTaskCompletion(data(), 2, null)?.items[1].completed_at,
    ).toBeNull();
  });

  it("returns the same data for unknown tasks and no-op transitions", () => {
    const unchanged = data();

    expect(applySearchTaskCompletion(unchanged, 99, null)).toBe(unchanged);
    expect(applySearchTaskCompletion(unchanged, 1, null)).toBe(unchanged);
    expect(applySearchTaskCompletion(undefined, 1, null)).toBeUndefined();
  });
});
