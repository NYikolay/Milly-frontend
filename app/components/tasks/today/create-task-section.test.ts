import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CreateTaskSection } from "./create-task-section";

function render(showSearchCard = false): string {
  return renderToStaticMarkup(
    createElement(CreateTaskSection, {
      showSearchCard,
      onVoice: () => {},
      onInteractive: () => {},
      onSearch: () => {},
    }),
  );
}

function countButtons(html: string): number {
  return html.match(/<button /g)?.length ?? 0;
}

describe("CreateTaskSection", () => {
  it("renders the heading and both primary cards", () => {
    const html = render();

    expect(html).toContain("Создать задачу");
    expect(html).toContain("Голосом");
    expect(html).toContain(
      "Опишите словами задачу, мы добавим её в ваш список дел",
    );
    expect(html).toContain("Интерактивно");
    expect(html).toContain("Заполните форму для добавления задачи");
    expect(html).toContain("📝");
  });

  it("renders the two-column layout and card styling", () => {
    const html = render();

    expect(html).toContain("min-h-[165px]");
    expect(html).toContain("grid grid-cols-2 gap-[10px]");
    expect(html).toContain("rounded-[25px] bg-app-card");
    expect(html).toContain("focus-visible:outline-app-accent");
  });

  it("hides the search card when showSearchCard is false", () => {
    const html = render(false);

    expect(html).not.toContain("🔍");
    expect(html).not.toContain("Поиск задач");
    expect(html).not.toContain("Ищите, фильтруйте и сортируйте ваши задачи");
    expect(countButtons(html)).toBe(2);
  });

  it("renders the search card when showSearchCard is true", () => {
    const html = render(true);

    expect(html).toContain("🔍");
    expect(html).toContain("Поиск задач");
    expect(html).toContain("Ищите, фильтруйте и сортируйте ваши задачи");
  });

  it("renders every card as a button with decorative emojis", () => {
    const html = render(true);

    expect(countButtons(html)).toBe(3);
    expect(html.match(/type="button"/g)).toHaveLength(3);
    expect(html).toContain(
      'aria-hidden="true" class="text-[40px] leading-none">📝',
    );
    expect(html).toContain(
      'aria-hidden="true" class="text-[40px] leading-none">🔍',
    );
  });
});
