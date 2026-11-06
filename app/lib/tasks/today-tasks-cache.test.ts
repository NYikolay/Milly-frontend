import { describe, expect, it } from "vitest";

import { applyTaskCompletion } from "./today-tasks-cache";
import type { TodayTasksData } from "./today-tasks-cache";
import type { TaskResponse } from "./types";

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

const data: TodayTasksData = {
  tasks: [
    task({ id: 1 }),
    task({ id: 2, completed_at: "2026-11-06T09:00:00.000Z" }),
  ],
  progress: { total: 2, completed: 1, remaining: 1 },
};

describe("applyTaskCompletion", () => {
  it("completes a task and increments progress", () => {
    const next = applyTaskCompletion(
      data,
      1,
      "2026-11-06T10:00:00.000Z",
    );

    expect(next?.tasks[0].completed_at).toBe("2026-11-06T10:00:00.000Z");
    expect(next?.progress).toEqual({
      total: 2,
      completed: 2,
      remaining: 0,
    });
  });

  it("uncompletes a task and decrements progress", () => {
    const next = applyTaskCompletion(data, 2, null);

    expect(next?.tasks[1].completed_at).toBeNull();
    expect(next?.progress).toEqual({
      total: 2,
      completed: 0,
      remaining: 2,
    });
  });

  it("returns the same data for unknown tasks and no-op transitions", () => {
    expect(applyTaskCompletion(data, 99, null)).toBe(data);
    expect(applyTaskCompletion(data, 1, null)).toBe(data);
    expect(applyTaskCompletion(undefined, 1, null)).toBeUndefined();
  });
});
