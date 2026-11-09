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
    icon: "book",
    color: { id: 1, slug: "green", name: "Зелёный", hex: "#16A34A" },
    progress: { total: 0, completed: 0, remaining: 0 },
    archived_at: null,
    created_at: "2026-11-01T07:00:00.000Z",
    updated_at: "2026-11-01T07:00:00.000Z",
    ...overrides,
  };
}

const TIME_ZONE = "Europe/Moscow";
const NOW = new Date("2026-11-06T07:00:00.000Z");

function render(
  props: Partial<Parameters<typeof TodayTaskRow>[0]> = {},
): string {
  return renderToStaticMarkup(
    createElement(TodayTaskRow, {
      task: task(),
      timeZone: TIME_ZONE,
      now: NOW,
      isPending: false,
      isLast: false,
      onToggle: () => {},
      ...props,
    }),
  );
}

describe("TodayTaskRow", () => {
  it("renders an unfinished P1 task with project, flag and accent time", () => {
    const html = render({
      task: task({
        title: "Обсудить макет",
        project_id: 10,
        priority: "urgent_important",
        series_id: 55,
      }),
      project: project(),
    });

    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain(
      'aria-label="Обсудить макет: отметить выполненной"',
    );
    expect(html).toContain("book.svg");
    expect(html).toContain('style="background-color:#16A34A"');
    expect(html).toContain("size-7");
    expect(html).toContain("p-[5px] text-white");
    expect(html).toContain("запуск сайта");
    expect(html).toContain("· 11:00");
    expect(html).toContain("flag.svg");
    expect(html).toContain("text-app-accent");
    expect(html).toContain("border-app-text-secondary/[0.55]");
    expect(html).toContain("size-[35px]");
    expect(html).toContain("size-[28px]");
    expect(html).toContain("chevron-right.svg");
    expect(html).toContain("repeat.svg");
    expect(html).toContain('aria-label="Регулярная задача"');
    expect(html).not.toContain("· Регулярные");
    expect(html).not.toContain("check.svg");
  });

  it("renders a completed task without flag and with project icon", () => {
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
    expect(html).toContain(
      'text-app-text-secondary line-through">Обсудить макет',
    );
    expect(html).not.toContain("flag.svg");
    expect(html).toContain("book.svg");
    expect(html).toContain("#16A34A");
    expect(html).toContain("запуск сайта");
    expect(html).toContain("text-app-text-secondary\">· 11:00");
  });

  it("renders the no-project fallback with the gray project badge", () => {
    const html = render();

    expect(html).toContain("no-project.svg");
    expect(html).not.toContain("file.svg");
    expect(html).toContain('bg-app-track text-app-text"');
    expect(html).toContain("Без проекта");
  });

  it("renders the due time as destructive when the task is overdue", () => {
    const html = render({
      task: task({ due_at: "2026-11-06T06:00:00.000Z" }),
    });

    expect(html).toContain('text-app-destructive">· 09:00');
    expect(html).not.toContain('text-app-accent">· 09:00');
  });

  it("prefers the destructive time over the urgent-important accent", () => {
    const html = render({
      task: task({
        due_at: "2026-11-06T06:00:00.000Z",
        priority: "urgent_important",
      }),
    });

    expect(html).toContain("flag.svg");
    expect(html).toContain('text-app-destructive">· 09:00');
    expect(html).not.toContain('text-app-accent">· ');
  });

  it("keeps the secondary time for a completed overdue task", () => {
    const html = render({
      task: task({
        due_at: "2026-11-06T06:00:00.000Z",
        completed_at: "2026-11-06T06:30:00.000Z",
      }),
    });

    expect(html).toContain('text-app-text-secondary">· 09:00');
    expect(html).not.toContain("text-app-destructive");
  });

  it("renders no flag and secondary time for the neither priority", () => {
    const html = render({ task: task({ priority: "neither" }) });

    expect(html).not.toContain("flag.svg");
    expect(html).toContain("text-app-text-secondary\">· 11:00");
  });

  it.each(["important_not_urgent", "urgent_not_important"] as const)(
    "renders no flag and secondary time for the %s priority",
    (priority) => {
      const html = render({ task: task({ priority }) });

      expect(html).not.toContain("flag.svg");
      expect(html).toContain("text-app-text-secondary\">· 11:00");
    },
  );

  it("renders a bottom border only for non-last rows", () => {
    const bordered = render({ isLast: false });
    const last = render({ isLast: true });

    expect(bordered).toContain("border-app-stroke");
    expect(bordered).toMatch(/border-b(?!-)/);
    expect(last).toContain("border-b-0");
    expect(last).not.toMatch(/border-b(?!-)/);
  });

  it("renders the recurring icon based on series_id", () => {
    const withSeries = render({ task: task({ series_id: 55 }) });
    const withoutSeries = render({
      task: task({ series_id: null, recurrence: "regular" }),
    });

    expect(withSeries).toContain("repeat.svg");
    expect(withSeries).toContain('aria-label="Регулярная задача"');
    expect(withoutSeries).not.toContain("repeat.svg");
  });

  it("stretches the divider to the bottom of the row", () => {
    const html = render();

    expect(html).toContain("self-stretch");
  });

  it("renders a detail button when onOpen is provided", () => {
    const html = render({ onOpen: () => {} });

    expect(html).toContain('aria-label="Открыть задачу: Задача"');
    expect(html.match(/type="button"/g)?.length).toBe(2);
  });

  it("keeps the row content non-interactive without onOpen", () => {
    const html = render();

    expect(html).not.toContain("Открыть задачу");
    expect(html.match(/type="button"/g)?.length).toBe(1);
  });
});
