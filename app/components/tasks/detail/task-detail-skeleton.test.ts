import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskDetailSkeleton } from "./task-detail-skeleton";

describe("TaskDetailSkeleton", () => {
  it("renders a busy detail skeleton", () => {
    const html = renderToStaticMarkup(createElement(TaskDetailSkeleton));
    expect(html).toContain('aria-label="Загружаем задачу"');
    expect(html).toContain('aria-busy="true"');
    expect(html.match(/h-\[47px\]/g)?.length).toBe(5);
  });
});
