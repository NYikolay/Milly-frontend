import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchTasksError } from "./search-tasks-error";

function render(): string {
  return renderToStaticMarkup(
    createElement(SearchTasksError, { onRetry: () => {} }),
  );
}

describe("SearchTasksError", () => {
  it("renders a retry card as an alert", () => {
    const html = render();

    expect(html).toContain("Не удалось загрузить задачи");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Повторить");
    expect(html).toContain(
      "flex flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]",
    );
    expect(html).toContain("text-[17px] font-semibold leading-[1.4] text-app-text");
    expect(html).toContain("text-[15px] font-semibold text-app-accent");
  });
});
