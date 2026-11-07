import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchHeader } from "./search-header";

function render() {
  return renderToStaticMarkup(createElement(SearchHeader));
}

describe("SearchHeader", () => {
  it("renders the title and subtitle", () => {
    const html = render();

    expect(html).toContain("Поиск задач");
    expect(html).toContain(
      "Ищите, фильтруйте и сортируйте старые или новые задачи",
    );
  });

  it("uses the Figma typography and spacing", () => {
    const html = render();

    expect(html).toContain("text-[24px]");
    expect(html).toContain("font-bold");
    expect(html).toContain("leading-[29px]");
    expect(html).toContain("tracking-[-0.8px]");
    expect(html).toContain("text-[13px]");
    expect(html).toContain("leading-[1.4]");
    expect(html).toContain("text-app-text-secondary");
    expect(html).toContain("px-[15px]");
    expect(html).toContain("gap-[5px]");
  });
});
