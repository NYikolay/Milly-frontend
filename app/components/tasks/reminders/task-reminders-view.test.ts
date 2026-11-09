import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TaskRemindersDraft } from "~/lib/tasks/reminders";
import type { TaskResponse } from "~/lib/tasks/types";

import {
  enableRemindersDraft,
  TaskRemindersView,
  type TaskRemindersViewProps,
} from "./task-reminders-view";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 42,
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
        interval_days: 1,
        time_of_day: "14:00:00",
        timezone: null,
        next_run_at: null,
      },
    ],
    created_at: "2026-11-08T09:00:00.000Z",
    updated_at: "2026-11-08T09:00:00.000Z",
    ...overrides,
  };
}

function draft(
  overrides: Partial<TaskRemindersDraft> = {},
): TaskRemindersDraft {
  return {
    remindersEnabled: false,
    beforeDueEnabled: false,
    beforeDueAmount: -1,
    beforeDueUnit: "hours",
    scheduledEnabled: false,
    scheduledIntervalDays: 1,
    scheduledTime: "14:00",
    ...overrides,
  };
}

function render(props: Partial<TaskRemindersViewProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskRemindersView, {
      task: task(),
      error: null,
      onSave: () => {},
      onRetry: () => {},
      ...props,
    }),
  );
}

describe("enableRemindersDraft", () => {
  it("enables the default before-due rule for an invalid amount", () => {
    expect(enableRemindersDraft(draft(), "")).toEqual({
      ...draft(),
      remindersEnabled: true,
      beforeDueEnabled: true,
      beforeDueAmount: 1,
    });
  });

  it("preserves a valid amount", () => {
    expect(enableRemindersDraft(draft({ beforeDueAmount: 14 }), "14")).toEqual({
      ...draft({ beforeDueAmount: 14 }),
      remindersEnabled: true,
      beforeDueEnabled: true,
    });
  });
});

describe("TaskRemindersView", () => {
  it("renders the header and description", () => {
    const html = render();
    expect(html).toContain("Автоматические напоминания");
    expect(html).toContain(
      "Milly напомнит о задаче в Telegram по заданным правилам.",
    );
  });

  it("renders the off state with the hint and without settings", () => {
    const html = render({
      task: task({ reminders_enabled: false, reminders: [] }),
    });
    expect(html).toContain("Включите автонапоминания для настройки.");
    expect(html).not.toContain("НАСТРОЙКИ");
    expect(html).toContain('aria-checked="false"');
  });

  it("renders both rule cards, values and hints", () => {
    const html = render();
    expect(html).toContain("НАСТРОЙКИ");
    expect(html).toContain("До срока задачи");
    expect(html).toContain("По расписанию");
    expect(html).toContain('value="14"');
    expect(html).toContain("Часов");
    expect(html).toContain("Каждый день");
    expect(html).toContain("14:00");
    expect(html).toContain("flex-wrap");
    expect(html).toContain(
      "Напоминание будет выслано в чат с Milly один раз до её завершения.",
    );
    expect(html).toContain(
      "Напоминание по расписанию будет высылаться в чат с Milly каждый заданный промежуток времени.",
    );
  });

  it("hides the before-due helper when the rule is off", () => {
    const base = task();
    const html = render({
      task: task({ reminders: [base.reminders[1]] }),
    });
    expect(html).toContain(
      "Напоминание по расписанию будет высылаться в чат с Milly каждый заданный промежуток времени.",
    );
    expect(html).not.toContain(
      "Напоминание будет выслано в чат с Milly один раз до её завершения.",
    );
  });

  it("hides the scheduled helper when the rule is off", () => {
    const base = task();
    const html = render({
      task: task({ reminders: [base.reminders[0]] }),
    });
    expect(html).toContain(
      "Напоминание будет выслано в чат с Milly один раз до её завершения.",
    );
    expect(html).not.toContain(
      "Напоминание по расписанию будет высылаться в чат с Milly каждый заданный промежуток времени.",
    );
  });

  it("shows the save error with a retry button", () => {
    const html = render({ error: "Не удалось сохранить напоминания. Попробуйте ещё раз." });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Не удалось сохранить напоминания. Попробуйте ещё раз.");
    expect(html).toContain("Повторить");
  });

  it("uses app tokens for cards and text", () => {
    const html = render();
    expect(html).toContain("bg-app-card");
    expect(html).toContain("text-app-text-secondary");
    expect(html).not.toContain("dark:");
  });
});
