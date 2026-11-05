import { describe, expect, it } from "vitest";

import { getQuickAddHeader } from "./quick-add-step";

describe("getQuickAddHeader", () => {
  it("uses the exact titles and back visibility", () => {
    expect(getQuickAddHeader("form")).toEqual({
      title: "Добавление задачи",
      showBack: false,
    });
    expect(getQuickAddHeader("labels")).toEqual({
      title: "Метки",
      showBack: true,
    });
    expect(getQuickAddHeader("priority")).toEqual({
      title: "Приоритет задачи",
      showBack: true,
    });
    expect(getQuickAddHeader("due")).toEqual({
      title: "Дата и время задачи",
      showBack: true,
    });
    expect(getQuickAddHeader("reminders")).toEqual({
      title: "Автонапоминания",
      showBack: true,
    });
  });
});
