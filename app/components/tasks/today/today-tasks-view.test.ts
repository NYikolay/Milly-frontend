import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ProjectResponse } from "~/lib/projects/types";
import type { TaskResponse, TodayProgressResponse } from "~/lib/tasks/types";

import { TodayTasksError } from "./today-tasks-error";
import { TodayTasksSkeleton } from "./today-tasks-skeleton";
import { TodayTasksView } from "./today-tasks-view";

const NOW = new Date("2026-11-05T13:07:42Z");
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
    due_at: "2026-11-05T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-05T07:00:00.000Z",
    updated_at: "2026-11-05T07:00:00.000Z",
    ...overrides,
  };
}

function plannedTasks(count: number): TaskResponse[] {
  return Array.from({ length: count }, (_, index) =>
    task({ id: index + 1, title: `В планах ${index + 1}` }),
  );
}

function completedTasks(count: number, offset = 100): TaskResponse[] {
  return Array.from({ length: count }, (_, index) =>
    task({
      id: offset + index,
      title: `Выполнено ${index + 1}`,
      completed_at: "2026-11-05T09:00:00.000Z",
    }),
  );
}

function progress(
  total: number,
  completed: number,
): TodayProgressResponse {
  return { total, completed, remaining: total - completed };
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
    created_at: "2026-11-01T07:00:00.000Z",
    updated_at: "2026-11-01T07:00:00.000Z",
    ...overrides,
  };
}

function renderView(
  overrides: Partial<Parameters<typeof TodayTasksView>[0]> = {},
): string {
  return renderToStaticMarkup(
    createElement(TodayTasksView, {
      now: NOW,
      timeZone: TIME_ZONE,
      tasks: [],
      progress: progress(0, 0),
      projects: [],
      expanded: { planned: false, completed: false },
      onToggleExpanded: () => {},
      pendingTaskId: null,
      completionError: null,
      onToggleTask: () => {},
      ...overrides,
    }),
  );
}

describe("TodayTasksView", () => {
  it("renders the default state with both groups and no quick access blocks", () => {
    const html = renderView({
      tasks: [...plannedTasks(3), ...completedTasks(2)],
      progress: progress(5, 2),
    });

    expect(html).toContain("Задачи на сегодня");
    expect(html).toContain("Четверг, 5 ноября");
    expect(html).toContain("Всё идёт по плану");
    expect(html).toContain("2 из 5 задач выполнено");
    expect(html).toContain("В планах");
    expect(html).toContain("Выполнено");
    expect(html).not.toContain("Создать задачу");
    expect(html).not.toContain("Голосом");
    expect(html).not.toContain("Интерактивно");
    expect(html).toContain('aria-label="Разделы задач"');
    expect(html).toContain("Сегодня");
    expect(html).not.toContain("🔍");
    expect(html).not.toContain(
      "Ищите, фильтруйте и сортируйте ваши задачи",
    );
  });

  it("renders the empty state without quick access cards", () => {
    const html = renderView();

    expect(html).toContain("Задач на сегодня нету 😴");
    expect(html).not.toContain("Задачи на сегодня");
    expect(html).not.toContain("Всё идёт по плану");
    expect(html).not.toContain("В планах");
    expect(html).not.toContain("Выполнено");
    expect(html).not.toContain("Создать задачу");
    expect(html).not.toContain("Голосом");
    expect(html).not.toContain("Интерактивно");
    expect(html).not.toContain("🔍");
    expect(html).not.toContain("Ищите, фильтруйте и сортируйте ваши задачи");
  });

  it("renders the completed state without planned group or quick access cards", () => {
    const html = renderView({
      tasks: completedTasks(2),
      progress: progress(2, 2),
    });

    expect(html).toContain("На сегодня всё 🥳");
    expect(html).toContain("2 из 2 задач выполнено ✌");
    expect(html).not.toContain("В планах");
    expect(html).toContain("Выполнено");
    expect(html).not.toContain("Создать задачу");
    expect(html).not.toContain("Голосом");
    expect(html).not.toContain("Интерактивно");
    expect(html).not.toContain("🔍");
  });

  it("renders the completion error as an alert", () => {
    const error = "Не удалось отметить задачу. Попробуйте ещё раз.";
    const html = renderView({
      tasks: plannedTasks(1),
      progress: progress(1, 0),
      completionError: error,
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain(error);
    expect(html).toContain("text-app-destructive");
  });

  it("renders the project name and icon when the project resolves", () => {
    const html = renderView({
      tasks: [
        task({ id: 1, project_id: 10, title: "Запуск сайта" }),
      ],
      progress: progress(1, 0),
      projects: [project()],
    });

    expect(html).toContain("Запуск сайта");
    expect(html).toContain("запуск сайта");
    expect(html).toContain("book.svg");
    expect(html).toContain("#16A34A");
  });

  it("falls back to the no-project row when the project is missing", () => {
    const html = renderView({
      tasks: [task({ id: 1, project_id: 10 })],
      progress: progress(1, 0),
      projects: [],
    });

    expect(html).toContain("Без проекта");
    expect(html).toContain("file.svg");
  });
});

describe("TodayTasksSkeleton", () => {
  it("mirrors the tasks screen structure with shimmering blocks", () => {
    const html = renderToStaticMarkup(createElement(TodayTasksSkeleton));

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем задачи"');
    expect(html).toContain("skeleton-shimmer");
    expect(html).toContain("h-[50px] rounded-[36px]");
    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[18px]");
    expect(html).toContain("h-[24px]");
    expect(html).toContain("min-h-[67px]");
    expect(html).not.toContain("min-h-[165px]");
    expect(html).toContain("rounded-[25px] bg-app-card p-[15px]");
  });

  it("does not expose any task data", () => {
    const html = renderToStaticMarkup(createElement(TodayTasksSkeleton));

    expect(html).not.toContain("В планах");
    expect(html).not.toContain("Выполнено");
    expect(html).not.toContain("Сегодня");
    expect(html).not.toContain("Создать задачу");
    expect(html).not.toContain("Голосом");
  });
});

describe("TodayTasksError", () => {
  it("keeps the segments, title and date and shows a retry card", () => {
    const html = renderToStaticMarkup(
      createElement(TodayTasksError, {
        dateLabel: "Четверг, 5 ноября",
        onRetry: () => {},
      }),
    );

    expect(html).toContain('aria-label="Разделы задач"');
    expect(html).toContain("Сегодня");
    expect(html).toContain("Задачи на сегодня");
    expect(html).toContain("Четверг, 5 ноября");
    expect(html).toContain("Не удалось загрузить задачи");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Повторить");
    expect(html).toContain("rounded-[25px] bg-app-card p-[15px]");
    expect(html).toContain("text-[15px] font-semibold text-app-accent");
    expect(html).toContain("focus-visible:outline-app-accent");
  });
});
