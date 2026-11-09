import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DueStep } from "./due-step";
import type { DueStepProps, DueStepValue } from "./due-step";

const now = new Date("2026-11-05T13:07:42Z");

function render(
  overrides: Partial<DueStepValue> = {},
  props: Partial<DueStepProps> = {},
) {
  return renderToStaticMarkup(
    createElement(DueStep, {
      value: {
        date: "2026-11-05",
        time: "16:00",
        isRecurring: false,
        ...overrides,
      },
      timeZone: "Europe/Moscow",
      now,
      onChange: () => {},
      onApply: () => {},
      ...props,
    }),
  );
}

describe("DueStep", () => {
  it("renders the calendar, time input, toggle and one-off hint", () => {
    const html = render();

    expect(html).toContain("Ноябрь 2026");
    expect(html).toContain('type="time"');
    expect(html).toContain("Регулярная задача");
    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain("Готово");
  });

  it("keeps the divider above time and removes bottom borders", () => {
    const html = render();

    expect(html).toContain("border-t border-app-stroke");
    expect(html).not.toContain("border-b");
  });

  it("renders the recurring hint", () => {
    const html = render({
      date: "2026-11-11",
      isRecurring: true,
    });

    expect(html).toContain("С 11.11.2026, ежедневно в 16:00");
  });

  it("renders the one-off hint for another date", () => {
    const html = render({ date: "2026-11-11" });

    expect(html).toContain("На 11.11.2026, 16:00");
  });

  it("clamps a past date to today", () => {
    const html = render({ date: "2020-01-01" });

    expect(html).toContain("Сегодня, 16:00");
    expect(html).not.toContain("01.01.2020");
  });

  it("disables apply and shows the helper when the time is empty", () => {
    const html = render({ time: "" });

    expect(html).toContain("Укажите время");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Готово<\/button>/);
  });

  it("keeps apply enabled when the time is valid", () => {
    const html = render();

    expect(html).not.toContain("Укажите время");
    expect(html).not.toMatch(
      /<button[^>]*disabled=""[^>]*>Готово<\/button>/,
    );
  });

  it("uses today as the minimum date", () => {
    const html = render();

    expect(html).toMatch(
      /<button[^>]*aria-label="Предыдущий месяц"[^>]*disabled=""/,
    );
  });

  it("shows the update error above the apply button", () => {
    const html = render(
      {},
      { error: "Не удалось изменить срок. Попробуйте ещё раз." },
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Не удалось изменить срок. Попробуйте ещё раз.");
    expect(html.indexOf('role="alert"')).toBeLessThan(
      html.indexOf("Готово"),
    );
  });

  it("disables apply and marks it busy while pending", () => {
    const html = render({}, { isPending: true });

    expect(html).toMatch(
      /<button(?=[^>]*aria-busy="true")(?=[^>]*disabled="")[^>]*>Готово<\/button>/,
    );
  });
});
