import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { TASK_REMINDERS_SAVE_ERROR } from "~/lib/tasks/reminders";
import type { TaskResponse, TaskUpdateInput } from "~/lib/tasks/types";

interface TaskQueryState {
  isPending: boolean;
  data: TaskResponse | undefined;
  error: Error | null;
  refetch: () => void;
}

interface RemindersMutationState {
  mutate: (input: TaskUpdateInput) => void;
  reset: () => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  variables: TaskUpdateInput | undefined;
}

interface RemindersViewState {
  task: TaskResponse;
  error: string | null;
  onSave: (input: TaskUpdateInput) => void;
  onRetry: () => void;
  onToggleHaptic?: () => void;
}

const routeState = vi.hoisted(() => ({
  params: { id: "42" } as Record<string, string | undefined>,
  taskArgs: undefined as [number, boolean] | undefined,
  task: undefined as TaskQueryState | undefined,
  mutationArgs: undefined as number | undefined,
  mutation: {
    mutate: (_input: TaskUpdateInput): void => {},
    reset: (): void => {},
    isPending: false,
    isError: false,
    error: null,
    variables: undefined,
  } as RemindersMutationState,
  viewProps: undefined as RemindersViewState | undefined,
  navigate: vi.fn(),
  bottomNavActive: undefined as string | undefined,
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

vi.mock("~/hooks/use-update-task-reminders", () => ({
  useUpdateTaskReminders: (taskId: number) => {
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
      selection: () => undefined,
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

vi.mock("~/components/tasks/reminders/task-reminders-view", () => ({
  TaskRemindersView: (props: RemindersViewState) => {
    routeState.viewProps = props;

    return createElement("div", null, "VIEW");
  },
}));

vi.mock("~/components/tasks/reminders/task-reminders-skeleton", () => ({
  TaskRemindersSkeleton: () => createElement("div", null, "SKELETON"),
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

import TaskReminders, { meta } from "./task-reminders";

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
  return renderToStaticMarkup(createElement(TaskReminders));
}

describe("TaskReminders route", () => {
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
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      variables: undefined,
    };
    routeState.viewProps = undefined;
    routeState.navigate.mockClear();
    routeState.bottomNavActive = undefined;
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

  it("shows the view when the task is loaded", () => {
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

  it("saves reminder changes through the mutation", () => {
    renderRoute();
    routeState.viewProps?.onSave({ reminders_enabled: true });

    expect(routeState.mutation.mutate).toHaveBeenCalledWith({
      reminders_enabled: true,
    });
  });

  it("retries the last failed payload", () => {
    const input = { reminders_enabled: true };
    routeState.mutation = {
      mutate: vi.fn(),
      reset: vi.fn(),
      isPending: false,
      isError: true,
      error: new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      variables: input,
    };

    renderRoute();
    routeState.viewProps?.onRetry();

    expect(routeState.mutation.reset).toHaveBeenCalledTimes(1);
    expect(routeState.mutation.mutate).toHaveBeenCalledWith(input);
  });

  it("shows the save error", () => {
    routeState.mutation = {
      mutate: vi.fn(),
      reset: vi.fn(),
      isPending: false,
      isError: true,
      error: new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      variables: undefined,
    };

    renderRoute();

    expect(routeState.viewProps?.error).toBe(TASK_REMINDERS_SAVE_ERROR);
  });

  it("falls back to /tasks/42 from the back button without history", () => {
    vi.stubGlobal("window", { history: { state: {} } });

    renderRoute();
    routeState.onBackButton?.();

    expect(routeState.navigate).toHaveBeenCalledWith("/tasks/42");
  });

  it("goes back through history", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });

    renderRoute();
    routeState.onBackButton?.();

    expect(routeState.navigate).toHaveBeenCalledWith(-1);
  });

  it("returns the public meta title", () => {
    expect(meta({} as never)).toContainEqual({
      title: "Напоминания — Milly",
    });
  });
});
