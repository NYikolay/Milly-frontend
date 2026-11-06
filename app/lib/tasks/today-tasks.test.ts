import { describe, expect, it } from "vitest";

import type { TaskResponse } from "./types";
import {
  COMPLETED_PREVIEW_LIMIT,
  PLANNED_PREVIEW_LIMIT,
  getTodayProgressCopy,
  getTodayTasksState,
  getVisibleTasks,
  shouldShowSearchCard,
  splitTodayTasks,
} from "./today-tasks";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-06T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-06T07:00:00.000Z",
    updated_at: "2026-11-06T07:00:00.000Z",
    ...overrides,
  };
}

describe("getTodayTasksState", () => {
  it("treats zero tasks as empty", () => {
    expect(getTodayTasksState(0, 0)).toBe("empty");
  });

  it("treats all completed tasks as completed", () => {
    expect(getTodayTasksState(5, 5)).toBe("completed");
    expect(getTodayTasksState(5, 6)).toBe("completed");
  });

  it("treats the rest as default", () => {
    expect(getTodayTasksState(5, 2)).toBe("default");
  });
});

describe("splitTodayTasks", () => {
  it("splits by completed_at preserving order", () => {
    const planned = task({ id: 1 });
    const completed = task({ id: 2, completed_at: "2026-11-06T09:00:00Z" });

    expect(splitTodayTasks([planned, completed])).toEqual({
      planned: [planned],
      completed: [completed],
    });
  });
});

describe("getTodayProgressCopy", () => {
  it("returns the default copy", () => {
    expect(getTodayProgressCopy(6, 2)).toEqual({
      title: "Всё идёт по плану",
      description: "2 из 6 задач выполнено",
    });
  });

  it("returns the all-completed copy", () => {
    expect(getTodayProgressCopy(20, 20)).toEqual({
      title: "На сегодня всё 🥳",
      description: "20 из 20 задач выполнено ✌",
    });
  });

  it("clamps completed into the total", () => {
    expect(getTodayProgressCopy(3, 5).description).toBe(
      "3 из 3 задач выполнено ✌",
    );
  });
});

describe("preview helpers", () => {
  it("uses 3 planned and 2 completed previews", () => {
    expect(PLANNED_PREVIEW_LIMIT).toBe(3);
    expect(COMPLETED_PREVIEW_LIMIT).toBe(2);
  });

  it("cuts the list when collapsed and keeps it when expanded", () => {
    const tasks = [task({ id: 1 }), task({ id: 2 }), task({ id: 3 })];

    expect(getVisibleTasks(tasks, 2, false)).toEqual(tasks.slice(0, 2));
    expect(getVisibleTasks(tasks, 2, true)).toBe(tasks);
  });

  it("shows the search card only when there are no planned tasks", () => {
    expect(shouldShowSearchCard(0)).toBe(true);
    expect(shouldShowSearchCard(3)).toBe(false);
  });
});
