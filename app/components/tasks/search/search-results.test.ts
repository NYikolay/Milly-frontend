import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ProjectResponse } from "~/lib/projects/types";
import type { TaskResponse } from "~/lib/tasks/types";

import { SearchResults } from "./search-results";

const DATE = "2026-10-29";
const TIME_ZONE = "Europe/Moscow";
const NOW = new Date("2026-10-29T07:00:00.000Z");

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-10-29T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-10-29T07:00:00.000Z",
    updated_at: "2026-10-29T07:00:00.000Z",
    ...overrides,
  };
}

function project(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    id: 10,
    name: "запуск сайта",
    description: null,
    icon: "book",
    color: { id: 1, slug: "green", name: "Зелёный", hex: "#16A34A" },
    progress: { total: 0, completed: 0, remaining: 0 },
    archived_at: null,
    created_at: "2026-10-01T07:00:00.000Z",
    updated_at: "2026-10-01T07:00:00.000Z",
    ...overrides,
  };
}

function render(
  overrides: Partial<Parameters<typeof SearchResults>[0]> = {},
): string {
  return renderToStaticMarkup(
    createElement(SearchResults, {
      date: DATE,
      tasks: [],
      projects: [],
      timeZone: TIME_ZONE,
      now: NOW,
      pendingTaskId: null,
      completionError: null,
      onToggleTask: () => {},
      onOpenTask: () => {},
      ...overrides,
    }),
  );
}

describe("SearchResults", () => {
  it("renders the results title, task row and resolved project", () => {
    const html = render({
      tasks: [
        task({
          id: 1,
          project_id: 10,
          title: "Обсудить макет",
        }),
      ],
      projects: [project()],
    });

    expect(html).toContain('aria-labelledby="search-results-title"');
    expect(html).toContain('id="search-results-title"');
    expect(html).toContain("Задачи на 29.10.2026 (1)");
    expect(html).toContain("Обсудить макет");
    expect(html).toContain("запуск сайта");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain("· 11:00");
    expect(html).toContain("rounded-[25px] bg-app-card px-[15px] py-[15px]");
  });

  it("renders the empty card when there are no tasks", () => {
    const html = render();

    expect(html).toContain("Задачи на 29.10.2026 (0)");
    expect(html).toContain("К сожалению задач не найдено");
    expect(html).toContain("😔");
    expect(html).toContain("min-h-[90px]");
    expect(html).toContain("rounded-[25px] bg-app-card p-[15px]");
    expect(html).toContain(
      "text-center text-[15px] leading-[1.3] text-app-text-secondary",
    );
    expect(html).not.toContain('role="checkbox"');
  });

  it("renders the completion error as an alert above the results", () => {
    const error = "Не удалось обновить задачу. Попробуйте ещё раз.";
    const html = render({ completionError: error });

    expect(html).toContain('role="alert"');
    expect(html).toContain(error);
    expect(html).toContain(
      "px-[15px] text-[13px] leading-[1.4] text-app-destructive",
    );
  });

  it("falls back to the no-project row when the project is missing", () => {
    const html = render({
      tasks: [task({ id: 1, project_id: 10, title: "Обсудить макет" })],
      projects: [],
    });

    expect(html).toContain("Без проекта");
    expect(html).toContain("no-project.svg");
    expect(html).not.toContain("file.svg");
  });

  it("renders the due time as destructive for an overdue task", () => {
    const html = render({
      tasks: [task({ id: 1, due_at: "2026-10-29T06:00:00.000Z" })],
    });

    expect(html).toContain('text-app-destructive">· 09:00');
  });

  it("renders a row that opens the task detail", () => {
    const html = render({
      tasks: [task({ id: 7, title: "Открыть меня" })],
    });

    expect(html).toContain('aria-label="Открыть задачу: Открыть меня"');
  });
});
