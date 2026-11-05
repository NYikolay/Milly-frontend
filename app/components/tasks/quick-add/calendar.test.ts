import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Calendar } from "./calendar";

describe("Calendar", () => {
  it("renders a Monday-first November 2026 grid with the selected day", () => {
    const html = renderToStaticMarkup(
      createElement(Calendar, {
        value: "2026-11-11",
        today: "2026-11-05",
        onSelect: () => {},
      }),
    );

    expect(html).toContain("Ноябрь 2026");
    expect(html).toContain("ПН");
    expect(html).toContain('aria-selected="true"');
    expect(html.match(/role="gridcell"/g)).toHaveLength(42);
  });

  it("disables past days and previous-month navigation", () => {
    const html = renderToStaticMarkup(
      createElement(Calendar, {
        value: "2026-11-11",
        today: "2026-11-05",
        minDate: "2026-11-05",
        onSelect: () => {},
      }),
    );

    const cells = html.match(/<button[^>]*role="gridcell"[^>]*>/g) ?? [];
    const disabledCells = cells.filter((cell) => cell.includes('disabled=""'));

    expect(disabledCells).toHaveLength(10);
    expect(html).toMatch(
      /<button[^>]*aria-label="Предыдущий месяц"[^>]*disabled=""/,
    );
  });
});
