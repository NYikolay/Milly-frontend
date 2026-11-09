import { describe, expect, it } from "vitest";

import { buildTaskDueUpdate, getTaskDueDraft } from "./task-due";
import type { TaskResponse } from "./types";

const TIME_ZONE = "Europe/Moscow";

function task(
  overrides: Partial<Pick<TaskResponse, "due_at" | "recurrence">> = {},
): Pick<TaskResponse, "due_at" | "recurrence"> {
  return {
    due_at: "2026-11-08T13:00:00.000Z",
    recurrence: "one_off",
    ...overrides,
  };
}

describe("getTaskDueDraft", () => {
  it("reads date and time in the user timezone", () => {
    expect(getTaskDueDraft(task(), TIME_ZONE)).toEqual({
      date: "2026-11-08",
      time: "16:00",
      isRecurring: false,
    });
  });

  it.each(["regular", "periodic"] as const)(
    "marks %s tasks as recurring",
    (recurrence) => {
      expect(
        getTaskDueDraft(task({ recurrence }), TIME_ZONE).isRecurring,
      ).toBe(true);
    },
  );
});

describe("buildTaskDueUpdate", () => {
  it("returns null when nothing changed", () => {
    const current = task();

    expect(
      buildTaskDueUpdate(
        current,
        getTaskDueDraft(current, TIME_ZONE),
        TIME_ZONE,
      ),
    ).toBeNull();
  });

  it("sends only due_at when the date changes", () => {
    expect(
      buildTaskDueUpdate(
        task(),
        { date: "2026-11-09", time: "16:00", isRecurring: false },
        TIME_ZONE,
      ),
    ).toEqual({ due_at: "2026-11-09T13:00:00.000Z" });
  });

  it("turns a one-off task into a daily regular task", () => {
    expect(
      buildTaskDueUpdate(
        task(),
        { date: "2026-11-09", time: "16:00", isRecurring: true },
        TIME_ZONE,
      ),
    ).toEqual({
      due_at: "2026-11-09T13:00:00.000Z",
      recurrence: "regular",
    });
  });

  it("sends only recurrence when a regular task is turned off", () => {
    expect(
      buildTaskDueUpdate(
        task({ recurrence: "regular" }),
        { date: "2026-11-08", time: "16:00", isRecurring: false },
        TIME_ZONE,
      ),
    ).toEqual({ recurrence: "one_off" });
  });

  it("keeps periodic recurrence when only the date changes", () => {
    expect(
      buildTaskDueUpdate(
        task({ recurrence: "periodic" }),
        { date: "2026-11-10", time: "16:00", isRecurring: true },
        TIME_ZONE,
      ),
    ).toEqual({ due_at: "2026-11-10T13:00:00.000Z" });
  });

  it("sends one_off when a periodic task is turned off", () => {
    expect(
      buildTaskDueUpdate(
        task({ recurrence: "periodic" }),
        { date: "2026-11-08", time: "16:00", isRecurring: false },
        TIME_ZONE,
      ),
    ).toEqual({ recurrence: "one_off" });
  });

  it("compares instants instead of offset strings", () => {
    const current = task({ due_at: "2026-11-08T16:00:00+03:00" });

    expect(
      buildTaskDueUpdate(
        current,
        getTaskDueDraft(current, TIME_ZONE),
        TIME_ZONE,
      ),
    ).toBeNull();
  });
});
