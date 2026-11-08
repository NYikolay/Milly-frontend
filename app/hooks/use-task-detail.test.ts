import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import {
  createDeleteTaskMutationOptions,
  createToggleTaskDetailMutationOptions,
} from "./use-task-detail";

const TASK_ID = 1;
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

let queryClient: QueryClient;
let haptics: TelegramHaptics;

beforeEach(() => {
  queryClient = new QueryClient();
  haptics = {
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  };
});

describe("createToggleTaskDetailMutationOptions", () => {
  it("snapshots and optimistically completes the detail task", async () => {
    const current = task();
    queryClient.setQueryData(queryKey, current);
    const options = createToggleTaskDetailMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    const context = await options.onMutate({
      taskId: TASK_ID,
      nextCompleted: true,
    });

    expect(context.previous).toBe(current);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData<TaskResponse>(queryKey)?.completed_at,
    ).toEqual(expect.any(String));
  });

  it("optimistically uncompletes the detail task", async () => {
    const current = task({ completed_at: "2026-11-06T09:00:00.000Z" });
    queryClient.setQueryData(queryKey, current);
    const options = createToggleTaskDetailMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.onMutate({ taskId: TASK_ID, nextCompleted: false });

    expect(
      queryClient.getQueryData<TaskResponse>(queryKey)?.completed_at,
    ).toBeNull();
  });

  it("restores the snapshot and reports an error", async () => {
    const current = task();
    queryClient.setQueryData(queryKey, current);
    const options = createToggleTaskDetailMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate({
      taskId: TASK_ID,
      nextCompleted: true,
    });

    options.onError(
      new Error("failed"),
      { taskId: TASK_ID, nextCompleted: true },
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });

  it("invalidates tasks and projects after settling", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createToggleTaskDetailMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSettled();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["projects"] });
  });
});

describe("createDeleteTaskMutationOptions", () => {
  it("removes the detail query and reports success on delete", () => {
    const onDeleted = vi.fn();
    queryClient.setQueryData(queryKey, task());
    const options = createDeleteTaskMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onDeleted,
    });
    const removeQueries = vi.spyOn(queryClient, "removeQueries");
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);

    options.onSuccess();

    expect(removeQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
    expect(haptics.notification).toHaveBeenCalledWith("success");
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("treats 404 as a successful deletion", () => {
    const onDeleted = vi.fn();
    const options = createDeleteTaskMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onDeleted,
    });

    options.onError(
      new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
    );

    expect(haptics.notification).toHaveBeenCalledWith("success");
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("keeps the detail query on other delete failures", () => {
    const onDeleted = vi.fn();
    queryClient.setQueryData(queryKey, task());
    const options = createDeleteTaskMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onDeleted,
    });
    const removeQueries = vi.spyOn(queryClient, "removeQueries");

    options.onError(
      new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
    );

    expect(removeQueries).not.toHaveBeenCalled();
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
