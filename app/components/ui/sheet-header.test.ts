import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SheetHeader } from "./sheet-header";

const noop = () => {};

describe("SheetHeader", () => {
  it("renders a centered title, close button and divider", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Добавление задачи",
        onClose: noop,
      }),
    );

    expect(html).toContain("Добавление задачи");
    expect(html).toContain('aria-label="Закрыть"');
    expect(html).toContain("border-b");
    expect(html).not.toContain('aria-label="Назад"');
  });

  it("renders the back button when onBack is provided", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Метки",
        onClose: noop,
        onBack: noop,
      }),
    );

    expect(html).toContain('aria-label="Назад"');
  });
});
