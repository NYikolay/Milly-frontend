import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KeyboardSpacer } from "./bottom-sheet";

describe("KeyboardSpacer", () => {
  it("reserves the keyboard inset as a shrinkable flex item", () => {
    const html = renderToStaticMarkup(
      createElement(KeyboardSpacer, { height: 300 }),
    );

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('class="shrink-0"');
    expect(html).toContain('data-keyboard-spacer=""');
    expect(html).toContain("height:300px");
  });

  it("collapses to zero when the keyboard is closed", () => {
    const html = renderToStaticMarkup(
      createElement(KeyboardSpacer, { height: 0 }),
    );

    expect(html).toContain("height:0px");
  });
});
