import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { createQuickTaskDefaults } from "~/lib/tasks/quick-task-schema";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";

import { QuickAddForm } from "./quick-add-form";

function Harness({ title = "" }: { title?: string }) {
  const draft = {
    ...createQuickTaskDefaults(
      new Date("2026-11-05T13:07:42Z"),
      "Europe/Moscow",
    ),
    title,
  };
  const form = useForm<QuickTaskDraft>({
    defaultValues: draft,
    values: draft,
  });

  return createElement(QuickAddForm, {
    draft,
    error: null,
    form,
    isPending: false,
    labels: [],
    now: new Date("2026-11-05T13:07:42Z"),
    onOpenStep: () => {},
    onSubmit: () => {},
    onTitleChange: () => {},
    onVoice: () => {},
    timeZone: "Europe/Moscow",
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

  it("renders the title and counter from the draft", () => {
    const html = renderToStaticMarkup(createElement(Harness, { title: "Тест" }));

    expect(html).toContain("Тест");
    expect(html).toContain("4/120");
  });
});
