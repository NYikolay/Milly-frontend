import { createElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { TaskResponse } from "~/lib/tasks/types";

import { TaskDueSheet, type TaskDueSheetProps } from "./task-due-sheet";

const sheet = vi.hoisted(() => ({
  open: false,
  title: "",
  showCloseButton: false,
  swipeToClose: false,
  panelAnimateLayout: false,
  bodyClassName: "",
}));

vi.mock("~/components/ui/bottom-sheet", async (importActual) => {
  const actual = await importActual<
    typeof import("~/components/ui/bottom-sheet")
  >();

  return {
    ...actual,
    BottomSheet: (props: {
      open: boolean;
      title: string;
      showCloseButton?: boolean;
      swipeToClose?: boolean;
      panelAnimateLayout?: boolean;
      bodyClassName?: string;
      children: ReactNode;
    }) => {
      sheet.open = props.open;
      sheet.title = props.title;
      sheet.showCloseButton = props.showCloseButton === true;
      sheet.swipeToClose = props.swipeToClose === true;
      sheet.panelAnimateLayout = props.panelAnimateLayout === true;
      sheet.bodyClassName = props.bodyClassName ?? "";

      return createElement("div", null, props.children);
    },
  };
});

const NOW = new Date("2026-11-08T10:00:00.000Z");

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 42,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T13:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T09:00:00.000Z",
    updated_at: "2026-11-08T09:00:00.000Z",
    ...overrides,
  };
}

function render(props: Partial<TaskDueSheetProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskDueSheet, {
      open: true,
      task: task(),
      timeZone: "Europe/Moscow",
      now: NOW,
      isPending: false,
      error: null,
      onOpenChange: () => {},
      onSave: () => {},
      ...props,
    }),
  );
}

describe("TaskDueSheet", () => {
  it("configures the bottom sheet for this step", () => {
    render();

    expect(sheet.open).toBe(true);
    expect(sheet.title).toBe("Дата и время задачи");
    expect(sheet.showCloseButton).toBe(true);
    expect(sheet.swipeToClose).toBe(true);
    expect(sheet.panelAnimateLayout).toBe(true);
    expect(sheet.bodyClassName).toBe("p-[15px]");
  });

  it("passes the closed state through", () => {
    render({ open: false });

    expect(sheet.open).toBe(false);
  });

  it("renders the calendar, time, toggle and hint", () => {
    const html = render();

    expect(html).toContain("Ноябрь 2026");
    expect(html).toContain('type="time"');
    expect(html).toContain("Регулярная задача");
    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain("Готово");
  });

  it("initializes the switch from a regular task", () => {
    const html = render({ task: task({ recurrence: "regular" }) });

    expect(html).toContain('aria-checked="true"');
  });

  it("keeps the switch on for a periodic task", () => {
    const html = render({ task: task({ recurrence: "periodic" }) });

    expect(html).toContain('aria-checked="true"');
  });

  it("shows the update error and pending state", () => {
    const html = render({
      isPending: true,
      error: "Не удалось изменить срок. Попробуйте ещё раз.",
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Не удалось изменить срок. Попробуйте ещё раз.");
    expect(html).toMatch(
      /<button(?=[^>]*disabled="")[^>]*>Готово<\/button>/,
    );
  });
});
