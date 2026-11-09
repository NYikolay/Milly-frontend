import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ProjectResponse } from "~/lib/projects/types";

import {
  TaskProjectView,
  type TaskProjectViewProps,
} from "./task-project-view";

function project(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    id: 10,
    name: "Работа",
    description: null,
    icon: "briefcase",
    color: { id: 1, slug: "green", name: "Зелёный", hex: "#16A34A" },
    progress: { total: 0, completed: 0, remaining: 0 },
    archived_at: null,
    created_at: "2026-11-01T07:00:00.000Z",
    updated_at: "2026-11-01T07:00:00.000Z",
    ...overrides,
  };
}

function render(props: Partial<TaskProjectViewProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskProjectView, {
      selectedProjectId: null,
      projects: [project()],
      isProjectsLoading: false,
      isProjectsError: false,
      onRetryProjects: () => {},
      onSelect: () => {},
      ...props,
    }),
  );
}

describe("TaskProjectView", () => {
  it("renders the header, subtitle and footer hint", () => {
    const html = render();
    expect(html).toContain("Выбор проекта");
    expect(html).toContain("Выберите к какому проекту привязать задачу");
    expect(html).toContain(
      "Это позволит вам группировать и фильтровать свои задачи",
    );
  });

  it("renders no-project first and all backend projects", () => {
    const html = render({
      projects: [project(), project({ id: 11, name: "Личное" })],
    });
    expect(html).toContain("Без проекта");
    expect(html).toContain("Работа");
    expect(html).toContain("Личное");
    expect(html.indexOf("Без проекта")).toBeLessThan(html.indexOf("Работа"));
    expect(html.indexOf("Работа")).toBeLessThan(html.indexOf("Личное"));
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });

  it("marks the current project", () => {
    const html = render({ selectedProjectId: 10 });
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("check.svg");
  });

  it("renders the backend color badge with a white icon", () => {
    const html = render();
    expect(html).toContain("background-color:#16A34A");
    expect(html).toContain("text-white");
    expect(html).toContain("briefcase.svg");
    expect(html).not.toContain("dark:");
  });

  it("renders the neutral no-project badge", () => {
    const html = render({ projects: [] });
    expect(html).toContain("no-project.svg");
    expect(html).toContain("bg-app-track");
  });

  it("shows the projects loading message", () => {
    expect(render({ projects: [], isProjectsLoading: true })).toContain(
      "Загружаем проекты…",
    );
  });

  it("shows the projects error and retry", () => {
    const onRetryProjects = vi.fn();
    const html = render({
      projects: [],
      isProjectsError: true,
      onRetryProjects,
    });

    expect(html).toContain("Не удалось загрузить проекты");
    expect(html).toContain("Повторить");
  });

  it("draws dividers only between rows", () => {
    const html = render({
      projects: [project(), project({ id: 11, name: "Личное" })],
    });
    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(2);
  });

  it("uses app tokens and no dark variants", () => {
    const html = render({ selectedProjectId: 10 });
    expect(html).toContain("bg-app-card");
    expect(html).toContain("text-app-text-secondary");
    expect(html).toContain("text-app-accent");
    expect(html).not.toContain("dark:");
  });
});
