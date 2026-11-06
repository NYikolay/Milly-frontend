import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuickAddChips } from "./quick-add-chips";
import type { QuickAddChipsProps } from "./quick-add-chips";

function render(overrides: Partial<QuickAddChipsProps> = {}) {
  return renderToStaticMarkup(
    createElement(QuickAddChips, {
      labels: [],
      now: new Date("2026-11-05T13:07:42Z"),
      timeZone: "Europe/Moscow",
      selectedLabelIds: [],
      priority: "important_not_urgent",
      dueDate: "2026-11-05",
      dueTime: "16:00",
      isRecurring: false,
      remindersEnabled: true,
      beforeDueEnabled: true,
      scheduledEnabled: false,
      onOpenStep: () => {},
      ...overrides,
    }),
  );
}

describe("QuickAddChips", () => {
  it("renders date, labels, priority and reminder chips without extra icons", () => {
    const html = render();

    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain("P2");
    expect(html).toContain("Напоминание");
    expect(html).toContain("calendar.svg");
    expect(html).not.toContain("flag.svg");
    expect(html).not.toContain("clock.svg");
  });

  it("uses the home menu spacing and compact icons", () => {
    const html = render();

    expect(html).toContain("gap-[5px]");
    expect(html).toContain("size-[18px]");
    expect(html).toContain("size-6");
  });

  it("uses the compact repeat icon when recurring", () => {
    const html = render({ isRecurring: true });

    expect(html).toContain("size-[15px]");
  });
});
