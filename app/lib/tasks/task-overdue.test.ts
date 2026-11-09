import { describe, expect, it } from "vitest";

import { isTaskOverdue } from "./task-overdue";

const NOW = new Date("2026-11-06T07:00:00.000Z");

function task(
  overrides: Partial<{ due_at: string; completed_at: string | null }> = {},
): { due_at: string; completed_at: string | null } {
  return {
    due_at: "2026-11-06T08:00:00.000Z",
    completed_at: null,
    ...overrides,
  };
}

describe("isTaskOverdue", () => {
  it("returns true one millisecond before now", () => {
    expect(
      isTaskOverdue(task({ due_at: "2026-11-06T06:59:59.999Z" }), NOW),
    ).toBe(true);
  });

  it("returns false when due_at equals now", () => {
    expect(
      isTaskOverdue(task({ due_at: "2026-11-06T07:00:00.000Z" }), NOW),
    ).toBe(false);
  });

  it("returns false when due_at is after now", () => {
    expect(
      isTaskOverdue(task({ due_at: "2026-11-06T07:00:00.001Z" }), NOW),
    ).toBe(false);
  });

  it("returns false for a completed task with a past due_at", () => {
    expect(
      isTaskOverdue(
        task({
          due_at: "2026-11-06T06:00:00.000Z",
          completed_at: "2026-11-06T06:30:00.000Z",
        }),
        NOW,
      ),
    ).toBe(false);
  });

  it("handles a non-UTC offset that is in the past in absolute time", () => {
    expect(
      isTaskOverdue(task({ due_at: "2026-11-06T09:00:00.000+03:00" }), NOW),
    ).toBe(true);
  });
});
