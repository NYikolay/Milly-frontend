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
});
