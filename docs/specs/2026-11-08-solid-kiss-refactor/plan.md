# Рефакторинг frontend по SOLID и KISS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить реальные дублирования и мёртвый код в `frontend/`, сохранив пользовательскую логику, тексты, порядок запросов и вёрстку.

**Architecture:** Общие чистые помощники выносятся в `app/lib/` (завершение, query options, feedback, layout), фабрика завершения — в `app/lib/tasks/task-completion.ts`, а hooks и routes становятся тонкими обёртками. Ключи кэша `["tasks"]`, `["projects"]`, `["labels"]` и публичные имена функций сохраняются.

**Tech Stack:** React 19, React Router 8 (SSR), TypeScript 5.9 strict, Tailwind CSS 4, TanStack Query 5, Vitest.

**Spec:** `docs/specs/2026-11-08-solid-kiss-refactor/spec.md`

## Global Constraints

- Поведение, тексты, порядок запросов и вёрстка не меняются; единственное сетевое изменение — FR-5 (метки не входят в серверный ключ).
- Новые зависимости и пакеты не добавлять.
- Backend, `docs/api.md`, `root.tsx`, глобальные провайдеры, маршруты и SSR не менять.
- TypeScript strict: без `any`, `import type` для типов.
- Файлы — `kebab-case`, компоненты — `PascalCase`, импорты через `~/*`.
- Тесты — Vitest, `app/**/*.test.ts`; линтера нет, `npm run lint` не добавлять.
- Ключи кэша остаются `["tasks"]`, `["projects"]`, `["labels"]`; детальный ключ — под `["tasks"]`.
- Жизненный цикл завершения задачи (haptics, optimistic, rollback, success, invalidations) сохраняется дословно.
- Не коммитить изменения без явного разрешения пользователя.
- Не начинать реализацию до утверждения spec и этого плана.

## Review Focus

- **Жизненный цикл завершения:** общая фабрика воспроизводит `selection`, `cancelQueries`, снимок, оптимистичное обновление, откат, success и инвалидации. Тесты `task-completion.test.ts`, `use-today-tasks.test.ts`, `use-search-tasks.test.ts`, `use-task-detail.test.ts`.
- **Reference equality в cache:** no-op переход и неизвестная задача возвращают тот же объект; `updated_at` сохраняется при снятии завершения. Тесты `completion-cache.test.ts`, `today-tasks-cache.test.ts`, `search-tasks-cache.test.ts`, `task-detail-cache.test.ts`.
- **Ключи и `enabled`:** проекты/метки используют те же ключи, детальный экран сохраняет условные запросы. Тесты `projects-query.test.ts`, `labels-query.test.ts`, `task-detail.test.ts`.
- **Метки только на клиенте:** переключение метки не меняет ключ и не создаёт новый `GET /tasks`; AND-фильтрация сохраняется. Тесты `search-filters.test.ts`, `search-tasks-cache.test.ts`; ручная проверка в DevTools.
- **Текст ошибки и pending:** `TASK_COMPLETION_ERROR` и `getPendingTaskId` дают прежние значения на всех трёх экранах. Тесты `completion-feedback.test.ts`, `tasks.test.ts`, `task-search.test.ts`, `task-detail.test.ts`.
- **Визуальная идентичность:** `AppErrorPage`, скелетоны и нижние отступы не меняют классы/геометрию. Тесты `app-error-page.test.ts`, `search-tasks-skeleton.test.ts`, `route-skeleton.test.ts`; ручная проверка 320/412/448 px.
- **Zod-путь:** ошибка дублирующихся `labelIds` показывается под `labelIds`, а не `labelIds.0`. Тест `quick-task-schema.test.ts`.

---

## File Structure

**Create:**
- `app/lib/tasks/completion-cache.ts` + `completion-cache.test.ts`
- `app/lib/tasks/task-completion.ts` + `task-completion.test.ts`
- `app/lib/tasks/completion-feedback.ts` + `completion-feedback.test.ts`
- `app/lib/projects/projects-query.ts` + `projects-query.test.ts`
- `app/lib/labels/labels-query.ts` + `labels-query.test.ts`
- `app/lib/errors/async.ts` + `async.test.ts`
- `app/lib/layout.ts` + `layout.test.ts`
- `app/components/tasks/task-rows-skeleton.tsx` + `task-rows-skeleton.test.ts`

**Modify:**
- `app/lib/tasks/today-tasks.ts` + `today-tasks.test.ts`
- `app/lib/tasks/today-tasks-cache.ts`
- `app/lib/tasks/search-tasks-cache.ts`
- `app/lib/tasks/task-detail-cache.ts`
- `app/lib/tasks/search-filters.ts` + `search-filters.test.ts`
- `app/lib/tasks/search-tasks-cache.test.ts`
- `app/lib/tasks/quick-task-schema.ts` + `quick-task-schema.test.ts`
- `app/hooks/use-today-tasks.ts`
- `app/hooks/use-search-tasks.ts`
- `app/hooks/use-task-detail.ts`
- `app/lib/api/http.ts`
- `app/lib/auth/failure.ts`
- `app/hooks/use-voice-recorder.ts`
- `app/routes/tasks.tsx`
- `app/routes/task-search.tsx`
- `app/routes/task-detail.tsx`
- `app/components/home/daily-progress-card.tsx`
- `app/components/tasks/today/today-progress-card.tsx`
- `app/components/tasks/today/today-tasks-skeleton.tsx`
- `app/components/tasks/search/search-tasks-skeleton.tsx`
- `app/components/tasks/quick-add/quick-add-composer.tsx`
- `app/components/tasks/quick-add/use-create-quick-task.ts`
- `app/components/tasks/quick-add/labels-step.tsx`
- `app/components/tasks/quick-add/project-step.tsx`
- `app/components/errors/app-error-page.tsx`
- `app/components/home/home-skeleton.tsx`
- `app/components/errors/error-screen.tsx`
- `app/components/layout/route-skeleton.tsx`
- `AGENTS.md`

**Delete:**
- `app/components/ui/button.tsx`
- `app/components/ui/card.tsx`
- `app/lib/format-date.ts`
- `app/components/tasks/quick-add/search-filter.ts`
- `app/components/tasks/quick-add/search-filter.test.ts`

---

### Task 1: Общий помощник завершения и нормализация прогресса

**Files:**
- Create: `app/lib/tasks/completion-cache.ts`
- Create: `app/lib/tasks/completion-cache.test.ts`
- Modify: `app/lib/tasks/today-tasks.ts`
- Modify: `app/lib/tasks/today-tasks.test.ts`
- Modify: `app/lib/tasks/today-tasks-cache.ts`
- Modify: `app/lib/tasks/search-tasks-cache.ts`
- Modify: `app/lib/tasks/task-detail-cache.ts`
- Modify: `app/components/home/daily-progress-card.tsx`
- Modify: `app/components/tasks/today/today-progress-card.tsx`

**Interfaces:**
- Consumes: `TaskResponse`.
- Produces:
  - `hasCompletionChanged(task: Pick<TaskResponse, "completed_at">, completedAt: string | null): boolean`
  - `applyCompletionFields(task: TaskResponse, completedAt: string | null): TaskResponse`
  - `replaceTaskInList(tasks: TaskResponse[], updatedTask: TaskResponse): TaskResponse[]`
  - `normalizeCompleted(total: number, completed: number): number`

- [ ] **Step 1: Написать падающие тесты**

Создать `app/lib/tasks/completion-cache.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  applyCompletionFields,
  hasCompletionChanged,
  replaceTaskInList,
} from "./completion-cache";
import type { TaskResponse } from "./types";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T07:00:00.000Z",
    updated_at: "2026-11-08T07:00:00.000Z",
    ...overrides,
  };
}

describe("hasCompletionChanged", () => {
  it("detects only transitions between active and completed", () => {
    expect(hasCompletionChanged(task(), "2026-11-08T10:00:00.000Z")).toBe(true);
    expect(
      hasCompletionChanged(
        task({ completed_at: "2026-11-08T09:00:00.000Z" }),
        null,
      ),
    ).toBe(true);
    expect(hasCompletionChanged(task(), null)).toBe(false);
    expect(
      hasCompletionChanged(
        task({ completed_at: "2026-11-08T09:00:00.000Z" }),
        "2026-11-08T10:00:00.000Z",
      ),
    ).toBe(false);
  });
});

describe("applyCompletionFields", () => {
  it("sets completed_at and updated_at when completing", () => {
    expect(
      applyCompletionFields(task(), "2026-11-08T10:00:00.000Z"),
    ).toMatchObject({
      completed_at: "2026-11-08T10:00:00.000Z",
      updated_at: "2026-11-08T10:00:00.000Z",
    });
  });

  it("clears completed_at and preserves updated_at when uncompleting", () => {
    expect(
      applyCompletionFields(
        task({
          completed_at: "2026-11-08T09:00:00.000Z",
          updated_at: "2026-11-08T09:00:00.000Z",
        }),
        null,
      ),
    ).toMatchObject({
      completed_at: null,
      updated_at: "2026-11-08T09:00:00.000Z",
    });
  });
});

describe("replaceTaskInList", () => {
  it("replaces only the matching task and keeps order", () => {
    const first = task({ id: 1 });
    const second = task({ id: 2 });
    const updated = task({ id: 2, title: "Обновлённая" });

    expect(replaceTaskInList([first, second], updated)).toEqual([first, updated]);
  });
});
```

Дополнить `app/lib/tasks/today-tasks.test.ts` импортом
`normalizeCompleted` и тестом:

```ts
describe("normalizeCompleted", () => {
  it("clamps completed into a valid range", () => {
    expect(normalizeCompleted(5, -1)).toBe(0);
    expect(normalizeCompleted(5, 3)).toBe(3);
    expect(normalizeCompleted(5, 9)).toBe(5);
    expect(normalizeCompleted(0, 4)).toBe(0);
  });
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/tasks/completion-cache.test.ts app/lib/tasks/today-tasks.test.ts`
Expected: FAIL — модуль `completion-cache` и `normalizeCompleted` не найдены.

- [ ] **Step 3: Реализовать общие помощники**

Создать `app/lib/tasks/completion-cache.ts`:

```ts
import type { TaskResponse } from "./types";

export function hasCompletionChanged(
  task: Pick<TaskResponse, "completed_at">,
  completedAt: string | null,
): boolean {
  return (task.completed_at !== null) !== (completedAt !== null);
}

export function applyCompletionFields(
  task: TaskResponse,
  completedAt: string | null,
): TaskResponse {
  return {
    ...task,
    completed_at: completedAt,
    updated_at: completedAt ?? task.updated_at,
  };
}

export function replaceTaskInList(
  tasks: TaskResponse[],
  updatedTask: TaskResponse,
): TaskResponse[] {
  return tasks.map((task) =>
    task.id === updatedTask.id ? updatedTask : task,
  );
}
```

Добавить в `app/lib/tasks/today-tasks.ts`:

```ts
export function normalizeCompleted(total: number, completed: number): number {
  return total === 0 ? 0 : Math.min(Math.max(completed, 0), total);
}
```

- [ ] **Step 4: Перевести cache-модули и progress-карточки на помощники**

`app/lib/tasks/today-tasks-cache.ts`:

```ts
import { applyCompletionFields, hasCompletionChanged } from "./completion-cache";
import { normalizeCompleted } from "./today-tasks";
```

В `applyTaskCompletion` после поиска `current`:

```ts
if (!hasCompletionChanged(current, completedAt)) return data;

const tasks = data.tasks.map((task) =>
  task.id === taskId ? applyCompletionFields(task, completedAt) : task,
);
const completed = normalizeCompleted(
  data.progress.total,
  data.progress.completed + (completedAt !== null ? 1 : -1),
);
```

`app/lib/tasks/search-tasks-cache.ts`: та же замена для `data.items`.

`app/lib/tasks/task-detail-cache.ts`:

```ts
if (!task || !hasCompletionChanged(task, completedAt)) return task;

return applyCompletionFields(task, completedAt);
```

`app/components/home/daily-progress-card.tsx`:

```ts
const normalizedCompleted = normalizeCompleted(total, completed);
```

`app/components/tasks/today/today-progress-card.tsx`:

```ts
const normalized = normalizeCompleted(total, completed);
```

`getTodayProgressCopy` в `today-tasks.ts`:

```ts
const normalizedTotal = Math.max(total, 0);
const normalizedCompleted = normalizeCompleted(normalizedTotal, completed);
```

- [ ] **Step 5: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/tasks/completion-cache.test.ts app/lib/tasks/today-tasks.test.ts app/lib/tasks/today-tasks-cache.test.ts app/lib/tasks/search-tasks-cache.test.ts app/lib/tasks/task-detail-cache.test.ts app/components/home/daily-progress-card.test.ts app/components/tasks/today/today-progress-card.test.ts`
Expected: PASS.

- [ ] **Step 6: Проверить типы**

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 7: Не коммитить**

---

### Task 2: Общие query options проектов и меток

**Files:**
- Create: `app/lib/projects/projects-query.ts`
- Create: `app/lib/projects/projects-query.test.ts`
- Create: `app/lib/labels/labels-query.ts`
- Create: `app/lib/labels/labels-query.test.ts`
- Modify: `app/routes/tasks.tsx`
- Modify: `app/routes/task-search.tsx`
- Modify: `app/routes/task-detail.tsx`
- Modify: `app/components/tasks/quick-add/quick-add-composer.tsx`
- Modify: `app/hooks/use-today-tasks.ts`
- Modify: `app/hooks/use-search-tasks.ts`
- Modify: `app/hooks/use-task-detail.ts`
- Modify: `app/components/tasks/quick-add/use-create-quick-task.ts`

**Interfaces:**
- Consumes: `fetchProjects`, `fetchLabels`, `queryOptions`.
- Produces:
  - `PROJECTS_QUERY_KEY = ["projects"] as const`
  - `projectsQueryOptions`
  - `LABELS_QUERY_KEY = ["labels"] as const`
  - `labelsQueryOptions`

- [ ] **Step 1: Написать падающие тесты query options**

`app/lib/projects/projects-query.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { fetchProjects } from "./projects-api";
import { PROJECTS_QUERY_KEY, projectsQueryOptions } from "./projects-query";

vi.mock("./projects-api", () => ({
  fetchProjects: vi.fn(),
}));

describe("projectsQueryOptions", () => {
  it("uses the shared projects key and fetcher", async () => {
    const projects = [{ id: 1 }];
    vi.mocked(fetchProjects).mockResolvedValue(projects as never);
    const signal = new AbortController().signal;
    const queryFn = projectsQueryOptions.queryFn;

    expect(PROJECTS_QUERY_KEY).toEqual(["projects"]);
    expect(projectsQueryOptions.queryKey).toEqual(PROJECTS_QUERY_KEY);

    if (!queryFn) throw new Error("queryFn is missing");

    await expect(queryFn({ signal } as never)).resolves.toBe(projects);
    expect(fetchProjects).toHaveBeenCalledWith(signal);
  });
});
```

`app/lib/labels/labels-query.test.ts` — аналогично с
`fetchLabels` и `LABELS_QUERY_KEY`.

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/projects/projects-query.test.ts app/lib/labels/labels-query.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать query options**

`app/lib/projects/projects-query.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";

import { fetchProjects } from "./projects-api";

export const PROJECTS_QUERY_KEY = ["projects"] as const;

export const projectsQueryOptions = queryOptions({
  queryKey: PROJECTS_QUERY_KEY,
  queryFn: ({ signal }) => fetchProjects(signal),
});
```

`app/lib/labels/labels-query.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";

import { fetchLabels } from "./labels-api";

export const LABELS_QUERY_KEY = ["labels"] as const;

export const labelsQueryOptions = queryOptions({
  queryKey: LABELS_QUERY_KEY,
  queryFn: ({ signal }) => fetchLabels(signal),
});
```

- [ ] **Step 4: Перевести call sites на общие options**

`app/routes/tasks.tsx`:

```ts
const projectsQuery = useQuery(projectsQueryOptions);
```

`app/routes/task-search.tsx`:

```ts
const projectsQuery = useQuery(projectsQueryOptions);
const labelsQuery = useQuery(labelsQueryOptions);
```

`app/routes/task-detail.tsx`:

```ts
const projectsQuery = useQuery({
  ...projectsQueryOptions,
  enabled: task !== undefined && task.project_id !== null,
});
const labelsQuery = useQuery({
  ...labelsQueryOptions,
  enabled: task !== undefined && task.labels.length > 0,
});
```

`app/components/tasks/quick-add/quick-add-composer.tsx`:

```ts
const labelsQuery = useQuery(labelsQueryOptions);
const projectsQuery = useQuery(projectsQueryOptions);
```

Удалить импорты `fetchProjects`/`fetchLabels` из этих файлов.

- [ ] **Step 5: Перевести инвалидации на `PROJECTS_QUERY_KEY`**

В `use-today-tasks.ts`, `use-search-tasks.ts`, `use-task-detail.ts`
(два места) и `use-create-quick-task.ts` заменить:

```ts
void queryClient.invalidateQueries({ queryKey: ["projects"] });
```

на:

```ts
void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
```

Импортировать `PROJECTS_QUERY_KEY` из
`~/lib/projects/projects-query`.

- [ ] **Step 6: Запустить тесты и проверить типы**

Run: `npx vitest run app/lib/projects app/lib/labels app/routes/tasks.test.ts app/routes/task-search.test.ts app/routes/task-detail.test.ts app/hooks/use-today-tasks.test.ts app/hooks/use-search-tasks.test.ts app/hooks/use-task-detail.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 7: Не коммитить**

---

### Task 3: Общая фабрика оптимистичной мутации завершения

**Files:**
- Create: `app/lib/tasks/task-completion.ts`
- Create: `app/lib/tasks/task-completion.test.ts`
- Modify: `app/hooks/use-today-tasks.ts`
- Modify: `app/hooks/use-search-tasks.ts`
- Modify: `app/hooks/use-task-detail.ts`

**Interfaces:**
- Consumes: `completeTask`, `uncompleteTask`, `QueryClient`, `QueryKey`, `PROJECTS_QUERY_KEY`, `replaceTaskInList`.
- Produces:
  - `TaskCompletionVariables`
  - `TaskCompletionHaptics`
  - `TaskCompletionMutationContext<TData>`
  - `TaskCompletionMutationOptions<TData>`
  - `createTaskCompletionMutationOptions<TData>(params)`

- [ ] **Step 1: Написать падающие тесты фабрики**

`app/lib/tasks/task-completion.test.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { completeTask, uncompleteTask } from "./tasks-api";
import { applyCompletionFields, replaceTaskInList } from "./completion-cache";
import { createTaskCompletionMutationOptions } from "./task-completion";
import type { TaskResponse } from "./types";

vi.mock("./tasks-api", () => ({
  completeTask: vi.fn(),
  uncompleteTask: vi.fn(),
}));

interface ListData {
  items: TaskResponse[];
}

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T07:00:00.000Z",
    updated_at: "2026-11-08T07:00:00.000Z",
    ...overrides,
  };
}

const queryKey = ["tasks", "test"] as const;

let queryClient: QueryClient;
let haptics: {
  selection: ReturnType<typeof vi.fn>;
  notification: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  queryClient = new QueryClient();
  haptics = { selection: vi.fn(), notification: vi.fn() };
  vi.mocked(completeTask).mockReset();
  vi.mocked(uncompleteTask).mockReset();
});

function createOptions() {
  return createTaskCompletionMutationOptions<ListData>({
    queryClient,
    haptics,
    queryKey,
    applyOptimistic: (data, taskId, completedAt) =>
      data
        ? {
            items: data.items.map((item) =>
              item.id === taskId
                ? applyCompletionFields(item, completedAt)
                : item,
            ),
          }
        : data,
    applySuccess: (data, updatedTask) =>
      data
        ? { items: replaceTaskInList(data.items, updatedTask) }
        : data,
  });
}

describe("createTaskCompletionMutationOptions", () => {
  it("optimistically completes, rolls back and reports haptics", async () => {
    const data: ListData = { items: [task()] };
    queryClient.setQueryData(queryKey, data);
    const options = createOptions();

    const context = await options.onMutate({
      taskId: 1,
      nextCompleted: true,
    });

    expect(context.previous).toBe(data);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData<ListData>(queryKey)?.items[0].completed_at,
    ).toEqual(expect.any(String));

    options.onError(
      new Error("failed"),
      { taskId: 1, nextCompleted: true },
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toBe(data);
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });

  it("replaces the task with the server response on success", () => {
    const data: ListData = { items: [task()] };
    queryClient.setQueryData(queryKey, data);
    const options = createOptions();
    const updated = task({ completed_at: "2026-11-08T10:00:00.000Z" });

    options.onSuccess(updated);

    expect(queryClient.getQueryData<ListData>(queryKey)?.items[0]).toBe(
      updated,
    );
    expect(haptics.notification).toHaveBeenCalledWith("success");
  });

  it("calls complete/uncomplete and invalidates tasks and projects", async () => {
    vi.mocked(completeTask).mockResolvedValue(task());
    vi.mocked(uncompleteTask).mockResolvedValue(task());
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createOptions();

    await options.mutationFn({ taskId: 5, nextCompleted: true });
    await options.mutationFn({ taskId: 5, nextCompleted: false });
    options.onSettled();

    expect(completeTask).toHaveBeenCalledWith(5);
    expect(uncompleteTask).toHaveBeenCalledWith(5);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tasks"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
  });
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/tasks/task-completion.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать фабрику**

`app/lib/tasks/task-completion.ts`:

```ts
import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { PROJECTS_QUERY_KEY } from "~/lib/projects/projects-query";

import { completeTask, uncompleteTask } from "./tasks-api";
import type { TaskResponse } from "./types";

export interface TaskCompletionVariables {
  taskId: number;
  nextCompleted: boolean;
}

export interface TaskCompletionHaptics {
  selection: () => void;
  notification: (type: "success" | "error") => void;
}

export interface TaskCompletionMutationContext<TData> {
  previous: TData | undefined;
}

export interface TaskCompletionMutationOptions<TData> {
  mutationFn: (variables: TaskCompletionVariables) => Promise<TaskResponse>;
  onMutate: (
    variables: TaskCompletionVariables,
  ) => Promise<TaskCompletionMutationContext<TData>>;
  onError: (
    error: Error,
    variables: TaskCompletionVariables,
    context: TaskCompletionMutationContext<TData> | undefined,
  ) => void;
  onSuccess: (updatedTask: TaskResponse) => void;
  onSettled: () => void;
}

export interface CreateTaskCompletionMutationOptionsParams<TData> {
  queryClient: QueryClient;
  haptics: TaskCompletionHaptics;
  queryKey: QueryKey;
  applyOptimistic: (
    data: TData | undefined,
    taskId: number,
    completedAt: string | null,
  ) => TData | undefined;
  applySuccess: (
    data: TData | undefined,
    updatedTask: TaskResponse,
  ) => TData | undefined;
}

export function createTaskCompletionMutationOptions<TData>({
  queryClient,
  haptics,
  queryKey,
  applyOptimistic,
  applySuccess,
}: CreateTaskCompletionMutationOptionsParams<TData>): TaskCompletionMutationOptions<TData> {
  return {
    mutationFn: ({ taskId, nextCompleted }) =>
      nextCompleted ? completeTask(taskId) : uncompleteTask(taskId),
    onMutate: async ({ taskId, nextCompleted }) => {
      haptics.selection();
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TData>(queryKey);

      queryClient.setQueryData<TData>(queryKey, (data) =>
        applyOptimistic(
          data,
          taskId,
          nextCompleted ? new Date().toISOString() : null,
        ),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      haptics.notification("error");
    },
    onSuccess: (updatedTask) => {
      haptics.notification("success");
      queryClient.setQueryData<TData>(queryKey, (data) =>
        applySuccess(data, updatedTask),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  };
}
```

- [ ] **Step 4: Перевести hooks на общую фабрику**

`app/hooks/use-today-tasks.ts`:

```ts
import {
  applyTaskCompletion,
  todayProgressQueryKey,
  todayTasksQueryKey,
  type TodayTasksData,
} from "~/lib/tasks/today-tasks-cache";
import { replaceTaskInList } from "~/lib/tasks/completion-cache";
import {
  createTaskCompletionMutationOptions,
  type TaskCompletionMutationContext,
  type TaskCompletionMutationOptions,
  type TaskCompletionVariables,
} from "~/lib/tasks/task-completion";

export type ToggleTaskCompletionVariables = TaskCompletionVariables;
export type ToggleTaskMutationContext =
  TaskCompletionMutationContext<TodayTasksData>;
export type ToggleTaskMutationOptions =
  TaskCompletionMutationOptions<TodayTasksData>;

export function createToggleTaskMutationOptions({
  queryClient,
  haptics,
  queryKey,
}: CreateToggleTaskMutationOptionsParams): ToggleTaskMutationOptions {
  return createTaskCompletionMutationOptions<TodayTasksData>({
    queryClient,
    haptics,
    queryKey,
    applyOptimistic: applyTaskCompletion,
    applySuccess: (data, updatedTask) =>
      data
        ? { ...data, tasks: replaceTaskInList(data.tasks, updatedTask) }
        : data,
  });
}
```

`app/hooks/use-search-tasks.ts` — аналогично:

```ts
applyOptimistic: applySearchTaskCompletion,
applySuccess: (data, updatedTask) =>
  data
    ? { ...data, items: replaceTaskInList(data.items, updatedTask) }
    : data,
```

`app/hooks/use-task-detail.ts`:

```ts
export function createToggleTaskDetailMutationOptions({
  queryClient,
  haptics,
  taskId,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
}): ToggleTaskDetailMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  return createTaskCompletionMutationOptions<TaskResponse>({
    queryClient,
    haptics,
    queryKey,
    applyOptimistic: (data, _taskId, completedAt) =>
      applyTaskDetailCompletion(data, completedAt),
    applySuccess: (_data, updatedTask) => updatedTask,
  });
}
```

Удалить локальные дублирующиеся интерфейсы, оставив алиасы типов.
Импорты `completeTask`/`uncompleteTask` из hooks удалить.

- [ ] **Step 5: Запустить тесты и проверить типы**

Run: `npx vitest run app/lib/tasks/task-completion.test.ts app/hooks/use-today-tasks.test.ts app/hooks/use-search-tasks.test.ts app/hooks/use-task-detail.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 6: Не коммитить**

---

### Task 4: Единый текст и состояние ошибки завершения

**Files:**
- Create: `app/lib/tasks/completion-feedback.ts`
- Create: `app/lib/tasks/completion-feedback.test.ts`
- Modify: `app/routes/tasks.tsx`
- Modify: `app/routes/task-search.tsx`
- Modify: `app/routes/task-detail.tsx`

**Interfaces:**
- Produces:
  - `TASK_COMPLETION_ERROR`
  - `CompletionMutationView`
  - `getPendingTaskId(mutation): number | null`
  - `getCompletionError(mutation): string | null`

- [ ] **Step 1: Написать падающие тесты**

`app/lib/tasks/completion-feedback.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  TASK_COMPLETION_ERROR,
  getCompletionError,
  getPendingTaskId,
} from "./completion-feedback";

describe("getPendingTaskId", () => {
  it("returns the task id only while pending", () => {
    expect(
      getPendingTaskId({
        isPending: true,
        isError: false,
        variables: { taskId: 7 },
      }),
    ).toBe(7);
    expect(
      getPendingTaskId({
        isPending: false,
        isError: false,
        variables: { taskId: 7 },
      }),
    ).toBeNull();
    expect(
      getPendingTaskId({ isPending: true, isError: false }),
    ).toBeNull();
  });
});

describe("getCompletionError", () => {
  it("returns the shared copy only on error", () => {
    expect(getCompletionError({ isError: true })).toBe(TASK_COMPLETION_ERROR);
    expect(getCompletionError({ isError: false })).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/tasks/completion-feedback.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать помощники**

```ts
export const TASK_COMPLETION_ERROR =
  "Не удалось обновить задачу. Попробуйте ещё раз.";

export interface CompletionMutationView {
  isPending: boolean;
  isError: boolean;
  variables?: { taskId: number };
}

export function getPendingTaskId(
  mutation: CompletionMutationView,
): number | null {
  return mutation.isPending
    ? (mutation.variables?.taskId ?? null)
    : null;
}

export function getCompletionError(
  mutation: Pick<CompletionMutationView, "isError">,
): string | null {
  return mutation.isError ? TASK_COMPLETION_ERROR : null;
}
```

- [ ] **Step 4: Перевести route-модули на помощники**

`app/routes/tasks.tsx` и `app/routes/task-search.tsx`:

```ts
const pendingTaskId = getPendingTaskId(toggleMutation);
const completionError = getCompletionError(toggleMutation);
```

`app/routes/task-detail.tsx`:

```ts
const completionError = getCompletionError(toggleMutation);
```

Удалить локальные тернарники и строковый литерал.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run app/lib/tasks/completion-feedback.test.ts app/routes/tasks.test.ts app/routes/task-search.test.ts app/routes/task-detail.test.ts`
Expected: PASS.

- [ ] **Step 6: Не коммитить**

---

### Task 5: Серверный ключ поиска без меток

**Files:**
- Modify: `app/lib/tasks/search-filters.ts`
- Modify: `app/lib/tasks/search-filters.test.ts`
- Modify: `app/lib/tasks/search-tasks-cache.test.ts`

**Interfaces:**
- Consumes: `SearchTaskFilters`.
- Produces: `searchFiltersFingerprint(filters)` без `labelIds`.

- [ ] **Step 1: Обновить тесты и увидеть падение**

В `app/lib/tasks/search-tasks-cache.test.ts` заменить ожидаемые строки:

```ts
"p:|pr:|s:all|r:all"
```

и:

```ts
"p:1,2|pr:|s:all|r:all"
```

Добавить тест:

```ts
it("keeps the same server key when only labels change", () => {
  const base = createDefaultSearchFilters();

  expect(
    searchTasksQueryKey("Europe/Moscow", TODAY, "созвон", {
      ...base,
      labelIds: [1],
    }),
  ).toEqual(
    searchTasksQueryKey("Europe/Moscow", TODAY, "созвон", {
      ...base,
      labelIds: [2],
    }),
  );
});
```

В `app/lib/tasks/search-filters.test.ts` добавить:

```ts
it("ignores client-only labels in the server fingerprint", () => {
  const base = createDefaultSearchFilters();

  expect(searchFiltersFingerprint({ ...base, labelIds: [1, 2] })).toBe(
    searchFiltersFingerprint(base),
  );
});
```

Run: `npx vitest run app/lib/tasks/search-filters.test.ts app/lib/tasks/search-tasks-cache.test.ts`
Expected: FAIL — fingerprint всё ещё содержит `|l:`.

- [ ] **Step 2: Убрать метки из fingerprint**

В `app/lib/tasks/search-filters.ts` заменить:

```ts
return `p:${filters.projectIds.join(",")}|pr:${filters.priorities.join(",")}|s:${filters.status}|r:${filters.recurrence}|l:${filters.labelIds.join(",")}`;
```

на:

```ts
return `p:${filters.projectIds.join(",")}|pr:${filters.priorities.join(",")}|s:${filters.status}|r:${filters.recurrence}`;
```

`canonicalizeSearchFilters`, `buildSearchTaskListQuery` и
`filterTasksForDisplay` не менять.

- [ ] **Step 3: Запустить тесты и проверить типы**

Run: `npx vitest run app/lib/tasks/search-filters.test.ts app/lib/tasks/search-tasks-cache.test.ts app/hooks/use-search-tasks.test.ts app/routes/task-search.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 4: Не коммитить**

---

### Task 6: Единый `isAbortError`

**Files:**
- Create: `app/lib/errors/async.ts`
- Create: `app/lib/errors/async.test.ts`
- Modify: `app/lib/api/http.ts`
- Modify: `app/lib/auth/failure.ts`
- Modify: `app/hooks/use-voice-recorder.ts`

**Interfaces:**
- Produces: `isAbortError(error: unknown): boolean`.

- [ ] **Step 1: Написать падающий тест**

`app/lib/errors/async.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isAbortError } from "./async";

describe("isAbortError", () => {
  it("recognizes DOMException AbortError", () => {
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
  });

  it("rejects other errors and non-objects", () => {
    expect(isAbortError(new Error("Aborted"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
  });
});
```

Run: `npx vitest run app/lib/errors/async.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 2: Реализовать помощник**

```ts
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}
```

- [ ] **Step 3: Заменить локальные копии**

- `app/lib/api/http.ts`: удалить локальную `isAbortError`,
  импортировать из `~/lib/errors/async`.
- `app/hooks/use-voice-recorder.ts`: удалить локальную
  `isAbortError`, импортировать из `~/lib/errors/async`.
- `app/lib/auth/failure.ts`: удалить локальную функцию, импортировать
  и реэкспортировать:

```ts
import { isAbortError } from "~/lib/errors/async";

export { isAbortError };
```

- [ ] **Step 4: Запустить тесты и проверить типы**

Run: `npx vitest run app/lib/errors/async.test.ts app/lib/auth/failure.test.ts app/lib/api/http.test.ts app/lib/api/client.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 5: Не коммитить**

---

### Task 7: Удаление мёртвого кода и re-export shim

**Files:**
- Delete: `app/components/ui/button.tsx`
- Delete: `app/components/ui/card.tsx`
- Delete: `app/lib/format-date.ts`
- Delete: `app/components/tasks/quick-add/search-filter.ts`
- Delete: `app/components/tasks/quick-add/search-filter.test.ts`
- Modify: `app/components/tasks/quick-add/labels-step.tsx`
- Modify: `app/components/tasks/quick-add/project-step.tsx`

**Interfaces:**
- Consumes: `matchesSearchQuery` из `~/lib/text-search`.

- [ ] **Step 1: Проверить отсутствие использований**

Run: `rg -n "components/ui/button|components/ui/card|formatTodayLabel|format-date|search-filter" app`
Expected: совпадения только в удаляемых файлах и `AGENTS.md`.

- [ ] **Step 2: Перевести импорты на `~/lib/text-search`**

В `labels-step.tsx` и `project-step.tsx`:

```ts
import { matchesSearchQuery } from "~/lib/text-search";
```

- [ ] **Step 3: Удалить мёртвые файлы**

```bash
rm app/components/ui/button.tsx \
   app/components/ui/card.tsx \
   app/lib/format-date.ts \
   app/components/tasks/quick-add/search-filter.ts \
   app/components/tasks/quick-add/search-filter.test.ts
```

- [ ] **Step 4: Запустить тесты и проверить типы**

Run: `npx vitest run app/lib/text-search.test.ts app/components/tasks/quick-add/labels-step.test.ts app/components/tasks/quick-add/project-step.test.ts app/components/tasks/search/filters`
Expected: PASS.

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 5: Не коммитить**

---

### Task 8: `AppErrorPage` на общем доке навигации

**Files:**
- Modify: `app/components/errors/app-error-page.tsx`
- Test: `app/components/errors/app-error-page.test.ts` (существующий)

**Interfaces:**
- Consumes: `BottomNavigationDock`.

- [ ] **Step 1: Зафиксировать текущее поведение**

Run: `npx vitest run app/components/errors/app-error-page.test.ts`
Expected: PASS — характеристический тест фиксирует fixed-обёртку,
safe-area, `max-w-md px-4` и активную вкладку.

- [ ] **Step 2: Переписать `AppErrorPage`**

```tsx
import type { ReactElement } from "react";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { AppShell } from "~/components/layout/app-shell";

import { ErrorScreen } from "./error-screen";
import type { ErrorScreenProps } from "./error-screen";

export interface AppErrorPageProps extends ErrorScreenProps {}

export function AppErrorPage(props: AppErrorPageProps): ReactElement {
  return (
    <AppShell>
      <ErrorScreen {...props} />
      <BottomNavigationDock active="home" />
    </AppShell>
  );
}
```

- [ ] **Step 3: Запустить тест и проверить типы**

Run: `npx vitest run app/components/errors/app-error-page.test.ts app/components/errors/error-screen.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 4: Не коммитить**

---

### Task 9: Общие константы нижнего отступа и скелетон строк

**Files:**
- Create: `app/lib/layout.ts`
- Create: `app/lib/layout.test.ts`
- Create: `app/components/tasks/task-rows-skeleton.tsx`
- Create: `app/components/tasks/task-rows-skeleton.test.ts`
- Modify: `app/routes/home.tsx`
- Modify: `app/routes/tasks.tsx`
- Modify: `app/routes/task-search.tsx`
- Modify: `app/routes/task-detail.tsx`
- Modify: `app/components/home/home-skeleton.tsx`
- Modify: `app/components/errors/error-screen.tsx`
- Modify: `app/components/layout/route-skeleton.tsx`
- Modify: `app/components/tasks/today/today-tasks-skeleton.tsx`
- Modify: `app/components/tasks/search/search-tasks-skeleton.tsx`

**Interfaces:**
- Produces:
  - `CONTENT_BOTTOM_PADDING`
  - `CONTENT_BOTTOM_PADDING_WITH_FAB`
  - `TaskRowsSkeleton({ rows: number })`

- [ ] **Step 1: Написать падающие тесты**

`app/lib/layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  CONTENT_BOTTOM_PADDING,
  CONTENT_BOTTOM_PADDING_WITH_FAB,
} from "./layout";

describe("layout constants", () => {
  it("keeps the exact bottom paddings", () => {
    expect(CONTENT_BOTTOM_PADDING).toBe(
      "calc(89px + max(0px, 30px - var(--app-inset-bottom)))",
    );
    expect(CONTENT_BOTTOM_PADDING_WITH_FAB).toBe(
      "calc(145px + max(0px, 30px - var(--app-inset-bottom)))",
    );
  });
});
```

`app/components/tasks/task-rows-skeleton.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskRowsSkeleton } from "./task-rows-skeleton";

describe("TaskRowsSkeleton", () => {
  it("renders rows with separators except after the last one", () => {
    const html = renderToStaticMarkup(
      createElement(TaskRowsSkeleton, { rows: 3 }),
    );

    expect(html.match(/min-h-\[67px\]/g)?.length).toBe(3);
    expect(html.match(/border-b border-app-stroke/g)?.length).toBe(2);
    expect(html).toContain("rounded-[25px] bg-app-card px-[15px] py-[15px]");
  });
});
```

Run: `npx vitest run app/lib/layout.test.ts app/components/tasks/task-rows-skeleton.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 2: Реализовать константы и общий скелетон**

`app/lib/layout.ts`:

```ts
export const CONTENT_BOTTOM_PADDING =
  "calc(89px + max(0px, 30px - var(--app-inset-bottom)))";

export const CONTENT_BOTTOM_PADDING_WITH_FAB =
  "calc(145px + max(0px, 30px - var(--app-inset-bottom)))";
```

`app/components/tasks/task-rows-skeleton.tsx` — вынести только
карточку строк из `TaskGroupSkeleton`:

```tsx
import type { ReactElement } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/cn";

export interface TaskRowsSkeletonProps {
  rows: number;
}

export function TaskRowsSkeleton({
  rows,
}: TaskRowsSkeletonProps): ReactElement {
  return (
    <div className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]">
      {Array.from({ length: rows }, (_, index) => (
        <div className="flex min-h-[67px] items-center gap-[12px]" key={index}>
          <Skeleton className="size-[35px] shrink-0 rounded-full" />
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-[12px] self-stretch",
              index < rows - 1 && "border-b border-app-stroke",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
              <Skeleton className="h-[15px] w-2/3 rounded-[5px]" />
              <div className="flex min-w-0 items-center gap-[5px]">
                <Skeleton className="size-[15px] shrink-0 rounded-[4px]" />
                <Skeleton className="h-[12px] w-1/3 rounded-[4px]" />
                <Skeleton className="h-[12px] w-[36px] shrink-0 rounded-[4px]" />
              </div>
            </div>
            <Skeleton className="size-6 shrink-0 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Перевести скелетоны на общий компонент**

`today-tasks-skeleton.tsx`: сохранить локальный `TaskGroupSkeleton`
(заголовок, `section`, `pt-4`), заменив только карточку строк:

```tsx
<TaskRowsSkeleton rows={rows} />
```

`search-tasks-skeleton.tsx`: сохранить внешнюю `section`, `role` и
заголовок, заменив только карточку строк:

```tsx
<TaskRowsSkeleton rows={3} />
```

- [ ] **Step 4: Перевести нижние отступы на константы**

- `routes/home.tsx`, `routes/task-detail.tsx`,
  `components/home/home-skeleton.tsx`,
  `components/errors/error-screen.tsx`,
  `components/layout/route-skeleton.tsx` — `CONTENT_BOTTOM_PADDING`;
- `routes/tasks.tsx`, `routes/task-search.tsx` —
  `CONTENT_BOTTOM_PADDING_WITH_FAB`.

В `route-skeleton.tsx` удалить локальную константу и импортировать
общую.

- [ ] **Step 5: Запустить тесты и проверить типы**

Run: `npx vitest run app/lib/layout.test.ts app/components/tasks/task-rows-skeleton.test.ts app/components/tasks/search/search-tasks-skeleton.test.ts app/components/layout/route-skeleton.test.ts app/components/errors/error-screen.test.ts app/components/home/home-skeleton.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 6: Не коммитить**

---

### Task 10: Безопасный маппинг ошибок Zod

**Files:**
- Modify: `app/lib/tasks/quick-task-schema.ts`
- Modify: `app/lib/tasks/quick-task-schema.test.ts`

**Interfaces:**
- Consumes: `quickTaskResolver`, `QuickTaskDraft`.
- Produces: прежний `Resolver<QuickTaskDraft>` с корректными ключами
  ошибок.

- [ ] **Step 1: Написать падающий тест**

Добавить в `app/lib/tasks/quick-task-schema.test.ts` импорт
`quickTaskResolver` и тест:

```ts
it("maps nested array issues to the top-level field", async () => {
  const base = {
    ...createQuickTaskDefaults(now, "Europe/Moscow"),
    title: "Задача",
    labelIds: [1, 1],
  };
  const result = await quickTaskResolver(base, undefined, {} as never);

  expect(result.errors.labelIds).toBeDefined();
  expect(result.errors).not.toHaveProperty("labelIds.0");
});
```

Run: `npx vitest run app/lib/tasks/quick-task-schema.test.ts`
Expected: FAIL — ошибка попадает в `labelIds.0`.

- [ ] **Step 2: Исправить маппинг**

В `app/lib/tasks/quick-task-schema.ts` добавить список ключей:

```ts
const QUICK_TASK_FIELD_KEYS = [
  "title",
  "dueDate",
  "dueTime",
  "isRecurring",
  "priority",
  "projectId",
  "labelIds",
  "remindersEnabled",
  "beforeDueEnabled",
  "beforeDueAmount",
  "beforeDueUnit",
  "scheduledEnabled",
  "scheduledIntervalDays",
  "scheduledTime",
] as const satisfies readonly (keyof QuickTaskDraft)[];

const QUICK_TASK_FIELDS = new Set<string>(QUICK_TASK_FIELD_KEYS);
```

Заменить цикл:

```ts
for (const issue of result.error.issues) {
  const field = issue.path[0];

  if (typeof field !== "string" || !QUICK_TASK_FIELDS.has(field)) {
    continue;
  }

  const key = field as keyof QuickTaskDraft;

  if (errors[key]) {
    continue;
  }

  errors[key] = { type: issue.code, message: issue.message };
}
```

- [ ] **Step 3: Запустить тесты и проверить типы**

Run: `npx vitest run app/lib/tasks/quick-task-schema.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 4: Не коммитить**

---

### Task 11: Обновление `AGENTS.md`

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: итоговые имена модулей из Tasks 1–10.

- [ ] **Step 1: Обновить структуру и правила**

- Убрать из `components/tasks/quick-add/` строку `search-filter.ts`.
- Убрать `button` и `card` из перечня примитивов `components/ui/`.
- Убрать `format-date.ts` из `lib/`.
- Добавить в `lib/`:
  - `tasks/completion-cache.ts` — общие поля завершения и замена
    задачи в списке;
  - `tasks/task-completion.ts` — общая фабрика оптимистичной мутации;
  - `tasks/completion-feedback.ts` — общий текст ошибки и pending id;
  - `projects/projects-query.ts` и `labels/labels-query.ts` — ключи и
    query options;
  - `errors/async.ts` — общий `isAbortError`;
  - `layout.ts` — нижние отступы контента.
- Добавить `components/tasks/task-rows-skeleton.tsx`.
- В разделе про данные/кэш зафиксировать, что метки не входят в
  серверный ключ поиска и применяются на клиенте.
- Остальные правила, ручные проверки и ограничения не менять.

- [ ] **Step 2: Проверить, что ссылки на удалённые файлы исчезли**

Run: `rg -n "search-filter.ts|components/ui/button|components/ui/card|format-date.ts" AGENTS.md`
Expected: нет совпадений.

- [ ] **Step 3: Не коммитить**

---

### Task 12: Финальная проверка

**Files:**
- Без изменений кода.

- [ ] **Step 1: Полный прогон тестов**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Проверка типов**

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 3: Production-сборка**

Run: `npm run build`
Expected: сборка завершается успешно.

- [ ] **Step 4: Ручные проверки**

- `/tasks/search`: переключение только метки не создаёт новый запрос
  `GET /tasks` (DevTools → Network), список фильтруется на клиенте.
- `/tasks`, `/tasks/search`, `/tasks/:id`: завершение и возврат задачи,
  haptics, откат при ошибке, инвалидация.
- Error-экран: `AppErrorPage` на 320 px, light/dark, safe-area;
  нижняя навигация на месте.
- Скелетоны и нижние отступы на `/`, `/tasks`, `/tasks/search`,
  `/tasks/:id`: визуально идентичны прежним.
- Быстрое создание: метки/проекты загружаются, после создания и `404`
  списки обновляются.

- [ ] **Step 5: Не коммитить**

---

## Self-Review

- **Spec coverage:** FR-1 → Task 1; FR-2 → Task 2; FR-3 → Task 3;
  FR-4 → Task 4; FR-5 → Task 5; FR-6 → Task 6; FR-7 → Task 7;
  FR-8 → Task 8; FR-9 → Task 9; FR-10 → Task 10; FR-11 → тесты в
  Tasks 1–10 и обновление `AGENTS.md` в Task 11.
- **Placeholder scan:** во всех шагах указаны файлы, сигнатуры, тесты
  или команды; TBD и «обработать edge cases» отсутствуют.
- **Type consistency:** `TaskCompletionVariables`,
  `TaskCompletionMutationOptions<TData>`,
  `CreateTaskCompletionMutationOptionsParams<TData>`,
  `PROJECTS_QUERY_KEY`, `LABELS_QUERY_KEY`,
  `CONTENT_BOTTOM_PADDING*` и `TaskRowsSkeletonProps` определены один
  раз и используются с теми же именами.
- **Review Focus coverage:** завершение — Tasks 1, 3, 4; ключи и
  `enabled` — Task 2; метки — Task 5; визуальная идентичность —
  Tasks 8, 9; Zod — Task 10.
- **Proportion:** план фиксирует интерфейсы, файлы и проверки; тела
  приведены только для алгоритмов, которые нельзя однозначно вывести
  из сигнатур и тестов.

## Execution Handoff

Implementation must not start until the user reviews and approves the spec
and this plan. After approval, choose the execution method:
subagent-driven development is recommended, because the tasks have clear
interfaces and independent review gates; native execution is acceptable if
the user prefers one session.
