import { describe, expect, it } from "vitest";

import type { AppErrorDescriptor } from "./app-error";
import { getAppErrorCopy } from "./copy";

function descriptor(
  overrides: Partial<AppErrorDescriptor> &
    Pick<AppErrorDescriptor, "kind">,
): AppErrorDescriptor {
  return {
    status: null,
    requestId: null,
    ...overrides,
  };
}

describe("getAppErrorCopy", () => {
  it("returns the not-found copy", () => {
    expect(getAppErrorCopy(descriptor({ kind: "not-found", status: 404 })))
      .toEqual({
        title: "Страница не найдена",
        description: [
          "Возможно, ссылка устарела или страница была перемещена.",
        ],
        primaryAction: "home",
        primaryLabel: "На главную",
        secondaryLabel: "Назад",
        hint: [],
      });
  });

  it("returns the rate-limited copy and ignores requestId", () => {
    expect(
      getAppErrorCopy(
        descriptor({
          kind: "rate-limited",
          status: 429,
          requestId: "req-1",
        }),
      ),
    ).toEqual({
      title: "Слишком много запросов",
      description: [
        "Вы отправили слишком много запросов подряд. Подождите немного и повторите попытку.",
      ],
      primaryAction: "retry",
      primaryLabel: "Повторить запрос",
      secondaryLabel: "Назад",
      hint: ["Сделайте небольшую паузу"],
    });
  });

  it("returns the server copy with an error code for 5xx", () => {
    expect(
      getAppErrorCopy(
        descriptor({
          kind: "server",
          status: 500,
          requestId: "req-1",
        }),
      ),
    ).toEqual({
      title: "Что-то пошло не так",
      description: [
        "Не удалось выполнить запрос. Попробуйте ещё раз чуть позже.",
        "В случае повторения ошибки пожалуйста, обратитесь в службу поддержки.",
      ],
      primaryAction: "retry",
      primaryLabel: "Попробовать снова",
      secondaryLabel: "Назад",
      hint: ["Ошибка на стороне сервера.", "Код ошибки: req-1"],
    });
  });

  it("omits the error code when requestId is missing", () => {
    expect(
      getAppErrorCopy(descriptor({ kind: "server", status: 503 })),
    ).toEqual({
      title: "Что-то пошло не так",
      description: [
        "Не удалось выполнить запрос. Попробуйте ещё раз чуть позже.",
        "В случае повторения ошибки пожалуйста, обратитесь в службу поддержки.",
      ],
      primaryAction: "retry",
      primaryLabel: "Попробовать снова",
      secondaryLabel: "Назад",
      hint: ["Ошибка на стороне сервера."],
    });
  });

  it("omits the error code when requestId is empty", () => {
    expect(
      getAppErrorCopy(
        descriptor({ kind: "server", status: 500, requestId: "" }),
      ),
    ).toEqual({
      title: "Что-то пошло не так",
      description: [
        "Не удалось выполнить запрос. Попробуйте ещё раз чуть позже.",
        "В случае повторения ошибки пожалуйста, обратитесь в службу поддержки.",
      ],
      primaryAction: "retry",
      primaryLabel: "Попробовать снова",
      secondaryLabel: "Назад",
      hint: ["Ошибка на стороне сервера."],
    });
  });

  it("omits the server hint for server errors with a non-5xx status", () => {
    expect(
      getAppErrorCopy(
        descriptor({
          kind: "server",
          status: 422,
          requestId: "req-1",
        }),
      ),
    ).toEqual({
      title: "Что-то пошло не так",
      description: [
        "Не удалось выполнить запрос. Попробуйте ещё раз чуть позже.",
        "В случае повторения ошибки пожалуйста, обратитесь в службу поддержки.",
      ],
      primaryAction: "retry",
      primaryLabel: "Попробовать снова",
      secondaryLabel: "Назад",
      hint: [],
    });
  });

  it("adds the server hint when the status is null", () => {
    expect(
      getAppErrorCopy(
        descriptor({
          kind: "server",
          status: null,
          requestId: "req-2",
        }),
      ),
    ).toEqual({
      title: "Что-то пошло не так",
      description: [
        "Не удалось выполнить запрос. Попробуйте ещё раз чуть позже.",
        "В случае повторения ошибки пожалуйста, обратитесь в службу поддержки.",
      ],
      primaryAction: "retry",
      primaryLabel: "Попробовать снова",
      secondaryLabel: "Назад",
      hint: ["Ошибка на стороне сервера.", "Код ошибки: req-2"],
    });
  });
});
