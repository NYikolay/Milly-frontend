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
    icon: "leaf",
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
      onVoice: () => {},
      onInteractive: () => {},
      onSearch: () => {},
      ...overrides,
    }),
  );
}

describe("TodayTasksView", () => {
  it("renders the default state with both groups and no search card", () => {
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
    expect(html).toContain("Создать задачу");
    expect(html).toContain("Голосом");
    expect(html).toContain("Интерактивно");
    expect(html).toContain('aria-label="Разделы задач"');
    expect(html).toContain("Сегодня");
    expect(html).not.toContain("🔍");
    expect(html).not.toContain(
      "Ищите, фильтруйте и сортируйте ваши задачи",
    );
  });

  it("renders the empty state with the sleeping copy and search card", () => {
    const html = renderView();

    expect(html).toContain("Задач на сегодня нету 😴");
    expect(html).not.toContain("Задачи на сегодня");
    expect(html).not.toContain("Всё идёт по плану");
    expect(html).not.toContain("В планах");
    expect(html).not.toContain("Выполнено");
    expect(html).toContain("🔍");
    expect(html).toContain("Ищите, фильтруйте и сортируйте ваши задачи");
  });

  it("renders the completed state without planned group", () => {
    const html = renderView({
      tasks: completedTasks(2),
      progress: progress(2, 2),
    });

    expect(html).toContain("На сегодня всё 🥳");
    expect(html).toContain("2 из 2 задач выполнено ✌");
    expect(html).not.toContain("В планах");
    expect(html).toContain("Выполнено");
    expect(html).toContain("🔍");
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

  it("falls back to the no-project row when the project is missing", () => {
    const html = renderView({
      tasks: [task({ id: 1, project_id: 10 })],
      progress: progress(1, 0),
      projects: [],
    });

    expect(html).toContain("Без проекта");
    expect(html).toContain("no-project.svg");
  });
});

describe("TodayTasksSkeleton", () => {
  it("renders an accessible pulsing placeholder", () => {
    const html = renderToStaticMarkup(createElement(TodayTasksSkeleton));

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем задачи"');
    expect(html).toContain("animate-pulse");
    expect(html).toContain("h-[50px] rounded-[36px] bg-app-card");
    expect(html).toContain("mt-[15px] h-[29px] w-2/3 rounded bg-app-card");
    expect(html).toContain("h-[18px] w-1/3 rounded bg-app-card");
    expect(html).toContain("h-[89px] rounded-[25px] bg-app-card");
    expect(html).toContain("h-[231px] rounded-[25px] bg-app-card");
    expect(html).toContain("h-[164px] rounded-[25px] bg-app-card");
  });

  it("does not expose any task data", () => {
    const html = renderToStaticMarkup(createElement(TodayTasksSkeleton));

    expect(html).not.toContain("В планах");
    expect(html).not.toContain("Выполнено");
    expect(html).not.toContain("Сегодня");
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
    expect(html).toContain("Повторить");
    expect(html).toContain("rounded-[25px] bg-app-card p-[15px]");
    expect(html).toContain("text-[15px] font-semibold text-app-accent");
    expect(html).toContain("focus-visible:outline-app-accent");
  });
});
