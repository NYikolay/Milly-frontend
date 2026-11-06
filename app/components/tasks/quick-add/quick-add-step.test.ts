import { describe, expect, it } from "vitest";

import { QUICK_ADD_DETAIL_STEPS, getQuickAddHeader } from "./quick-add-step";

describe("quick add details", () => {
  it("contains the five detail steps", () => {
    expect(QUICK_ADD_DETAIL_STEPS).toEqual([
      "labels",
      "project",
      "priority",
      "due",
      "reminders",
    ]);
  });

  it("keeps the exact detail titles", () => {
    expect(getQuickAddHeader("labels").title).toBe("Метки");
    expect(getQuickAddHeader("project").title).toBe("Проект");
    expect(getQuickAddHeader("priority").title).toBe("Приоритет задачи");
    expect(getQuickAddHeader("due").title).toBe("Дата и время задачи");
    expect(getQuickAddHeader("reminders").title).toBe("Автонапоминания");
  });
});
