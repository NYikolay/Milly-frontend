import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import type { ProjectResponse } from "~/lib/projects/types";
import type { TaskResponse } from "~/lib/tasks/types";

interface TaskQueryState {
  isPending: boolean;
  data: TaskResponse | undefined;
  error: Error | null;
  refetch: () => void;
}

interface ProjectsQueryState {
  data: ProjectResponse[] | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

interface ProjectMutationState {
  mutate: (projectId: number | null) => void;
}

interface ProjectViewState {
  selectedProjectId: number | null;
  projects: readonly ProjectResponse[];
  isProjectsLoading: boolean;
  isProjectsError: boolean;
  onRetryProjects: () => void;
  onSelect: (projectId: number | null) => void;
}

const routeState = vi.hoisted(() => ({
  params: { id: "42" } as Record<string, string | undefined>,
  taskArgs: undefined as [number, boolean] | undefined,
  task: undefined as TaskQueryState | undefined,
  projectsEnabled: undefined as boolean | undefined,
  projects: undefined as ProjectsQueryState | undefined,
  mutationArgs: undefined as number | undefined,
  mutation: {
    mutate: (_projectId: number | null): void => {},
  } as ProjectMutationState,
  viewProps: undefined as ProjectViewState | undefined,
  navigate: vi.fn(),
  bottomNavActive: undefined as string | undefined,
  selection: vi.fn(),
  onBackButton: undefined as (() => void) | undefined,
  onBack: undefined as (() => void) | undefined,
  onRetry: undefined as (() => void) | undefined,
}));

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: (options: { enabled: boolean }) => {
    routeState.projectsEnabled = options.enabled;

    return routeState.projects;
  },
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

vi.mock("~/hooks/use-update-task-project", () => ({
  useUpdateTaskProject: (taskId: number) => {
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

vi.mock("~/components/tasks/project/task-project-view", () => ({
  TaskProjectView: (props: ProjectViewState) => {
    routeState.viewProps = props;

    return createElement("div", null, "VIEW");
  },
}));

vi.mock("~/components/tasks/project/task-project-skeleton", () => ({
  TaskProjectSkeleton: () => createElement("div", null, "SKELETON"),
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

import TaskProject, { meta } from "./task-project";

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

function project(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    id: 10,
    name: "Работа",
    description: null,
    icon: "book",
    color: { id: 1, slug: "green", name: "Зелёный", hex: "#16A34A" },
    progress: { total: 0, completed: 0, remaining: 0 },
    archived_at: null,
    created_at: "2026-11-01T07:00:00.000Z",
    updated_at: "2026-11-01T07:00:00.000Z",
    ...overrides,
  };
}

function renderRoute(): string {
  return renderToStaticMarkup(createElement(TaskProject));
}

describe("TaskProject route", () => {
  beforeEach(() => {
    routeState.params = { id: "42" };
    routeState.taskArgs = undefined;
    routeState.task = {
      isPending: false,
      data: task(),
      error: null,
      refetch: vi.fn(),
    };
    routeState.projectsEnabled = undefined;
    routeState.projects = {
      data: [],
      isPending: false,
      isError: false,
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

  it("shows the view with the current project and projects data", () => {
    const projects = [project()];

    routeState.task = {
      isPending: false,
      data: task({ project_id: 10 }),
      error: null,
      refetch: vi.fn(),
    };
    routeState.projects = {
      data: projects,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };

    const html = renderRoute();

    expect(html).toContain("VIEW");
    expect(routeState.viewProps?.selectedProjectId).toBe(10);
    expect(routeState.viewProps?.projects).toBe(projects);
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

  it("shows not found for an invalid id without requests", () => {
    routeState.params = { id: "abc" };

    expect(renderRoute()).toContain("ERROR:not-found");
    expect(routeState.taskArgs).toEqual([0, false]);
    expect(routeState.projectsEnabled).toBe(false);
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

  it("passes the projects loading state to the view", () => {
    routeState.projects = {
      data: [],
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    };

    const html = renderRoute();

    expect(html).toContain("VIEW");
    expect(routeState.viewProps?.isProjectsLoading).toBe(true);
  });

  it("passes the projects error state and retry to the view", () => {
    const refetch = vi.fn();

    routeState.projects = {
      data: [],
      isPending: false,
      isError: true,
      refetch,
    };

    renderRoute();

    expect(routeState.viewProps?.isProjectsError).toBe(true);

    routeState.viewProps?.onRetryProjects();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("sends a new project and goes back", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });

    renderRoute();
    routeState.viewProps?.onSelect(11);

    expect(routeState.mutationArgs).toBe(42);
    expect(routeState.mutation.mutate).toHaveBeenCalledWith(11);
    expect(routeState.navigate).toHaveBeenCalledWith(-1);
    expect(routeState.selection).toHaveBeenCalledTimes(1);
  });

  it("does not send the current project and still goes back", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });
    routeState.task = {
      isPending: false,
      data: task({ project_id: 10 }),
      error: null,
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.viewProps?.onSelect(10);

    expect(routeState.mutation.mutate).not.toHaveBeenCalled();
    expect(routeState.navigate).toHaveBeenCalledWith(-1);
  });

  it("sends null for no project and goes back", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });
    routeState.task = {
      isPending: false,
      data: task({ project_id: 10 }),
      error: null,
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.viewProps?.onSelect(null);

    expect(routeState.mutation.mutate).toHaveBeenCalledWith(null);
    expect(routeState.navigate).toHaveBeenCalledWith(-1);
  });

  it("does not send null when the task has no project", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });
    routeState.task = {
      isPending: false,
      data: task({ project_id: null }),
      error: null,
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.viewProps?.onSelect(null);

    expect(routeState.mutation.mutate).not.toHaveBeenCalled();
    expect(routeState.navigate).toHaveBeenCalledWith(-1);
  });

  it("falls back to /tasks/42 without history", () => {
    vi.stubGlobal("window", { history: { state: {} } });

    renderRoute();
    routeState.viewProps?.onSelect(11);

    expect(routeState.mutation.mutate).toHaveBeenCalledWith(11);
    expect(routeState.navigate).toHaveBeenCalledWith("/tasks/42");
  });

  it("falls back to /tasks for an invalid id", () => {
    routeState.params = { id: "abc" };
    vi.stubGlobal("window", { history: { state: {} } });

    renderRoute();
    routeState.onBack?.();

    expect(routeState.navigate).toHaveBeenCalledWith("/tasks");
  });

  it("goes back through the native BackButton", () => {
    vi.stubGlobal("window", { history: { state: { idx: 1 } } });

    renderRoute();
    routeState.onBackButton?.();

    expect(routeState.navigate).toHaveBeenCalledWith(-1);
    expect(routeState.selection).toHaveBeenCalledTimes(1);
  });

  it("returns the public meta title and description", () => {
    expect(meta({} as never)).toContainEqual({
      title: "Проект — Milly",
    });
    expect(meta({} as never)).toContainEqual({
      name: "description",
      content: "Изменение проекта задачи в Milly",
    });
  });
});
