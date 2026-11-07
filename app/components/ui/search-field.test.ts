import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchField } from "./search-field";

function render(value = "", variant?: "track" | "stroke") {
  return renderToStaticMarkup(
    createElement(SearchField, {
      ariaLabel: "Поиск меток",
      onChange: () => {},
      value,
      variant,
    }),
  );
}

describe("SearchField", () => {
  it("renders the search field geometry and icon", () => {
    const html = render();

    expect(html).toContain('type="search"');
    expect(html).toContain('placeholder="Поиск"');
    expect(html).toContain('aria-label="Поиск меток"');
    expect(html).toContain("search.svg");
    expect(html).toContain("h-[45px]");
    expect(html).toContain("rounded-[25px]");
    expect(html).toContain("bg-app-track");
    expect(html).toContain("px-[15px]");
    expect(html).toContain("gap-[10px]");
    expect(html).toContain("size-5");
    expect(html).toContain("text-app-text-secondary");
  });

  it("renders the controlled value", () => {
    expect(render("работа")).toContain('value="работа"');
  });

  it("keeps the track surface by default", () => {
    const html = render("");

    expect(html).toContain("bg-app-track");
    expect(html).not.toContain("bg-app-stroke");
  });

  it("uses the stroke surface on the search page", () => {
    const html = render("", "stroke");

    expect(html).toContain("bg-app-stroke");
    expect(html).not.toContain("bg-app-track");
  });
});
