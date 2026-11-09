import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskPriorityView, type TaskPriorityViewProps } from "./task-priority-view";

function render(props: Partial<TaskPriorityViewProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskPriorityView, {
      priority: "neither",
      onSelect: () => {},
      ...props,
    }),
  );
}

describe("TaskPriorityView", () => {
  it("renders the header and subtitle", () => {
    const html = render();
    expect(html).toContain("Приоритет задачи");
    expect(html).toContain(
      "Выберите приоритет задачи по Матрице Эйзенхауэра",
    );
  });

  it("renders all four priority options and one selected radio", () => {
    const html = render({ priority: "important_not_urgent" });
    expect(html).toContain("Срочные и важные");
    expect(html).toContain("Важные, но не срочные");
    expect(html).toContain("Срочные, но не важные");
    expect(html).toContain("Не срочные и не важные");
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)).toHaveLength(4);

    const radiogroupTag = html
      .split("<")
      .find((tag) => tag.includes('role="radiogroup"'));
    expect(radiogroupTag).toContain('aria-label="Приоритет задачи"');
    expect(html.match(/type="button"/g)).toHaveLength(4);

    const buttons = html.split("<button").slice(1);
    expect(buttons).toHaveLength(4);

    const checkedButtons = buttons.filter((button) =>
      button.includes('aria-checked="true"'),
    );
    const uncheckedButtons = buttons.filter((button) =>
      button.includes('aria-checked="false"'),
    );

    expect(checkedButtons).toHaveLength(1);
    expect(checkedButtons[0]).toContain("Важные, но не срочные");
    expect(uncheckedButtons).toHaveLength(3);
  });

  it("shows the Eisenhower explanation", () => {
    expect(render()).toContain(
      "Матрица Эйзенхауэра - это простой и полезный метод тайм-менеджмента.",
    );
  });

  it("draws dividers only between rows", () => {
    expect(render().match(/border-b border-app-stroke/g)).toHaveLength(3);
  });

  it("uses app tokens and no dark variants", () => {
    const html = render();
    expect(html).toContain("bg-app-card");
    expect(html).toContain("text-app-text-secondary");
    expect(html).toContain("text-app-accent");
    expect(html).not.toContain("dark:");
  });
});
