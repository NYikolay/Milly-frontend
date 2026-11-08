import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SingleSelectFilterStep } from "./single-select-filter-step";

describe("SingleSelectFilterStep", () => {
  it("renders radio rows and the initial value", () => {
    const html = renderToStaticMarkup(
      createElement(SingleSelectFilterStep, {
        ariaLabel: "Статус задачи",
        options: [
          { value: "completed", label: "Выполненные" },
          { value: "open", label: "Не выполненные" },
        ] as const,
        initialValue: "open",
        onApply: vi.fn(),
      }),
    );

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Статус задачи"');
    expect(html).toContain('role="radio"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Применить");
    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
  });
});
