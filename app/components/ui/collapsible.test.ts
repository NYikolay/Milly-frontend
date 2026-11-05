import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Collapsible } from "./collapsible";

describe("Collapsible", () => {
  it("renders children when open", () => {
    const html = renderToStaticMarkup(
      createElement(Collapsible, {
        open: true,
        children: createElement("p", null, "Настройки"),
      }),
    );

    expect(html).toContain("Настройки");
    expect(html).toContain("overflow-hidden");
  });

  it("does not render children when closed", () => {
    const html = renderToStaticMarkup(
      createElement(Collapsible, {
        open: false,
        children: createElement("p", null, "Настройки"),
      }),
    );

    expect(html).not.toContain("Настройки");
  });
});
