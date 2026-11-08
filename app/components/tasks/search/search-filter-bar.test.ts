import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SearchFilterBar } from "./search-filter-bar";

interface RenderOptions {
  activeFilterCount?: number;
  activeDate?: boolean;
  activePriority?: boolean;
  activeProject?: boolean;
  activeRecurrence?: boolean;
}

function render(options: RenderOptions = {}) {
  return renderToStaticMarkup(
    createElement(SearchFilterBar, {
      activeFilterCount: options.activeFilterCount ?? 0,
      activeDate: options.activeDate ?? false,
      activePriority: options.activePriority ?? false,
      activeProject: options.activeProject ?? false,
      activeRecurrence: options.activeRecurrence ?? false,
      onOpenAll: vi.fn(),
      onOpenDate: vi.fn(),
      onOpenPriority: vi.fn(),
      onOpenProject: vi.fn(),
      onOpenRecurrence: vi.fn(),
    }),
  );
}

function expectChipActive(html: string, ariaLabel: string) {
  const escapedLabel = ariaLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  expect(html).toMatch(
    new RegExp(
      `aria-label="${escapedLabel}" class="[^"]*border-app-accent[^"]*text-app-accent[^"]*"`,
    ),
  );
}

describe("SearchFilterBar", () => {
  it("renders five enabled filter buttons in the Figma order", () => {
    const html = render();

    expect(html).toContain("Все фильтры");
    expect(html).toContain("Фильтр по дате");
    expect(html).toContain("По приоритету");
    expect(html).toContain("Проект");
    expect(html).toContain("Периодичность");
    expect(html).toContain("adjustments-horizontal.svg");
    expect(html).toContain("calendar.svg");
    expect(html.match(/aria-haspopup="dialog"/g)?.length).toBe(5);
    expect(html).not.toContain("aria-disabled");
    expect(html).not.toContain("tabindex");
    expect(html).toContain("[scrollbar-width:none]");
    expect(html).toContain("overflow-x-auto");
    expect(html).not.toContain("-mx-4");
  });

  it("shows the active badge and active project chip", () => {
    const html = render({ activeFilterCount: 3, activeProject: true });

    expect(html).toContain("Все фильтры, активно: 3");
    expect(html).toContain("aria-hidden=\"true\"");
    expect(html).toContain("bg-app-accent");
    expect(html).toContain(">3<");
    expectChipActive(html, "Все фильтры, активно: 3");
    expectChipActive(html, "Фильтр по проекту");
  });

  it("renders the active date icon", () => {
    const html = render({ activeDate: true });

    expect(html).toContain("calendar.svg");
    expectChipActive(html, "Фильтр по дате");
  });

  it("renders an active recurrence chip", () => {
    const html = render({ activeRecurrence: true });

    expect(html).toContain("Периодичность");
    expectChipActive(html, "Фильтр по периодичности");
  });

  it("renders an active priority chip", () => {
    const html = render({ activePriority: true });

    expect(html).toContain("По приоритету");
    expectChipActive(html, "Фильтр по приоритету");
  });
});
