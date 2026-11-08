import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ProjectStep,
  filterProjectList,
  getProjectStepMessage,
} from "./project-step";

const project = {
  id: 10,
  name: "Личное",
  description: null,
  icon: "book",
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
    expect(html).toContain("bg-app-track");
    expect(html).toContain("text-app-text");
    expect(html).toContain("Готово");
    expect(html).not.toContain("Загружаем проекты…");
  });

  it("fills the expanded sheet and pins the apply action to the bottom", () => {
    const html = render();

    expect(html).toContain("flex flex-1 flex-col");
    expect(html).toContain("mt-auto pt-[15px]");
  });

  it("renders projects with a badge and selected check", () => {
    const html = render({ projects: [project], selectedId: 10 });

    expect(html).toContain("Личное");
    expect(html).toContain("book.svg");
    expect(html).toContain("size-7");
    expect(html).toContain("p-[5px]");
    expect(html).toContain("text-white");
    expect(html).toContain("background-color:#16A34A");
    expect(html).toContain(
      "truncate text-[15px] leading-[1.3] text-app-text",
    );
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("h-[50px]");
    expect(html).not.toContain("h-[59px]");
  });

  it("renders the project search field", () => {
    const html = render();

    expect(html).toContain('placeholder="Поиск"');
    expect(html).toContain('aria-label="Поиск проектов"');
    expect(html).toContain("h-[45px]");
  });

  it("keeps the same gap after search as the labels step", () => {
    expect(render()).toContain("mt-[15px]");
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

  it("draws a divider only between rows", () => {
    expect(render().match(/border-b border-app-stroke/g)).toBeNull();

    const html = render({ projects: [project] });

    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
  });

  it("filters real projects by name but never filters the no-project row", () => {
    expect(filterProjectList([project], "лич")).toHaveLength(1);
    expect(filterProjectList([project], "ЛИЧ")).toHaveLength(1);
    expect(filterProjectList([project], "дом")).toHaveLength(0);
    expect(filterProjectList([project], "  ")).toHaveLength(1);
    expect(render()).toContain("Без проекта");
  });
});
