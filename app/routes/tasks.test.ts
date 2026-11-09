import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface RouteTask {
  id: number;
  series_id: number | null;
  due_at: string;
  completed_at: string | null;
}

const taskToasts = vi.hoisted(() => ({
  showTaskPastDueToast: vi.fn(),
}));

vi.mock("~/lib/tasks/task-toasts", () => taskToasts);

const routeState = vi.hoisted(() => ({
  overview: undefined as
    | {
        isPending: boolean;
        isError: boolean;
        data:
          | {
              tasks: { title: string }[];
              progress: {
                total: number;
                completed: number;
                remaining: number;
              };
            }
          | undefined;
      }
    | undefined,
  toggle: {
    isPending: false,
    isError: false,
    variables: undefined as
      | { taskId: number; nextCompleted: boolean }
      | undefined,
    mutate: (_variables: {
      taskId: number;
      nextCompleted: boolean;
    }): void => {},
    reset: vi.fn(),
  },
  navigate: vi.fn(),
  onOpenTask: undefined as
    | ((task: { id: number }) => void)
    | undefined,
  onToggleTask: undefined as
    | ((task: RouteTask, nextCompleted: boolean) => void)
    | undefined,
}));

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: () => ({ data: [] }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => routeState.navigate,
}));

vi.mock("~/hooks/use-today-tasks", () => ({
  useTodayTasksData: () => routeState.overview,
  useToggleTaskCompletion: () => routeState.toggle,
}));

vi.mock("~/hooks/use-bottom-navigation", () => ({
  useBottomNavigation: () => () => undefined,
}));

vi.mock("~/hooks/use-task-segment-navigation", () => ({
  useTaskSegmentNavigation: () => () => undefined,
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

vi.mock("~/components/tasks/today/today-tasks-view", () => ({
  TodayTasksView: ({
    tasks,
    onOpenTask,
    onToggleTask,
  }: {
    tasks: { title: string }[];
    onOpenTask: (task: { id: number }) => void;
    onToggleTask: (task: RouteTask, nextCompleted: boolean) => void;
  }) => {
    routeState.onOpenTask = onOpenTask;
    routeState.onToggleTask = onToggleTask;

    return createElement(
      "div",
      null,
      `VIEW:${tasks.map((task) => task.title).join(",")}`,
    );
  },
}));

vi.mock("~/components/tasks/today/today-tasks-error", () => ({
  TodayTasksError: () => createElement("div", null, "ERROR"),
}));

vi.mock("~/components/tasks/today/today-tasks-skeleton", () => ({
  TodayTasksSkeleton: () => createElement("div", null, "SKELETON"),
}));

vi.mock("~/components/home/bottom-navigation-dock", () => ({
  BottomNavigationDock: () => null,
}));

vi.mock("~/components/voice/voice-recorder-sheet", () => ({
  VoiceRecorderSheet: () => null,
}));

import Tasks from "./tasks";

function renderTasks(): string {
  return renderToStaticMarkup(createElement(Tasks));
}

function pastDueTask(overrides: Partial<RouteTask> = {}): RouteTask {
  return {
    id: 7,
    series_id: null,
    due_at: "2026-11-07T08:00:00.000Z",
    completed_at: "2026-11-07T09:00:00.000Z",
    ...overrides,
  };
}

describe("Tasks route overview state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T12:00:00Z"));
    routeState.navigate.mockClear();
    routeState.onOpenTask = undefined;
    routeState.onToggleTask = undefined;
    routeState.toggle.mutate = vi.fn();
    routeState.toggle.reset = vi.fn();
    taskToasts.showTaskPastDueToast.mockClear();
    routeState.overview = {
      isPending: false,
      isError: false,
      data: {
        tasks: [{ title: "Плановая задача" }],
        progress: { total: 1, completed: 0, remaining: 1 },
      },
    };
  });

  it("keeps cached tasks visible when a background refetch fails", () => {
    routeState.overview = {
      isPending: false,
      isError: true,
      data: {
        tasks: [{ title: "Плановая задача" }],
        progress: { total: 1, completed: 0, remaining: 1 },
      },
    };

    const html = renderTasks();

    expect(html).toContain("VIEW:Плановая задача");
    expect(html).not.toContain("ERROR");
  });

  it("shows the full error when a request fails without cached data", () => {
    routeState.overview = {
      isPending: false,
      isError: true,
      data: undefined,
    };

    expect(renderTasks()).toContain("ERROR");
  });

  it("shows the skeleton while the first request is pending", () => {
    routeState.overview = {
      isPending: true,
      isError: false,
      data: undefined,
    };

    expect(renderTasks()).toContain("SKELETON");
  });

  it("navigates to the task detail from a row", () => {
    renderTasks();
    routeState.onOpenTask?.({ id: 42 });

    expect(routeState.navigate).toHaveBeenCalledWith("/tasks/42");
  });

  it("shows the past-due toast instead of reactivating a completed one-off task due yesterday", () => {
    renderTasks();

    routeState.onToggleTask?.(pastDueTask(), false);

    expect(taskToasts.showTaskPastDueToast).toHaveBeenCalledTimes(1);
    expect(routeState.toggle.reset).toHaveBeenCalledTimes(1);
    expect(routeState.toggle.mutate).not.toHaveBeenCalled();
  });

  it("shows the past-due toast instead of reactivating a completed series task due yesterday", () => {
    renderTasks();

    routeState.onToggleTask?.(pastDueTask({ series_id: 42 }), false);

    expect(taskToasts.showTaskPastDueToast).toHaveBeenCalledTimes(1);
    expect(routeState.toggle.reset).toHaveBeenCalledTimes(1);
    expect(routeState.toggle.mutate).not.toHaveBeenCalled();
  });

  it("sends reactivation of a completed task due later today", () => {
    renderTasks();

    routeState.onToggleTask?.(
      pastDueTask({
        due_at: "2026-11-08T13:00:00.000Z",
        completed_at: "2026-11-08T11:00:00.000Z",
      }),
      false,
    );

    expect(taskToasts.showTaskPastDueToast).not.toHaveBeenCalled();
    expect(routeState.toggle.mutate).toHaveBeenCalledWith({
      taskId: 7,
      nextCompleted: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
