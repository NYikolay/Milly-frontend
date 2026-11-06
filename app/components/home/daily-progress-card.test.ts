import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DailyProgressCard } from "./daily-progress-card";

describe("DailyProgressCard", () => {
  it("renders the user avatar when a photo url is available", () => {
    const html = renderToStaticMarkup(
      createElement(DailyProgressCard, {
        completed: 10,
        total: 15,
        photoUrl: "https://t.me/i/userpic/320/user.jpg",
      }),
    );

    expect(html).toContain('src="https://t.me/i/userpic/320/user.jpg"');
    expect(html).toContain("size-[30px]");
    expect(html).toContain("rounded-full");
    expect(html).toContain("object-cover");
    expect(html).toContain("Всё идёт по плану");
  });

  it("keeps the card without an avatar when the photo url is missing", () => {
    const html = renderToStaticMarkup(
      createElement(DailyProgressCard, {
        completed: 10,
        total: 15,
        photoUrl: null,
      }),
    );

    expect(html).not.toContain("<img");
    expect(html).toContain("Всё идёт по плану");
    expect(html).toContain("10 из 15 задач выполнено");
  });
});
