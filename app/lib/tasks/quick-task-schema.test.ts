import { describe, expect, it } from "vitest";

import {
  createQuickTaskDefaults,
  isQuickTaskSubmittable,
  quickTaskResolver,
  quickTaskSchema,
} from "./quick-task-schema";
import { PRIORITY_OPTIONS, priorityShortLabel } from "./priority";

const now = new Date("2026-11-05T13:07:42Z");

describe("quick task defaults", () => {
  it("uses the spec defaults", () => {
    expect(createQuickTaskDefaults(now, "Europe/Moscow")).toEqual({
      title: "",
      dueDate: "2026-11-05",
      dueTime: "17:00",
      isRecurring: false,
      priority: "important_not_urgent",
      projectId: null,
      labelIds: [],
      remindersEnabled: true,
      beforeDueEnabled: true,
      beforeDueAmount: 1,
      beforeDueUnit: "hours",
      scheduledEnabled: false,
      scheduledIntervalDays: 1,
      scheduledTime: "14:00",
    });
  });
});

describe("quick task schema", () => {
  it("rejects empty and too-long titles", () => {
    const base = createQuickTaskDefaults(now, "Europe/Moscow");

    expect(
      quickTaskSchema.safeParse({ ...base, title: "   " }).success,
    ).toBe(false);
    expect(
      quickTaskSchema.safeParse({ ...base, title: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      quickTaskSchema.safeParse({ ...base, title: "Задача" }).success,
    ).toBe(true);
  });

  it("accepts a nullable positive project id", () => {
    const base = {
      ...createQuickTaskDefaults(now, "Europe/Moscow"),
      title: "Задача",
    };

    expect(
      quickTaskSchema.safeParse({ ...base, projectId: null }).success,
    ).toBe(true);
    expect(
      quickTaskSchema.safeParse({ ...base, projectId: 10 }).success,
    ).toBe(true);
    expect(
      quickTaskSchema.safeParse({ ...base, projectId: 0 }).success,
    ).toBe(false);
  });

  it("maps nested array issues to the top-level field", async () => {
    const base = {
      ...createQuickTaskDefaults(now, "Europe/Moscow"),
      title: "Задача",
      labelIds: [1, 1],
    };
    const result = await quickTaskResolver(base, undefined, {} as never);

    expect(result.errors.labelIds).toBeDefined();
    expect(result.errors).not.toHaveProperty("labelIds.0");
  });

  it("maps nested array element issues to the top-level field", async () => {
    const base = {
      ...createQuickTaskDefaults(now, "Europe/Moscow"),
      title: "Задача",
      labelIds: [0],
    };
    const result = await quickTaskResolver(base, undefined, {} as never);

    expect(result.errors.labelIds).toBeDefined();
    expect(result.errors).not.toHaveProperty("labelIds.0");
  });

  it("keeps the submit button disabled for empty titles and pending state", () => {
    expect(isQuickTaskSubmittable({ title: "  " }, false)).toBe(false);
    expect(isQuickTaskSubmittable({ title: "Задача" }, true)).toBe(false);
    expect(isQuickTaskSubmittable({ title: "Задача" }, false)).toBe(true);
  });
});

describe("priority mapping", () => {
  it("maps the four priorities to P1-P4 and the exact copy", () => {
    expect(PRIORITY_OPTIONS.map((option) => option.label)).toEqual([
      "Срочные и важные",
      "Важные, но не срочные",
      "Срочные, но не важные",
      "Не срочные и не важные",
    ]);
    expect(priorityShortLabel("urgent_important")).toBe("P1");
    expect(priorityShortLabel("important_not_urgent")).toBe("P2");
    expect(priorityShortLabel("urgent_not_important")).toBe("P3");
    expect(priorityShortLabel("neither")).toBe("P4");
  });
});
