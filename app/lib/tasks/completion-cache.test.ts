import { describe, expect, it } from "vitest";

import {
  applyCompletionFields,
  hasCompletionChanged,
  replaceTaskInList,
} from "./completion-cache";
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

describe("hasCompletionChanged", () => {
  it("detects only transitions between active and completed", () => {
    expect(hasCompletionChanged(task(), "2026-11-08T10:00:00.000Z")).toBe(true);
    expect(
      hasCompletionChanged(
        task({ completed_at: "2026-11-08T09:00:00.000Z" }),
        null,
      ),
    ).toBe(true);
    expect(hasCompletionChanged(task(), null)).toBe(false);
    expect(
      hasCompletionChanged(
        task({ completed_at: "2026-11-08T09:00:00.000Z" }),
        "2026-11-08T10:00:00.000Z",
      ),
    ).toBe(false);
  });
});

describe("applyCompletionFields", () => {
  it("sets completed_at and updated_at when completing", () => {
    expect(
      applyCompletionFields(task(), "2026-11-08T10:00:00.000Z"),
    ).toMatchObject({
      completed_at: "2026-11-08T10:00:00.000Z",
      updated_at: "2026-11-08T10:00:00.000Z",
    });
  });

  it("clears completed_at and preserves updated_at when uncompleting", () => {
    expect(
      applyCompletionFields(
        task({
          completed_at: "2026-11-08T09:00:00.000Z",
          updated_at: "2026-11-08T09:00:00.000Z",
        }),
        null,
      ),
    ).toMatchObject({
      completed_at: null,
      updated_at: "2026-11-08T09:00:00.000Z",
    });
  });
});

describe("replaceTaskInList", () => {
  it("replaces only the matching task and keeps order", () => {
    const first = task({ id: 1 });
    const second = task({ id: 2 });
    const updated = task({ id: 2, title: "Обновлённая" });

    expect(replaceTaskInList([first, second], updated)).toEqual([first, updated]);
  });
});
