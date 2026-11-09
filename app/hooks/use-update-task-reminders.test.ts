import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import { createUpdateTaskRemindersMutationOptions } from "./use-update-task-reminders";

vi.mock("~/lib/tasks/tasks-api", () => ({ updateTask: vi.fn() }));

const updateTaskMock = vi.mocked(updateTask);
const TASK_ID = 42;
const queryKey = taskDetailQueryKey(TASK_ID);

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: TASK_ID,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T13:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T09:00:00.000Z",
    updated_at: "2026-11-08T09:00:00.000Z",
    ...overrides,
  };
}

let queryClient: QueryClient;
let haptics: TelegramHaptics;

beforeEach(() => {
  queryClient = new QueryClient();
  haptics = { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() };
  updateTaskMock.mockReset();
});

describe("createUpdateTaskRemindersMutationOptions", () => {
  it("calls PATCH for the task and serializes reminder mutations", async () => {
    updateTaskMock.mockResolvedValue(task());
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn({
      reminders_enabled: true,
      reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
    });

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      reminders_enabled: true,
      reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
    });
    expect(options.scope).toEqual({ id: "task-reminders" });
  });

  it("updates the detail cache, invalidates related keys and skips the success haptic", () => {
    const updated = task({ reminders_enabled: true });
    queryClient.setQueryData(queryKey, task());
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(updated);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["task-series"] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["projects"] });
    expect(haptics.notification).not.toHaveBeenCalled();
  });

  it("does not overwrite the current detail when the response has another id", () => {
    const current = task();
    const updated = task({ id: 99 });
    queryClient.setQueryData(queryKey, current);
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["task-series"] });
  });

  it("invalidates the detail on 404 and reports an error", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onError(
      new ApiError("Not found", { status: 404, code: "not_found", requestId: "test" }),
    );

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });

  it("keeps the detail on other errors and reports an error", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onError(
      new ApiError("Server error", { status: 500, code: "internal_error", requestId: "test" }),
    );

    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });

  it("keeps the detail on a generic error and reports an error", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onError(new Error("Boom"));

    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });
});
