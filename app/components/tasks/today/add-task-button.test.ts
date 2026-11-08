import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AddTaskButton } from "./add-task-button";

describe("AddTaskButton", () => {
  function render(hidden = false): string {
    return renderToStaticMarkup(
      createElement(AddTaskButton, { onClick: () => {}, hidden }),
    );
  }

  it("renders an accessible add-task button", () => {
    const html = render();

    expect(html).toContain('aria-label="Добавить задачу"');
    expect(html).toContain('type="button"');
    expect(html).toContain("edit.svg");
  });

  it("stays fixed above the bottom navigation and aligned to the app frame", () => {
    const html = render();

    expect(html).toContain("fixed inset-x-0");
    expect(html).toContain("max-w-md");
    expect(html).toContain("justify-end px-4");
    expect(html).toContain("calc(max(30px, var(--app-inset-bottom)) + 80px)");
  });

  it("uses the 50px circular card style", () => {
    const html = render();

    expect(html).toContain("size-[50px]");
    expect(html).toContain("rounded-full");
    expect(html).toContain("bg-app-card");
    expect(html).toContain("border-app-fab-stroke");
    expect(html).toContain("text-app-accent");
    expect(html).toContain("shadow-[0_0_20px_rgba(0,0,0,0.25)]");
  });

  it("fades out and becomes inert when hidden", () => {
    const html = render(true);
    const rootTag = html.slice(0, html.indexOf(">") + 1);
    const buttonTag = /<button[^>]*>/.exec(html)?.[0] ?? "";

    expect(rootTag).toContain("opacity-0");
    expect(rootTag).toContain('aria-hidden="true"');
    expect(rootTag).toContain("inert");
    expect(buttonTag).not.toContain("pointer-events-auto");
  });

  it("stays interactive when visible", () => {
    const buttonTag = /<button[^>]*>/.exec(render())?.[0] ?? "";

    expect(buttonTag).toContain("pointer-events-auto");
  });
});
