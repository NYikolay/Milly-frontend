import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TaskResponse } from "~/lib/tasks/types";

import { TodayTaskGroup } from "./today-task-group";

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

function tasks(count: number): TaskResponse[] {
  return Array.from({ length: count }, (_, index) =>
    task({ id: index + 1, title: `Задача ${index + 1}` }),
  );
}

function render(
  props: Partial<Parameters<typeof TodayTaskGroup>[0]> = {},
): string {
  return renderToStaticMarkup(
    createElement(TodayTaskGroup, {
      id: "planned",
      title: "В планах",
      tasks: tasks(4),
      previewLimit: 3,
      expanded: false,
      onToggleExpanded: () => {},
      projectsById: new Map(),
      timeZone: "Europe/Moscow",
      pendingTaskId: null,
      onToggleTask: () => {},
      ...props,
    }),
  );
}

function countCheckboxes(html: string): number {
  return html.match(/role="checkbox"/g)?.length ?? 0;
}

describe("TodayTaskGroup", () => {
  it("renders the heading and a collapsed preview", () => {
    const html = render();

    expect(html).toContain("<h2");
    expect(html).toContain("В планах");
    expect(html).toContain("Посмотреть все (4)");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="planned-list"');
    expect(html).toContain('id="planned-list"');
    expect(countCheckboxes(html)).toBe(3);
  });

  it("renders every task when expanded", () => {
    const html = render({ expanded: true });

    expect(html).toContain("Свернуть");
    expect(html).toContain('aria-expanded="true"');
    expect(countCheckboxes(html)).toBe(4);
  });

  it("hides the expand control when everything fits the preview", () => {
    const html = render({ tasks: tasks(2), previewLimit: 2 });

    expect(html).not.toContain("Посмотреть все");
    expect(countCheckboxes(html)).toBe(2);
  });

  it("renders the list as a rounded card with inner padding", () => {
    const html = render();

    expect(html).toContain("rounded-[25px] bg-app-card");
    expect(html).toContain("px-[15px] py-[15px]");
  });
});
