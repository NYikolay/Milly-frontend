import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import type { Priority, TaskResponse } from "~/lib/tasks/types";

interface TaskQueryState {
  isPending: boolean;
  data: TaskResponse | undefined;
  error: Error | null;
  refetch: () => void;
}

interface PriorityMutationState {
  mutate: (priority: Priority) => void;
}

interface PriorityViewState {
  priority: Priority;
  onSelect: (priority: Priority) => void;
}

const routeState = vi.hoisted(() => ({
  params: { id: "42" } as Record<string, string | undefined>,
  taskArgs: undefined as [number, boolean] | undefined,
  task: undefined as TaskQueryState | undefined,
  mutationArgs: undefined as number | undefined,
  mutation: {
    mutate: (_priority: Priority): void => {},
  } as PriorityMutationState,
  viewProps: undefined as PriorityViewState | undefined,
  navigate: vi.fn(),
  bottomNavActive: undefined as string | undefined,
  selection: vi.fn(),
  onBackButton: undefined as (() => void) | undefined,
  onBack: undefined as (() => void) | undefined,
  onRetry: undefined as (() => void) | undefined,
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
}));

vi.mock("~/hooks/use-update-task-priority", () => ({
  useUpdateTaskPriority: (taskId: number) => {
    routeState.mutationArgs = taskId;

    return routeState.mutation;
  },
}));

vi.mock("~/hooks/use-bottom-navigation", () => ({
  useBottomNavigation: () => () => undefined,
}));

vi.mock("~/hooks/use-telegram-back-button", () => ({
  useTelegramBackButton: (onBack: () => void) => {
    routeState.onBackButton = onBack;
  },
}));

vi.mock("~/providers/auth-provider", () => ({
  useAuth: () => ({ user: { timezone: "UTC" } }),
}));

vi.mock("~/providers/telegram-provider", () => ({
  useTelegram: () => ({
    haptics: {
      selection: routeState.selection,
      impact: () => undefined,
      notification: () => undefined,
    },
  }),
}));

vi.mock("~/components/home/bottom-navigation-dock", () => ({
  BottomNavigationDock: ({ active }: { active?: string }) => {
    routeState.bottomNavActive = active;

    return null;
  },
}));

vi.mock("~/components/tasks/priority/task-priority-view", () => ({
  TaskPriorityView: (props: PriorityViewState) => {
    routeState.viewProps = props;

    return createElement("div", null, "VIEW");
  },
}));

vi.mock("~/components/tasks/priority/task-priority-skeleton", () => ({
  TaskPrioritySkeleton: () => createElement("div", null, "SKELETON"),
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

import TaskPriority, { meta } from "./task-priority";

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
  return renderToStaticMarkup(createElement(TaskPriority));
}

describe("TaskPriority route", () => {
  beforeEach(() => {
    routeState.params = { id: "42" };
    routeState.taskArgs = undefined;
    routeState.task = {
      isPending: false,
      data: task(),
      error: null,
      refetch: vi.fn(),
    };
    routeState.mutationArgs = undefined;
    routeState.mutation = {
      mutate: vi.fn(),
    };
    routeState.viewProps = undefined;
    routeState.navigate.mockClear();
    routeState.bottomNavActive = undefined;
    routeState.selection.mockClear();
    routeState.onBackButton = undefined;
    routeState.onBack = undefined;
    routeState.onRetry = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("shows the view with the current priority", () => {
    routeState.task = {
      isPending: false,
      data: task({ priority: "urgent_not_important" }),
      error: null,
      refetch: vi.fn(),
    };

    const html = renderRoute();

    expect(html).toContain("VIEW");
    expect(routeState.viewProps?.priority).toBe("urgent_not_important");
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
    const refetch = vi.fn();
    routeState.task = {
      isPending: false,
      data: undefined,
      error: new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      refetch,
    };

    const html = renderRoute();

    expect(html).toContain("ERROR:load-error");

    routeState.onRetry?.();

    expect(refetch).toHaveBeenCalledTimes(1);
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

  it("sends a new priority and goes back", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });

    renderRoute();
    routeState.viewProps?.onSelect("urgent_important");

    expect(routeState.mutationArgs).toBe(42);
    expect(routeState.mutation.mutate).toHaveBeenCalledWith(
      "urgent_important",
    );
    expect(routeState.navigate).toHaveBeenCalledWith(-1);
    expect(routeState.selection).toHaveBeenCalledTimes(1);
  });

  it("does not send the current priority and still goes back", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });

    renderRoute();
    routeState.viewProps?.onSelect("neither");

    expect(routeState.mutation.mutate).not.toHaveBeenCalled();
    expect(routeState.navigate).toHaveBeenCalledWith(-1);
  });

  it("falls back to /tasks/42 without history", () => {
    vi.stubGlobal("window", { history: { state: {} } });

    renderRoute();
    routeState.viewProps?.onSelect("urgent_important");

    expect(routeState.mutation.mutate).toHaveBeenCalledWith(
      "urgent_important",
    );
    expect(routeState.navigate).toHaveBeenCalledWith("/tasks/42");
  });

  it("falls back to /tasks for an invalid id", () => {
    routeState.params = { id: "abc" };
    vi.stubGlobal("window", { history: { state: {} } });

    renderRoute();
    routeState.onBack?.();

    expect(routeState.navigate).toHaveBeenCalledWith("/tasks");
  });

  it("goes back through the native BackButton with history", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });

    renderRoute();
    routeState.onBackButton?.();

    expect(routeState.navigate).toHaveBeenCalledWith(-1);
    expect(routeState.selection).toHaveBeenCalledTimes(1);
  });

  it("falls back to /tasks/42 through the native BackButton without history", () => {
    vi.stubGlobal("window", { history: { state: {} } });

    renderRoute();
    routeState.onBackButton?.();

    expect(routeState.navigate).toHaveBeenCalledWith("/tasks/42");
  });

  it("returns the public meta title and description", () => {
    expect(meta({} as never)).toContainEqual({
      title: "Приоритет — Milly",
    });
    expect(meta({} as never)).toContainEqual({
      name: "description",
      content: "Изменение приоритета задачи в Milly",
    });
  });
});
