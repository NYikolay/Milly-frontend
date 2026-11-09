import { QueryClient, keepPreviousData } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import {
  buildSearchTaskListQuery,
  createDefaultSearchFilters,
  type SearchTaskFilters,
} from "~/lib/tasks/search-filters";
import { searchTasksQueryKey } from "~/lib/tasks/search-tasks-cache";
import { fetchTasks } from "~/lib/tasks/tasks-api";
import type { TaskListResponse, TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import {
  createToggleSearchTaskMutationOptions,
  useSearchTasksData,
  type ToggleSearchTaskMutationOptions,
} from "./use-search-tasks";

const useQueryMock = vi.hoisted(() => vi.fn());
const taskToasts = vi.hoisted(() => ({
  showTaskPastDueToast: vi.fn(),
}));

vi.mock("~/lib/tasks/task-toasts", () => taskToasts);

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: useQueryMock };
});

vi.mock("~/lib/tasks/tasks-api", () => ({
  completeTask: vi.fn(),
  fetchTasks: vi.fn(),
  uncompleteTask: vi.fn(),
}));

const TIME_ZONE = "Europe/Moscow";
const DATE = "2026-11-06";
const QUERY = "отчёт";
const FILTERS: SearchTaskFilters = {
  ...createDefaultSearchFilters(),
  status: "open",
};
const queryKey = searchTasksQueryKey(
  TIME_ZONE,
  DATE,
  QUERY,
  createDefaultSearchFilters(),
);

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

function createData(): TaskListResponse {
  return {
    items: [
      task({ id: 1 }),
      task({ id: 2, completed_at: "2026-11-06T09:00:00.000Z" }),
    ],
    next_cursor: "next-page",
  };
}

let queryClient: QueryClient;
let haptics: TelegramHaptics;

beforeEach(() => {
  queryClient = new QueryClient();
  useQueryMock.mockReset();
  vi.mocked(fetchTasks).mockReset();
  taskToasts.showTaskPastDueToast.mockClear();
  haptics = {
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  };
});

function createOptions(
  data?: TaskListResponse,
): ToggleSearchTaskMutationOptions {
  if (data !== undefined) {
    queryClient.setQueryData(queryKey, data);
  }

  return createToggleSearchTaskMutationOptions({
    queryClient,
    haptics,
    queryKey,
  });
}

describe("useSearchTasksData", () => {
  it("requests tasks with the built server query and fingerprinted key", async () => {
    useQueryMock.mockReturnValue({ data: undefined });
    vi.mocked(fetchTasks).mockResolvedValue({ items: [], next_cursor: null });
    const controller = new AbortController();

    useSearchTasksData(TIME_ZONE, DATE, QUERY, FILTERS);

    expect(useQueryMock).toHaveBeenCalledTimes(1);

    const options = useQueryMock.mock.calls[0][0] as {
      queryKey: unknown;
      queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
      placeholderData: unknown;
    };

    expect(options.queryKey).toEqual(
      searchTasksQueryKey(TIME_ZONE, DATE, QUERY, FILTERS),
    );
    expect(options.placeholderData).toBe(keepPreviousData);

    await options.queryFn({ signal: controller.signal });

    expect(fetchTasks).toHaveBeenCalledWith(
      buildSearchTaskListQuery(FILTERS, DATE, QUERY),
      controller.signal,
    );
  });
});

describe("createToggleSearchTaskMutationOptions", () => {
  it("snapshots the cache and optimistically completes a task", async () => {
    const data = createData();
    const options = createOptions(data);

    const context = await options.onMutate({
      taskId: 1,
      nextCompleted: true,
    });

    expect(context.previous).toBe(data);
    expect(haptics.selection).toHaveBeenCalledTimes(1);

    const optimistic = queryClient.getQueryData<TaskListResponse>(queryKey);

    expect(optimistic?.items[0].completed_at).toEqual(expect.any(String));
    expect(optimistic?.next_cursor).toBe("next-page");
  });

  it("optimistically uncompletes a task", async () => {
    const data = createData();
    const options = createOptions(data);

    await options.onMutate({ taskId: 2, nextCompleted: false });

    const optimistic = queryClient.getQueryData<TaskListResponse>(queryKey);

    expect(optimistic?.items[1].completed_at).toBeNull();
    expect(optimistic?.next_cursor).toBe("next-page");
  });

  it("restores the previous snapshot and reports an error haptic", async () => {
    const data = createData();
    const options = createOptions(data);
    const context = await options.onMutate({
      taskId: 1,
      nextCompleted: true,
    });

    options.onError(
      new Error("request failed"),
      { taskId: 1, nextCompleted: true },
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(data);
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });

  it("shows the past-due toast when reactivation is rejected", async () => {
    const data = createData();
    const options = createOptions(data);
    const context = await options.onMutate({
      taskId: 2,
      nextCompleted: false,
    });

    options.onError(
      new ApiError("Task due date is in the past", {
        status: 400,
        code: "bad_request",
        requestId: "request-1",
      }),
      { taskId: 2, nextCompleted: false },
      context,
    );

    expect(taskToasts.showTaskPastDueToast).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(queryKey)).toEqual(data);
  });

  it("replaces the task with the server response and reports success", () => {
    const data = createData();
    const options = createOptions(data);
    const updatedTask = task({
      id: 1,
      title: "Обновлённая задача",
      completed_at: "2026-11-06T10:00:00.000Z",
      updated_at: "2026-11-06T10:00:00.000Z",
    });

    options.onSuccess(updatedTask);

    const next = queryClient.getQueryData<TaskListResponse>(queryKey);

    expect(next?.items[0]).toEqual(updatedTask);
    expect(next?.items[1]).toBe(data.items[1]);
    expect(next?.next_cursor).toBe("next-page");
    expect(haptics.notification).toHaveBeenCalledWith("success");
  });

  it("invalidates tasks and projects after settling", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createOptions();

    options.onSettled();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tasks"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
  });
});
