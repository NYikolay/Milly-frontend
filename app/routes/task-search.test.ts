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
  search: undefined as
    | {
        isPending: boolean;
        data:
          | {
              items: {
                id: number;
                title: string;
                completed_at: string | null;
                labels: { id: number; name: string }[];
              }[];
              next_cursor: string | null;
            }
          | undefined;
        refetch: () => void;
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
  hookArgs: {
    search: undefined as unknown[] | undefined,
    toggle: undefined as unknown[] | undefined,
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
  useQuery: () => ({
    data: [],
    isPending: false,
    isError: false,
    refetch: () => undefined,
  }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => routeState.navigate,
}));

vi.mock("~/hooks/use-search-tasks", () => ({
  useSearchTasksData: (...args: unknown[]) => {
    routeState.hookArgs.search = args;
    return routeState.search;
  },
  useToggleSearchTaskCompletion: (...args: unknown[]) => {
    routeState.hookArgs.toggle = args;
    return routeState.toggle;
  },
}));

vi.mock("~/lib/labels/labels-api", () => ({
  fetchLabels: vi.fn(async () => []),
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

vi.mock("~/components/tasks/task-segments", () => ({
  TaskSegments: ({ value }: { value: string }) =>
    createElement("div", null, `SEGMENTS:${value}`),
}));

vi.mock("~/components/tasks/search/search-header", () => ({
  SearchHeader: () => createElement("div", null, "HEADER"),
}));

vi.mock("~/components/tasks/search/search-filter-bar", () => ({
  SearchFilterBar: (props: Record<string, unknown>) =>
    createElement("div", { "data-filter-bar": JSON.stringify(props) }),
}));

vi.mock("~/components/tasks/search/filters/search-filters-sheet", () => ({
  SearchFiltersSheet: ({ state }: { state: { step: string | null } }) =>
    createElement("div", null, `SHEET:${state.step ?? "none"}`),
}));

vi.mock("~/components/tasks/search/search-results", () => ({
  SearchResults: ({
    date,
    tasks,
    completionError,
    onOpenTask,
    onToggleTask,
  }: {
    date: string;
    tasks: { title: string }[];
    completionError: string | null;
    onOpenTask: (task: { id: number }) => void;
    onToggleTask: (task: RouteTask, nextCompleted: boolean) => void;
  }) => {
    routeState.onOpenTask = onOpenTask;
    routeState.onToggleTask = onToggleTask;

    return createElement(
      "div",
      null,
      `RESULTS:${date}:${tasks.map((task) => task.title).join(",")}:${completionError ?? ""}`,
    );
  },
}));

vi.mock("~/components/tasks/search/search-tasks-skeleton", () => ({
  SearchTasksSkeleton: () => createElement("div", null, "SKELETON"),
}));

vi.mock("~/components/tasks/search/search-tasks-error", () => ({
  SearchTasksError: () => createElement("div", null, "ERROR"),
}));

vi.mock("~/components/tasks/today/add-task-button", () => ({
  AddTaskButton: () => null,
}));

vi.mock("~/components/home/bottom-navigation-dock", () => ({
  BottomNavigationDock: () => null,
}));

import { formatZonedToday } from "~/lib/tasks/date-time";
import { createDefaultSearchFilters } from "~/lib/tasks/search-filters";
import type { TaskListResponse } from "~/lib/tasks/types";

import TaskSearch, { loader, resolveSearchResults } from "./task-search";

function render(activeFilterPreview = false): string {
  return renderToStaticMarkup(
    createElement(TaskSearch, {
      loaderData: { activeFilterPreview },
    } as never),
  );
}

function currentToday(): string {
  return formatZonedToday(new Date(), "UTC");
}

interface FilterBarProps {
  activeFilterCount: number;
  activeDate: boolean;
  activePriority: boolean;
  activeProject: boolean;
  activeRecurrence: boolean;
}

function getFilterBarProps(html: string): FilterBarProps {
  const match = /data-filter-bar="([^"]*)"/.exec(html);

  if (!match) {
    throw new Error("SearchFilterBar props were not rendered");
  }

  return JSON.parse(match[1].replaceAll("&quot;", '"')) as FilterBarProps;
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

describe("TaskSearch route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T12:00:00Z"));
    routeState.search = {
      isPending: false,
      data: {
        items: [
          {
            id: 1,
            title: "Плановая задача",
            completed_at: null,
            labels: [],
          },
        ],
        next_cursor: null,
      },
      refetch: () => undefined,
    };
    routeState.toggle.isPending = false;
    routeState.toggle.isError = false;
    routeState.toggle.variables = undefined;
    routeState.toggle.mutate = vi.fn();
    routeState.toggle.reset = vi.fn();
    routeState.hookArgs.search = undefined;
    routeState.hookArgs.toggle = undefined;
    routeState.navigate.mockClear();
    routeState.onOpenTask = undefined;
    routeState.onToggleTask = undefined;
    taskToasts.showTaskPastDueToast.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the search composition with default filters", () => {
    const today = currentToday();
    const html = render();

    expect(html).toContain("SEGMENTS:search");
    expect(html).toContain("HEADER");
    expect(html).toContain(`RESULTS:${today}:Плановая задача:`);
    expect(getFilterBarProps(html)).toEqual({
      activeFilterCount: 0,
      activeDate: false,
      activePriority: false,
      activeProject: false,
      activeRecurrence: false,
    });
    expect(html).toContain("SHEET:none");
    expect(routeState.hookArgs.search?.slice(0, 3)).toEqual([
      "UTC",
      today,
      "",
    ]);
    expect(routeState.hookArgs.search?.[3]).toEqual(
      createDefaultSearchFilters(),
    );
    expect(routeState.hookArgs.toggle?.[3]).toEqual(
      createDefaultSearchFilters(),
    );
  });

  it("shows the skeleton while the first request is pending", () => {
    routeState.search = {
      isPending: true,
      data: undefined,
      refetch: () => undefined,
    };

    const html = render();

    expect(html).toContain("SKELETON");
    expect(html).toContain("SEGMENTS:search");
    expect(html).toContain("HEADER");
    expect(getFilterBarProps(html).activeFilterCount).toBe(0);
    expect(html).toContain("SHEET:none");
  });

  it("shows the error when a request fails without cached data", () => {
    routeState.search = {
      isPending: false,
      data: undefined,
      refetch: () => undefined,
    };

    const html = render();

    expect(html).toContain("ERROR");
    expect(html).toContain("SEGMENTS:search");
    expect(html).toContain("HEADER");
    expect(getFilterBarProps(html).activeFilterCount).toBe(0);
    expect(html).toContain("SHEET:none");
  });

  it("passes the completion error to the results", () => {
    const today = currentToday();
    routeState.toggle.isError = true;
    routeState.toggle.variables = { taskId: 1, nextCompleted: true };

    expect(render()).toContain(
      `RESULTS:${today}:Плановая задача:Не удалось обновить задачу. Попробуйте ещё раз.`,
    );
  });

  it("shows the active project filter in preview mode", () => {
    const filterBar = getFilterBarProps(render(true));

    expect(filterBar).toEqual({
      activeFilterCount: 1,
      activeDate: false,
      activePriority: false,
      activeProject: true,
      activeRecurrence: false,
    });
  });

  it("navigates to the task detail from a row", () => {
    render();
    routeState.onOpenTask?.({ id: 42 });

    expect(routeState.navigate).toHaveBeenCalledWith("/tasks/42");
  });

  it("shows the past-due toast instead of reactivating a completed one-off task due yesterday", () => {
    render();

    routeState.onToggleTask?.(pastDueTask(), false);

    expect(taskToasts.showTaskPastDueToast).toHaveBeenCalledTimes(1);
    expect(routeState.toggle.reset).toHaveBeenCalledTimes(1);
    expect(routeState.toggle.mutate).not.toHaveBeenCalled();
  });

  it("shows the past-due toast instead of reactivating a completed series task due yesterday", () => {
    render();

    routeState.onToggleTask?.(pastDueTask({ series_id: 42 }), false);

    expect(taskToasts.showTaskPastDueToast).toHaveBeenCalledTimes(1);
    expect(routeState.toggle.reset).toHaveBeenCalledTimes(1);
    expect(routeState.toggle.mutate).not.toHaveBeenCalled();
  });

  it("sends reactivation of a completed task due later today", () => {
    render();

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
});

describe("resolveSearchResults", () => {
  const current: TaskListResponse = { items: [], next_cursor: "current" };
  const previous: TaskListResponse = { items: [], next_cursor: "previous" };

  it("prefers the current response when defined", () => {
    expect(resolveSearchResults(current, previous)).toBe(current);
  });

  it("falls back to the previous response when the current is undefined", () => {
    expect(resolveSearchResults(undefined, previous)).toBe(previous);
  });

  it("returns undefined when both responses are undefined", () => {
    expect(resolveSearchResults(undefined, undefined)).toBeUndefined();
  });
});

describe("TaskSearch loader", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function load(url: string) {
    return loader({ request: new Request(url) } as never);
  }

  it("enables the filter preview in dev with the state param", () => {
    vi.stubEnv("DEV", true);

    expect(load("http://localhost/tasks/search?state=filter")).toEqual({
      activeFilterPreview: true,
    });
    expect(load("http://localhost/tasks/search")).toEqual({
      activeFilterPreview: false,
    });
  });

  it("keeps the filter preview off outside dev", () => {
    vi.stubEnv("DEV", false);

    expect(load("http://localhost/tasks/search?state=filter")).toEqual({
      activeFilterPreview: false,
    });
  });
});
