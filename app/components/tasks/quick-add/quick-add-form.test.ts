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
    onVoice: () => {},
    isPending: false,
    error: null,
  });
}

describe("QuickAddForm", () => {
  it("renders the inline Figma form with counter, mic and no description", () => {
    const html = renderToStaticMarkup(createElement(Harness));

    expect(html).toContain('class="flex flex-col gap-[10px]"');
    expect(html).toContain("0/120");
    expect(html).toContain("Запись к стоматологу завтра в 10 утра");
    expect(html).toContain('aria-label="Название задачи"');
    expect(html).toContain('aria-label="Записать голосом"');
    expect(html).toContain("Добавить задачу");
    expect(html).not.toContain("Введите быструю задачу");
    expect(html).not.toContain(">Название<");
    expect(html).toContain("h-[104px]");
    expect(html).toContain("focus-within:outline-2");
  });
});
