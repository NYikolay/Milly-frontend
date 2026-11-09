# Экран «Выбор проекта» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать страницу `/tasks/:id/project` с мгновенным применением выбранного проекта и возвратом на детали задачи по фреймам Figma `34:10224`, `34:10437`.

**Architecture:** Новый route под `_app` открывается из строки «Проект» на `/tasks/:id`. `TaskProjectView` рендерит «Без проекта» и активные проекты из `GET /projects?limit=100` с бейджем `ProjectIconBadge` (цвет backend + белая иконка) и отметкой текущего выбора; выбор вызывает мутацию `useUpdateTaskProject`, которая оптимистично обновляет детальный кэш и отправляет `PATCH /tasks/{id}` с `{ project_id }`, затем route сразу возвращает пользователя назад. Skeleton повторяет геометрию страницы и подключается в `RouteSkeleton`.

**Tech Stack:** React Router 8 Framework Mode, React 19, TypeScript 5.9 strict, Tailwind CSS 4, TanStack React Query 5, Vitest 5 (node, `renderToStaticMarkup`), sonner.

**Spec:** `docs/specs/2026-11-09-task-project/spec.md`

## Global Constraints

- Только токены `app-*`; light/dark через `data-app-theme`, без `dark:` и хардкода цветов. Исключение — inline `backgroundColor` бейджа из `project.color.hex`.
- SSR включён; защищённые данные задачи и проектов не попадают в SSR-ответ; `useQuery` только после `AuthGate`.
- Новые зависимости не добавляются.
- Все API-запросы — через `updateTask` / `apiRequest`.
- Детальный ключ кэша обязан оставаться под `["tasks"]`: `["tasks","detail",taskId]`.
- `TaskUpdateInput` расширяется `project_id?: number | null`.
- TypeScript strict, без `any`; типы — через `import type`; алиас `~/*`.
- Файлы — `kebab-case`, компоненты — `PascalCase`; `default export` только у route-модулей.
- Тесты — Vitest, `app/**/*.test.ts`, среда `node`, без jsdom/Testing Library.
- Линтера нет; `npm run lint` не добавлять.
- Тексты: заголовок «Выбор проекта», подсказка «Выберите к какому проекту привязать задачу», первая строка «Без проекта», пояснение «Это позволит вам группировать и фильтровать свои задачи», загрузка «Загружаем проекты…», ошибка загрузки «Не удалось загрузить проекты», кнопка «Повторить», toast «Не удалось изменить проект. Попробуйте ещё раз.».
- Бейдж проекта — существующий `ProjectIconBadge`: `28×28`, padding `5px`, иконка `18×18`; фон `project.color.hex`, иконка белая; «Без проекта» — `NO_PROJECT_ICON` на `bg-app-track`.
- Ширины 320/412/448 px, light/dark и safe-area не ломаются.

## Review Focus

- Выбор текущего проекта и текущего «Без проекта»: `PATCH` не отправляется, выполняется только возврат назад.
- Выбор другого проекта: `PATCH` уходит с `{ project_id }`, детальный кэш обновляется оптимистично, пользователь сразу возвращается на `/tasks/:id`.
- Выбор «Без проекта» при наличии проекта: `PATCH` уходит с `{ project_id: null }` (явный null сохраняется в JSON).
- Ошибка `PATCH` после возврата: снимок кэша откатывается, звучит error haptic, показывается toast для любого статуса; при `404` дополнительно инвалидируются детали и `["projects"]`.
- PATCH экземпляра серии: после успеха инвалидируются `["tasks"]`, `["task-series"]` и `["projects"]`, ответ с другим `id` не перезаписывает текущий детальный кэш.
- Проекты loading/error: «Без проекта» доступна всегда, ошибка не блокирует экран и показывает «Повторить».
- Невалидный id и `404` загрузки: «Задача не найдена» без запроса/с запросом; обычная ошибка — «Повторить».

---

### Task 1: Модель кэша, toast и мутация PATCH проекта

**Files:**
- Modify: `app/lib/tasks/types.ts`
- Modify: `app/lib/tasks/task-detail-cache.ts`
- Modify: `app/lib/tasks/task-toasts.ts`
- Create: `app/hooks/use-update-task-project.ts`
- Test: `app/lib/tasks/task-detail-cache.test.ts`
- Test: `app/lib/tasks/task-toasts.test.ts`
- Test: `app/hooks/use-update-task-project.test.ts`

**Interfaces:**
- Produces:
  - `export function applyTaskDetailProject(task: TaskResponse | undefined, projectId: number | null): TaskResponse | undefined`
  - `export const TASK_PROJECT_UPDATE_ERROR = "Не удалось изменить проект. Попробуйте ещё раз."`
  - `export function showTaskProjectUpdateErrorToast(): void`
  - `export interface UpdateTaskProjectMutationContext { previous: TaskResponse | undefined }`
  - `export interface UpdateTaskProjectMutationOptions { mutationFn: (projectId: number | null) => Promise<TaskResponse>; onMutate: (projectId: number | null) => Promise<UpdateTaskProjectMutationContext>; onError: (error: Error, projectId: number | null, context: UpdateTaskProjectMutationContext | undefined) => void; onSuccess: (updated: TaskResponse) => void; onSettled: () => void }`
  - `export function createUpdateTaskProjectMutationOptions({ queryClient, haptics, taskId }: { queryClient: QueryClient; haptics: TelegramHaptics; taskId: number }): UpdateTaskProjectMutationOptions`
  - `export function useUpdateTaskProject(taskId: number): UseMutationResult<TaskResponse, Error, number | null>`
- Consumes: `updateTask` из `~/lib/tasks/tasks-api`; `taskDetailQueryKey`, `applyTaskDetailProject`; `PROJECTS_QUERY_KEY`; `ApiError`; `TelegramHaptics`, `useTelegram`; `showTaskProjectUpdateErrorToast`.

- [ ] **Step 1: Написать падающие тесты модели и toast**

В существующий импорт из `./task-detail-cache` в
`app/lib/tasks/task-detail-cache.test.ts` добавить
`applyTaskDetailProject` и дописать:

```ts
describe("applyTaskDetailProject", () => {
  it("changes the project optimistically", () => {
    const next = applyTaskDetailProject(task(), 10);
    expect(next?.project_id).toBe(10);
  });

  it("clears the project optimistically with null", () => {
    const next = applyTaskDetailProject(task({ project_id: 10 }), null);
    expect(next?.project_id).toBeNull();
  });

  it("returns the same task for the same project", () => {
    const current = task({ project_id: 10 });
    expect(applyTaskDetailProject(current, 10)).toBe(current);
  });

  it("returns the same task for the same no-project state", () => {
    const current = task({ project_id: null });
    expect(applyTaskDetailProject(current, null)).toBe(current);
  });

  it("returns undefined for missing data", () => {
    expect(applyTaskDetailProject(undefined, 10)).toBeUndefined();
  });
});
```

В существующий импорт из `./task-toasts` в
`app/lib/tasks/task-toasts.test.ts` добавить
`showTaskProjectUpdateErrorToast` и дописать:

```ts
it("shows a project update error toast without an icon", () => {
  showTaskProjectUpdateErrorToast();

  expect(sonner.error).toHaveBeenCalledWith(
    "Не удалось изменить проект. Попробуйте ещё раз.",
    { icon: null },
  );
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/lib/tasks/task-detail-cache.test.ts app/lib/tasks/task-toasts.test.ts`
Expected: FAIL — `applyTaskDetailProject`/`showTaskProjectUpdateErrorToast` не экспортируются.

- [ ] **Step 3: Реализовать модель и toast**

`app/lib/tasks/types.ts` — добавить в `TaskUpdateInput`:
```ts
project_id?: number | null;
```

`app/lib/tasks/task-detail-cache.ts`:
```ts
export function applyTaskDetailProject(
  task: TaskResponse | undefined,
  projectId: number | null,
): TaskResponse | undefined {
  if (!task || task.project_id === projectId) return task;

  return { ...task, project_id: projectId };
}
```

`app/lib/tasks/task-toasts.ts`:
```ts
export const TASK_PROJECT_UPDATE_ERROR =
  "Не удалось изменить проект. Попробуйте ещё раз.";

export function showTaskProjectUpdateErrorToast(): void {
  toast.error(TASK_PROJECT_UPDATE_ERROR, { icon: null });
}
```

- [ ] **Step 4: Запустить тесты модели**

Run: `npx vitest run app/lib/tasks/task-detail-cache.test.ts app/lib/tasks/task-toasts.test.ts`
Expected: PASS.

- [ ] **Step 5: Написать падающий тест мутации**

Создать `app/hooks/use-update-task-project.test.ts` по образцу `use-update-task-priority.test.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { showTaskProjectUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import { createUpdateTaskProjectMutationOptions } from "./use-update-task-project";

vi.mock("~/lib/tasks/tasks-api", () => ({ updateTask: vi.fn() }));
vi.mock("~/lib/tasks/task-toasts", () => ({
  showTaskProjectUpdateErrorToast: vi.fn(),
}));

const updateTaskMock = vi.mocked(updateTask);
const toastMock = vi.mocked(showTaskProjectUpdateErrorToast);
const TASK_ID = 42;
const queryKey = taskDetailQueryKey(TASK_ID);

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: TASK_ID,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T13:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T09:00:00.000Z",
    updated_at: "2026-11-08T09:00:00.000Z",
    ...overrides,
  };
}

let queryClient: QueryClient;
let haptics: TelegramHaptics;

beforeEach(() => {
  queryClient = new QueryClient();
  haptics = { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() };
  updateTaskMock.mockReset();
  toastMock.mockReset();
});

describe("createUpdateTaskProjectMutationOptions", () => {
  it("calls PATCH with the project id", async () => {
    updateTaskMock.mockResolvedValue(task({ project_id: 10 }));
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn(10);

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      project_id: 10,
    });
  });

  it("calls PATCH with an explicit null to clear the project", async () => {
    updateTaskMock.mockResolvedValue(task({ project_id: null }));
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn(null);

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      project_id: null,
    });
  });

  it("applies the project optimistically and returns the previous snapshot", async () => {
    const current = task({ project_id: null });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    const context = await options.onMutate(10);

    expect(queryClient.getQueryData<TaskResponse>(queryKey)?.project_id).toBe(
      10,
    );
    expect(context.previous).toEqual(current);
  });

  it("rolls the cache back and reports an error", async () => {
    const current = task({ project_id: 10 });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate(11);

    options.onError(
      new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      11,
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the server task on success and reports success", () => {
    const updated = task({ project_id: 10 });
    queryClient.setQueryData(queryKey, task());
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(updated);
    expect(haptics.notification).toHaveBeenCalledWith("success");
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("does not overwrite the detail cache when the response has another id", () => {
    const current = task();
    const updated = task({ id: 99, project_id: 10 });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
  });

  it("invalidates detail, tasks, series and projects after settling", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSettled();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["task-series"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
  });

  it("rolls back, shows a toast and invalidates detail/projects on 404", async () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const current = task({ project_id: 10 });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate(11);

    options.onError(
      new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
      11,
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
  });
});
```

- [ ] **Step 6: Запустить тест и убедиться, что он падает**

Run: `npx vitest run app/hooks/use-update-task-project.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 7: Реализовать хук**

`app/hooks/use-update-task-project.ts`:
```ts
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ApiError } from "~/lib/api/errors";
import { PROJECTS_QUERY_KEY } from "~/lib/projects/projects-query";
import {
  applyTaskDetailProject,
  taskDetailQueryKey,
} from "~/lib/tasks/task-detail-cache";
import { showTaskProjectUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export interface UpdateTaskProjectMutationContext {
  previous: TaskResponse | undefined;
}

export interface UpdateTaskProjectMutationOptions {
  mutationFn: (projectId: number | null) => Promise<TaskResponse>;
  onMutate: (
    projectId: number | null,
  ) => Promise<UpdateTaskProjectMutationContext>;
  onError: (
    error: Error,
    projectId: number | null,
    context: UpdateTaskProjectMutationContext | undefined,
  ) => void;
  onSuccess: (updated: TaskResponse) => void;
  onSettled: () => void;
}

export function createUpdateTaskProjectMutationOptions({
  queryClient,
  haptics,
  taskId,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
}): UpdateTaskProjectMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  return {
    mutationFn: (projectId) => updateTask(taskId, { project_id: projectId }),
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskResponse>(queryKey);

      queryClient.setQueryData<TaskResponse>(queryKey, (data) =>
        applyTaskDetailProject(data, projectId),
      );

      return { previous };
    },
    onError: (error, _projectId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      haptics.notification("error");
      showTaskProjectUpdateErrorToast();

      if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey });
        void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      }
    },
    onSuccess: (updated) => {
      if (updated.id === taskId) {
        queryClient.setQueryData(queryKey, updated);
      }
      haptics.notification("success");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task-series"] });
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  };
}

export function useUpdateTaskProject(
  taskId: number,
): UseMutationResult<TaskResponse, Error, number | null> {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();

  return useMutation(
    createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId,
    }),
  );
}
```

- [ ] **Step 8: Запустить тесты**

Run: `npx vitest run app/hooks/use-update-task-project.test.ts app/lib/tasks/task-detail-cache.test.ts app/lib/tasks/task-toasts.test.ts`
Expected: PASS.

---

### Task 2: Компоненты страницы выбора проекта

**Files:**
- Create: `app/components/tasks/project/task-project-view.tsx`
- Create: `app/components/tasks/project/task-project-skeleton.tsx`
- Test: `app/components/tasks/project/task-project-view.test.ts`
- Test: `app/components/tasks/project/task-project-skeleton.test.ts`

**Interfaces:**
- Produces:
  - `export interface TaskProjectViewProps { selectedProjectId: number | null; projects: readonly ProjectResponse[]; isProjectsLoading: boolean; isProjectsError: boolean; onRetryProjects: () => void; onSelect: (projectId: number | null) => void }`
  - `export function TaskProjectView(props: TaskProjectViewProps): ReactElement`
  - `export function TaskProjectSkeleton(): ReactElement`
- Consumes: `ProjectIconBadge` из `~/components/tasks/quick-add/project-icon-badge`; `getProjectIcon`, `NO_PROJECT_ICON`; `AssetIcon` + `check.svg`; `Skeleton`; `cn`.

- [ ] **Step 1: Написать падающие SSR-тесты**

`task-project-view.test.ts`:
```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ProjectResponse } from "~/lib/projects/types";

import {
  TaskProjectView,
  type TaskProjectViewProps,
} from "./task-project-view";

function project(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    id: 10,
    name: "Работа",
    description: null,
    icon: "briefcase",
    color: { id: 1, slug: "green", name: "Зелёный", hex: "#16A34A" },
    progress: { total: 0, completed: 0, remaining: 0 },
    archived_at: null,
    created_at: "2026-11-01T07:00:00.000Z",
    updated_at: "2026-11-01T07:00:00.000Z",
    ...overrides,
  };
}

function render(props: Partial<TaskProjectViewProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskProjectView, {
      selectedProjectId: null,
      projects: [project()],
      isProjectsLoading: false,
      isProjectsError: false,
      onRetryProjects: () => {},
      onSelect: () => {},
      ...props,
    }),
  );
}

describe("TaskProjectView", () => {
  it("renders the header, subtitle and footer hint", () => {
    const html = render();
    expect(html).toContain("Выбор проекта");
    expect(html).toContain("Выберите к какому проекту привязать задачу");
    expect(html).toContain(
      "Это позволит вам группировать и фильтровать свои задачи",
    );
  });

  it("renders no-project first and all backend projects", () => {
    const html = render({
      projects: [project(), project({ id: 11, name: "Личное" })],
    });
    expect(html).toContain("Без проекта");
    expect(html).toContain("Работа");
    expect(html).toContain("Личное");
    expect(html.indexOf("Без проекта")).toBeLessThan(html.indexOf("Работа"));
    expect(html.indexOf("Работа")).toBeLessThan(html.indexOf("Личное"));
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });

  it("marks the current project", () => {
    const html = render({ selectedProjectId: 10 });
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("check.svg");
  });

  it("renders the backend color badge with a white icon", () => {
    const html = render();
    expect(html).toContain("background-color:#16A34A");
    expect(html).toContain("text-white");
    expect(html).toContain("briefcase.svg");
    expect(html).not.toContain("dark:");
  });

  it("renders the neutral no-project badge", () => {
    const html = render({ projects: [] });
    expect(html).toContain("no-project.svg");
    expect(html).toContain("bg-app-track");
  });

  it("shows the projects loading message", () => {
    expect(render({ projects: [], isProjectsLoading: true })).toContain(
      "Загружаем проекты…",
    );
  });

  it("shows the projects error and retry", () => {
    const onRetryProjects = vi.fn();
    const html = render({
      projects: [],
      isProjectsError: true,
      onRetryProjects,
    });

    expect(html).toContain("Не удалось загрузить проекты");
    expect(html).toContain("Повторить");
  });

  it("draws dividers only between rows", () => {
    const html = render({
      projects: [project(), project({ id: 11, name: "Личное" })],
    });
    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(2);
  });

  it("uses app tokens and no dark variants", () => {
    const html = render({ selectedProjectId: 10 });
    expect(html).toContain("bg-app-card");
    expect(html).toContain("text-app-text-secondary");
    expect(html).toContain("text-app-accent");
    expect(html).not.toContain("dark:");
  });
});
```

`task-project-skeleton.test.ts`:
```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskProjectSkeleton } from "./task-project-skeleton";

describe("TaskProjectSkeleton", () => {
  it("renders a status region with the expected label", () => {
    const html = renderToStaticMarkup(createElement(TaskProjectSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем проект"');
  });

  it("repeats the page geometry", () => {
    const html = renderToStaticMarkup(createElement(TaskProjectSkeleton));
    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[265px]");
    expect(html).toContain("rounded-[25px]");
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/components/tasks/project`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать `TaskProjectSkeleton`**

Структура:
- root `div role="status" aria-busy="true" aria-label="Загружаем проект" className="flex flex-1 flex-col gap-2"`;
- блок заголовка `px-[15px] py-[15px]` с `Skeleton h-[29px] w-[60%] rounded-[6px]`;
- подсказка `px-[15px]` с `Skeleton h-[13px] w-[90%] rounded-[4px]`;
- карточка `Skeleton h-[265px] w-full rounded-[25px]`;
- пояснение `px-[15px]` с двумя `Skeleton h-[13px]` (`w-full`, `w-2/3`).

- [ ] **Step 4: Реализовать `TaskProjectView`**

Разметка:
- root `div className="flex flex-1 flex-col gap-2"`;
- заголовок `h1` с классами `break-words text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text` в `px-[15px] py-[15px]`;
- подсказка `p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary"`;
- карточка `div role="radiogroup" aria-label="Проект" className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]"`;
- строки `rows.map((row, index) => ...)` с `key={row.id ?? "no-project"}`;
- строки:
  ```ts
  const rows: ProjectRow[] = [
    {
      id: null,
      name: "Без проекта",
      icon: NO_PROJECT_ICON,
      colorHex: null,
    },
    ...projects.map((project) => ({
      id: project.id,
      name: project.name,
      icon: getProjectIcon(project.icon),
      colorHex: project.color.hex,
    })),
  ];
  ```
- каждая строка — `button type="button" role="radio" aria-checked={row.id === selectedProjectId}` с классами `flex h-[47px] w-full items-center gap-[11px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent`;
- ведущая ячейка: при выборе — `AssetIcon className="size-6 shrink-0 text-app-accent" src={checkIcon}`, иначе пустой `span aria-hidden="true" className="size-6 shrink-0"`; ширина ячейки `24px`, как в `ProjectStep`;
- текстовая часть `span className={cn("flex h-full min-w-0 flex-1 items-center gap-[5px]", !isLast && "border-b border-app-stroke")}`;
- внутри — `ProjectIconBadge colorHex={row.colorHex} icon={row.icon}` и `span className="truncate text-[15px] leading-[1.3] text-app-text"`;
- после строк, если `isProjectsLoading` — `p className="py-[10px] text-[15px] leading-[1.3] text-app-text-secondary"` с «Загружаем проекты…»;
- если `isProjectsError` — блок с «Не удалось загрузить проекты» и кнопкой «Повторить» (`onClick={onRetryProjects}`, классы `text-[15px] font-semibold text-app-accent` + focus/active);
- пояснение под карточкой — текст из Global Constraints, `px-[15px] text-[13px] leading-[1.4] text-app-text-secondary`;
- `onClick={() => onSelect(row.id)}`.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run app/components/tasks/project`
Expected: PASS.

---

### Task 3: Маршрут, RouteSkeleton и вход из деталей

**Files:**
- Create: `app/routes/task-project.tsx`
- Modify: `app/routes.ts`
- Modify: `app/routes/task-detail.tsx`
- Modify: `app/components/tasks/detail/task-detail-card.tsx`
- Modify: `app/components/tasks/detail/task-detail-view.tsx`
- Modify: `app/components/layout/route-skeleton.tsx`
- Test: `app/routes/task-project.test.ts`
- Test: `app/routes/task-detail.test.ts`
- Test: `app/components/tasks/detail/task-detail-card.test.ts`
- Test: `app/components/tasks/detail/task-detail-view.test.ts`
- Test: `app/components/layout/route-skeleton.test.ts`

**Interfaces:**
- Produces:
  - `default export function TaskProject(): ReactElement`
  - `export function meta(): { title: string }[]`
  - `TaskDetailCardProps.onProjectClick?: () => void`
  - `TaskDetailViewProps.onProjectClick?: () => void`
- Consumes: `useTaskDetail`, `useUpdateTaskProject`, `projectsQueryOptions`, `TaskProjectView`, `TaskProjectSkeleton`, `TaskDetailError`, `useTelegramBackButton`, `shouldGoBack`, `useBottomNavigation`, `CONTENT_BOTTOM_PADDING`.

- [ ] **Step 1: Написать падающие тесты маршрута и интеграции**

`app/routes/task-project.test.ts` — по образцу `task-priority.test.ts`:
- mock `@tanstack/react-query` → `{ queryOptions: (o) => o, useQuery: (options) => { routeState.projectsEnabled = options.enabled; return routeState.projects; } }`;
- mock `react-router` → `useParams`, `useNavigate`;
- mock `~/hooks/use-task-detail` → `useTaskDetail(taskId, enabled)` записывает аргументы, возвращает `routeState.task`;
- mock `~/hooks/use-update-task-project` → возвращает `{ mutate }`, записывает аргументы;
- mock `~/hooks/use-bottom-navigation`, `~/hooks/use-telegram-back-button`;
- mock `~/providers/auth-provider`, `~/providers/telegram-provider`;
- mock `~/components/home/bottom-navigation-dock`, `~/components/tasks/project/task-project-view`, `~/components/tasks/project/task-project-skeleton`, `~/components/tasks/detail/task-detail-error`.

В `beforeEach` задавать `routeState.projects` как
`{ data: [], isPending: false, isError: false, refetch: vi.fn() }`,
`routeState.task` — как загруженную задачу, а `routeState.projectsEnabled`
сбрасывать в `undefined`.

Тесты:
1. `shows the skeleton while the task is loading` → `SKELETON`.
2. `shows the view with the current project and projects data` → `VIEW`, `viewProps.selectedProjectId === task.project_id`, `viewProps.projects === projects`, `bottomNavActive === "tasks"`.
3. `shows not found for a 404` → `ERROR:not-found`.
4. `shows a load error for a non-404 failure` → `ERROR:load-error`; retry calls task `refetch`.
5. `shows not found for an invalid id without requests` → `taskArgs` `[0, false]`, `projectsEnabled === false`.
6. `keeps cached task data when a background refetch fails` → `VIEW`.
7. `passes the projects loading state to the view` → `viewProps.isProjectsLoading === true`.
8. `passes the projects error state and retry to the view` → `viewProps.isProjectsError === true`; `viewProps.onRetryProjects()` calls projects `refetch`.
9. `sends a new project and goes back` → `onSelect(11)`; `mutate` called with `11`; `navigate(-1)` при `history.state = { idx: 1 }`; selection haptic.
10. `does not send the current project and still goes back` → task `project_id: 10`; `onSelect(10)`; `mutate` not called; `navigate(-1)`.
11. `sends null for no project and goes back` → task `project_id: 10`; `onSelect(null)`; `mutate(null)`; `navigate(-1)`.
12. `does not send null when the task has no project` → task `project_id: null`; `onSelect(null)`; `mutate` not called; `navigate(-1)`.
13. `falls back to /tasks/42 without history` → `history.state = {}`; `navigate("/tasks/42")`.
14. `falls back to /tasks for an invalid id` → params `abc`; `onBack`; `navigate("/tasks")`.
15. `goes back through the native BackButton` → `onBackButton()`; `navigate(-1)`.
16. `returns the public meta title and description` → «Проект — Milly», «Изменение проекта задачи в Milly».

Интеграционные кейсы:
- `task-detail-card.test.ts`: с `onProjectClick` есть `aria-label="Изменить проект"` и `<button>`; без обработчика — нет.
- `task-detail-view.test.ts`: `onProjectClick` пробрасывается (aria-label появляется).
- `task-detail.test.ts`: добавить `onProjectClick?: () => void` в
  `TaskDetailViewState`; `routeState.viewProps?.onProjectClick?.()` →
  `navigate("/tasks/42/project")`.
- `route-skeleton.test.ts`: mock `TaskProjectSkeleton` → `PROJECT_SKELETON`; `renderAt("/tasks/42/project")` содержит его и не содержит `DETAIL_SKELETON`; с trailing slash.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/routes/task-project.test.ts app/routes/task-detail.test.ts app/components/tasks/project app/components/tasks/detail app/components/layout/route-skeleton.test.ts`
Expected: FAIL — route и обработчики отсутствуют.

- [ ] **Step 3: Реализовать route**

`app/routes/task-project.tsx`:
```tsx
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { TaskDetailError } from "~/components/tasks/detail/task-detail-error";
import { TaskProjectSkeleton } from "~/components/tasks/project/task-project-skeleton";
import { TaskProjectView } from "~/components/tasks/project/task-project-view";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import { useTaskDetail } from "~/hooks/use-task-detail";
import { useTelegramBackButton } from "~/hooks/use-telegram-back-button";
import { useUpdateTaskProject } from "~/hooks/use-update-task-project";
import { ApiError } from "~/lib/api/errors";
import { shouldGoBack } from "~/lib/errors/navigation";
import { CONTENT_BOTTOM_PADDING } from "~/lib/layout";
import { projectsQueryOptions } from "~/lib/projects/projects-query";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/task-project";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Проект — Milly" },
    { name: "description", content: "Изменение проекта задачи в Milly" },
  ];
}

export default function TaskProject() {
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const projectsQuery = useQuery({
    ...projectsQueryOptions,
    enabled: isValidId,
  });
  const mutation = useUpdateTaskProject(taskId);
  useTelegramBackButton(handleBack);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate(isValidId ? `/tasks/${taskId}` : "/tasks");
  }

  function handleSelect(projectId: number | null) {
    if (taskQuery.data && projectId !== taskQuery.data.project_id) {
      mutation.mutate(projectId);
    }
    handleBack();
  }

  let content: ReactNode;

  if (!isValidId) {
    content = (
      <TaskDetailError
        kind="not-found"
        onBack={handleBack}
        onRetry={handleBack}
      />
    );
  } else if (taskQuery.isPending) {
    content = <TaskProjectSkeleton />;
  } else if (!taskQuery.data) {
    const isNotFound =
      taskQuery.error instanceof ApiError && taskQuery.error.status === 404;
    content = (
      <TaskDetailError
        kind={isNotFound ? "not-found" : "load-error"}
        onBack={handleBack}
        onRetry={() => void taskQuery.refetch()}
      />
    );
  } else {
    content = (
      <TaskProjectView
        isProjectsError={projectsQuery.isError}
        isProjectsLoading={projectsQuery.isPending}
        onRetryProjects={() => void projectsQuery.refetch()}
        onSelect={handleSelect}
        projects={projectsQuery.data ?? []}
        selectedProjectId={taskQuery.data.project_id}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="flex flex-1 flex-col gap-2 px-4"
        style={{
          paddingBottom: CONTENT_BOTTOM_PADDING,
        }}
      >
        {content}
      </div>
      <BottomNavigationDock active="tasks" onSelect={onSelectTab} />
    </main>
  );
}
```

- [ ] **Step 4: Подключить маршрут, строку «Проект» и RouteSkeleton**

- `app/routes.ts`: добавить `route("tasks/:id/project", "routes/task-project.tsx")` после priority.
- `task-detail-card.tsx`: добавить `onProjectClick?: () => void`; строке «Проект» передать `ariaLabel="Изменить проект"` и `onClick={onProjectClick}`.
- `task-detail-view.tsx`: добавить `onProjectClick?: () => void`; передать в `TaskDetailCard`.
- `task-detail.tsx`: добавить `handleProjectClick()` с `haptics.selection()` и `void navigate(\`/tasks/${task.id}/project\`)`; передать `onProjectClick={handleProjectClick}`.
- `route-skeleton.tsx`:
  ```ts
  const isTaskProject = /^\/tasks\/[^/]+\/project\/?$/.test(pathname);
  ```
  и в цепочке `isSearch ? ... : isTaskProject ? <TaskProjectSkeleton /> : isTaskPriority ? ... : isTaskReminders ? ... : isTaskDetail ? ...`.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run app/routes/task-project.test.ts app/routes/task-detail.test.ts app/components/tasks/project app/components/tasks/detail app/components/layout/route-skeleton.test.ts`
Expected: PASS.

---

### Task 4: Документация и финальная проверка

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/agents/features/task-project.md`
- Modify: `docs/agents/structure.md`
- Modify: `docs/agents/features/task-detail.md`
- Modify: `docs/agents/ui.md`
- Modify: `docs/agents/qa.md`
- Modify: `docs/specs/2026-11-08-task-detail/spec.md`
- Create: `docs/specs/2026-11-09-task-project/spec.md` (создан)
- Create: `docs/specs/2026-11-09-task-project/plan.md` (этот файл)

- [ ] **Step 1: Обновить `AGENTS.md`**

- В таблицу «Тема → файл» добавить строку про экран выбора проекта
  (`docs/agents/features/task-project.md`).
- В «Быстрая карта» добавить папку `app/components/tasks/project/`,
  хук `app/hooks/use-update-task-project.ts`, маршрут
  `/tasks/:id/project`.
- В инварианты добавить: выбор проекта сразу отправляет PATCH
  `{ project_id }` (включая `null`), возвращает на детали, оптимистично
  обновляет кэш; текущий выбор не отправляется; ошибка — toast;
  `["projects"]` инвалидируется.
- В «Проверка перед завершением» сослаться на QA-раздел.

- [ ] **Step 2: Обновить `docs/agents/structure.md`**

Добавить:
- `tasks/project/` — экран «Выбор проекта»;
- `use-update-task-project.ts` — PATCH проекта, кэш, haptics;
- `routes/task-project.tsx` — маршрут `/tasks/:id/project`;
- в `task-detail-cache.ts` — оптимистичный проект.

- [ ] **Step 3: Создать `docs/agents/features/task-project.md`**

Кратко описать:
- маршрут и открытие из строки «Проект»;
- «Без проекта» + активные проекты из `GET /projects?limit=100`,
  бейдж с цветом backend и белой иконкой;
- мгновенный PATCH `{ project_id }`/`{ project_id: null }`,
  оптимистичный кэш, возврат;
- отсутствие PATCH для текущего выбора;
- ошибки: toast для любого статуса, при `404` дополнительно
  инвалидируются детали и `["projects"]`;
- загрузка/ошибка проектов и «Повторить»;
- проверки в `docs/agents/qa.md`.

- [ ] **Step 4: Обновить `docs/agents/features/task-detail.md`**

- В строке про интерактивность карточки добавить «Проект» к «Срок»,
  «Напоминание» и «Приоритет».
- Добавить, что «Проект» открывает `/tasks/:id/project`; значение
  остаётся текстом без бейджа.

- [ ] **Step 5: Обновить `docs/agents/ui.md`**

- Уточнить, что `ProjectIconBadge` используется и на
  `/tasks/:id/project`, где строки `47px`, а не `50px`.
- Зафиксировать, что фон бейджа — `project.color.hex` из backend,
  иконка белая; «Без проекта» — `no-project.svg` на `bg-app-track`.

- [ ] **Step 6: Обновить `docs/agents/qa.md`**

Добавить раздел `/tasks/:id/project`:
- открытие из строки «Проект»;
- «Без проекта» и проекты, галочка текущего, выбор другого, возврат и
  обновление значения;
- выбор «Без проекта» отправляет `null`;
- выбор текущего без PATCH;
- ошибка PATCH — откат и toast; `404` — откат, toast и инвалидация;
- проекты loading/error и «Повторить»;
- light/dark, 320/412/448 px, safe-area, Telegram BackButton;
- SSR без данных задачи и проектов, meta «Проект — Milly».

- [ ] **Step 7: Добавить blockquote в спецификацию деталей**

В `docs/specs/2026-11-08-task-detail/spec.md`:
```md
> Примечание (2026-11-09): строка «Проект» теперь открывает
> `/tasks/:id/project` (см.
> `docs/specs/2026-11-09-task-project/spec.md`). Пункт «Изменение …
> проекта» из «Вне scope» больше не действует.
```

- [ ] **Step 8: Полная проверка**

Run: `npm test`
Expected: PASS.
Run: `npm run typecheck`
Expected: PASS.
Run: `npm run build`
Expected: PASS.
Run:
```bash
npm run build
PORT=3000 npm start &
curl -s http://localhost:3000/tasks/1/project | grep -E "Выбор проекта|Без проекта|Загружаем проект" || true
```
Expected: SSR-ответ не содержит защищённых данных задачи и проектов; допустим только скелетон. Остановить сервер после проверки.

---

## Self-Review

- **Spec coverage:** FR-1 → Task 3; FR-2 → Task 1; FR-3–FR-5 → Task 2; FR-6 → Tasks 2–3; FR-7 → Task 3; FR-8 → Tasks 1–3; FR-9 → Tasks 1–4. Все пункты покрыты.
- **Step scan:** каждый шаг содержит конкретный файл, сигнатуру, тестовые assertions и команду; открытых «handle edge cases» нет.
- **Type consistency:** `TaskProjectViewProps`, `createUpdateTaskProjectMutationOptions`, `applyTaskDetailProject`, `TaskProjectSkeleton` используются одинаково во всех задачах; `project_id` везде `number | null`.
- **Review Focus:** рискованные классы покрыты тестами Task 1 (оптимистичный кэш, откат, toast, `404`, `null`) и Task 3 (текущий выбор, «Без проекта», возврат, fallback, невалидный id, loading/error проектов).
- **Project badge:** визуальные требования проверяются в Task 2 через `background-color:#16A34A`, `text-white`, `no-project.svg`, `bg-app-track`.
