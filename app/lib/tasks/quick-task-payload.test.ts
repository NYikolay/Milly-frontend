import { describe, expect, it } from "vitest";

import { createQuickTaskDefaults } from "./quick-task-schema";
import {
  buildReminderInputs,
  toSeriesCreateInput,
  toTaskCreateInput,
} from "./quick-task-payload";

const now = new Date("2026-11-05T13:07:42Z");
const moscow = "Europe/Moscow";

function draft(overrides: Partial<ReturnType<typeof createQuickTaskDefaults>> = {}) {
  return {
    ...createQuickTaskDefaults(now, moscow),
    title: "  Позвонить врачу  ",
    dueDate: "2026-11-06",
    dueTime: "10:00",
    ...overrides,
  };
}

describe("toTaskCreateInput", () => {
  it("builds a one-off task with a zoned due_at and deduped labels", () => {
    const input = toTaskCreateInput(
      draft({ labelIds: [3, 3, 4], priority: "urgent_important" }),
      moscow,
    );

    expect(input).toEqual({
      title: "Позвонить врачу",
      due_at: "2026-11-06T07:00:00.000Z",
      priority: "urgent_important",
      project_id: null,
      label_ids: [3, 4],
      reminders_enabled: true,
      reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
    });
  });

  it("passes the project id from the draft", () => {
    expect(toTaskCreateInput(draft({ projectId: 10 }), moscow).project_id).toBe(
      10,
    );
  });
});

describe("toSeriesCreateInput", () => {
  it("builds a daily series without interval_days", () => {
    const input = toSeriesCreateInput(
      draft({ isRecurring: true, labelIds: [3] }),
      moscow,
    );

    expect(input).toEqual({
      title: "Позвонить врачу",
      priority: "important_not_urgent",
      frequency: "daily",
      time_of_day: "10:00:00",
      timezone: moscow,
      starts_on: "2026-11-06",
      project_id: null,
      label_ids: [3],
      reminders_enabled: true,
      reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
    });
  });

  it("starts from a past date without changing it", () => {
    const input = toSeriesCreateInput(
      draft({ isRecurring: true, dueDate: "2026-01-01" }),
      moscow,
    );

    expect(input.starts_on).toBe("2026-01-01");
  });

  it("passes the project id from the draft", () => {
    expect(
      toSeriesCreateInput(draft({ isRecurring: true, projectId: 10 }), moscow)
        .project_id,
    ).toBe(10);
  });
});

describe("buildReminderInputs", () => {
  it("converts hours and days to minutes", () => {
    expect(
      buildReminderInputs(draft({ beforeDueAmount: 2, beforeDueUnit: "days" })),
    ).toEqual({
      enabled: true,
      reminders: [
        { kind: "before_due", enabled: true, offset_minutes: 2880 },
      ],
    });
  });

  it("adds the scheduled rule when enabled", () => {
    expect(
      buildReminderInputs(
        draft({
          scheduledEnabled: true,
          scheduledIntervalDays: 7,
          scheduledTime: "09:30",
        }),
      ),
    ).toEqual({
      enabled: true,
      reminders: [
        { kind: "before_due", enabled: true, offset_minutes: 60 },
        {
          kind: "scheduled",
          enabled: true,
          interval_days: 7,
          time_of_day: "09:30:00",
        },
      ],
    });
  });

  it("disables reminders when the master or both rules are off", () => {
    expect(
      buildReminderInputs(draft({ remindersEnabled: false })),
    ).toEqual({ enabled: false, reminders: [] });
    expect(
      buildReminderInputs(
        draft({ beforeDueEnabled: false, scheduledEnabled: false }),
      ),
    ).toEqual({ enabled: false, reminders: [] });
  });

  it("clamps the offset to the API maximum", () => {
    expect(
      buildReminderInputs(
        draft({ beforeDueAmount: 999999, beforeDueUnit: "days" }),
      ).reminders[0]?.offset_minutes,
    ).toBe(525600);
  });
});
