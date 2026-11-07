import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a decorative shimmering block with the requested classes", () => {
    const html = renderToStaticMarkup(
      createElement(Skeleton, { className: "h-4 w-10 rounded" }),
    );

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("skeleton-shimmer");
    expect(html).toContain("h-4 w-10 rounded");
  });
});
