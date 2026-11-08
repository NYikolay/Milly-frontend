import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import type { TaskResponse } from "~/lib/tasks/types";

interface TaskQueryState {
  isPending: boolean;
  data: TaskResponse | undefined;
  error: Error | null;
  refetch: () => void;
}

interface ToggleState {
  isPending: boolean;
  isError: boolean;
  mutate: (variables: { taskId: number; nextCompleted: boolean }) => void;
}

const routeState = vi.hoisted(() => ({
  params: { id: "42" } as Record<string, string | undefined>,
  taskArgs: undefined as [number, boolean] | undefined,
  task: undefined as TaskQueryState | undefined,
  toggle: {
    isPending: false,
    isError: false,
    mutate: (_variables: {
      taskId: number;
      nextCompleted: boolean;
    }): void => {},
  } as ToggleState,
  navigate: vi.fn(),
  bottomNavActive: undefined as string | undefined,
  onDeleted: undefined as (() => void) | undefined,
  onConfirmDelete: undefined as (() => void) | undefined,
  onBack: undefined as (() => void) | undefined,
  onRetry: undefined as (() => void) | undefined,
  showSeriesWarning: undefined as boolean | undefined,
}));

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: () => ({ data: [] }),
}));

vi.mock("react-router", () => ({
  useParams: () => routeState.params,
  useNavigate: () => routeState.navigate,
}));

vi.mock("~/hooks/use-task-detail", () => ({
  useTaskDetail: (taskId: number, enabled: boolean) => {
    routeState.taskArgs = [taskId, enabled];
    return routeState.task;
  },
  useToggleTaskDetailCompletion: () => routeState.toggle,
  useDeleteTask: (_taskId: number, onDeleted: () => void) => {
    routeState.onDeleted = onDeleted;

    return {
      mutate: () => onDeleted(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    };
  },
}));

vi.mock("~/hooks/use-bottom-navigation", () => ({
  useBottomNavigation: () => () => undefined,
}));

vi.mock("~/hooks/use-telegram-back-button", () => ({
  useTelegramBackButton: () => undefined,
}));

vi.mock("~/providers/auth-provider", () => ({
  useAuth: () => ({ user: { timezone: "UTC" } }),
}));

vi.mock("~/providers/telegram-provider", () => ({
  useTelegram: () => ({
    haptics: {
      selection: () => undefined,
      impact: () => undefined,
    },
  }),
}));

vi.mock("~/components/home/bottom-navigation-dock", () => ({
  BottomNavigationDock: ({ active }: { active?: string }) => {
    routeState.bottomNavActive = active;

    return null;
  },
}));

vi.mock("~/components/tasks/detail/task-detail-view", () => ({
  TaskDetailView: () => createElement("div", null, "VIEW"),
}));

vi.mock("~/components/tasks/detail/task-detail-error", () => ({
  TaskDetailError: ({
    kind,
    onBack,
    onRetry,
  }: {
    kind: string;
    onBack: () => void;
    onRetry: () => void;
  }) => {
    routeState.onBack = onBack;
    routeState.onRetry = onRetry;

    return createElement("div", null, `ERROR:${kind}`);
  },
}));

vi.mock("~/components/tasks/detail/task-detail-skeleton", () => ({
  TaskDetailSkeleton: () => createElement("div", null, "SKELETON"),
}));

vi.mock("~/components/tasks/detail/delete-task-modal", () => ({
  DeleteTaskModal: ({
    onConfirm,
    showSeriesWarning,
  }: {
    onConfirm: () => void;
    showSeriesWarning: boolean;
  }) => {
    routeState.onConfirmDelete = onConfirm;
    routeState.showSeriesWarning = showSeriesWarning;

    return null;
  },
}));

import TaskDetail from "./task-detail";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 42,
    series_id: null,
    project_id: null,
    title: "Записаться к доктору",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T12:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T09:00:00.000Z",
    updated_at: "2026-11-08T09:00:00.000Z",
    ...overrides,
  };
}

function renderRoute(): string {
  return renderToStaticMarkup(createElement(TaskDetail));
}

describe("TaskDetail route", () => {
  beforeEach(() => {
    routeState.params = { id: "42" };
    routeState.taskArgs = undefined;
    routeState.task = {
      isPending: false,
      data: task(),
      error: null,
      refetch: vi.fn(),
    };
    routeState.toggle = {
      isPending: false,
      isError: false,
      mutate: vi.fn(),
    };
    routeState.navigate.mockClear();
    routeState.bottomNavActive = undefined;
    routeState.onDeleted = undefined;
    routeState.onConfirmDelete = undefined;
    routeState.onBack = undefined;
    routeState.onRetry = undefined;
    routeState.showSeriesWarning = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows the skeleton while the task is loading", () => {
    routeState.task = {
      isPending: true,
      data: undefined,
      error: null,
      refetch: vi.fn(),
    };

    expect(renderRoute()).toContain("SKELETON");
  });

  it("shows the view when the task is loaded", () => {
    routeState.task = {
      isPending: false,
      data: task(),
      error: null,
      refetch: vi.fn(),
    };

    expect(renderRoute()).toContain("VIEW");
    expect(routeState.bottomNavActive).toBe("tasks");
  });

  it("shows not found for a 404", () => {
    routeState.task = {
      isPending: false,
      data: undefined,
      error: new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
      refetch: vi.fn(),
    };

    expect(renderRoute()).toContain("ERROR:not-found");
  });

  it("shows a load error for a non-404 failure", () => {
    routeState.task = {
      isPending: false,
      data: undefined,
      error: new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      refetch: vi.fn(),
    };

    expect(renderRoute()).toContain("ERROR:load-error");
  });

  it("retries the task query from the load error state", () => {
    routeState.task = {
      isPending: false,
      data: undefined,
      error: new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.onRetry?.();

    expect(routeState.task.refetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to /tasks from the error back button without history", () => {
    vi.stubGlobal("window", { history: { state: {} } });
    routeState.task = {
      isPending: false,
      data: undefined,
      error: new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.onBack?.();

    expect(routeState.navigate).toHaveBeenCalledWith("/tasks");
  });

  it("shows not found for an invalid id without a request", () => {
    routeState.params = { id: "abc" };

    expect(renderRoute()).toContain("ERROR:not-found");
    expect(routeState.taskArgs).toEqual([0, false]);
  });

  it("keeps cached task data when a background refetch fails", () => {
    routeState.task = {
      isPending: false,
      data: task(),
      error: new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      refetch: vi.fn(),
    };

    expect(renderRoute()).toContain("VIEW");
  });

  it("returns back after deletion", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });
    routeState.task = {
      isPending: false,
      data: task(),
      error: null,
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.onConfirmDelete?.();

    expect(routeState.navigate).toHaveBeenCalledWith(-1);
  });

  it("falls back to /tasks after deletion without history", () => {
    vi.stubGlobal("window", { history: { state: { idx: 0 } } });
    routeState.task = {
      isPending: false,
      data: task(),
      error: null,
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.onConfirmDelete?.();

    expect(routeState.navigate).toHaveBeenCalledWith("/tasks");
  });

  it("warns about cascade deletion for an upcoming incomplete series task", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T10:00:00Z"));
    routeState.task = {
      isPending: false,
      data: task({
        series_id: 5,
        completed_at: null,
        due_at: "2026-11-09T10:00:00.000Z",
      }),
      error: null,
      refetch: vi.fn(),
    };

    renderRoute();

    expect(routeState.showSeriesWarning).toBe(true);
  });

  it("does not warn about cascade deletion for a completed series task", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T10:00:00Z"));
    routeState.task = {
      isPending: false,
      data: task({
        series_id: 5,
        completed_at: "2026-11-08T09:00:00.000Z",
        due_at: "2026-11-09T10:00:00.000Z",
      }),
      error: null,
      refetch: vi.fn(),
    };

    renderRoute();

    expect(routeState.showSeriesWarning).toBe(false);
  });

  it("does not warn about cascade deletion for an overdue series task", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T10:00:00Z"));
    routeState.task = {
      isPending: false,
      data: task({
        series_id: 5,
        completed_at: null,
        due_at: "2026-11-07T10:00:00.000Z",
      }),
      error: null,
      refetch: vi.fn(),
    };

    renderRoute();

    expect(routeState.showSeriesWarning).toBe(false);
  });
});
