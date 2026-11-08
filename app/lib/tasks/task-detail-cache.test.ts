import { describe, expect, it } from "vitest";

import {
  applyTaskDetailCompletion,
  taskDetailQueryKey,
} from "./task-detail-cache";
import type { TaskResponse } from "./types";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 42,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T07:00:00.000Z",
    updated_at: "2026-11-08T07:00:00.000Z",
    ...overrides,
  };
}

describe("taskDetailQueryKey", () => {
  it("keeps the detail key under the tasks prefix", () => {
    expect(taskDetailQueryKey(42)).toEqual(["tasks", "detail", 42]);
  });
});

describe("applyTaskDetailCompletion", () => {
  it("completes a task optimistically", () => {
    const next = applyTaskDetailCompletion(task(), "2026-11-08T10:00:00.000Z");
    expect(next?.completed_at).toBe("2026-11-08T10:00:00.000Z");
    expect(next?.updated_at).toBe("2026-11-08T10:00:00.000Z");
  });

  it("uncompletes a task and preserves updated_at", () => {
    const next = applyTaskDetailCompletion(
      task({
        completed_at: "2026-11-08T10:00:00.000Z",
        updated_at: "2026-11-08T10:00:00.000Z",
      }),
      null,
    );
    expect(next?.completed_at).toBeNull();
    expect(next?.updated_at).toBe("2026-11-08T10:00:00.000Z");
  });

  it("returns the same task for a no-op transition", () => {
    const current = task();
    expect(applyTaskDetailCompletion(current, null)).toBe(current);
  });

  it("returns undefined for missing data", () => {
    expect(applyTaskDetailCompletion(undefined, null)).toBeUndefined();
  });
});
