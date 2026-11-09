import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectIconBadge } from "./project-icon-badge";

function render(colorHex: string | null, icon = "/icons/book.svg") {
  return renderToStaticMarkup(
    createElement(ProjectIconBadge, { colorHex, icon }),
  );
}

describe("ProjectIconBadge", () => {
  it("renders a 28px colored circle with a white 18px glyph", () => {
    const html = render("#16A34A");

    expect(html).toContain("size-7");
    expect(html).toContain("rounded-full");
    expect(html).toContain("p-[5px]");
    expect(html).toContain("size-4.5");
    expect(html).toContain("text-white");
    expect(html).toContain("background-color:#16A34A");
    expect(html).toContain("book.svg");
  });

  it("renders the no-project badge with app tokens and the same glyph size", () => {
    const html = render(null, "/icons/no-project.svg");

    expect(html).toContain("bg-app-track");
    expect(html).toContain("text-app-text");
    expect(html).not.toContain("background-color");
    expect(html).toContain("no-project.svg");
    expect(html).toContain("size-4.5");
  });
});
