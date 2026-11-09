# Экран «Приоритет задачи» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать страницу `/tasks/:id/priority` с мгновенным применением выбранного приоритета и возвратом на детали задачи по фреймам Figma `34:9823`, `34:10095`.

**Architecture:** Новый route под `_app` открывается из строки «Приоритет» на `/tasks/:id`. `TaskPriorityView` рендерит четыре варианта из `PRIORITY_OPTIONS` с отметкой текущего; выбор вызывает мутацию `useUpdateTaskPriority`, которая оптимистично обновляет детальный кэш и отправляет `PATCH /tasks/{id}` с `{ priority }`, затем route сразу возвращает пользователя назад. Skeleton повторяет геометрию страницы и подключается в `RouteSkeleton`.

**Tech Stack:** React Router 8 Framework Mode, React 19, TypeScript 5.9 strict, Tailwind CSS 4, TanStack React Query 5, Vitest 5 (node, `renderToStaticMarkup`), sonner.

**Spec:** `docs/specs/2026-11-09-task-priority/spec.md`

## Global Constraints

- Только токены `app-*`; light/dark через `data-app-theme`, без `dark:` и хардкода цветов.
- SSR включён; защищённые данные задачи не попадают в SSR-ответ; `useQuery` только после `AuthGate`.
- Новые зависимости не добавляются.
- Все API-запросы — через `updateTask` / `apiRequest`.
- Детальный ключ кэша обязан оставаться под `["tasks"]`: `["tasks","detail",taskId]`.
- `TaskUpdateInput` расширяется `priority?: Priority`.
- TypeScript strict, без `any`; типы — через `import type`; алиас `~/*`.
- Файлы — `kebab-case`, компоненты — `PascalCase`; `default export` только у route-модулей.
- Тесты — Vitest, `app/**/*.test.ts`, среда `node`, без jsdom/Testing Library.
- Линтера нет; `npm run lint` не добавлять.
- Тексты: заголовок «Приоритет задачи», подсказка «Выберите приоритет задачи по Матрице Эйзенхауэра», пояснение «Матрица Эйзенхауэра - это простой и полезный метод тайм-менеджмента. Он помогает расставить приоритеты и разделить дела по двум главным признакам: важность и срочность.», ошибка toast «Не удалось изменить приоритет. Попробуйте ещё раз.».
- Варианты — `PRIORITY_OPTIONS` («Срочные и важные», «Важные, но не срочные», «Срочные, но не важные», «Не срочные и не важные»).
- Ширины 320/412/448 px, light/dark и safe-area не ломаются.

## Review Focus

- Выбор текущего приоритета: `PATCH` не отправляется, выполняется только возврат назад.
- Выбор другого приоритета: `PATCH` уходит с `{ priority }`, детальный кэш обновляется оптимистично, пользователь сразу возвращается на `/tasks/:id`.
- Ошибка `PATCH` после возврата: снимок кэша откатывается, звучит error haptic, показывается toast с текстом ошибки.
- `404` от `PATCH`: детальный ключ инвалидируется, экран деталей сам показывает «Задача не найдена»; toast не показывается.
- PATCH экземпляра серии: после успеха инвалидируются `["tasks"]` и `["task-series"]`, ответ с другим `id` не перезаписывает текущий детальный кэш.
- Невалидный id и `404` загрузки: «Задача не найдена» без запроса/с запросом; обычная ошибка — «Повторить».

---

### Task 1: Модель кэша, toast и мутация PATCH приоритета

**Files:**
- Modify: `app/lib/tasks/types.ts`
- Modify: `app/lib/tasks/task-detail-cache.ts`
- Modify: `app/lib/tasks/task-toasts.ts`
- Create: `app/hooks/use-update-task-priority.ts`
- Test: `app/lib/tasks/task-detail-cache.test.ts`
- Test: `app/lib/tasks/task-toasts.test.ts`
- Test: `app/hooks/use-update-task-priority.test.ts`

**Interfaces:**
- Produces:
  - `export function applyTaskDetailPriority(task: TaskResponse | undefined, priority: Priority): TaskResponse | undefined`
  - `export const TASK_PRIORITY_UPDATE_ERROR = "Не удалось изменить приоритет. Попробуйте ещё раз."`
  - `export function showTaskPriorityUpdateErrorToast(): void`
  - `export interface UpdateTaskPriorityMutationOptions { mutationFn: (priority: Priority) => Promise<TaskResponse>; onMutate: (priority: Priority) => Promise<{ previous: TaskResponse | undefined }>; onError: (error: Error, priority: Priority, context: { previous: TaskResponse | undefined } | undefined) => void; onSuccess: (updated: TaskResponse) => void; onSettled: () => void }`
  - `export function createUpdateTaskPriorityMutationOptions({ queryClient, haptics, taskId }: { queryClient: QueryClient; haptics: TelegramHaptics; taskId: number }): UpdateTaskPriorityMutationOptions`
  - `export function useUpdateTaskPriority(taskId: number): UseMutationResult<TaskResponse, Error, Priority>`
- Consumes: `updateTask` из `~/lib/tasks/tasks-api`; `taskDetailQueryKey`, `applyTaskDetailPriority`; `ApiError`; `TelegramHaptics`, `useTelegram`; `showTaskPriorityUpdateErrorToast`.

- [ ] **Step 1: Написать падающие тесты модели и toast**

Добавить в `app/lib/tasks/task-detail-cache.test.ts`:

```ts
import { applyTaskDetailPriority } from "./task-detail-cache";

describe("applyTaskDetailPriority", () => {
  it("changes the priority optimistically", () => {
    const next = applyTaskDetailPriority(task(), "urgent_important");
    expect(next?.priority).toBe("urgent_important");
  });

  it("returns the same task for the same priority", () => {
    const current = task({ priority: "neither" });
    expect(applyTaskDetailPriority(current, "neither")).toBe(current);
  });

  it("returns undefined for missing data", () => {
    expect(applyTaskDetailPriority(undefined, "neither")).toBeUndefined();
  });
});
```

Добавить в `app/lib/tasks/task-toasts.test.ts`:

```ts
import { showTaskPriorityUpdateErrorToast } from "./task-toasts";

it("shows a priority update error toast without an icon", () => {
  showTaskPriorityUpdateErrorToast();

  expect(sonner.error).toHaveBeenCalledWith(
    "Не удалось изменить приоритет. Попробуйте ещё раз.",
    { icon: null },
  );
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/lib/tasks/task-detail-cache.test.ts app/lib/tasks/task-toasts.test.ts`
Expected: FAIL — `applyTaskDetailPriority`/`showTaskPriorityUpdateErrorToast` не экспортируются.

- [ ] **Step 3: Реализовать модель и toast**

`app/lib/tasks/types.ts` — добавить в `TaskUpdateInput`:
```ts
priority?: Priority;
```

`app/lib/tasks/task-detail-cache.ts`:
```ts
export function applyTaskDetailPriority(
  task: TaskResponse | undefined,
  priority: Priority,
): TaskResponse | undefined {
  if (!task || task.priority === priority) return task;

  return { ...task, priority };
}
```

`app/lib/tasks/task-toasts.ts`:
```ts
export const TASK_PRIORITY_UPDATE_ERROR =
  "Не удалось изменить приоритет. Попробуйте ещё раз.";

export function showTaskPriorityUpdateErrorToast(): void {
  toast.error(TASK_PRIORITY_UPDATE_ERROR, { icon: null });
}
```

- [ ] **Step 4: Запустить тесты модели**

Run: `npx vitest run app/lib/tasks/task-detail-cache.test.ts app/lib/tasks/task-toasts.test.ts`
Expected: PASS.

- [ ] **Step 5: Написать падающий тест мутации**

Создать `app/hooks/use-update-task-priority.test.ts` по образцу `use-update-task-due.test.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { showTaskPriorityUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import { createUpdateTaskPriorityMutationOptions } from "./use-update-task-priority";

vi.mock("~/lib/tasks/tasks-api", () => ({ updateTask: vi.fn() }));
vi.mock("~/lib/tasks/task-toasts", () => ({
  showTaskPriorityUpdateErrorToast: vi.fn(),
}));

const updateTaskMock = vi.mocked(updateTask);
const toastMock = vi.mocked(showTaskPriorityUpdateErrorToast);
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

describe("createUpdateTaskPriorityMutationOptions", () => {
  it("calls PATCH with only the priority", async () => {
    updateTaskMock.mockResolvedValue(task({ priority: "urgent_important" }));
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn("urgent_important");

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      priority: "urgent_important",
    });
  });

  it("applies the priority optimistically and returns the previous snapshot", async () => {
    const current = task();
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    const context = await options.onMutate("important_not_urgent");

    expect(queryClient.getQueryData<TaskResponse>(queryKey)?.priority).toBe(
      "important_not_urgent",
    );
    expect(context.previous).toEqual(current);
  });

  it("rolls the cache back and reports an error", async () => {
    const current = task();
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate("urgent_not_important");

    options.onError(
      new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      "urgent_not_important",
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the server task on success and reports success", () => {
    const updated = task({ priority: "urgent_important" });
    queryClient.setQueryData(queryKey, task());
    const options = createUpdateTaskPriorityMutationOptions({
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
    const updated = task({ id: 99, priority: "urgent_important" });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
  });

  it("invalidates detail, tasks and series after settling", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskPriorityMutationOptions({
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
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
  });

  it("invalidates detail and skips the toast on 404", async () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const current = task();
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate("neither");

    options.onError(
      new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
      "neither",
      context,
    );

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Запустить тест и убедиться, что он падает**

Run: `npx vitest run app/hooks/use-update-task-priority.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 7: Реализовать хук**

`app/hooks/use-update-task-priority.ts`:
- `mutationFn: (priority) => updateTask(taskId, { priority })`;
- `onMutate`: `await queryClient.cancelQueries({ queryKey })`, снимок
  `previous`, `setQueryData(queryKey, (data) => applyTaskDetailPriority(data, priority))`;
- `onError`: вернуть `previous` при наличии, `haptics.notification("error")`,
  `showTaskPriorityUpdateErrorToast()` только для не-`404`, при `404` —
  `invalidateQueries({ queryKey })`;
- `onSuccess`: если `updated.id === taskId` — `setQueryData(queryKey, updated)`,
  `haptics.notification("success")`;
- `onSettled`: инвалидации `queryKey`, `["tasks"]`, `["task-series"]`.
- `useUpdateTaskPriority(taskId)` — `useQueryClient` + `useTelegram`.

- [ ] **Step 8: Запустить тесты**

Run: `npx vitest run app/hooks/use-update-task-priority.test.ts app/lib/tasks/task-detail-cache.test.ts app/lib/tasks/task-toasts.test.ts`
Expected: PASS.

---

### Task 2: Компоненты страницы приоритета

**Files:**
- Create: `app/components/tasks/priority/task-priority-view.tsx`
- Create: `app/components/tasks/priority/task-priority-skeleton.tsx`
- Test: `app/components/tasks/priority/task-priority-view.test.ts`
- Test: `app/components/tasks/priority/task-priority-skeleton.test.ts`

**Interfaces:**
- Produces:
  - `export interface TaskPriorityViewProps { priority: Priority; onSelect: (priority: Priority) => void }`
  - `export function TaskPriorityView(props: TaskPriorityViewProps): ReactElement`
  - `export function TaskPrioritySkeleton(): ReactElement`
- Consumes: `PRIORITY_OPTIONS`; `AssetIcon` + `check.svg`; `Skeleton`; `cn`.

- [ ] **Step 1: Написать падающие SSR-тесты**

`task-priority-view.test.ts`:
```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskPriorityView, type TaskPriorityViewProps } from "./task-priority-view";

function render(props: Partial<TaskPriorityViewProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskPriorityView, {
      priority: "neither",
      onSelect: () => {},
      ...props,
    }),
  );
}

describe("TaskPriorityView", () => {
  it("renders the header and subtitle", () => {
    const html = render();
    expect(html).toContain("Приоритет задачи");
    expect(html).toContain(
      "Выберите приоритет задачи по Матрице Эйзенхауэра",
    );
  });

  it("renders all four priority options and one selected radio", () => {
    const html = render({ priority: "important_not_urgent" });
    expect(html).toContain("Срочные и важные");
    expect(html).toContain("Важные, но не срочные");
    expect(html).toContain("Срочные, но не важные");
    expect(html).toContain("Не срочные и не важные");
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)).toHaveLength(4);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });

  it("shows the Eisenhower explanation", () => {
    expect(render()).toContain(
      "Матрица Эйзенхауэра - это простой и полезный метод тайм-менеджмента.",
    );
  });

  it("draws dividers only between rows", () => {
    expect(render().match(/border-b border-app-stroke/g)).toHaveLength(3);
  });

  it("uses app tokens and no dark variants", () => {
    const html = render();
    expect(html).toContain("bg-app-card");
    expect(html).toContain("text-app-text-secondary");
    expect(html).toContain("text-app-accent");
    expect(html).not.toContain("dark:");
  });
});
```

`task-priority-skeleton.test.ts`:
```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskPrioritySkeleton } from "./task-priority-skeleton";

describe("TaskPrioritySkeleton", () => {
  it("renders a status region with the expected label", () => {
    const html = renderToStaticMarkup(createElement(TaskPrioritySkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем приоритет"');
  });

  it("repeats the page geometry", () => {
    const html = renderToStaticMarkup(createElement(TaskPrioritySkeleton));
    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[218px]");
    expect(html).toContain("rounded-[25px]");
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/components/tasks/priority`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать `TaskPrioritySkeleton`**

Структура:
- root `div role="status" aria-busy="true" aria-label="Загружаем приоритет" className="flex flex-1 flex-col gap-2"`;
- блок заголовка `px-[15px] py-[15px]` с `Skeleton h-[29px] w-[60%] rounded-[6px]`;
- подсказка `px-[15px]` с `Skeleton h-[13px] w-[90%] rounded-[4px]`;
- карточка `Skeleton h-[218px] w-full rounded-[25px]`;
- пояснение `px-[15px]` с двумя `Skeleton h-[13px]` (`w-full`, `w-2/3`).

- [ ] **Step 4: Реализовать `TaskPriorityView`**

Разметка:
- root `div className="flex flex-1 flex-col gap-2"`;
- заголовок `h1` с классами `break-words text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text` в `px-[15px] py-[15px]`;
- подсказка `p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary"`;
- карточка `div role="radiogroup" aria-label="Приоритет задачи" className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]"`;
- каждая строка — `button type="button" role="radio" aria-checked={isSelected}` с классами `flex h-[47px] w-full items-center gap-[11px] text-left text-[15px] leading-[1.3] text-app-text transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent`;
- ведущая ячейка `span className="flex size-6 shrink-0 items-center justify-center"`; при выборе — `AssetIcon className="size-6 text-app-accent" src={checkIcon}`;
- текстовая часть `span className={cn("flex h-full min-w-0 flex-1 items-center", !isLast && "border-b border-app-stroke")}` с `span className="truncate"`;
- пояснение под карточкой — текст из Global Constraints, `px-[15px] text-[13px] leading-[1.4] text-app-text-secondary`;
- `onClick={() => onSelect(option.value)}`.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run app/components/tasks/priority`
Expected: PASS.

---

### Task 3: Маршрут, RouteSkeleton и вход из деталей

**Files:**
- Create: `app/routes/task-priority.tsx`
- Modify: `app/routes.ts`
- Modify: `app/routes/task-detail.tsx`
- Modify: `app/components/tasks/detail/task-detail-card.tsx`
- Modify: `app/components/tasks/detail/task-detail-view.tsx`
- Modify: `app/components/layout/route-skeleton.tsx`
- Test: `app/routes/task-priority.test.ts`
- Test: `app/routes/task-detail.test.ts`
- Test: `app/components/tasks/detail/task-detail-card.test.ts`
- Test: `app/components/tasks/detail/task-detail-view.test.ts`
- Test: `app/components/layout/route-skeleton.test.ts`

**Interfaces:**
- Produces:
  - `default export function TaskPriority(): ReactElement`
  - `export function meta(): { title: string }[]`
  - `TaskDetailCardProps.onPriorityClick?: () => void`
  - `TaskDetailViewProps.onPriorityClick?: () => void`
- Consumes: `useTaskDetail`, `useUpdateTaskPriority`, `TaskPriorityView`, `TaskPrioritySkeleton`, `TaskDetailError`, `useTelegramBackButton`, `shouldGoBack`, `useBottomNavigation`, `CONTENT_BOTTOM_PADDING`, `Priority`.

- [ ] **Step 1: Написать падающие тесты маршрута и интеграции**

`app/routes/task-priority.test.ts` — по образцу `task-reminders.test.ts`:
- mock `@tanstack/react-query` → `{ queryOptions: (o) => o, useQuery: () => ({ data: [] }) }`;
- mock `react-router` → `useParams`, `useNavigate`;
- mock `~/hooks/use-task-detail` → `useTaskDetail(taskId, enabled)` записывает аргументы, возвращает `routeState.task`;
- mock `~/hooks/use-update-task-priority` → возвращает `{ mutate }`, записывает аргументы;
- mock `~/hooks/use-bottom-navigation`, `~/hooks/use-telegram-back-button`;
- mock `~/providers/auth-provider`, `~/providers/telegram-provider`;
- mock `~/components/home/bottom-navigation-dock`, `~/components/tasks/priority/task-priority-view`, `~/components/tasks/priority/task-priority-skeleton`, `~/components/tasks/detail/task-detail-error`.

Тесты:
1. `shows the skeleton while the task is loading` → `SKELETON`.
2. `shows the view with the current priority` → `VIEW`, `viewProps.priority === task.priority`, `bottomNavActive === "tasks"`.
3. `shows not found for a 404` → `ERROR:not-found`.
4. `shows a load error for a non-404 failure` → `ERROR:load-error`.
5. `shows not found for an invalid id without a request` → `taskArgs` `[0, false]`.
6. `keeps cached task data when a background refetch fails` → `VIEW`.
7. `sends a new priority and goes back` → `viewProps.onSelect("urgent_important")`; `mutate` called with `"urgent_important"`; `navigate(-1)` при `history.state = { idx: 1 }`.
8. `does not send the current priority and still goes back` → `onSelect("neither")`; `mutate` not called; `navigate(-1)`.
9. `falls back to /tasks/42 without history` → `history.state = {}`; `onSelect(...)`; `navigate("/tasks/42")`.
10. `falls back to /tasks for an invalid id` → params `abc`; `onBack`; `navigate("/tasks")`.
11. `returns the public meta title and description` → `meta()`.

Интеграционные кейсы:
- `task-detail-card.test.ts`: с `onPriorityClick` есть `aria-label="Изменить приоритет"` и `<button>`; без обработчика — нет.
- `task-detail-view.test.ts`: `onPriorityClick` пробрасывается (aria-label появляется).
- `task-detail.test.ts`: `routeState.viewProps?.onPriorityClick?.()` → `navigate("/tasks/42/priority")`.
- `route-skeleton.test.ts`: mock `TaskPrioritySkeleton` → `PRIORITY_SKELETON`; `renderAt("/tasks/42/priority")` содержит его и не содержит `DETAIL_SKELETON`; с trailing slash.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/routes/task-priority.test.ts app/routes/task-detail.test.ts app/components/tasks/priority app/components/tasks/detail app/components/layout/route-skeleton.test.ts`
Expected: FAIL — route и обработчики отсутствуют.

- [ ] **Step 3: Реализовать route**

`app/routes/task-priority.tsx`:
```tsx
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Приоритет — Milly" },
    { name: "description", content: "Изменение приоритета задачи в Milly" },
  ];
}

export default function TaskPriority() {
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const mutation = useUpdateTaskPriority(taskId);
  useTelegramBackButton(handleBack);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate(isValidId ? `/tasks/${taskId}` : "/tasks");
  }

  function handleSelect(priority: Priority) {
    if (taskQuery.data && priority !== taskQuery.data.priority) {
      mutation.mutate(priority);
    }
    handleBack();
  }
  ...
}
```
Рендер: `main > div className="flex flex-1 flex-col gap-2 px-4"` с
`paddingBottom: CONTENT_BOTTOM_PADDING`; внутри:
- невалидный id → `TaskDetailError kind="not-found" onBack={handleBack} onRetry={handleBack}`;
- `isPending` → `TaskPrioritySkeleton`;
- ошибка без data: `404` → not-found, иначе load-error с `refetch`;
- data → `TaskPriorityView priority={taskQuery.data.priority} onSelect={handleSelect}`;
- `BottomNavigationDock active="tasks" onSelect={onSelectTab}`.

- [ ] **Step 4: Подключить маршрут, строку «Приоритет» и RouteSkeleton**

- `app/routes.ts`: добавить `route("tasks/:id/priority", "routes/task-priority.tsx")` после reminders.
- `task-detail-card.tsx`: добавить `onPriorityClick?: () => void`; строке «Приоритет» передать `ariaLabel="Изменить приоритет"` и `onClick={onPriorityClick}`.
- `task-detail-view.tsx`: добавить `onPriorityClick?: () => void`; передать в `TaskDetailCard`.
- `task-detail.tsx`: добавить `handlePriorityClick()` с `haptics.selection()` и `void navigate(\`/tasks/${task.id}/priority\`)`; передать `onPriorityClick={handlePriorityClick}`.
- `route-skeleton.tsx`:
  ```ts
  const isTaskPriority = /^\/tasks\/[^/]+\/priority\/?$/.test(pathname);
  ```
  и в цепочке `isSearch ? ... : isTaskPriority ? <TaskPrioritySkeleton /> : isTaskReminders ? ... : isTaskDetail ? ...`.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run app/routes/task-priority.test.ts app/routes/task-detail.test.ts app/components/tasks/priority app/components/tasks/detail app/components/layout/route-skeleton.test.ts`
Expected: PASS.

---

### Task 4: Документация и финальная проверка

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/agents/features/task-priority.md`
- Modify: `docs/agents/structure.md`
- Modify: `docs/agents/features/task-detail.md`
- Modify: `docs/agents/qa.md`
- Modify: `docs/specs/2026-11-08-task-detail/spec.md`
- Create: `docs/specs/2026-11-09-task-priority/spec.md` (создан)
- Create: `docs/specs/2026-11-09-task-priority/plan.md` (этот файл)

- [ ] **Step 1: Обновить `AGENTS.md`**

- В таблицу «Тема → файл» добавить строку про экран приоритета
  (`docs/agents/features/task-priority.md`).
- В «Быстрая карта» добавить папку `app/components/tasks/priority/`,
  хук `app/hooks/use-update-task-priority.ts`, маршрут
  `/tasks/:id/priority`.
- В инварианты добавить: выбор приоритета сразу отправляет PATCH,
  возвращает на детали, оптимистично обновляет кэш; ошибка — toast.
- В «Проверка перед завершением» сослаться на QA-раздел.

- [ ] **Step 2: Обновить `docs/agents/structure.md`**

Добавить:
- `tasks/priority/` — экран «Приоритет задачи»;
- `use-update-task-priority.ts` — PATCH приоритета, кэш, haptics;
- `routes/task-priority.tsx` — маршрут `/tasks/:id/priority`.

- [ ] **Step 3: Создать `docs/agents/features/task-priority.md`**

Кратко описать:
- маршрут и открытие из строки «Приоритет»;
- четыре варианта и отметку текущего;
- мгновенный PATCH `{ priority }`, оптимистичный кэш, возврат;
- отсутствие PATCH для текущего приоритета;
- ошибки: toast для не-`404`, `404` → «Задача не найдена»;
- проверки в `docs/agents/qa.md`.

- [ ] **Step 4: Обновить `docs/agents/features/task-detail.md`**

- В строке про интерактивность карточки добавить «Приоритет» к «Срок» и
  «Напоминание».
- Добавить, что «Приоритет» открывает `/tasks/:id/priority`.

- [ ] **Step 5: Обновить `docs/agents/qa.md`**

Добавить раздел `/tasks/:id/priority`:
- открытие из строки «Приоритет»;
- галочка текущего, выбор другого, возврат и обновление значения;
- выбор текущего без PATCH;
- ошибка PATCH — откат и toast; `404` — «Задача не найдена»;
- light/dark, 320/412/448 px, safe-area, Telegram BackButton;
- SSR без данных задачи, meta «Приоритет — Milly».

- [ ] **Step 6: Добавить blockquote в спецификацию деталей**

В `docs/specs/2026-11-08-task-detail/spec.md`:
```md
> Примечание (2026-11-09): строка «Приоритет» теперь открывает
> `/tasks/:id/priority` (см.
> `docs/specs/2026-11-09-task-priority/spec.md`). Пункт «редактирование
> … приоритета» из «Вне scope» больше не действует.
```

- [ ] **Step 7: Полная проверка**

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
curl -s http://localhost:3000/tasks/1/priority | grep -E "Приоритет задачи|Матрица Эйзенхауэра|Срочные и важные" || true
```
Expected: SSR-ответ не содержит защищённых данных задачи и вариантов; допустим только скелетон/экран загрузки. Остановить сервер после проверки.

---

## Self-Review

- **Spec coverage:** FR-1 → Task 3; FR-2 → Task 1; FR-3–FR-5 → Task 2; FR-6 → Tasks 2–3; FR-7 → Task 3; FR-8 → Tasks 1–3; FR-9 → Tasks 1–4. Все пункты покрыты.
- **Step scan:** каждый шаг содержит конкретный файл, сигнатуру, тестовые assertions и команду; открытых «handle edge cases» нет.
- **Type consistency:** `TaskPriorityViewProps`, `createUpdateTaskPriorityMutationOptions`, `applyTaskDetailPriority`, `TaskPrioritySkeleton` используются одинаково во всех задачах.
- **Review Focus:** шесть рискованных классов покрыты тестами Task 1 (оптимистичный кэш, откат, toast, `404`) и Task 3 (текущий приоритет, возврат, fallback, невалидный id).
