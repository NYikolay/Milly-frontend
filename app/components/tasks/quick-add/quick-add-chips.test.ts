import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuickAddChips } from "./quick-add-chips";

function render() {
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
});
