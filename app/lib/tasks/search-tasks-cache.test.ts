import { describe, expect, it } from "vitest";

import { createDefaultSearchFilters } from "./search-filters";
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

const TODAY = "2026-11-08";

describe("searchTasksQueryKey", () => {
  it("keeps the search key under the tasks prefix", () => {
    expect(
      searchTasksQueryKey(
        "Europe/Moscow",
        "2026-11-06",
        "отчёт",
        createDefaultSearchFilters(),
      ),
    ).toEqual([
      "tasks",
      "search",
      "Europe/Moscow",
      "2026-11-06",
      "отчёт",
      "p:|pr:|s:all|r:all",
    ]);
  });

  it("builds the search query key with the filters fingerprint", () => {
    const key = searchTasksQueryKey("Europe/Moscow", TODAY, "созвон", {
      ...createDefaultSearchFilters(),
      projectIds: [2, 1],
    });

    expect(key).toEqual([
      "tasks",
      "search",
      "Europe/Moscow",
      TODAY,
      "созвон",
      "p:1,2|pr:|s:all|r:all",
    ]);
  });

  it("keeps the same server key when only labels change", () => {
    const base = createDefaultSearchFilters();

    expect(
      searchTasksQueryKey("Europe/Moscow", TODAY, "созвон", {
        ...base,
        labelIds: [1],
      }),
    ).toEqual(
      searchTasksQueryKey("Europe/Moscow", TODAY, "созвон", {
        ...base,
        labelIds: [2],
      }),
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
