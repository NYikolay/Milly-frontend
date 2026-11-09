import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskProjectSkeleton } from "./task-project-skeleton";

describe("TaskProjectSkeleton", () => {
  it("renders a status region with the expected label", () => {
    const html = renderToStaticMarkup(createElement(TaskProjectSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем проект"');
  });

  it("repeats the page geometry", () => {
    const html = renderToStaticMarkup(createElement(TaskProjectSkeleton));
    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[265px]");
    expect(html).toContain("rounded-[25px]");
  });
});
