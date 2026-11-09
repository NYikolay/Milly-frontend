import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LabelResponse } from "~/lib/labels/types";
import type { ProjectResponse } from "~/lib/projects/types";

import { QuickAddChips } from "./quick-add-chips";
import type { QuickAddChipsProps } from "./quick-add-chips";

const projectFixture: ProjectResponse = {
  id: 10,
  name: "Личное",
  description: null,
  icon: "book",
  color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
  progress: { total: 0, completed: 0, remaining: 0 },
  archived_at: null,
  created_at: "2026-11-06T09:00:00Z",
  updated_at: "2026-11-06T09:00:00Z",
};

const labelFixture: LabelResponse = {
  id: 3,
  name: "Личное",
  color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
  created_at: "2026-11-05T09:00:00Z",
  updated_at: "2026-11-05T09:00:00Z",
};

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
  it("renders date, labels, project, priority and reminder chips without extra icons", () => {
    const html = render();

    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain("Без проекта");
    expect(html).toContain("P2");
    expect(html).toContain("Напоминание");
    expect(html).toContain("calendar.svg");
    expect(html).not.toContain("flag.svg");
    expect(html).not.toContain("clock.svg");
  });

  it("renders the no-project chip after labels by default", () => {
    const html = render();

    expect(html).toContain("Без проекта");
    expect(html).toContain("no-project.svg");
    expect(html).toContain("bg-app-track");
    expect(html).toContain("text-app-text");
    expect(html).toContain("size-7");
    expect(html).not.toContain("file.svg");
    expect(html.indexOf("Выбрать метки")).toBeLessThan(
      html.indexOf("Выбрать проект"),
    );
  });

  it("renders the selected project name and badge", () => {
    const html = render({ project: projectFixture });

    expect(html).toContain("Личное");
    expect(html).toContain('aria-label="Проект: Личное"');
    expect(html).toContain("book.svg");
    expect(html).toContain("size-7");
    expect(html).toContain("text-white");
    expect(html).toContain("background-color:#16A34A");
    expect(html).not.toContain("Без проекта");
  });

  it("renders the project chip after the labels chip", () => {
    const html = render({ project: projectFixture });

    expect(html.indexOf("Выбрать метки")).toBeLessThan(
      html.indexOf('aria-label="Проект: Личное"'),
    );
    expect(html.indexOf('aria-label="Проект: Личное"')).toBeLessThan(
      html.indexOf("Автонапоминания"),
    );
  });

  it("keeps the existing tag icon in the selected labels chip", () => {
    const html = render({
      labels: [labelFixture],
      selectedLabelIds: [3],
    });

    expect(html).toContain("tag.svg");
    expect(html).not.toContain("tag-raw.svg");
  });

  it("uses the home menu spacing and compact icons", () => {
    const html = render();

    expect(html).toContain("gap-[5px]");
    expect(html).toContain("size-[18px]");
    expect(html).toContain("size-4.5");
  });

  it("uses the compact repeat icon when recurring", () => {
    const html = render({ isRecurring: true });

    expect(html).toContain("repeat.svg");
    expect(html).toContain("size-[18px]");
  });
});
