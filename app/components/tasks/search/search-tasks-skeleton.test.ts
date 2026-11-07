import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchTasksSkeleton } from "./search-tasks-skeleton";

function render(): string {
  return renderToStaticMarkup(createElement(SearchTasksSkeleton));
}

describe("SearchTasksSkeleton", () => {
  it("renders a labelled busy status with shimmering task rows", () => {
    const html = render();

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем задачи"');
    expect(html).toContain('role="status"');
    expect(html).toContain("skeleton-shimmer");
    expect(html).toContain("mx-[15px] h-[18px] w-1/2 rounded-[6px]");
    expect(html).toContain("rounded-[25px] bg-app-card px-[15px] py-[15px]");
    expect(html).toContain("min-h-[67px]");
    expect(html.match(/min-h-\[67px\]/g)?.length).toBe(3);
    expect(html.match(/border-b border-app-stroke/g)?.length).toBe(2);
  });

  it("does not expose results or retry copy", () => {
    const html = render();

    expect(html).not.toContain("Задачи на");
    expect(html).not.toContain("Повторить");
  });
});
