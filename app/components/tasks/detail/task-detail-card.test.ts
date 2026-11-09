import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LabelResponse } from "~/lib/labels/types";
import type { ProjectResponse } from "~/lib/projects/types";
import type { TaskResponse } from "~/lib/tasks/types";

import { TaskDetailCard, type TaskDetailCardProps } from "./task-detail-card";

const NOW = new Date("2026-11-08T10:00:00.000Z");
const TIME_ZONE = "Europe/Moscow";

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
    created_at: "2026-11-06T07:00:00.000Z",
    updated_at: "2026-11-06T07:00:00.000Z",
    ...overrides,
  };
}

function project(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    id: 10,
    name: "Работа",
    description: null,
    icon: "book",
    color: { id: 1, slug: "green", name: "Зелёный", hex: "#16A34A" },
    progress: { total: 0, completed: 0, remaining: 0 },
    archived_at: null,
    created_at: "2026-11-01T07:00:00.000Z",
    updated_at: "2026-11-01T07:00:00.000Z",
    ...overrides,
  };
}

function label(overrides: Partial<LabelResponse> = {}): LabelResponse {
  return {
    id: 3,
    name: "Личное",
    color: { id: 3, slug: "green", name: "Зелёный", hex: "#40DD82" },
    created_at: "2026-11-01T07:00:00.000Z",
    updated_at: "2026-11-01T07:00:00.000Z",
    ...overrides,
  };
}

function render(props: Partial<TaskDetailCardProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskDetailCard, {
      task: task(),
      labels: [label()],
      timeZone: TIME_ZONE,
      now: NOW,
      ...props,
    }),
  );
}

describe("TaskDetailCard", () => {
  it("renders all five property rows and their values", () => {
    const html = render({
      task: task({
        project_id: 10,
        priority: "urgent_important",
        labels: [
          { id: 3, name: "Личное" },
          { id: 4, name: "Работа" },
          { id: 5, name: "Дом" },
          { id: 6, name: "Спорт" },
        ],
      }),
      project: project(),
      labels: [label()],
    });

    expect(html).toContain("Срок");
    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain("Напоминание");
    expect(html).toContain("За 30 минут");
    expect(html).toContain("Приоритет");
    expect(html).toContain("Срочные и важные");
    expect(html).toContain("Метки");
    expect(html).toContain("Личное + 3");
    expect(html).toContain("Проект");
    expect(html).toContain("Работа");
    expect(html).toContain("calendar.svg");
    expect(html).toContain("bell.svg");
    expect(html).toContain("flag.svg");
    expect(html).toContain("tag.svg");
    expect(html).toContain("tag-raw.svg");
    expect(html).toContain("folder.svg");
    expect(html).toContain("chevron-right.svg");
    expect(html).toContain("text-app-accent");
    expect(html).toContain("#40DD82");
    expect(html).not.toContain("<button");
  });

  it("renders the due row as an edit button when a handler is provided", () => {
    const html = render({ onDueClick: () => {} });

    expect(html).toContain('aria-label="Изменить срок"');
    expect(html).toMatch(/<button[^>]*aria-label="Изменить срок"[^>]*>/);
    expect(html).toContain("Срок");
  });

  it("keeps the due row non-interactive without a handler", () => {
    expect(render()).not.toContain('aria-label="Изменить срок"');
  });

  it("renders the reminder row as an edit button when a handler is provided", () => {
    const html = render({ onReminderClick: () => {} });

    expect(html).toContain('aria-label="Изменить напоминание"');
    expect(html).toMatch(
      /<button[^>]*aria-label="Изменить напоминание"[^>]*>/,
    );
    expect(html).toContain("Напоминание");
  });

  it("keeps the reminder row non-interactive without a handler", () => {
    expect(render()).not.toContain('aria-label="Изменить напоминание"');
  });

  it("renders the priority row as an edit button when a handler is provided", () => {
    const html = render({ onPriorityClick: () => {} });

    expect(html).toContain('aria-label="Изменить приоритет"');
    expect(html).toMatch(/<button[^>]*aria-label="Изменить приоритет"[^>]*>/);
    expect(html).toContain("Приоритет");
  });

  it("keeps the priority row non-interactive without a handler", () => {
    expect(render()).not.toContain('aria-label="Изменить приоритет"');
  });

  it("renders the project row as an edit button when a handler is provided", () => {
    const html = render({ onProjectClick: () => {} });

    expect(html).toContain('aria-label="Изменить проект"');
    expect(html).toMatch(/<button[^>]*aria-label="Изменить проект"[^>]*>/);
    expect(html).toContain("Проект");
  });

  it("keeps the project row non-interactive without a handler", () => {
    expect(render()).not.toContain('aria-label="Изменить проект"');
  });

  it("renders the labels row as an edit button when a handler is provided", () => {
    const html = render({ onLabelsClick: () => {} });

    expect(html).toContain('aria-label="Изменить метки"');
    expect(html).toMatch(/<button[^>]*aria-label="Изменить метки"[^>]*>/);
    expect(html).toContain("Метки");
  });

  it("keeps the labels row non-interactive without a handler", () => {
    expect(render()).not.toContain('aria-label="Изменить метки"');
  });

  it("truncates long plain-text values while the label stays visible", () => {
    const longProjectName =
      "Очень длинное название проекта, которое заметно длиннее шестидесяти символов";
    const html = render({ project: project({ name: longProjectName }) });

    expect(longProjectName.length).toBeGreaterThan(60);
    expect(html).toContain(
      `<span class="min-w-0 truncate">${longProjectName}</span>`,
    );
    expect(html).toContain("Проект");
  });

  it("renders dividers between rows but not after the last one", () => {
    expect(render().match(/border-b border-app-stroke/g)?.length).toBe(4);
  });

  it("renders fallbacks for empty labels, missing project and no reminders", () => {
    const html = render({
      task: task({ reminders_enabled: false, reminders: [] }),
    });
    expect(html).toContain("Нет");
    expect(html).toContain("Без проекта");
    expect(html).not.toContain("tag-raw.svg");
  });

  it("falls back to app-success for an unknown label color", () => {
    const html = render({
      task: task({ labels: [{ id: 99, name: "Неизвестная" }] }),
      labels: [label()],
    });
    expect(html).toContain("var(--app-success)");
  });

  it("marks the due date as destructive when warned", () => {
    const html = render({ isDueDateWarning: true });
    const dueRow = html.slice(
      html.indexOf("Срок"),
      html.indexOf("Напоминание"),
    );

    expect(dueRow).toContain("text-app-destructive");
    expect(dueRow).not.toContain("text-app-accent");
  });

  it("marks the due date as destructive when the task is overdue", () => {
    const html = render({
      task: task({ due_at: "2026-11-08T09:00:00.000Z" }),
    });
    const dueRow = html.slice(
      html.indexOf("Срок"),
      html.indexOf("Напоминание"),
    );

    expect(dueRow).toContain("text-app-destructive");
    expect(dueRow).not.toContain("text-app-accent");
  });

  it("keeps the accent due date for a completed overdue task", () => {
    const html = render({
      task: task({
        due_at: "2026-11-08T09:00:00.000Z",
        completed_at: "2026-11-08T09:30:00.000Z",
      }),
    });
    const dueRow = html.slice(
      html.indexOf("Срок"),
      html.indexOf("Напоминание"),
    );

    expect(dueRow).toContain("text-app-accent");
    expect(dueRow).not.toContain("text-app-destructive");
  });
});
