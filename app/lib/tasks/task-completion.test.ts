import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { completeTask, uncompleteTask } from "./tasks-api";
import { applyCompletionFields, replaceTaskInList } from "./completion-cache";
import {
  createTaskCompletionMutationOptions,
  type TaskCompletionHaptics,
} from "./task-completion";
import type { TaskResponse } from "./types";

vi.mock("./tasks-api", () => ({
  completeTask: vi.fn(),
  uncompleteTask: vi.fn(),
}));

interface ListData {
  items: TaskResponse[];
}

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T07:00:00.000Z",
    updated_at: "2026-11-08T07:00:00.000Z",
    ...overrides,
  };
}

const queryKey = ["tasks", "test"] as const;

let queryClient: QueryClient;
let haptics: TaskCompletionHaptics;

beforeEach(() => {
  queryClient = new QueryClient();
  haptics = { selection: vi.fn(), notification: vi.fn() };
  vi.mocked(completeTask).mockReset();
  vi.mocked(uncompleteTask).mockReset();
});

function createOptions() {
  return createTaskCompletionMutationOptions<ListData>({
    queryClient,
    haptics,
    queryKey,
    applyOptimistic: (data, taskId, completedAt) =>
      data
        ? {
            items: data.items.map((item) =>
              item.id === taskId
                ? applyCompletionFields(item, completedAt)
                : item,
            ),
          }
        : data,
    applySuccess: (data, updatedTask) =>
      data
        ? { items: replaceTaskInList(data.items, updatedTask) }
        : data,
  });
}

describe("createTaskCompletionMutationOptions", () => {
  it("optimistically completes, rolls back and reports haptics", async () => {
    const data: ListData = { items: [task()] };
    queryClient.setQueryData(queryKey, data);
    const options = createOptions();

    const context = await options.onMutate({
      taskId: 1,
      nextCompleted: true,
    });

    expect(context.previous).toBe(data);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData<ListData>(queryKey)?.items[0].completed_at,
    ).toEqual(expect.any(String));

    options.onError(
      new Error("failed"),
      { taskId: 1, nextCompleted: true },
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toBe(data);
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });

  it("replaces the task with the server response on success", () => {
    const data: ListData = { items: [task()] };
    queryClient.setQueryData(queryKey, data);
    const options = createOptions();
    const updated = task({ completed_at: "2026-11-08T10:00:00.000Z" });

    options.onSuccess(updated);

    expect(queryClient.getQueryData<ListData>(queryKey)?.items[0]).toBe(
      updated,
    );
    expect(haptics.notification).toHaveBeenCalledWith("success");
  });

  it("calls complete/uncomplete and invalidates tasks and projects", async () => {
    vi.mocked(completeTask).mockResolvedValue(task());
    vi.mocked(uncompleteTask).mockResolvedValue(task());
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createOptions();

    await options.mutationFn({ taskId: 5, nextCompleted: true });
    await options.mutationFn({ taskId: 5, nextCompleted: false });
    options.onSettled();

    expect(completeTask).toHaveBeenCalledWith(5);
    expect(uncompleteTask).toHaveBeenCalledWith(5);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tasks"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
  });
});
