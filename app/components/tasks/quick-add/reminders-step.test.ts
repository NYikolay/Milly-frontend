import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { normalizeReminderDraft, RemindersStep } from "./reminders-step";
import type { ReminderDraft } from "./reminders-step";

const defaults = {
  remindersEnabled: true,
  beforeDueEnabled: true,
  beforeDueAmount: 1,
  beforeDueUnit: "hours" as const,
  scheduledEnabled: false,
  scheduledIntervalDays: 1,
  scheduledTime: "14:00",
};

function render(
  overrides: {
    value?: Partial<ReminderDraft>;
    amountInput?: string;
  } = {},
) {
  return renderToStaticMarkup(
    createElement(RemindersStep, {
      value: { ...defaults, ...overrides.value },
      amountInput: overrides.amountInput ?? "1",
      onChange: () => {},
      onAmountInputChange: () => {},
      onApply: () => {},
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

  it("uses the compact pill sizes and indented helpers", () => {
    const html = render();

    expect(html).toContain("rounded-[28px]");
    expect(html).toContain("text-[15px]");
    expect(html).toContain("px-[15px]");
    expect(html.match(/overflow-hidden/g)).toHaveLength(2);
  });

  it("animates the scheduled block with its own collapsible", () => {
    const html = render({
      value: { scheduledEnabled: true },
    });

    expect(html.match(/overflow-hidden/g)).toHaveLength(3);
  });

  it("keeps focus rings visible on the amount and time pills", () => {
    const html = render({
      value: { scheduledEnabled: true },
    });

    expect(html.match(/focus-visible:outline-solid/g)).toHaveLength(2);
  });

  it("shows scheduled controls when the scheduled rule is on", () => {
    const html = render({
      value: { scheduledEnabled: true },
    });

    expect(html).toContain("По расписанию");
    expect(html).toContain("Каждый день");
    expect(html).toContain("14:00");
  });

  it("hides settings when the master switch is off", () => {
    const html = render({
      value: { remindersEnabled: false },
    });

    expect(html).toContain("Автонапоминания");
    expect(html).not.toContain("До срока задачи");
  });

  it("disables apply and shows the helper when the scheduled time is empty", () => {
    const html = render({
      value: { scheduledEnabled: true, scheduledTime: "" },
    });

    expect(html).toContain("Укажите время");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Применить<\/button>/);
  });

  it("keeps apply enabled when the scheduled time is valid", () => {
    const html = render({
      value: { scheduledEnabled: true, scheduledTime: "09:30" },
    });

    expect(html).not.toContain("Укажите время");
    expect(html).not.toMatch(
      /<button[^>]*disabled=""[^>]*>Применить<\/button>/,
    );
  });

  it("keeps an empty amount input empty and disables apply", () => {
    const html = render({ amountInput: "" });

    expect(html).toContain('value=""');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Применить<\/button>/);
  });
});

describe("normalizeReminderDraft", () => {
  it("normalizes an invalid hidden scheduled time to the default", () => {
    const draft = normalizeReminderDraft({
      ...defaults,
      scheduledEnabled: false,
      scheduledTime: "",
    });

    expect(draft.scheduledTime).toBe("14:00");
    expect(draft.scheduledEnabled).toBe(false);
  });

  it("leaves the default draft unchanged when the scheduled time is valid", () => {
    expect(normalizeReminderDraft(defaults)).toEqual(defaults);
  });
});
