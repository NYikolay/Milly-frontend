import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { showTaskProjectUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import { createUpdateTaskProjectMutationOptions } from "./use-update-task-project";

vi.mock("~/lib/tasks/tasks-api", () => ({ updateTask: vi.fn() }));
vi.mock("~/lib/tasks/task-toasts", () => ({
  showTaskProjectUpdateErrorToast: vi.fn(),
}));

const updateTaskMock = vi.mocked(updateTask);
const toastMock = vi.mocked(showTaskProjectUpdateErrorToast);
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
  toastMock.mockReset();
});

describe("createUpdateTaskProjectMutationOptions", () => {
  it("calls PATCH with the project id", async () => {
    updateTaskMock.mockResolvedValue(task({ project_id: 10 }));
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn(10);

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      project_id: 10,
    });
  });

  it("calls PATCH with an explicit null to clear the project", async () => {
    updateTaskMock.mockResolvedValue(task({ project_id: null }));
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn(null);

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      project_id: null,
    });
  });

  it("applies the project optimistically and returns the previous snapshot", async () => {
    const current = task({ project_id: null });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    const context = await options.onMutate(10);

    expect(queryClient.getQueryData<TaskResponse>(queryKey)?.project_id).toBe(
      10,
    );
    expect(context.previous).toEqual(current);
  });

  it("rolls the cache back and reports an error", async () => {
    const current = task({ project_id: 10 });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate(11);

    options.onError(
      new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      11,
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the server task on success and reports success", () => {
    const updated = task({ project_id: 10 });
    queryClient.setQueryData(queryKey, task());
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(updated);
    expect(haptics.notification).toHaveBeenCalledWith("success");
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("does not overwrite the detail cache when the response has another id", () => {
    const current = task();
    const updated = task({ id: 99, project_id: 10 });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
  });

  it("invalidates detail, tasks, series and projects after settling", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSettled();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["task-series"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
  });

  it("rolls back, shows a toast and invalidates detail/projects on 404", async () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const current = task({ project_id: 10 });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate(11);

    options.onError(
      new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
      11,
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
  });
});
