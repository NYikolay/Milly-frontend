import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OptionChip } from "./option-chip";

describe("OptionChip", () => {
  it("renders the label and active state", () => {
    const html = renderToStaticMarkup(
      createElement(OptionChip, {
        icon: createElement("span"),
        label: "Сегодня, 16:00",
        active: true,
        onClick: () => {},
        ariaLabel: "Изменить дату и время",
      }),
    );

    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain('aria-label="Изменить дату и время"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("text-app-accent");
    expect(html).toContain("border-app-accent");
    expect(html).not.toContain("text-app-text");
    expect(html).not.toContain("border-app-stroke");
  });

  it("renders the inactive state without accent color classes", () => {
    const html = renderToStaticMarkup(
      createElement(OptionChip, {
        icon: createElement("span"),
        label: "Напоминание",
        onClick: () => {},
        ariaLabel: "Настроить напоминания",
      }),
    );

    expect(html).toContain("Напоминание");
    expect(html).toContain('aria-label="Настроить напоминания"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("text-app-text");
    expect(html).toContain("border-app-stroke");
    expect(html).not.toContain("text-app-accent");
    expect(html).not.toContain("border-app-accent");
  });
});
