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
    expect(html).toContain("text-app-accent");
  });
});
