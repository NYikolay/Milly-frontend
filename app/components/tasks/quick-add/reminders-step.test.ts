import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RemindersStep } from "./reminders-step";

const defaults = {
  remindersEnabled: true,
  beforeDueEnabled: true,
  beforeDueAmount: 1,
  beforeDueUnit: "hours" as const,
  scheduledEnabled: false,
  scheduledIntervalDays: 1,
  scheduledTime: "14:00",
};

function render(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(RemindersStep, {
      value: defaults,
      onApply: () => {},
      ...overrides,
    }),
  );
}

describe("RemindersStep", () => {
  it("renders the master switch, before-due settings and apply button", () => {
    const html = render();

    expect(html).toContain("Автонапоминания");
    expect(html).toContain("До срока задачи");
    expect(html).toContain("Часов");
    expect(html).toContain("Применить");
    expect(html).not.toContain("Каждый день");
  });

  it("shows scheduled controls when the scheduled rule is on", () => {
    const html = render({
      value: { ...defaults, scheduledEnabled: true },
    });

    expect(html).toContain("По расписанию");
    expect(html).toContain("Каждый день");
    expect(html).toContain("14:00");
  });

  it("hides settings when the master switch is off", () => {
    const html = render({
      value: { ...defaults, remindersEnabled: false },
    });

    expect(html).toContain("Автонапоминания");
    expect(html).not.toContain("До срока задачи");
  });
});
