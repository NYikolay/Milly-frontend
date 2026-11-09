import { describe, expect, it } from "vitest";

import {
  buildReminderRules,
  buildTaskRemindersUpdate,
  getReminderIntervalOptions,
  getTaskRemindersDraft,
  parseReminderAmount,
} from "./reminders";
import type { TaskResponse } from "./types";

function task(
  overrides: Partial<Pick<TaskResponse, "reminders_enabled" | "reminders">> = {},
): Pick<TaskResponse, "reminders_enabled" | "reminders"> {
  return {
    reminders_enabled: true,
    reminders: [
      {
        id: 1,
        kind: "before_due",
        enabled: true,
        offset_minutes: 840,
        interval_days: null,
        time_of_day: null,
        timezone: null,
        next_run_at: null,
      },
      {
        id: 2,
        kind: "scheduled",
        enabled: true,
        offset_minutes: null,
        interval_days: 3,
        time_of_day: "09:00:00",
        timezone: "Europe/Moscow",
        next_run_at: null,
      },
    ],
    ...overrides,
  };
}

function emptyTask(): Pick<TaskResponse, "reminders_enabled" | "reminders"> {
  return { reminders_enabled: false, reminders: [] };
}

describe("getTaskRemindersDraft", () => {
  it("returns defaults when there are no reminders", () => {
    expect(getTaskRemindersDraft(emptyTask())).toEqual({
      remindersEnabled: false,
      beforeDueEnabled: false,
      beforeDueAmount: 1,
      beforeDueUnit: "hours",
      scheduledEnabled: false,
      scheduledIntervalDays: 1,
      scheduledTime: "14:00",
    });
  });

  it("reads the master switch and the before-due offset in hours", () => {
    expect(getTaskRemindersDraft(task())).toMatchObject({
      remindersEnabled: true,
      beforeDueEnabled: true,
      beforeDueAmount: 14,
      beforeDueUnit: "hours",
      scheduledEnabled: true,
      scheduledIntervalDays: 3,
      scheduledTime: "09:00",
    });
  });

  it("reads days, minutes and zero offsets", () => {
    const days = task({
      reminders: [
        {
          id: 1,
          kind: "before_due",
          enabled: true,
          offset_minutes: 2880,
          interval_days: null,
          time_of_day: null,
          timezone: null,
          next_run_at: null,
        },
      ],
    });
    expect(getTaskRemindersDraft(days).beforeDueAmount).toBe(2);
    expect(getTaskRemindersDraft(days).beforeDueUnit).toBe("days");

    const minutes = task({
      reminders: [
        {
          id: 1,
          kind: "before_due",
          enabled: true,
          offset_minutes: 30,
          interval_days: null,
          time_of_day: null,
          timezone: null,
          next_run_at: null,
        },
      ],
    });
    expect(getTaskRemindersDraft(minutes).beforeDueAmount).toBe(30);
    expect(getTaskRemindersDraft(minutes).beforeDueUnit).toBe("minutes");

    const zero = task({
      reminders: [
        {
          id: 1,
          kind: "before_due",
          enabled: true,
          offset_minutes: 0,
          interval_days: null,
          time_of_day: null,
          timezone: null,
          next_run_at: null,
        },
      ],
    });
    expect(getTaskRemindersDraft(zero).beforeDueAmount).toBe(0);
    expect(getTaskRemindersDraft(zero).beforeDueUnit).toBe("minutes");
  });

  it("keeps rule values while the master switch is off", () => {
    expect(getTaskRemindersDraft(task({ reminders_enabled: false }))).toMatchObject({
      remindersEnabled: false,
      beforeDueEnabled: true,
      scheduledEnabled: true,
    });
  });
});

describe("buildReminderRules", () => {
  it("builds enabled rules with seconds in time_of_day", () => {
    expect(
      buildReminderRules({
        beforeDueEnabled: true,
        beforeDueAmount: 2,
        beforeDueUnit: "hours",
        scheduledEnabled: true,
        scheduledIntervalDays: 7,
        scheduledTime: "09:30",
      }),
    ).toEqual([
      { kind: "before_due", enabled: true, offset_minutes: 120 },
      {
        kind: "scheduled",
        enabled: true,
        interval_days: 7,
        time_of_day: "09:30:00",
      },
    ]);
  });

  it("omits disabled rules", () => {
    expect(
      buildReminderRules({
        beforeDueEnabled: false,
        beforeDueAmount: 2,
        beforeDueUnit: "hours",
        scheduledEnabled: false,
        scheduledIntervalDays: 1,
        scheduledTime: "14:00",
      }),
    ).toEqual([]);
  });

  it("clamps the offset to 0…525600", () => {
    expect(
      buildReminderRules({
        beforeDueEnabled: true,
        beforeDueAmount: 0,
        beforeDueUnit: "minutes",
        scheduledEnabled: false,
        scheduledIntervalDays: 1,
        scheduledTime: "14:00",
      })[0]?.offset_minutes,
    ).toBe(0);

    expect(
      buildReminderRules({
        beforeDueEnabled: true,
        beforeDueAmount: 999999,
        beforeDueUnit: "days",
        scheduledEnabled: false,
        scheduledIntervalDays: 1,
        scheduledTime: "14:00",
      })[0]?.offset_minutes,
    ).toBe(525600);
  });
});

describe("buildTaskRemindersUpdate", () => {
  it("sends only the master switch when it is turned off", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        remindersEnabled: false,
      }),
    ).toEqual({ reminders_enabled: false });
  });

  it("sends rules and enables the master when a rule changes", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        beforeDueAmount: 1,
      }),
    ).toEqual({
      reminders_enabled: true,
      reminders: [
        { kind: "before_due", enabled: true, offset_minutes: 60 },
        {
          kind: "scheduled",
          enabled: true,
          interval_days: 3,
          time_of_day: "09:00:00",
        },
      ],
    });
  });

  it("disables the master and clears rules when both are off", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        beforeDueEnabled: false,
        scheduledEnabled: false,
      }),
    ).toEqual({ reminders_enabled: false, reminders: [] });
  });

  it("returns null for an invalid time", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        scheduledTime: "",
      }),
    ).toBeNull();
  });

  it("returns null for an invalid amount", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        beforeDueAmount: -1,
      }),
    ).toBeNull();
  });
});

describe("getReminderIntervalOptions", () => {
  it("returns the five standard options", () => {
    expect(getReminderIntervalOptions(1).map((option) => option.value)).toEqual([
      1, 2, 3, 4, 7,
    ]);
  });

  it("adds an option for an unknown existing interval", () => {
    expect(getReminderIntervalOptions(5)).toContainEqual({
      value: 5,
      label: "Каждые 5 дней",
    });
  });
});

describe("parseReminderAmount", () => {
  it("accepts digits from 0 to 525600", () => {
    expect(parseReminderAmount("0")).toBe(0);
    expect(parseReminderAmount("14")).toBe(14);
    expect(parseReminderAmount("525600")).toBe(525600);
  });

  it("rejects empty, non-numeric and out-of-range values", () => {
    expect(parseReminderAmount("")).toBeNull();
    expect(parseReminderAmount("1a")).toBeNull();
    expect(parseReminderAmount("525601")).toBeNull();
  });
});
