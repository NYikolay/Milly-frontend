import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AppErrorDescriptor } from "~/lib/errors/app-error";
import { AppErrorPage } from "./app-error-page";

const noop = () => {};

const notFound: AppErrorDescriptor = {
  kind: "not-found",
  status: 404,
  requestId: null,
};

function render(): string {
  return renderToStaticMarkup(
    createElement(AppErrorPage, {
      descriptor: notFound,
      onHome: noop,
      onBack: noop,
      onRetry: noop,
    }),
  );
}

function buttons(html: string): string[] {
  return html.match(/<button[\s\S]*?<\/button>/g) ?? [];
}

function activeButtons(html: string): string[] {
  return buttons(html).filter((button) =>
    button.includes('aria-current="page"'),
  );
}

function extractDiv(html: string, startIndex: number): string {
  const tagPattern = /<(\/?)div\b[^>]*>/gi;
  let depth = 0;

  tagPattern.lastIndex = startIndex;

  for (let match = tagPattern.exec(html); match; match = tagPattern.exec(html)) {
    depth += match[1] === "/" ? -1 : 1;

    if (depth === 0) {
      return html.slice(startIndex, tagPattern.lastIndex);
    }
  }

  return "";
}

describe("AppErrorPage", () => {
  it("renders the primary navigation with all four tabs", () => {
    const html = render();

    expect(html).toContain('aria-label="Основная навигация"');
    expect(html).toContain("Главная");
    expect(html).toContain("Задачи");
    expect(html).toContain("Финансы");
    expect(html).toContain("Воркспейсы");
  });

  it("marks the home tab as the active page", () => {
    const html = render();
    const active = activeButtons(html);

    expect(active).toHaveLength(1);
    expect(active[0]).toContain("Главная");
  });

  it("renders the not-found error copy", () => {
    const html = render();

    expect(html).toContain("Страница не найдена");
  });

  it("renders the bottom navigation inside the fixed bottom container", () => {
    const html = render();
    const match = html.match(
      /<div class="[^"]*\bfixed\b[^"]*\bbottom-0\b[^"]*"[^>]*>/,
    );

    expect(match).not.toBeNull();

    const fixedTag = match?.[0] ?? "";
    const fixedIndex = match?.index ?? -1;

    expect(fixedIndex).toBeGreaterThanOrEqual(0);
    expect(fixedTag).toContain("inset-x-0");
    expect(fixedTag).toContain("bottom-0");
    expect(fixedTag).toContain("z-20");
    expect(fixedTag).toContain(
      "padding-bottom:max(30px, var(--app-inset-bottom))",
    );
    expect(fixedTag).toContain("padding-left:var(--app-inset-left)");
    expect(fixedTag).toContain("padding-right:var(--app-inset-right)");

    const fixedContainer = extractDiv(html, fixedIndex);

    expect(fixedContainer).toContain('aria-label="Основная навигация"');
    expect(fixedContainer).toContain("w-full max-w-md px-4");
  });
});
