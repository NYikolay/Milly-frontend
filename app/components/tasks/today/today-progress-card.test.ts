import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TodayProgressCard } from "./today-progress-card";

describe("TodayProgressCard", () => {
  it("renders the default progress copy", () => {
    const html = renderToStaticMarkup(
      createElement(TodayProgressCard, { total: 6, completed: 2 }),
    );

    expect(html).toContain("Всё идёт по плану");
    expect(html).toContain("2 из 6 задач выполнено");
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain("check-check.svg");
    expect(html).toContain("bg-app-progress-track");
  });

  it("renders the all-completed copy and a full bar", () => {
    const html = renderToStaticMarkup(
      createElement(TodayProgressCard, { total: 20, completed: 20 }),
    );

    expect(html).toContain("На сегодня всё 🥳");
    expect(html).toContain("20 из 20 задач выполнено ✌");
    expect(html).toContain('aria-valuenow="20"');
    expect(html).toContain("width:100%");
  });
});
