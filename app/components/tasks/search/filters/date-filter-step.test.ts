import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DateFilterStep } from "./date-filter-step";

describe("DateFilterStep", () => {
  it("renders the calendar, selected date caption and apply button", () => {
    const html = renderToStaticMarkup(
      createElement(DateFilterStep, {
        today: "2026-11-08",
        initialDate: "2026-11-01",
        onApply: vi.fn(),
      }),
    );

    expect(html).toContain("Ноябрь 2026");
    expect(html).toContain("Показать все задачи на 01.11.2026");
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Готово");
    expect(html).toContain('aria-label="Предыдущий месяц"');
  });
});
