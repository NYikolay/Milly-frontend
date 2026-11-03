import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AppErrorDescriptor } from "~/lib/errors/app-error";
import { ErrorScreen } from "./error-screen";

const noop = () => {};

function render(
  descriptor: AppErrorDescriptor,
  retryPending = false,
): string {
  return renderToStaticMarkup(
    createElement(ErrorScreen, {
      descriptor,
      onHome: noop,
      onBack: noop,
      onRetry: noop,
      retryPending,
    }),
  );
}

function readAttribute(html: string, name: string): string | null {
  const match = html.match(new RegExp(`\\b${name}="([^"]+)"`));

  return match?.[1] ?? null;
}

function requiredAttribute(html: string, name: string): string {
  const value = readAttribute(html, name);

  if (value === null) {
    throw new Error(`Missing attribute ${name}`);
  }

  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function elementById(html: string, id: string): string {
  const pattern = new RegExp(
    `<([a-z0-9]+)[^>]*\\bid="${escapeRegExp(id)}"[^>]*>[\\s\\S]*?</\\1>`,
    "i",
  );

  return html.match(pattern)?.[0] ?? "";
}

function firstButton(html: string): string {
  return html.match(/<button[\s\S]*?<\/button>/)?.[0] ?? "";
}

function hasDisabledAttribute(button: string): boolean {
  return /\sdisabled(?:=""|[\s>])/.test(button);
}

const notFound: AppErrorDescriptor = {
  kind: "not-found",
  status: 404,
  requestId: null,
};

const rateLimited: AppErrorDescriptor = {
  kind: "rate-limited",
  status: 429,
  requestId: "req-1",
};

const serverError: AppErrorDescriptor = {
  kind: "server",
  status: 500,
  requestId: "req-1",
};

const serverErrorWithoutRequestId: AppErrorDescriptor = {
  kind: "server",
  status: 503,
  requestId: null,
};

describe("ErrorScreen", () => {
  it("renders an accessible alert wired to the title and description", () => {
    const html = render(notFound);
    const labelledBy = requiredAttribute(html, "aria-labelledby");
    const describedBy = requiredAttribute(html, "aria-describedby");

    expect(html).toContain('role="alert"');
    expect(elementById(html, labelledBy)).toMatch(
      /^<h1\b[^>]*tabindex="-1"/,
    );
    expect(elementById(html, labelledBy)).toContain("Страница не найдена");
    expect(describedBy).not.toContain(" ");
    expect(elementById(html, describedBy)).toContain(
      "Возможно, ссылка устарела или страница была перемещена.",
    );
    expect(html).toContain('alt=""');
  });

  it("describes rate-limited alerts with both the description and the hint", () => {
    const html = render(rateLimited);
    const describedBy = requiredAttribute(html, "aria-describedby");
    const ids = describedBy.split(" ");

    expect(ids).toHaveLength(2);

    const [descriptionId, hintId] = ids;

    expect(elementById(html, descriptionId)).toContain(
      "Вы отправили слишком много запросов подряд.",
    );
    expect(elementById(html, hintId)).toContain(
      "Сделайте небольшую паузу",
    );
    expect(elementById(html, hintId)).toContain("gap-[5px]");
  });

  it("describes server alerts with the description group and the hint container", () => {
    const html = render(serverError);
    const labelledBy = requiredAttribute(html, "aria-labelledby");
    const describedBy = requiredAttribute(html, "aria-describedby");
    const ids = describedBy.split(" ");

    expect(ids).toHaveLength(2);
    expect(elementById(html, labelledBy)).toMatch(/^<h1\b/);
    expect(elementById(html, labelledBy)).toContain("Что-то пошло не так");

    const [descriptionId, hintId] = ids;
    const description = elementById(html, descriptionId);
    const hint = elementById(html, hintId);

    expect(description).toContain(
      "Не удалось выполнить запрос. Попробуйте ещё раз чуть позже.",
    );
    expect(description).toContain(
      "В случае повторения ошибки пожалуйста, обратитесь в службу поддержки.",
    );
    expect(hint).toContain("Ошибка на стороне сервера.");
    expect(hint).toContain("Код ошибки: req-1");
    expect(hint).toContain("gap-[5px]");
  });

  it("renders the not-found copy with a home action and no hint", () => {
    const html = render(notFound);
    const primary = firstButton(html);

    expect(html).toContain("Страница не найдена");
    expect(html).toContain("На главную");
    expect(html).toContain("Назад");
    expect(html).not.toContain("Сделайте небольшую паузу");
    expect(html).not.toContain("Код ошибки:");
    expect(primary).toContain('type="button"');
    expect(primary).toContain("На главную");
    expect(hasDisabledAttribute(primary)).toBe(false);
  });

  it("renders the rate-limited copy with a retry action and the pause hint", () => {
    const html = render(rateLimited);
    const primary = firstButton(html);

    expect(html).toContain("Слишком много запросов");
    expect(html).toContain("Повторить запрос");
    expect(html).toContain("Сделайте небольшую паузу");
    expect(html).not.toContain("Код ошибки:");
    expect(primary).toContain('type="button"');
    expect(primary).toContain("Повторить запрос");
    expect(hasDisabledAttribute(primary)).toBe(false);
  });

  it("keeps the hint in flow and applies the short-viewport card padding", () => {
    const html = render(serverError);
    const describedBy = requiredAttribute(html, "aria-describedby");
    const hintId = describedBy.split(" ")[1];
    const hint = elementById(html, hintId);

    expect(html).toContain("[@media(max-height:620px)]:py-[20px]");
    expect(html).toContain(
      "grid-rows-[minmax(0,1fr)_auto_minmax(57px,1fr)]",
    );
    expect(html).toContain(
      "[@media(max-height:620px)]:grid-rows-[minmax(0,1fr)_auto_minmax(57px,auto)]",
    );
    expect(hint).toContain("row-start-3");
    expect(hint).toContain("mt-[15px]");
    expect(hint).not.toContain("absolute");
    expect(hint).toContain("break-words");
    expect(hint).toContain("max-w-full");
    expect(hint).toContain("min-w-0");
  });

  it("renders the server copy with both paragraphs and the error code", () => {
    const html = render(serverError);
    const primary = firstButton(html);

    expect(html).toContain("Что-то пошло не так");
    expect(html).toContain(
      "Не удалось выполнить запрос. Попробуйте ещё раз чуть позже.",
    );
    expect(html).toContain(
      "В случае повторения ошибки пожалуйста, обратитесь в службу поддержки.",
    );
    expect(html).toContain("Попробовать снова");
    expect(html).toContain("Ошибка на стороне сервера.");
    expect(html).toContain("Код ошибки: req-1");
    expect(primary).toContain('type="button"');
    expect(primary).toContain("Попробовать снова");
    expect(hasDisabledAttribute(primary)).toBe(false);
  });

  it("omits the error code when the server error has no requestId", () => {
    const html = render(serverErrorWithoutRequestId);

    expect(html).toContain("Ошибка на стороне сервера.");
    expect(html).not.toContain("Код ошибки:");
  });

  it("marks the retry action as disabled and busy while pending", () => {
    const html = render(serverError, true);
    const primary = firstButton(html);

    expect(primary).toContain('aria-busy="true"');
    expect(hasDisabledAttribute(primary)).toBe(true);
  });

  it("always renders the back action with the exact label", () => {
    const html = render(notFound);
    const buttons = html.match(/<button[\s\S]*?<\/button>/g) ?? [];

    expect(buttons).toHaveLength(2);
    expect(buttons[1]).toContain("Назад");
    expect(buttons[1]).toContain('type="button"');
  });
});
