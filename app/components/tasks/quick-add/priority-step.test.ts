import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PriorityStep } from "./priority-step";

describe("PriorityStep", () => {
  it("renders all four priorities and marks the selected one", () => {
    const html = renderToStaticMarkup(
      createElement(PriorityStep, {
        value: "important_not_urgent",
        onApply: () => {},
      }),
    );

    expect(html).toContain("Срочные и важные");
    expect(html).toContain("Важные, но не срочные");
    expect(html).toContain("Срочные, но не важные");
    expect(html).toContain("Не срочные и не важные");
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain("Применить");
  });
});
