import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createDefaultSearchFilters } from "~/lib/tasks/search-filters";

import { AllFiltersStep } from "./all-filters-step";

describe("AllFiltersStep", () => {
  it("renders groups in figma order and marks active groups", () => {
    const html = renderToStaticMarkup(
      createElement(AllFiltersStep, {
        filters: {
          ...createDefaultSearchFilters(),
          projectIds: [1],
          recurrence: "regular",
        },
        onOpenStep: vi.fn(),
        onApply: vi.fn(),
      }),
    );

    const project = html.indexOf("Проект");
    const labels = html.indexOf("Метки");
    const priority = html.indexOf("Приоритет");
    const status = html.indexOf("Статус");
    const recurrence = html.indexOf("Регулярность");

    expect(project).toBeGreaterThan(-1);
    expect(project).toBeLessThan(labels);
    expect(labels).toBeLessThan(priority);
    expect(priority).toBeLessThan(status);
    expect(status).toBeLessThan(recurrence);
    expect(html).toContain("Проект, активно");
    expect(html).toContain("Регулярность, активно");
    expect(html).toContain("Применить");
    expect(html).toContain("h-[50px]");
    expect(html).not.toContain("h-[47px]");
    expect(html).not.toContain("gap-[15px]");
  });
});
