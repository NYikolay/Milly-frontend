import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TaskSegmentId } from "./task-segments";
import { TaskSegments } from "./task-segments";

function render(value: TaskSegmentId): string {
  return renderToStaticMarkup(
    createElement(TaskSegments, { value, onSelect: () => {} }),
  );
}

describe("TaskSegments", () => {
  it("enables today and search and keeps projects disabled", () => {
    const html = render("today");

    expect(html).toContain('aria-label="Разделы задач"');
    expect(html.match(/aria-disabled="true"/g)?.length).toBe(1);
    expect(html.match(/tabindex="-1"/g)?.length).toBe(2);
    expect(html).toContain("Сегодня");
    expect(html).toContain("Поиск задач");
    expect(html).toContain("Проекты");
  });

  it("marks the search segment active on the search screen", () => {
    const html = render("search");

    expect(html.match(/aria-selected="true"/g)?.length).toBe(1);
  });
});
