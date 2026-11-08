import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProjectFilterStep } from "./project-filter-step";

const PROJECTS = [
  {
    id: 1,
    name: "Работа",
    description: null,
    icon: "briefcase",
    color: { id: 1, slug: "green", name: "Зелёный", hex: "#48a981" },
    progress: { total: 0, completed: 0, remaining: 0 },
    archived_at: null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Личное",
    description: null,
    icon: "book",
    color: { id: 2, slug: "blue", name: "Синий", hex: "#2563eb" },
    progress: { total: 0, completed: 0, remaining: 0 },
    archived_at: null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
];

function render(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(ProjectFilterStep, {
      projects: PROJECTS,
      isLoading: false,
      isError: false,
      onRetry: vi.fn(),
      initialSelectedIds: [],
      onApply: vi.fn(),
      ...overrides,
    }),
  );
}

describe("ProjectFilterStep", () => {
  it("renders search, count and real project rows without a no-project row", () => {
    const html = render({ initialSelectedIds: [1] });

    expect(html).toContain('aria-label="Поиск проектов"');
    expect(html).toContain("Найдено 2 проекта");
    expect(html).toContain("Сбросить");
    expect(html).not.toContain("Без проекта");
    expect(html).not.toContain("no-project.svg");
    expect(html).toContain("Работа");
    expect(html).toContain("Личное");
    expect(html).toContain("h-[50px]");
    expect(html).not.toContain("h-[59px]");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Применить");
    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
  });

  it("shows the reset button only when projects are selected", () => {
    expect(render()).not.toContain("Сбросить");
    expect(render({ initialSelectedIds: [2] })).toContain("Сбросить");
  });

  it("renders multiple selected projects as checked", () => {
    const html = render({ initialSelectedIds: [1, 2] });

    expect(html.match(/role="checkbox"/g)).toHaveLength(2);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(2);
  });

  it("keeps the same gap after search as the labels filter", () => {
    expect(render()).toContain("mt-[15px]");
  });

  it("shows loading, error and no-match states", () => {
    const loading = renderToStaticMarkup(
      createElement(ProjectFilterStep, {
        projects: [],
        isLoading: true,
        isError: false,
        onRetry: vi.fn(),
        initialSelectedIds: [],
        onApply: vi.fn(),
      }),
    );
    const error = renderToStaticMarkup(
      createElement(ProjectFilterStep, {
        projects: [],
        isLoading: false,
        isError: true,
        onRetry: vi.fn(),
        initialSelectedIds: [],
        onApply: vi.fn(),
      }),
    );

    expect(loading).toContain("Загружаем проекты…");
    expect(error).toContain("Не удалось загрузить проекты");
    expect(error).toContain("Повторить");
  });
});
