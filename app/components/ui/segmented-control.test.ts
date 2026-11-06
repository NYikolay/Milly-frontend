import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SegmentedControl } from "./segmented-control";

const options = [
  { id: "today", label: "Сегодня", iconSrc: "/circle-check.svg" },
  { id: "search", label: "Поиск задач", iconSrc: "/search.svg", disabled: true },
  { id: "projects", label: "Проекты", iconSrc: "/dashboard.svg", disabled: true },
] as const;

describe("SegmentedControl", () => {
  it("renders an accessible tab list with the active tab", () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl, {
        ariaLabel: "Разделы задач",
        options,
        value: "today",
      }),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Разделы задач"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("bg-app-track");
    expect(html).toContain("text-app-accent");
  });

  it("marks search and projects as disabled and unfocusable", () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl, {
        ariaLabel: "Разделы задач",
        options,
        value: "today",
      }),
    );

    expect(html.match(/aria-disabled="true"/g)?.length).toBe(2);
    expect(html.match(/tabindex="-1"/g)?.length).toBe(2);
  });

  it("keeps icons above 360px and hides them below", () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl, {
        ariaLabel: "Разделы задач",
        options,
        value: "today",
      }),
    );

    expect(html).toContain("max-[359px]:hidden");
    expect(html).toContain("circle-check.svg");
    expect(html).toContain("search.svg");
  });
});
