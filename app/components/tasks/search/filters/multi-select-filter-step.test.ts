import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MultiSelectFilterStep } from "./multi-select-filter-step";

const OPTIONS = [
  { value: "urgent_important", label: "Срочные и важные" },
  { value: "neither", label: "Не срочные и не важные" },
] as const;

describe("MultiSelectFilterStep", () => {
  it("renders checkbox rows with the initial selection and apply button", () => {
    const html = renderToStaticMarkup(
      createElement(MultiSelectFilterStep, {
        ariaLabel: "Приоритет задачи",
        options: OPTIONS,
        initialSelected: ["neither"],
        onApply: vi.fn(),
      }),
    );

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Приоритет задачи"');
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
    expect(html).toContain("Применить");
  });
});
