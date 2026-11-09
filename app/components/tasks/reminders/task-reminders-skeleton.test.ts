import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskRemindersSkeleton } from "./task-reminders-skeleton";

describe("TaskRemindersSkeleton", () => {
  it("renders a status region with the expected label", () => {
    const html = renderToStaticMarkup(createElement(TaskRemindersSkeleton));

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем напоминания"');
  });

  it("repeats the page geometry", () => {
    const html = renderToStaticMarkup(createElement(TaskRemindersSkeleton));

    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[58px]");
    expect(html).toContain("rounded-[25px]");
  });
});
