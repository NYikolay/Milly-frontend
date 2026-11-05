import { describe, expect, it } from "vitest";

import { ApiError, ApiNetworkError } from "~/lib/api/errors";
import { describeQuickAddError } from "./quick-task-errors";

describe("describeQuickAddError", () => {
  it("maps network and timeout errors", () => {
    expect(describeQuickAddError(new ApiNetworkError("Network request failed"))).toBe(
      "Не удалось подключиться. Проверьте сеть и попробуйте ещё раз.",
    );
  });

  it("maps HTTP statuses to user-facing copy", () => {
    const error = (status: number) =>
      new ApiError("technical", { status, code: "x", requestId: "r" });

    expect(describeQuickAddError(error(422))).toBe(
      "Проверьте заполнение формы и попробуйте ещё раз.",
    );
    expect(describeQuickAddError(error(404))).toBe(
      "Метки больше недоступны. Обновите список.",
    );
    expect(describeQuickAddError(error(429))).toBe(
      "Слишком много запросов. Попробуйте позже.",
    );
    expect(describeQuickAddError(error(500))).toBe(
      "Сервис временно недоступен. Попробуйте ещё раз.",
    );
  });

  it("falls back to the generic copy", () => {
    expect(describeQuickAddError(new Error("boom"))).toBe(
      "Не удалось добавить задачу. Попробуйте ещё раз.",
    );
  });
});
