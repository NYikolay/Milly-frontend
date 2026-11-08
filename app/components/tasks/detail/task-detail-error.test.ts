import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskDetailError } from "./task-detail-error";

describe("TaskDetailError", () => {
  it("renders not found with a back action", () => {
    const html = renderToStaticMarkup(
      createElement(TaskDetailError, {
        kind: "not-found",
        onBack: () => {},
        onRetry: () => {},
      }),
    );
    expect(html).toContain("Задача не найдена");
    expect(html).toContain("Назад");
    expect(html).not.toContain("Повторить");
  });

  it("renders a load error with retry", () => {
    const html = renderToStaticMarkup(
      createElement(TaskDetailError, {
        kind: "load-error",
        onBack: () => {},
        onRetry: () => {},
      }),
    );
    expect(html).toContain("Не удалось загрузить задачу");
    expect(html).toContain("Повторить");
  });
});
