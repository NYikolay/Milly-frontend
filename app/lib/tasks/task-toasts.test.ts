import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  showTaskCreatedToast,
  showTaskDeletedToast,
  showTaskPastDueToast,
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
});
