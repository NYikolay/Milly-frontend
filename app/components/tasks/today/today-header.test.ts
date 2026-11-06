import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TodayHeader } from "./today-header";

describe("TodayHeader", () => {
  it("renders the title and date", () => {
    const html = renderToStaticMarkup(
      createElement(TodayHeader, {
        title: "Задачи на сегодня",
        dateLabel: "Четверг, 5 ноября",
      }),
    );

    expect(html).toContain("Задачи на сегодня");
    expect(html).toContain("Четверг, 5 ноября");
    expect(html).toContain("text-[24px]");
    expect(html).toContain("tracking-[-0.8px]");
    expect(html).toContain("text-app-text-secondary");
  });
});
