import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchTasksPageSkeleton } from "./search-tasks-page-skeleton";

function render(): string {
  return renderToStaticMarkup(createElement(SearchTasksPageSkeleton));
}

describe("SearchTasksPageSkeleton", () => {
  it("mirrors the search screen chrome and results", () => {
    const html = render();

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем задачи"');
    expect(html.match(/role="status"/g)?.length).toBe(1);
    expect(html).toContain("skeleton-shimmer");
    expect(html).toContain("h-[50px] rounded-[36px]");
    expect(html).toContain("h-[29px] w-1/2 rounded-[8px]");
    expect(html).toContain("h-[45px] w-full rounded-[25px]");
    expect(
      html.match(/size-\[45px\] shrink-0 rounded-\[50px\]/g)?.length,
    ).toBe(2);
    expect(html).toContain("w-[118px]");
    expect(html).toContain("w-[86px]");
    expect(html).toContain("w-[132px]");
    expect(html.match(/min-h-\[67px\]/g)?.length).toBe(3);
  });

  it("does not expose page copy or task data", () => {
    const html = render();

    expect(html).not.toContain("Поиск задач");
    expect(html).not.toContain("Все фильтры");
    expect(html).not.toContain("Задачи на");
    expect(html).not.toContain("В планах");
    expect(html).not.toContain("Выполнено");
  });
});
