import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskLabelsSkeleton } from "./task-labels-skeleton";

describe("TaskLabelsSkeleton", () => {
  it("renders a status region with the expected label", () => {
    const html = renderToStaticMarkup(createElement(TaskLabelsSkeleton));

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем метки"');
  });

  it("repeats the page geometry", () => {
    const html = renderToStaticMarkup(createElement(TaskLabelsSkeleton));

    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[50px]");
    expect(html).toContain("h-[45px]");
    expect(html).toContain("h-[134px]");
    expect(html).toContain("rounded-[25px]");
  });
});
