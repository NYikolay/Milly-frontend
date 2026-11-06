import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ProjectResponse } from "~/lib/projects/types";
import type { TaskResponse } from "~/lib/tasks/types";

import { TodayTaskRow } from "./today-task-row";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-06T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-06T07:00:00.000Z",
    updated_at: "2026-11-06T07:00:00.000Z",
    ...overrides,
  };
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

const TIME_ZONE = "Europe/Moscow";

function render(
  props: Partial<Parameters<typeof TodayTaskRow>[0]> = {},
): string {
  return renderToStaticMarkup(
    createElement(TodayTaskRow, {
      task: task(),
      timeZone: TIME_ZONE,
      isPending: false,
      isLast: false,
      onToggle: () => {},
      ...props,
    }),
  );
}

describe("TodayTaskRow", () => {
  it("renders an unfinished priority task with project, flag and accent time", () => {
    const html = render({
      task: task({
        title: "Обсудить макет",
        project_id: 10,
        priority: "important_not_urgent",
        recurrence: "regular",
      }),
      project: project(),
    });

    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain(
      'aria-label="Обсудить макет: отметить выполненной"',
    );
    expect(html).toContain("leaf.svg");
    expect(html).toContain("#16A34A");
    expect(html).toContain("запуск сайта");
    expect(html).toContain("· 11:00");
    expect(html).toContain("flag.svg");
    expect(html).toContain("text-app-accent");
    expect(html).toContain("border-app-text-secondary/[0.55]");
    expect(html).toContain("size-[35px]");
    expect(html).toContain("size-[28px]");
    expect(html).toContain("chevron-right.svg");
    expect(html).toContain("· Регулярные");
    expect(html).not.toContain("check.svg");
  });

  it("renders a completed task without flag and project icon", () => {
    const html = render({
      task: task({
        title: "Обсудить макет",
        project_id: 10,
        priority: "important_not_urgent",
        completed_at: "2026-11-06T09:00:00.000Z",
      }),
      project: project(),
    });

    expect(html).toContain('aria-checked="true"');
    expect(html).toContain(
      'aria-label="Обсудить макет: отметить невыполненной"',
    );
    expect(html).toContain("bg-app-accent");
    expect(html).toContain("check.svg");
    expect(html).toContain("text-white");
    expect(html).toContain("text-app-text-secondary\">Обсудить макет");
    expect(html).not.toContain("flag.svg");
    expect(html).not.toContain("leaf.svg");
    expect(html).toContain("запуск сайта");
    expect(html).toContain("text-app-text-secondary\">· 11:00");
  });

  it("renders the no-project fallback", () => {
    const html = render();

    expect(html).toContain("no-project.svg");
    expect(html).toContain("Без проекта");
  });

  it("renders no flag and secondary time for the neither priority", () => {
    const html = render({ task: task({ priority: "neither" }) });

    expect(html).not.toContain("flag.svg");
    expect(html).toContain("text-app-text-secondary\">· 11:00");
  });

  it("renders a bottom border only for non-last rows", () => {
    const bordered = render({ isLast: false });
    const last = render({ isLast: true });

    expect(bordered).toContain("border-app-stroke");
    expect(bordered).toMatch(/border-b(?!-)/);
    expect(last).toContain("border-b-0");
    expect(last).not.toMatch(/border-b(?!-)/);
  });
});
