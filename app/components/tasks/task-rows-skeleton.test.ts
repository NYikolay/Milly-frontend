import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskRowsSkeleton } from "./task-rows-skeleton";

describe("TaskRowsSkeleton", () => {
  it("renders rows with separators except after the last one", () => {
    const html = renderToStaticMarkup(
      createElement(TaskRowsSkeleton, { rows: 3 }),
    );

    expect(html.match(/min-h-\[67px\]/g)?.length).toBe(3);
    expect(html.match(/border-b border-app-stroke/g)?.length).toBe(2);
    expect(html).toContain("rounded-[25px] bg-app-card px-[15px] py-[15px]");
  });
});
