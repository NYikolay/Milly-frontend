import { describe, expect, it } from "vitest";

import type { LabelResponse } from "~/lib/labels/types";

import {
  findTaskLabelColor,
  formatTaskCreatedAt,
  formatTaskDueValue,
  formatTaskLabelsSummary,
  formatTaskPriority,
  formatTaskReminderSummary,
} from "./task-detail";
import type { ReminderResponse, TaskResponse } from "./types";

const NOW = new Date("2026-11-08T10:00:00.000Z");

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T13:00:00.000Z",
    completed_at: null,
    reminders_enabled: true,
    labels: [],
    reminders: [],
    created_at: "2026-11-05T07:00:00.000Z",
    updated_at: "2026-11-05T07:00:00.000Z",
    ...overrides,
  };
}

function reminder(
  overrides: Partial<ReminderResponse> = {},
): ReminderResponse {
  return {
    id: 1,
    kind: "before_due",
    enabled: true,
    offset_minutes: 30,
    interval_days: null,
    time_of_day: null,
    timezone: null,
    next_run_at: null,
    ...overrides,
  };
}

function label(overrides: Partial<LabelResponse> = {}): LabelResponse {
  return {
    id: 3,
    name: "Личное",
    color: {
      id: 1,
      slug: "green",
      name: "Зелёный",
      hex: "#40DD82",
    },
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("formatTaskDueValue", () => {
  it("formats today, tomorrow and another day", () => {
    expect(
      formatTaskDueValue(
        { due_at: "2026-11-08T13:00:00.000Z" },
        "Europe/Moscow",
        NOW,
      ),
    ).toBe("Сегодня, 16:00");
    expect(
      formatTaskDueValue(
        { due_at: "2026-11-09T13:00:00.000Z" },
        "Europe/Moscow",
        NOW,
      ),
    ).toBe("Завтра, 16:00");
    expect(
      formatTaskDueValue(
        { due_at: "2026-11-10T13:00:00.000Z" },
        "Europe/Moscow",
        NOW,
      ),
    ).toBe("На 10.11.2026, 16:00");
  });
});

describe("formatTaskCreatedAt", () => {
  it("formats creation time in the user's time zone", () => {
    expect(
      formatTaskCreatedAt("2026-11-05T07:00:00.000Z", "Europe/Moscow"),
    ).toBe("05.11.2026, 10:00");
  });
});

describe("formatTaskReminderSummary", () => {
  it("returns Нет when disabled or empty", () => {
    expect(formatTaskReminderSummary(task({ reminders_enabled: false }))).toBe(
      "Нет",
    );
    expect(formatTaskReminderSummary(task({ reminders: [] }))).toBe("Нет");
  });

  it("formats before_due offsets", () => {
    expect(formatTaskReminderSummary(task({ reminders: [reminder()] }))).toBe(
      "За 30 минут",
    );
    expect(
      formatTaskReminderSummary(
        task({ reminders: [reminder({ offset_minutes: 60 })] }),
      ),
    ).toBe("За 1 час");
    expect(
      formatTaskReminderSummary(
        task({ reminders: [reminder({ offset_minutes: 2880 })] }),
      ),
    ).toBe("За 2 дня");
    expect(
      formatTaskReminderSummary(
        task({ reminders: [reminder({ offset_minutes: 0 })] }),
      ),
    ).toBe("В момент срока");
  });

  it("formats scheduled reminders", () => {
    expect(
      formatTaskReminderSummary(
        task({
          reminders: [
            reminder({
              kind: "scheduled",
              offset_minutes: null,
              interval_days: 3,
              time_of_day: "09:00:00",
            }),
          ],
        }),
      ),
    ).toBe("Каждые 3 дня в 09:00");
    expect(
      formatTaskReminderSummary(
        task({
          reminders: [
            reminder({
              kind: "scheduled",
              offset_minutes: null,
              interval_days: 1,
              time_of_day: null,
            }),
          ],
        }),
      ),
    ).toBe("По расписанию");
  });

  it("appends the count of additional rules", () => {
    expect(
      formatTaskReminderSummary(
        task({
          reminders: [
            reminder(),
            reminder({
              id: 2,
              kind: "scheduled",
              offset_minutes: null,
              interval_days: 1,
              time_of_day: "09:00:00",
            }),
          ],
        }),
      ),
    ).toBe("За 30 минут + 1");
  });
});

describe("labels and priority helpers", () => {
  it("summarizes labels", () => {
    expect(formatTaskLabelsSummary([])).toBe("Нет");
    expect(formatTaskLabelsSummary([{ id: 3, name: "Личное" }])).toBe("Личное");
    expect(
      formatTaskLabelsSummary([
        { id: 3, name: "Личное" },
        { id: 4, name: "Работа" },
        { id: 5, name: "Дом" },
        { id: 6, name: "Спорт" },
      ]),
    ).toBe("Личное + 3");
  });

  it("finds the first label color", () => {
    expect(findTaskLabelColor([{ id: 3, name: "Личное" }], [label()])).toBe(
      "#40DD82",
    );
    expect(findTaskLabelColor([{ id: 99, name: "Нет" }], [label()])).toBeNull();
    expect(
      findTaskLabelColor(
        [
          { id: 99, name: "Нет" },
          { id: 3, name: "Личное" },
        ],
        [label()],
      ),
    ).toBeNull();
  });

  it("formats all priority labels", () => {
    expect(formatTaskPriority("urgent_important")).toBe("Срочные и важные");
    expect(formatTaskPriority("neither")).toBe("Не срочные и не важные");
  });
});
