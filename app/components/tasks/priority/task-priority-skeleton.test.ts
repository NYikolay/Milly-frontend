import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskPrioritySkeleton } from "./task-priority-skeleton";

describe("TaskPrioritySkeleton", () => {
  it("renders a status region with the expected label", () => {
    const html = renderToStaticMarkup(createElement(TaskPrioritySkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем приоритет"');
  });

  it("repeats the page geometry", () => {
    const html = renderToStaticMarkup(createElement(TaskPrioritySkeleton));
    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[218px]");

    const cardTag = html
      .split("<")
      .find((tag) => tag.includes("h-[218px]"));
    expect(cardTag).toContain("w-full");
    expect(cardTag).toContain("rounded-[25px]");

    const explanation = html.slice(html.indexOf("gap-[5px]"));
    expect(explanation.match(/h-\[13px\]/g)).toHaveLength(2);
  });
});
