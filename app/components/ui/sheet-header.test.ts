import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SheetHeader } from "./sheet-header";

const noop = () => {};

describe("SheetHeader", () => {
  it("renders a centered title, divider and no close button", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Добавление задачи",
      }),
    );

    expect(html).toContain("Добавление задачи");
    expect(html).toContain("border-b");
    expect(html).toContain("left-1/2");
    expect(html).toContain("-translate-x-1/2");
    expect(html).not.toContain('aria-label="Закрыть"');
    expect(html).not.toContain('aria-label="Назад"');
  });

  it("renders the back button when onBack is provided", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Метки",
        onBack: noop,
      }),
    );

    expect(html).toContain('aria-label="Назад"');
    expect(html).not.toContain('aria-label="Закрыть"');
  });

  it("renders the close button when onClose is provided", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Дата и время задачи",
        onClose: noop,
      }),
    );

    expect(html).toContain('aria-label="Закрыть"');
    expect(html).not.toContain('aria-label="Назад"');
  });

  it("disables touch actions on the header when a drag handler is provided", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Дата и время задачи",
        onPointerDown: noop,
      }),
    );

    expect(html).toContain("touch-action:none");
  });
});
