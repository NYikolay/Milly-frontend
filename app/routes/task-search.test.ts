import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routeState = vi.hoisted(() => ({
  search: undefined as
    | {
        isPending: boolean;
        data:
          | {
              items: { id: number; title: string }[];
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
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [] }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => () => undefined,
}));

vi.mock("~/hooks/use-search-tasks", () => ({
  useSearchTasksData: () => routeState.search,
  useToggleSearchTaskCompletion: () => routeState.toggle,
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
  SearchFilterBar: ({
    activeFilterCount,
    activeChip,
  }: {
    activeFilterCount: number;
    activeChip: string | null;
  }) =>
    createElement(
      "div",
      null,
      `FILTERS:${activeFilterCount}:${activeChip ?? "none"}`,
    ),
}));

vi.mock("~/components/tasks/search/search-results", () => ({
  SearchResults: ({
    tasks,
    completionError,
  }: {
    tasks: { title: string }[];
    completionError: string | null;
  }) =>
    createElement(
      "div",
      null,
      `RESULTS:${tasks.map((task) => task.title).join(",")}:${completionError ?? ""}`,
    ),
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

import TaskSearch, { loader } from "./task-search";

function render(activeFilterPreview = false): string {
  return renderToStaticMarkup(
    createElement(TaskSearch, {
      loaderData: { activeFilterPreview },
    } as never),
  );
}

describe("TaskSearch route", () => {
  beforeEach(() => {
    routeState.search = {
      isPending: false,
      data: {
        items: [{ id: 1, title: "Плановая задача" }],
        next_cursor: null,
      },
      refetch: () => undefined,
    };
    routeState.toggle.isPending = false;
    routeState.toggle.isError = false;
    routeState.toggle.variables = undefined;
    routeState.toggle.mutate = () => undefined;
  });

  it("renders the search composition with results", () => {
    const html = render();

    expect(html).toContain("SEGMENTS:search");
    expect(html).toContain("HEADER");
    expect(html).toContain("RESULTS:Плановая задача:");
    expect(html).toContain("FILTERS:0:none");
  });

  it("shows the skeleton while the first request is pending", () => {
    routeState.search = {
      isPending: true,
      data: undefined,
      refetch: () => undefined,
    };

    expect(render()).toContain("SKELETON");
  });

  it("shows the error when a request fails without cached data", () => {
    routeState.search = {
      isPending: false,
      data: undefined,
      refetch: () => undefined,
    };

    expect(render()).toContain("ERROR");
  });

  it("passes the completion error to the results", () => {
    routeState.toggle.isError = true;
    routeState.toggle.variables = { taskId: 1, nextCompleted: true };

    expect(render()).toContain(
      "RESULTS:Плановая задача:Не удалось обновить задачу. Попробуйте ещё раз.",
    );
  });

  it("shows the active project filter in preview mode", () => {
    const html = render(true);

    expect(html).toContain("FILTERS:1:project");
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
