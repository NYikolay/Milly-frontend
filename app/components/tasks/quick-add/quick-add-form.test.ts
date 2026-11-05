import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { createQuickTaskDefaults } from "~/lib/tasks/quick-task-schema";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";

import { QuickAddForm } from "./quick-add-form";

function Harness() {
  const form = useForm<QuickTaskDraft>({
    defaultValues: createQuickTaskDefaults(
      new Date("2026-11-05T13:07:42Z"),
      "Europe/Moscow",
    ),
  });

  return createElement(QuickAddForm, {
    form,
    labels: [],
    now: new Date("2026-11-05T13:07:42Z"),
    timeZone: "Europe/Moscow",
    onOpenStep: () => {},
    onSubmit: () => {},
    isPending: false,
    error: null,
  });
}

describe("QuickAddForm", () => {
  it("uses Figma label insets, field gap and inset focus ring", () => {
    const html = renderToStaticMarkup(createElement(Harness));

    expect(html).toContain('class="flex flex-col gap-[5px]"');
    expect(html).toContain(
      'class="flex items-center justify-between gap-[10px] px-[15px] text-[15px]"',
    );
    expect(html).toMatch(/<textarea[^>]*class="[^"]*-outline-offset-2/);
    expect(html).toContain("Добавить задачу");
  });
});
