import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("exposes the switch role and checked state", () => {
    const html = renderToStaticMarkup(
      createElement(Switch, {
        checked: true,
        onCheckedChange: () => {},
        label: "Регулярная задача",
      }),
    );

    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-label="Регулярная задача"');
  });

  it("keeps a 44px hit area around the 48x28 track", () => {
    const html = renderToStaticMarkup(
      createElement(Switch, {
        checked: false,
        onCheckedChange: () => {},
        label: "Регулярная задача",
      }),
    );

    expect(html).toMatch(/<button[^>]*class="[^"]*h-11[^"]*"/);
    expect(html).toMatch(/<span[^>]*class="[^"]*h-7 w-12[^"]*"/);
  });
});
