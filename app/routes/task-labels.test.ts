import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import type { LabelResponse } from "~/lib/labels/types";
import type { LabelRef, TaskResponse } from "~/lib/tasks/types";

interface TaskQueryState {
  isPending: boolean;
  data: TaskResponse | undefined;
  error: Error | null;
  refetch: () => void;
}

interface LabelsQueryState {
  data: LabelResponse[] | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

interface LabelsMutationState {
  mutate: (input: { labelIds: number[]; labels: LabelRef[] }) => void;
}

interface LabelsViewState {
  selectedIds: readonly number[];
  labels: readonly LabelResponse[];
  isLabelsLoading: boolean;
  isLabelsError: boolean;
  onRetryLabels: () => void;
  onToggle: (labelId: number) => void;
}

const routeState = vi.hoisted(() => ({
  params: { id: "42" } as Record<string, string | undefined>,
  taskArgs: undefined as [number, boolean] | undefined,
  task: undefined as TaskQueryState | undefined,
  labelsEnabled: undefined as boolean | undefined,
  labels: undefined as LabelsQueryState | undefined,
  mutationArgs: undefined as number | undefined,
  mutation: {
    mutate: (_input: { labelIds: number[]; labels: LabelRef[] }): void => {},
  } as LabelsMutationState,
  viewProps: undefined as LabelsViewState | undefined,
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
    routeState.labelsEnabled = options.enabled;

    return routeState.labels;
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

vi.mock("~/hooks/use-update-task-labels", () => ({
  useUpdateTaskLabels: (taskId: number) => {
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

vi.mock("~/components/tasks/labels/task-labels-view", () => ({
  TaskLabelsView: (props: LabelsViewState) => {
    routeState.viewProps = props;

    return createElement("div", null, "VIEW");
  },
}));

vi.mock("~/components/tasks/labels/task-labels-skeleton", () => ({
  TaskLabelsSkeleton: () => createElement("div", null, "SKELETON"),
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

import TaskLabels, { meta } from "./task-labels";

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

function label(overrides: Partial<LabelResponse> = {}): LabelResponse {
  return {
    id: 3,
    name: "Срочно",
    color: { id: 4, slug: "red", name: "Красный", hex: "#DC2626" },
    created_at: "2026-11-01T07:00:00.000Z",
    updated_at: "2026-11-01T07:00:00.000Z",
    ...overrides,
  };
}

function renderRoute(): string {
  return renderToStaticMarkup(createElement(TaskLabels));
}

describe("TaskLabels route", () => {
  beforeEach(() => {
    routeState.params = { id: "42" };
    routeState.taskArgs = undefined;
    routeState.task = {
      isPending: false,
      data: task(),
      error: null,
      refetch: vi.fn(),
    };
    routeState.labelsEnabled = undefined;
    routeState.labels = {
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

  it("shows the view with selected labels and labels data", () => {
    const labels = [label(), label({ id: 4, name: "Работа" })];

    routeState.task = {
      isPending: false,
      data: task({ labels: [{ id: 3, name: "Срочно" }] }),
      error: null,
      refetch: vi.fn(),
    };
    routeState.labels = {
      data: labels,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };

    const html = renderRoute();

    expect(html).toContain("VIEW");
    expect(routeState.viewProps?.selectedIds).toEqual([3]);
    expect(routeState.viewProps?.labels).toBe(labels);
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
    expect(routeState.labelsEnabled).toBe(false);
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

  it("passes the labels loading state to the view", () => {
    routeState.labels = {
      data: [],
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    };

    renderRoute();

    expect(routeState.viewProps?.isLabelsLoading).toBe(true);
  });

  it("passes the labels error state and retry to the view", () => {
    const refetch = vi.fn();

    routeState.labels = {
      data: [],
      isPending: false,
      isError: true,
      refetch,
    };

    renderRoute();

    expect(routeState.viewProps?.isLabelsError).toBe(true);

    routeState.viewProps?.onRetryLabels();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("toggles a new label without leaving the page", () => {
    routeState.labels = {
      data: [label()],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.viewProps?.onToggle(3);

    expect(routeState.mutationArgs).toBe(42);
    expect(routeState.mutation.mutate).toHaveBeenCalledWith({
      labelIds: [3],
      labels: [{ id: 3, name: "Срочно" }],
    });
    expect(routeState.navigate).not.toHaveBeenCalled();
    expect(routeState.selection).toHaveBeenCalledTimes(1);
  });

  it("removes a selected label and keeps the rest", () => {
    routeState.task = {
      isPending: false,
      data: task({
        labels: [
          { id: 3, name: "Срочно" },
          { id: 4, name: "Работа" },
        ],
      }),
      error: null,
      refetch: vi.fn(),
    };
    routeState.labels = {
      data: [label(), label({ id: 4, name: "Работа" })],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.viewProps?.onToggle(3);

    expect(routeState.mutation.mutate).toHaveBeenCalledWith({
      labelIds: [4],
      labels: [{ id: 4, name: "Работа" }],
    });
  });

  it("clears labels with an empty array", () => {
    routeState.task = {
      isPending: false,
      data: task({ labels: [{ id: 3, name: "Срочно" }] }),
      error: null,
      refetch: vi.fn(),
    };
    routeState.labels = {
      data: [label()],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.viewProps?.onToggle(3);

    expect(routeState.mutation.mutate).toHaveBeenCalledWith({
      labelIds: [],
      labels: [],
    });
  });

  it("blocks the 101st label", () => {
    const selected = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `Метка ${index + 1}`,
    }));
    const labels = [
      ...selected.map((item, index) =>
        label({
          id: item.id,
          name: item.name,
          color: {
            id: index + 1,
            slug: "red",
            name: "Красный",
            hex: "#DC2626",
          },
        }),
      ),
      label({ id: 101, name: "Лишняя" }),
    ];

    routeState.task = {
      isPending: false,
      data: task({ labels: selected }),
      error: null,
      refetch: vi.fn(),
    };
    routeState.labels = {
      data: labels,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };

    renderRoute();
    routeState.viewProps?.onToggle(101);

    expect(routeState.mutation.mutate).not.toHaveBeenCalled();
  });

  it("falls back to /tasks/42 without history", () => {
    vi.stubGlobal("window", { history: { state: {} } });

    renderRoute();
    routeState.onBackButton?.();

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
      title: "Метки — Milly",
    });
    expect(meta({} as never)).toContainEqual({
      name: "description",
      content: "Изменение меток задачи в Milly",
    });
  });
});
