import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BottomSheetAction } from "./bottom-sheet";

describe("BottomSheetAction", () => {
  it("uses the accent tone by default", () => {
    const html = renderToStaticMarkup(
      createElement(BottomSheetAction, null, "Сбросить"),
    );

    expect(html).toContain("text-app-accent");
    expect(html).not.toContain("text-app-destructive");
  });

  it("uses the destructive tone when requested", () => {
    const html = renderToStaticMarkup(
      createElement(BottomSheetAction, { tone: "destructive" }, "Сбросить"),
    );

    expect(html).toContain("text-app-destructive");
    expect(html).not.toContain("text-app-accent");
  });
});
