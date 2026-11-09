import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { showTaskLabelsUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { LabelRef, TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import {
  createUpdateTaskLabelsMutationOptions,
  type TaskLabelsUpdateInput,
} from "./use-update-task-labels";

vi.mock("~/lib/tasks/tasks-api", () => ({ updateTask: vi.fn() }));
vi.mock("~/lib/tasks/task-toasts", () => ({
  showTaskLabelsUpdateErrorToast: vi.fn(),
}));

const updateTaskMock = vi.mocked(updateTask);
const toastMock = vi.mocked(showTaskLabelsUpdateErrorToast);
const TASK_ID = 42;
const queryKey = taskDetailQueryKey(TASK_ID);
const URGENT: LabelRef = { id: 3, name: "Срочно" };
const WORK: LabelRef = { id: 4, name: "Работа" };

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

function input(
  labelIds: number[] = [URGENT.id],
  labels: LabelRef[] = [URGENT],
): TaskLabelsUpdateInput {
  return { labelIds, labels };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

let queryClient: QueryClient;
let haptics: TelegramHaptics;

beforeEach(() => {
  queryClient = new QueryClient();
  haptics = { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() };
  updateTaskMock.mockReset();
  toastMock.mockReset();
});

describe("createUpdateTaskLabelsMutationOptions", () => {
  it("serializes mutations under the task-labels scope", () => {
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    expect(options.scope).toEqual({ id: "task-labels" });
  });

  it("runs scoped mutations through the cache in FIFO order", async () => {
    queryClient.setQueryData(queryKey, task({ labels: [] }));
    const firstResponse = deferred<TaskResponse>();
    const secondResponse = deferred<TaskResponse>();

    updateTaskMock
      .mockImplementationOnce(() => firstResponse.promise)
      .mockImplementationOnce(() => secondResponse.promise);

    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const firstObserver = new MutationObserver(queryClient, options);
    const secondObserver = new MutationObserver(queryClient, options);

    const firstResult = firstObserver.mutate(input([URGENT.id], [URGENT]));
    const secondResult = secondObserver.mutate(
      input([URGENT.id, WORK.id], [URGENT, WORK]),
    );

    await vi.waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledTimes(1);
    });
    expect(updateTaskMock).toHaveBeenNthCalledWith(1, TASK_ID, {
      label_ids: [URGENT.id],
    });

    firstResponse.resolve(task({ labels: [URGENT] }));
    await firstResult;

    await vi.waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledTimes(2);
    });
    expect(updateTaskMock).toHaveBeenNthCalledWith(2, TASK_ID, {
      label_ids: [URGENT.id, WORK.id],
    });

    secondResponse.resolve(task({ labels: [URGENT, WORK] }));
    await secondResult;

    expect(queryClient.getQueryData<TaskResponse>(queryKey)?.labels).toEqual([
      URGENT,
      WORK,
    ]);
    expect(haptics.notification).toHaveBeenCalledWith("success");
    expect(haptics.notification).toHaveBeenCalledTimes(2);
  });

  it("calls PATCH with the full label_ids set", async () => {
    updateTaskMock.mockResolvedValue(task({ labels: [URGENT, WORK] }));
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn(input([URGENT.id, WORK.id], [URGENT, WORK]));

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      label_ids: [URGENT.id, WORK.id],
    });
  });

  it("calls PATCH with an explicit empty array to clear labels", async () => {
    updateTaskMock.mockResolvedValue(task({ labels: [] }));
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn(input([], []));

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      label_ids: [],
    });
  });

  it("applies labels optimistically and returns the previous snapshot", async () => {
    const current = task({ labels: [URGENT] });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    const context = await options.onMutate(input([WORK.id], [WORK]));

    expect(queryClient.getQueryData<TaskResponse>(queryKey)?.labels).toEqual([
      WORK,
    ]);
    expect(context.previous).toEqual(current);
  });

  it("rolls the cache back and reports an error", async () => {
    const current = task({ labels: [URGENT] });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate(input([WORK.id], [WORK]));

    options.onError(
      new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      input([WORK.id], [WORK]),
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the server task on success and reports success", () => {
    const updated = task({ labels: [URGENT, WORK] });
    queryClient.setQueryData(queryKey, task());
    const options = createUpdateTaskLabelsMutationOptions({
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
    const updated = task({ id: 99, labels: [URGENT] });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).not.toHaveBeenCalled();
  });

  it("invalidates detail, tasks and series after settling", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskLabelsMutationOptions({
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
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ["labels"],
    });
  });

  it("rolls back, shows a toast and invalidates detail/labels on 404", async () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const current = task({ labels: [URGENT] });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate(input([WORK.id], [WORK]));

    options.onError(
      new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
      input([WORK.id], [WORK]),
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["labels"],
    });
  });
});
