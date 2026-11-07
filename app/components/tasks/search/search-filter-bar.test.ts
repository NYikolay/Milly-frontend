import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchFilterBar } from "./search-filter-bar";

type ActiveChip = "priority" | "project" | "recurrence" | null;

function render(activeFilterCount = 0, activeChip: ActiveChip = null) {
  return renderToStaticMarkup(
    createElement(SearchFilterBar, { activeFilterCount, activeChip }),
  );
}

describe("SearchFilterBar", () => {
  it("renders five disabled placeholders in the Figma order", () => {
    const html = render();

    expect(html).toContain("Все фильтры");
    expect(html).toContain("Фильтр по дате");
    expect(html).toContain("По приоритету");
    expect(html).toContain("Проект");
    expect(html).toContain("Периодичность");
    expect(html).toContain("adjustments-horizontal.svg");
    expect(html).toContain("calendar.svg");
    expect(html.match(/aria-disabled="true"/g)?.length).toBe(5);
    expect(html).not.toContain("aria-haspopup");
    expect(html).toContain("[scrollbar-width:none]");
    expect(html).toContain("overflow-x-auto");
  });

  it("shows the active badge and project chip only in the preview state", () => {
    const html = render(1, "project");

    expect(html).toContain("Все фильтры, активно: 1");
    expect(html).toContain("bg-app-accent");
    expect(html).toContain("border-app-accent");
    expect(html).toContain("text-app-accent");
    expect(html).toContain(">1<");
  });
});
