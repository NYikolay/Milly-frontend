import { describe, expect, it } from "vitest";

import {
  applyTaskDetailCompletion,
  applyTaskDetailPriority,
  applyTaskDetailProject,
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

describe("applyTaskDetailPriority", () => {
  it("changes the priority optimistically", () => {
    const next = applyTaskDetailPriority(task(), "urgent_important");
    expect(next?.priority).toBe("urgent_important");
  });

  it("returns the same task for the same priority", () => {
    const current = task({ priority: "neither" });
    expect(applyTaskDetailPriority(current, "neither")).toBe(current);
  });

  it("returns undefined for missing data", () => {
    expect(applyTaskDetailPriority(undefined, "neither")).toBeUndefined();
  });
});

describe("applyTaskDetailProject", () => {
  it("changes the project optimistically", () => {
    const next = applyTaskDetailProject(task(), 10);
    expect(next?.project_id).toBe(10);
  });

  it("clears the project optimistically with null", () => {
    const next = applyTaskDetailProject(task({ project_id: 10 }), null);
    expect(next?.project_id).toBeNull();
  });

  it("returns the same task for the same project", () => {
    const current = task({ project_id: 10 });
    expect(applyTaskDetailProject(current, 10)).toBe(current);
  });

  it("returns the same task for the same no-project state", () => {
    const current = task({ project_id: null });
    expect(applyTaskDetailProject(current, null)).toBe(current);
  });

  it("returns undefined for missing data", () => {
    expect(applyTaskDetailProject(undefined, 10)).toBeUndefined();
  });
});
