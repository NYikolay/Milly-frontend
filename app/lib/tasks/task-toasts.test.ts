import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  showTaskCreatedToast,
  showTaskDeletedToast,
  showTaskPastDueToast,
  showTaskPriorityUpdateErrorToast,
  showTaskProjectUpdateErrorToast,
} from "./task-toasts";

const sonner = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: sonner,
}));

beforeEach(() => {
  sonner.success.mockClear();
  sonner.error.mockClear();
});

describe("task toasts", () => {
  it("shows a success toast after creating a task", () => {
    showTaskCreatedToast();

    expect(sonner.success).toHaveBeenCalledWith("Задача создана");
  });

  it("shows a success toast after deleting a task", () => {
    showTaskDeletedToast();

    expect(sonner.success).toHaveBeenCalledWith("Задача удалена");
  });

  it("shows a past-due error toast without an icon", () => {
    showTaskPastDueToast();

    expect(sonner.error).toHaveBeenCalledWith(
      "Нельзя вернуть в работу задачу с прошедшей датой. Сначала измените дату задачи.",
      { icon: null },
    );
  });

  it("shows a priority update error toast without an icon", () => {
    showTaskPriorityUpdateErrorToast();

    expect(sonner.error).toHaveBeenCalledWith(
      "Не удалось изменить приоритет. Попробуйте ещё раз.",
      { icon: null },
    );
  });

  it("shows a project update error toast without an icon", () => {
    showTaskProjectUpdateErrorToast();

    expect(sonner.error).toHaveBeenCalledWith(
      "Не удалось изменить проект. Попробуйте ещё раз.",
      { icon: null },
    );
  });
});
