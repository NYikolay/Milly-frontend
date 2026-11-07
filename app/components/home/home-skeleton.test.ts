import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeSkeleton } from "./home-skeleton";

describe("HomeSkeleton", () => {
  it("mirrors the home dashboard structure with shimmering blocks", () => {
    const html = renderToStaticMarkup(createElement(HomeSkeleton));

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем главный экран"');
    expect(html).toContain("skeleton-shimmer");
    expect(html).toContain("size-[50px]");
    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[24px]");
    expect(html).toContain("h-[18px]");
    expect(html).toContain("h-[104px]");
    expect(html).toContain("h-[45px]");
    expect(html).toContain("h-[50px]");
    expect(html).toContain("h-[67px]");
    expect(html).toContain("rounded-[25px] bg-app-card p-[15px]");
  });

  it("does not expose greeting or progress copy", () => {
    const html = renderToStaticMarkup(createElement(HomeSkeleton));

    expect(html).not.toContain("Привет");
    expect(html).not.toContain("Всё идёт по плану");
    expect(html).not.toContain("Чем займёмся?");
    expect(html).not.toContain("FAQ");
  });
});
