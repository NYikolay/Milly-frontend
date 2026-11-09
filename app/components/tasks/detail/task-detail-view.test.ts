import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TASK_PAST_DUE_MESSAGE } from "~/lib/tasks/task-reactivation";
import type { TaskResponse } from "~/lib/tasks/types";

import { TaskDetailView, type TaskDetailViewProps } from "./task-detail-view";

const NOW = new Date("2026-11-08T10:00:00.000Z");
const TIME_ZONE = "Europe/Moscow";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Записаться к доктору наук по теоретическому занятию",
    description: "Собрать результаты за октябрь.",
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-06T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-05T07:00:00.000Z",
    updated_at: "2026-11-06T07:00:00.000Z",
    ...overrides,
  };
}

function render(props: Partial<TaskDetailViewProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskDetailView, {
      task: task(),
      labels: [],
      timeZone: TIME_ZONE,
      now: NOW,
      isCompletionPending: false,
      completionError: null,
      isPastDueWarning: false,
      onToggleCompleted: () => {},
      onDelete: () => {},
      ...props,
    }),
  );
}

describe("TaskDetailView", () => {
  it("renders the title, description, created date and actions", () => {
    const html = render();
    expect(html).toContain(
      "Записаться к доктору наук по теоретическому занятию",
    );
    expect(html).toContain("Описание");
    expect(html).toContain("Собрать результаты за октябрь.");
    expect(html).toContain("Создано 05.11.2026, 10:00");
    expect(html).toContain("Отметить выполненной");
    expect(html).toContain("Удалить задачу");
    expect(html).not.toContain("Изменить название и описание задачи");
  });

  it("forwards the due row handler to the card", () => {
    expect(render({ onDueClick: () => {} })).toContain(
      'aria-label="Изменить срок"',
    );
    expect(render()).not.toContain('aria-label="Изменить срок"');
  });

  it("forwards the reminder row handler to the card", () => {
    expect(render({ onReminderClick: () => {} })).toContain(
      'aria-label="Изменить напоминание"',
    );
    expect(render()).not.toContain('aria-label="Изменить напоминание"');
  });

  it("forwards the priority row handler to the card", () => {
    expect(render({ onPriorityClick: () => {} })).toContain(
      'aria-label="Изменить приоритет"',
    );
    expect(render()).not.toContain('aria-label="Изменить приоритет"');
  });

  it("forwards the project row handler to the card", () => {
    expect(render({ onProjectClick: () => {} })).toContain(
      'aria-label="Изменить проект"',
    );
    expect(render()).not.toContain('aria-label="Изменить проект"');
  });

  it("wraps long unbroken titles", () => {
    const html = render({
      task: task({ title: `https://example.com/${"a".repeat(200)}` }),
    });
    const titleTag = html.match(/<h1[^>]*>/)?.[0] ?? "";

    expect(titleTag).toContain("break-words");
  });

  it("hides the description block when description is empty", () => {
    expect(render({ task: task({ description: null }) })).not.toContain(
      "Описание",
    );
  });

  it("shows Сделать активной for a completed task", () => {
    const html = render({
      task: task({ completed_at: "2026-11-08T10:00:00.000Z" }),
    });
    expect(html).toContain("Сделать активной");
    expect(html).not.toContain("Отметить выполненной");
  });

  it("disables both action buttons while completion is pending", () => {
    const html = render({ isCompletionPending: true });

    expect(html).toContain('aria-busy="true"');
    expect(html.match(/disabled=""/g)?.length).toBe(2);

    const completionButton =
      html.match(
        /<button[^>]*aria-busy="true"[^>]*>Отметить выполненной<\/button>/,
      )?.[0] ?? "";
    expect(completionButton).not.toBe("");
    expect(completionButton).toContain('disabled=""');
    expect(completionButton).toContain("opacity-50");

    const deleteButton =
      html.match(/<button[^>]*disabled=""[^>]*>Удалить задачу<\/button>/)?.[0] ??
      "";
    expect(deleteButton).not.toBe("");
  });

  it("shows the completion error alert", () => {
    expect(
      render({
        completionError: "Не удалось обновить задачу. Попробуйте ещё раз.",
      }),
    ).toContain('role="alert"');
  });

  it("shows the past-due warning with destructive styling", () => {
    const html = render({ isPastDueWarning: true });
    const alert = html.match(/<p[^>]*role="alert"[^>]*>[^<]*<\/p>/)?.[0] ?? "";

    expect(alert).toContain(TASK_PAST_DUE_MESSAGE);
    expect(alert).toContain("text-app-destructive");
  });

  it("does not show the past-due warning by default", () => {
    expect(render()).not.toContain(TASK_PAST_DUE_MESSAGE);
  });
});
