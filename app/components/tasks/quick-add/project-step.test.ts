import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectStep, getProjectStepMessage } from "./project-step";

const project = {
  id: 10,
  name: "Личное",
  description: null,
  icon: "leaf",
  color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
  progress: { total: 0, completed: 0, remaining: 0 },
  archived_at: null,
  created_at: "2026-11-06T09:00:00Z",
  updated_at: "2026-11-06T09:00:00Z",
};

function render(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(ProjectStep, {
      projects: [],
      isLoading: false,
      isError: false,
      selectedId: null,
      onRetry: () => {},
      onChange: () => {},
      onApply: () => {},
      ...overrides,
    }),
  );
}

describe("ProjectStep", () => {
  it("always renders the no-project row and apply action", () => {
    const html = render();

    expect(html).toContain("Без проекта");
    expect(html).toContain("no-project.svg");
    expect(html).toContain("Применить");
    expect(html).not.toContain("Загружаем проекты…");
  });

  it("renders projects with icon color and selected check", () => {
    const html = render({ projects: [project], selectedId: 10 });

    expect(html).toContain("Личное");
    expect(html).toContain("leaf.svg");
    expect(html).toContain("#16A34A");
    expect(html).toContain('aria-checked="true"');
  });

  it("renders loading and error states", () => {
    expect(render({ isLoading: true })).toContain("Загружаем проекты…");

    const error = render({ isError: true });

    expect(error).toContain("Не удалось загрузить проекты");
    expect(error).toContain("Повторить");
  });

  it("renders loading and error status before cached project rows", () => {
    const loading = render({ projects: [project], isLoading: true });

    expect(loading.indexOf("Загружаем проекты…")).toBeLessThan(
      loading.indexOf("Личное"),
    );

    const error = render({ projects: [project], isError: true });

    expect(error.indexOf("Не удалось загрузить проекты")).toBeLessThan(
      error.indexOf("Личное"),
    );
  });

  it("exposes the exact project step messages", () => {
    expect(getProjectStepMessage("loading")).toBe("Загружаем проекты…");
    expect(getProjectStepMessage("error")).toBe(
      "Не удалось загрузить проекты",
    );
  });

  it("renders a radiogroup with radio rows", () => {
    const html = render({ projects: [project] });

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Проект"');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
  });

  it("selects the no-project row by default", () => {
    const html = render({ projects: [project], selectedId: null });

    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain("Без проекта");
  });

  it("draws dividers between rows but not after the last row", () => {
    expect(render()).not.toContain("border-b border-app-stroke");

    const html = render({ projects: [project] });

    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
  });
});
