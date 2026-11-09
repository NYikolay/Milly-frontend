import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import { createUpdateTaskDueMutationOptions } from "./use-update-task-due";

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
  haptics = {
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  };
  updateTaskMock.mockReset();
});

describe("createUpdateTaskDueMutationOptions", () => {
  it("calls PATCH for the task", async () => {
    updateTaskMock.mockResolvedValue(task());
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated: vi.fn(),
    });

    await options.mutationFn({ due_at: "2026-11-09T13:00:00.000Z" });

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      due_at: "2026-11-09T13:00:00.000Z",
    });
  });

  it("updates the detail cache, invalidates related keys and reports success", () => {
    const updated = task({ recurrence: "regular" });
    const onUpdated = vi.fn();
    queryClient.setQueryData(queryKey, task());
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(updated);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["task-series"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
    expect(haptics.notification).toHaveBeenCalledWith("success");
    expect(onUpdated).toHaveBeenCalledWith(updated);
  });

  it("does not overwrite the current detail when the response has another id", () => {
    const current = task();
    const updated = task({ id: 99 });
    queryClient.setQueryData(queryKey, current);
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated: vi.fn(),
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
  });

  it("invalidates the detail on 404 and reports an error", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const onUpdated = vi.fn();
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated,
    });

    options.onError(
      new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
    );

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("keeps the detail query on other errors", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated: vi.fn(),
    });

    options.onError(
      new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
    );

    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });
});
