import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { DailyProgressCard } from "./daily-progress-card";
import type { DailyProgressCardProps } from "./daily-progress-card";

function renderCard(props: DailyProgressCardProps): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(DailyProgressCard, props),
    ),
  );
}

describe("DailyProgressCard", () => {
  it("renders the user avatar when a photo url is available", () => {
    const html = renderCard({
      completed: 10,
      total: 15,
      photoUrl: "https://t.me/i/userpic/320/user.jpg",
    });

    expect(html).toContain('src="https://t.me/i/userpic/320/user.jpg"');
    expect(html).toContain("size-[30px]");
    expect(html).toContain("rounded-full");
    expect(html).toContain("object-cover");
    expect(html).toContain("Всё идёт по плану");
    expect(html).toContain('href="/tasks"');
  });

  it("keeps the card without an avatar when the photo url is missing", () => {
    const html = renderCard({
      completed: 10,
      total: 15,
      photoUrl: null,
    });

    expect(html).not.toContain("<img");
    expect(html).toContain("Всё идёт по плану");
    expect(html).toContain("10 из 15 задач выполнено");
  });

  it("renders a loading state without progress copy", () => {
    const html = renderCard({
      completed: 0,
      status: "loading",
      total: 0,
    });

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Загружаем прогресс");
    expect(html).toContain("skeleton-shimmer");
    expect(html).not.toContain("Всё идёт по плану");
    expect(html).not.toContain("Чем займёмся?");
  });

  it("renders an error state that still opens the tasks screen", () => {
    const html = renderCard({
      completed: 0,
      status: "error",
      total: 0,
    });

    expect(html).toContain("Не удалось загрузить прогресс");
    expect(html).toContain("Откройте задачи и повторите попытку");
    expect(html).toContain('href="/tasks"');
  });
});
