import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BottomNavigationDock } from "./bottom-navigation-dock";

describe("BottomNavigationDock", () => {
  function getRootTag(html: string): string {
    return html.slice(0, html.indexOf(">") + 1);
  }

  it("renders the navigation visible by default", () => {
    const html = renderToStaticMarkup(createElement(BottomNavigationDock));
    const rootTag = getRootTag(html);

    expect(html).toContain("Основная навигация");
    expect(html).toContain('aria-current="page"');
    expect(rootTag).not.toContain("pointer-events-none");
    expect(rootTag).not.toContain("translate-y-full");
    expect(rootTag).not.toContain("opacity-0");
    expect(rootTag).not.toContain("aria-hidden");
    expect(rootTag).not.toContain("inert");
  });

  it("slides the navigation away and makes it inert when hidden", () => {
    const html = renderToStaticMarkup(
      createElement(BottomNavigationDock, { hidden: true }),
    );
    const rootTag = getRootTag(html);

    expect(rootTag).toContain("pointer-events-none");
    expect(rootTag).toContain("translate-y-full");
    expect(rootTag).toContain("opacity-0");
    expect(rootTag).toContain('aria-hidden="true"');
    expect(rootTag).toContain("inert");
  });
});
