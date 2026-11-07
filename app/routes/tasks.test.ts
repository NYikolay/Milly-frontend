import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [] }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => () => undefined,
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
  TodayTasksView: ({ tasks }: { tasks: { title: string }[] }) =>
    createElement(
      "div",
      null,
      `VIEW:${tasks.map((task) => task.title).join(",")}`,
    ),
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

describe("Tasks route overview state", () => {
  beforeEach(() => {
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
});
