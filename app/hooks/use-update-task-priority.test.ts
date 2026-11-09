import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { showTaskPriorityUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import { createUpdateTaskPriorityMutationOptions } from "./use-update-task-priority";

vi.mock("~/lib/tasks/tasks-api", () => ({ updateTask: vi.fn() }));
vi.mock("~/lib/tasks/task-toasts", () => ({
  showTaskPriorityUpdateErrorToast: vi.fn(),
}));

const updateTaskMock = vi.mocked(updateTask);
const toastMock = vi.mocked(showTaskPriorityUpdateErrorToast);
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

describe("createUpdateTaskPriorityMutationOptions", () => {
  it("calls PATCH with only the priority", async () => {
    updateTaskMock.mockResolvedValue(task({ priority: "urgent_important" }));
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn("urgent_important");

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      priority: "urgent_important",
    });
  });

  it("applies the priority optimistically and returns the previous snapshot", async () => {
    const current = task();
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    const context = await options.onMutate("important_not_urgent");

    expect(queryClient.getQueryData<TaskResponse>(queryKey)?.priority).toBe(
      "important_not_urgent",
    );
    expect(context.previous).toEqual(current);
  });

  it("rolls the cache back and reports an error", async () => {
    const current = task();
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate("urgent_not_important");

    options.onError(
      new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      "urgent_not_important",
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the server task on success and reports success", () => {
    const updated = task({ priority: "urgent_important" });
    queryClient.setQueryData(queryKey, task());
    const options = createUpdateTaskPriorityMutationOptions({
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
    const updated = task({ id: 99, priority: "urgent_important" });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
  });

  it("invalidates detail, tasks and series after settling", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskPriorityMutationOptions({
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

    const invalidatedRoots = invalidateQueries.mock.calls.map(
      ([filters]) => filters?.queryKey?.[0],
    );

    expect(invalidatedRoots).not.toContain("projects");
  });

  it("invalidates detail and skips the toast on 404", async () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const current = task();
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate("urgent_important");

    expect(queryClient.getQueryData<TaskResponse>(queryKey)?.priority).toBe(
      "urgent_important",
    );

    options.onError(
      new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
      "urgent_important",
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).not.toHaveBeenCalled();
  });
});
