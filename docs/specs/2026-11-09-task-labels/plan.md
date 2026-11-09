# Экран «Выбор меток задачи» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать страницу `/tasks/:id/labels` с множественным выбором меток, автосохранением каждого переключения и возвратом на детали задачи по фреймам Figma `54:13720`, `54:14028`, `57:9010`, `57:9326`.

**Architecture:** Новый route под `_app` открывается из строки «Метки» на `/tasks/:id`. `TaskLabelsView` рендерит заголовок, кнопку-заглушку «Создать метку», поиск и карточку меток из `GET /labels` с цветами backend и мультивыбором. Каждое нажатие сразу вызывает мутацию `useUpdateTaskLabels`, которая оптимистично обновляет детальный кэш и отправляет `PATCH /tasks/{id}` с полным `label_ids`; мутации сериализуются через `scope`, пользователь остаётся на странице. Skeleton повторяет геометрию страницы и подключается в `RouteSkeleton`.

**Tech Stack:** React Router 8 Framework Mode, React 19, TypeScript 5.9 strict, Tailwind CSS 4, TanStack React Query 5, Vitest 5 (node, `renderToStaticMarkup`), sonner.

**Spec:** `docs/specs/2026-11-09-task-labels/spec.md`

## Global Constraints

- Только токены `app-*`; light/dark через `data-app-theme`, без `dark:` и хардкода цветов. Исключение — inline-цвет метки из `label.color.hex`.
- SSR включён; защищённые данные задачи и меток не попадают в SSR-ответ; `useQuery` только после `AuthGate`.
- Новые зависимости не добавляются.
- Все API-запросы — через `updateTask` / `apiRequest`.
- Детальный ключ кэша обязан оставаться под `["tasks"]`: `["tasks","detail",taskId]`.
- `TaskUpdateInput` расширяется `label_ids?: number[]`.
- `label_ids` — полная замена набора; `[]` очищает; `null`/отсутствие поля не меняет набор. Поле `label_ids` не опускается.
- Мутации меток сериализуются через `scope: { id: "task-labels" }`.
- Максимум меток — 100; лишнее нажатие игнорируется без запроса.
- TypeScript strict, без `any`; типы — через `import type`; алиас `~/*`.
- Файлы — `kebab-case`, компоненты — `PascalCase`; `default export` только у route-модулей.
- Тесты — Vitest, `app/**/*.test.ts`, среда `node`, без jsdom/Testing Library.
- Линтера нет; `npm run lint` не добавлять.
- Тексты: заголовок «Выбор меток задачи», подзаголовок «Выберите или создайте метки для текущей задачи.», пустой подзаголовок «На данный момент у вас отсутствуют какие-либо метки, но вы можете создать первую прямо сейчас.», кнопка «Создать метку», пояснение «Это позволит вам группировать и фильтровать свои задачи», загрузка «Загружаем метки…», ошибка загрузки «Не удалось загрузить метки», кнопка «Повторить», нет совпадений «Ничего не найдено», toast «Не удалось изменить метки. Попробуйте ещё раз.».
- Иконки: кнопка создания — `tag-plus.svg` `18×18` цвета `app-accent`; строки меток — `tag-raw.svg` `18×18` цвета `label.color.hex`; ведущая иконка строки деталей — существующий `tag.svg`.
- Строка деталей переименовывается «Теги» → «Метки».
- Ширины 320/412/448 px, light/dark и safe-area не ломаются.

## Review Focus

- Каждое нажатие на метку отправляет полный `label_ids` и не закрывает страницу; текущий выбор отражается оптимистично.
- Снятие последней метки отправляет `{ label_ids: [] }`, а не опускает поле.
- Быстрые нажатия сериализуются через `scope`; финальный набор на сервере совпадает с финальным выбором.
- Ошибка `PATCH` после автосохранения: снимок кэша откатывается, error haptic и toast для любого статуса; при `404` дополнительно инвалидируются детали и `["labels"]`.
- Лимит 100: нажатие на 101-ю метку не отправляет запрос.
- Метки loading/error/empty: кнопка создания и пояснение видны всегда, поиск и карточка — только при наличии меток; закэшированный список не пропадает при refetch-ошибке.
- Невалидный id и `404` загрузки задачи: «Задача не найдена» без запроса/с запросом; обычная ошибка — «Повторить».

---

### Task 1: Модель кэша, toast и мутация PATCH меток

**Files:**
- Modify: `app/lib/tasks/types.ts`
- Modify: `app/lib/tasks/task-detail-cache.ts`
- Modify: `app/lib/tasks/task-toasts.ts`
- Create: `app/hooks/use-update-task-labels.ts`
- Test: `app/lib/tasks/task-detail-cache.test.ts`
- Test: `app/lib/tasks/task-toasts.test.ts`
- Test: `app/hooks/use-update-task-labels.test.ts`

**Interfaces:**
- Produces:
  - `export function applyTaskDetailLabels(task: TaskResponse | undefined, labels: readonly LabelRef[]): TaskResponse | undefined`
  - `export const TASK_LABELS_UPDATE_ERROR = "Не удалось изменить метки. Попробуйте ещё раз."`
  - `export function showTaskLabelsUpdateErrorToast(): void`
  - `export interface TaskLabelsUpdateInput { labelIds: number[]; labels: LabelRef[] }`
  - `export interface UpdateTaskLabelsMutationContext { previous: TaskResponse | undefined }`
  - `export interface UpdateTaskLabelsMutationOptions { scope: { id: string }; mutationFn: (input: TaskLabelsUpdateInput) => Promise<TaskResponse>; onMutate: (input: TaskLabelsUpdateInput) => Promise<UpdateTaskLabelsMutationContext>; onError: (error: Error, input: TaskLabelsUpdateInput, context: UpdateTaskLabelsMutationContext | undefined) => void; onSuccess: (updated: TaskResponse) => void; onSettled: () => void }`
  - `export function createUpdateTaskLabelsMutationOptions({ queryClient, haptics, taskId }: { queryClient: QueryClient; haptics: TelegramHaptics; taskId: number }): UpdateTaskLabelsMutationOptions`
  - `export function useUpdateTaskLabels(taskId: number): UseMutationResult<TaskResponse, Error, TaskLabelsUpdateInput>`
- Consumes: `updateTask` из `~/lib/tasks/tasks-api`; `taskDetailQueryKey`, `applyTaskDetailLabels`; `LABELS_QUERY_KEY`; `ApiError`; `TelegramHaptics`, `useTelegram`; `showTaskLabelsUpdateErrorToast`.

- [ ] **Step 1: Написать падающие тесты модели и toast**

В существующий импорт из `./task-detail-cache` в
`app/lib/tasks/task-detail-cache.test.ts` добавить
`applyTaskDetailLabels` и дописать:

```ts
describe("applyTaskDetailLabels", () => {
  const urgent = { id: 3, name: "Срочно" };
  const work = { id: 4, name: "Работа" };

  it("replaces labels optimistically", () => {
    const next = applyTaskDetailLabels(task(), [urgent, work]);
    expect(next?.labels).toEqual([urgent, work]);
  });

  it("clears labels optimistically with an empty array", () => {
    const next = applyTaskDetailLabels(task({ labels: [urgent] }), []);
    expect(next?.labels).toEqual([]);
  });

  it("returns the same task for the same labels", () => {
    const current = task({ labels: [urgent, work] });
    expect(applyTaskDetailLabels(current, [urgent, work])).toBe(current);
  });

  it("returns a new task when a label name changes", () => {
    const current = task({ labels: [{ id: 3, name: "Срочно" }] });
    const next = applyTaskDetailLabels(current, [
      { id: 3, name: "Очень срочно" },
    ]);
    expect(next?.labels).toEqual([{ id: 3, name: "Очень срочно" }]);
  });

  it("returns undefined for missing data", () => {
    expect(applyTaskDetailLabels(undefined, [urgent])).toBeUndefined();
  });
});
```

В существующий импорт из `./task-toasts` в
`app/lib/tasks/task-toasts.test.ts` добавить
`showTaskLabelsUpdateErrorToast` и дописать:

```ts
it("shows a labels update error toast without an icon", () => {
  showTaskLabelsUpdateErrorToast();

  expect(sonner.error).toHaveBeenCalledWith(
    "Не удалось изменить метки. Попробуйте ещё раз.",
    { icon: null },
  );
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/lib/tasks/task-detail-cache.test.ts app/lib/tasks/task-toasts.test.ts`
Expected: FAIL — `applyTaskDetailLabels`/`showTaskLabelsUpdateErrorToast` не экспортируются.

- [ ] **Step 3: Реализовать модель и toast**

`app/lib/tasks/types.ts` — добавить в `TaskUpdateInput`:
```ts
label_ids?: number[];
```

`app/lib/tasks/task-detail-cache.ts`:
```ts
import type { LabelRef, Priority, TaskResponse } from "./types";

function hasSameLabels(
  current: readonly LabelRef[],
  next: readonly LabelRef[],
): boolean {
  return (
    current.length === next.length &&
    current.every(
      (label, index) =>
        label.id === next[index].id && label.name === next[index].name,
    )
  );
}

export function applyTaskDetailLabels(
  task: TaskResponse | undefined,
  labels: readonly LabelRef[],
): TaskResponse | undefined {
  if (!task || hasSameLabels(task.labels, labels)) return task;

  return { ...task, labels: [...labels] };
}
```

`app/lib/tasks/task-toasts.ts`:
```ts
export const TASK_LABELS_UPDATE_ERROR =
  "Не удалось изменить метки. Попробуйте ещё раз.";

export function showTaskLabelsUpdateErrorToast(): void {
  toast.error(TASK_LABELS_UPDATE_ERROR, { icon: null });
}
```

- [ ] **Step 4: Запустить тесты модели**

Run: `npx vitest run app/lib/tasks/task-detail-cache.test.ts app/lib/tasks/task-toasts.test.ts`
Expected: PASS.

- [ ] **Step 5: Написать падающий тест мутации**

Создать `app/hooks/use-update-task-labels.test.ts` по образцу
`use-update-task-project.test.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { showTaskLabelsUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { LabelRef, TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import {
  createUpdateTaskLabelsMutationOptions,
  type TaskLabelsUpdateInput,
} from "./use-update-task-labels";

vi.mock("~/lib/tasks/tasks-api", () => ({ updateTask: vi.fn() }));
vi.mock("~/lib/tasks/task-toasts", () => ({
  showTaskLabelsUpdateErrorToast: vi.fn(),
}));

const updateTaskMock = vi.mocked(updateTask);
const toastMock = vi.mocked(showTaskLabelsUpdateErrorToast);
const TASK_ID = 42;
const queryKey = taskDetailQueryKey(TASK_ID);
const URGENT: LabelRef = { id: 3, name: "Срочно" };
const WORK: LabelRef = { id: 4, name: "Работа" };

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

function input(
  labelIds: number[] = [URGENT.id],
  labels: LabelRef[] = [URGENT],
): TaskLabelsUpdateInput {
  return { labelIds, labels };
}

let queryClient: QueryClient;
let haptics: TelegramHaptics;

beforeEach(() => {
  queryClient = new QueryClient();
  haptics = { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() };
  updateTaskMock.mockReset();
  toastMock.mockReset();
});

describe("createUpdateTaskLabelsMutationOptions", () => {
  it("serializes mutations under the task-labels scope", () => {
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    expect(options.scope).toEqual({ id: "task-labels" });
  });

  it("calls PATCH with the full label_ids set", async () => {
    updateTaskMock.mockResolvedValue(task({ labels: [URGENT, WORK] }));
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn(input([URGENT.id, WORK.id], [URGENT, WORK]));

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      label_ids: [URGENT.id, WORK.id],
    });
  });

  it("calls PATCH with an explicit empty array to clear labels", async () => {
    updateTaskMock.mockResolvedValue(task({ labels: [] }));
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn(input([], []));

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      label_ids: [],
    });
  });

  it("applies labels optimistically and returns the previous snapshot", async () => {
    const current = task({ labels: [URGENT] });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    const context = await options.onMutate(input([WORK.id], [WORK]));

    expect(queryClient.getQueryData<TaskResponse>(queryKey)?.labels).toEqual([
      WORK,
    ]);
    expect(context.previous).toEqual(current);
  });

  it("rolls the cache back and reports an error", async () => {
    const current = task({ labels: [URGENT] });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate(input([WORK.id], [WORK]));

    options.onError(
      new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
      input([WORK.id], [WORK]),
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the server task on success and reports success", () => {
    const updated = task({ labels: [URGENT, WORK] });
    queryClient.setQueryData(queryKey, task());
    const options = createUpdateTaskLabelsMutationOptions({
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
    const updated = task({ id: 99, labels: [URGENT] });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskLabelsMutationOptions({
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
    const options = createUpdateTaskLabelsMutationOptions({
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
      queryKey: ["labels"],
    });
  });

  it("rolls back, shows a toast and invalidates detail/labels on 404", async () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const current = task({ labels: [URGENT] });
    queryClient.setQueryData(queryKey, current);
    const options = createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });
    const context = await options.onMutate(input([WORK.id], [WORK]));

    options.onError(
      new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
      input([WORK.id], [WORK]),
      context,
    );

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["labels"],
    });
  });
});
```

- [ ] **Step 6: Запустить тест и убедиться, что он падает**

Run: `npx vitest run app/hooks/use-update-task-labels.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 7: Реализовать хук**

`app/hooks/use-update-task-labels.ts`:
```ts
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ApiError } from "~/lib/api/errors";
import { LABELS_QUERY_KEY } from "~/lib/labels/labels-query";
import {
  applyTaskDetailLabels,
  taskDetailQueryKey,
} from "~/lib/tasks/task-detail-cache";
import { showTaskLabelsUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { LabelRef, TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export interface TaskLabelsUpdateInput {
  labelIds: number[];
  labels: LabelRef[];
}

export interface UpdateTaskLabelsMutationContext {
  previous: TaskResponse | undefined;
}

export interface UpdateTaskLabelsMutationOptions {
  scope: { id: string };
  mutationFn: (input: TaskLabelsUpdateInput) => Promise<TaskResponse>;
  onMutate: (
    input: TaskLabelsUpdateInput,
  ) => Promise<UpdateTaskLabelsMutationContext>;
  onError: (
    error: Error,
    input: TaskLabelsUpdateInput,
    context: UpdateTaskLabelsMutationContext | undefined,
  ) => void;
  onSuccess: (updated: TaskResponse) => void;
  onSettled: () => void;
}

export function createUpdateTaskLabelsMutationOptions({
  queryClient,
  haptics,
  taskId,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
}): UpdateTaskLabelsMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  return {
    scope: { id: "task-labels" },
    mutationFn: ({ labelIds }) => updateTask(taskId, { label_ids: labelIds }),
    onMutate: async ({ labels }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskResponse>(queryKey);

      queryClient.setQueryData<TaskResponse>(queryKey, (data) =>
        applyTaskDetailLabels(data, labels),
      );

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      haptics.notification("error");
      showTaskLabelsUpdateErrorToast();

      if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey });
        void queryClient.invalidateQueries({ queryKey: LABELS_QUERY_KEY });
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
    },
  };
}

export function useUpdateTaskLabels(
  taskId: number,
): UseMutationResult<TaskResponse, Error, TaskLabelsUpdateInput> {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();

  return useMutation(
    createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId,
    }),
  );
}
```

- [ ] **Step 8: Запустить тесты**

Run: `npx vitest run app/hooks/use-update-task-labels.test.ts app/lib/tasks/task-detail-cache.test.ts app/lib/tasks/task-toasts.test.ts`
Expected: PASS.

---

### Task 2: Компоненты страницы меток

**Files:**
- Create: `app/components/tasks/labels/task-labels-view.tsx`
- Create: `app/components/tasks/labels/task-labels-skeleton.tsx`
- Test: `app/components/tasks/labels/task-labels-view.test.ts`
- Test: `app/components/tasks/labels/task-labels-skeleton.test.ts`

**Interfaces:**
- Produces:
  - `export interface TaskLabelsViewProps { selectedIds: readonly number[]; labels: readonly LabelResponse[]; isLabelsLoading: boolean; isLabelsError: boolean; onRetryLabels: () => void; onToggle: (labelId: number) => void }`
  - `export function filterLabels(labels: readonly LabelResponse[], query: string): LabelResponse[]`
  - `export function TaskLabelsView(props: TaskLabelsViewProps): ReactElement`
  - `export function TaskLabelsSkeleton(): ReactElement`
- Consumes: `AssetIcon` + `tag-plus.svg` / `tag-raw.svg`; `SearchField`; `Skeleton`; `cn`; `matchesSearchQuery`.

- [ ] **Step 1: Написать падающие SSR-тесты**

`task-labels-view.test.ts`:
```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { LabelResponse } from "~/lib/labels/types";

import {
  filterLabels,
  TaskLabelsView,
  type TaskLabelsViewProps,
} from "./task-labels-view";

function label(overrides: Partial<LabelResponse> = {}): LabelResponse {
  return {
    id: 3,
    name: "Срочно",
    color: { id: 4, slug: "red", name: "Красный", hex: "#DC2626" },
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}

function render(props: Partial<TaskLabelsViewProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskLabelsView, {
      selectedIds: [],
      labels: [label()],
      isLabelsLoading: false,
      isLabelsError: false,
      onRetryLabels: () => {},
      onToggle: () => {},
      ...props,
    }),
  );
}

describe("filterLabels", () => {
  it("filters by name case-insensitively", () => {
    const labels = [label(), label({ id: 4, name: "Работа" })];

    expect(filterLabels(labels, "раб")).toEqual([labels[1]]);
    expect(filterLabels(labels, "РАБ")).toEqual([labels[1]]);
  });

  it("returns all labels for an empty query", () => {
    const labels = [label(), label({ id: 4, name: "Работа" })];

    expect(filterLabels(labels, "  ")).toEqual(labels);
  });
});

describe("TaskLabelsView", () => {
  it("renders the header, subtitle, create button and explanation", () => {
    const html = render();

    expect(html).toContain("Выбор меток задачи");
    expect(html).toContain(
      "Выберите или создайте метки для текущей задачи.",
    );
    expect(html).toContain("Создать метку");
    expect(html).toContain("tag-plus.svg");
    expect(html).toContain(
      "Это позволит вам группировать и фильтровать свои задачи",
    );
  });

  it("renders the search field and labels list", () => {
    const html = render({
      labels: [label(), label({ id: 4, name: "Работа" })],
    });

    expect(html).toContain('aria-label="Поиск меток"');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Метки"');
    expect(html.match(/role="checkbox"/g)).toHaveLength(2);
  });

  it("marks selected labels with aria-checked", () => {
    const html = render({
      labels: [label(), label({ id: 4, name: "Работа" })],
      selectedIds: [3],
    });

    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain("bg-app-accent");
  });

  it("renders backend label colors and tag icons", () => {
    const html = render();

    expect(html).toContain("#DC2626");
    expect(html).toContain("tag-raw.svg");
    expect(html).not.toContain("dark:");
  });

  it("draws dividers only between rows", () => {
    const html = render({
      labels: [label(), label({ id: 4, name: "Работа" })],
    });

    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
  });

  it("renders the empty state without search or a list", () => {
    const html = render({ labels: [] });

    expect(html).toContain(
      "На данный момент у вас отсутствуют какие-либо метки, но вы можете создать первую прямо сейчас.",
    );
    expect(html).not.toContain('aria-label="Поиск меток"');
    expect(html).not.toContain('role="group"');
    expect(html).toContain("Создать метку");
    expect(html).toContain(
      "Это позволит вам группировать и фильтровать свои задачи",
    );
  });

  it("shows the initial labels loading state", () => {
    const html = render({ labels: [], isLabelsLoading: true });

    expect(html).toContain("Загружаем метки…");
    expect(html).not.toContain('aria-label="Поиск меток"');
    expect(html).not.toContain('role="group"');
  });

  it("shows the initial labels error and retry", () => {
    const onRetryLabels = vi.fn();
    const html = render({
      labels: [],
      isLabelsError: true,
      onRetryLabels,
    });

    expect(html).toContain("Не удалось загрузить метки");
    expect(html).toContain("Повторить");
    expect(html).not.toContain('aria-label="Поиск меток"');
    expect(html).not.toContain('role="group"');
  });

  it("keeps cached labels visible on a refetch error", () => {
    const html = render({ isLabelsError: true });

    expect(html).toContain("Срочно");
    expect(html).toContain("Не удалось загрузить метки");
    expect(html).toContain("Повторить");
  });

  it("uses app tokens", () => {
    const html = render();

    expect(html).toContain("bg-app-card");
    expect(html).toContain("text-app-accent");
    expect(html).toContain("text-app-text-secondary");
  });
});
```

`task-labels-skeleton.test.ts`:
```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskLabelsSkeleton } from "./task-labels-skeleton";

describe("TaskLabelsSkeleton", () => {
  it("renders a status region with the expected label", () => {
    const html = renderToStaticMarkup(createElement(TaskLabelsSkeleton));

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем метки"');
  });

  it("repeats the page geometry", () => {
    const html = renderToStaticMarkup(createElement(TaskLabelsSkeleton));

    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[50px]");
    expect(html).toContain("h-[45px]");
    expect(html).toContain("h-[134px]");
    expect(html).toContain("rounded-[25px]");
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/components/tasks/labels`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать `TaskLabelsSkeleton`**

Структура:
- root `div role="status" aria-busy="true" aria-label="Загружаем метки" className="flex flex-1 flex-col gap-2"`;
- блок заголовка `px-[15px] py-[15px]` с `Skeleton h-[29px] w-[60%] rounded-[6px]`;
- подзаголовок `px-[15px]` с `Skeleton h-[13px] w-[90%] rounded-[4px]`;
- кнопка `Skeleton h-[50px] w-full rounded-[25px]`;
- поиск `Skeleton h-[45px] w-full rounded-[25px]`;
- карточка `Skeleton h-[134px] w-full rounded-[25px]`;
- пояснение `px-[15px]` с двумя `Skeleton h-[13px]` (`w-full`, `w-2/3`).

- [ ] **Step 4: Реализовать `TaskLabelsView`**

Импорты иконок: `tag-plus.svg` — без суффикса (как в
`quick-add-chips.tsx`), `tag-raw.svg?no-inline` — как в
`labels-step.tsx`; оба рендерятся через `AssetIcon`, который берёт цвет
из `currentColor`.

Разметка:
- root `div className="flex flex-1 flex-col gap-2"`;
- заголовок `h1` с классами `break-words text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text` в `px-[15px] py-[15px]`;
- подзаголовок `p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary"`:
  - пустой список после загрузки — текст про отсутствие меток;
  - иначе — «Выберите или создайте метки для текущей задачи.»;
- кнопка создания:
  ```tsx
  <button
    className="flex h-[50px] w-full items-center justify-center gap-[5px] rounded-[25px] bg-app-card text-[15px] leading-[1.3] text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
    type="button"
  >
    <AssetIcon className="size-[18px] shrink-0" src={tagPlusIcon} />
    Создать метку
  </button>
  ```
  без `onClick`;
- `SearchField` (`ariaLabel="Поиск меток"`) только при `items.length > 0`;
- начальная загрузка (`isLabelsLoading && items.length === 0`) — `p` с «Загружаем метки…»;
- начальная ошибка (`isLabelsError && items.length === 0`) — блок с «Не удалось загрузить метки» и кнопкой «Повторить» (`onRetryLabels`);
- карточка при `items.length > 0`:
  ```tsx
  <div
    aria-label="Метки"
    className="flex flex-col gap-[10px] rounded-[25px] bg-app-card px-[15px] py-[15px]"
    role="group"
  >
  ```
  - если `hasNoMatches` — `<p>Ничего не найдено</p>` вместо строк;
  - строки `filteredItems.map((label, index) => ...)`, `key={label.id}`;
  - `button type="button" role="checkbox" aria-checked={isSelected}` с классами `flex h-[47px] w-full items-center gap-[15px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent`;
  - индикатор `span aria-hidden` `size-5 rounded-full border`; выбран — `border-app-accent` и внутренний `span size-[15px] rounded-full bg-app-accent`; не выбран — `border-app-text-secondary/55`;
  - контент `span className={cn("flex h-full min-w-0 flex-1 items-center gap-[5px]", !isLast && "border-b border-app-stroke")}`;
  - внутри `AssetIcon size-[18px]` с `src={tagIcon}` в `span` со `style={{ color: label.color.hex }}` и текст `span truncate text-[15px] leading-[1.3]` с тем же цветом;
- под карточкой при `isLabelsLoading && items.length > 0` — «Загружаем метки…»;
- под карточкой при `isLabelsError && items.length > 0` — «Не удалось загрузить метки» и «Повторить»;
- пояснение под списком/кнопкой — текст из Global Constraints;
- `filterLabels(labels, query)` — `.filter((label) => matchesSearchQuery(label.name, query))`;
- `uniqueLabels` — дедупликация по `id`;
- `hasNoMatches = query.trim().length > 0 && items.length > 0 && filteredItems.length === 0`.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run app/components/tasks/labels`
Expected: PASS.

---

### Task 3: Маршрут, RouteSkeleton и вход из деталей

**Files:**
- Create: `app/routes/task-labels.tsx`
- Modify: `app/routes.ts`
- Modify: `app/routes/task-detail.tsx`
- Modify: `app/components/tasks/detail/task-detail-card.tsx`
- Modify: `app/components/tasks/detail/task-detail-view.tsx`
- Modify: `app/components/layout/route-skeleton.tsx`
- Test: `app/routes/task-labels.test.ts`
- Test: `app/routes/task-detail.test.ts`
- Test: `app/components/tasks/detail/task-detail-card.test.ts`
- Test: `app/components/tasks/detail/task-detail-view.test.ts`
- Test: `app/components/layout/route-skeleton.test.ts`

**Interfaces:**
- Produces:
  - `default export function TaskLabels(): ReactElement`
  - `export function meta(): { title: string }[]`
  - `TaskDetailCardProps.onLabelsClick?: () => void`
  - `TaskDetailViewProps.onLabelsClick?: () => void`
- Consumes: `useTaskDetail`, `useUpdateTaskLabels`, `labelsQueryOptions`, `TaskLabelsView`, `TaskLabelsSkeleton`, `TaskDetailError`, `useTelegramBackButton`, `shouldGoBack`, `useBottomNavigation`, `CONTENT_BOTTOM_PADDING`; `TaskLabelsUpdateInput` из Task 1.

- [ ] **Step 1: Написать падающие тесты маршрута и интеграции**

`app/routes/task-labels.test.ts` — по образцу `task-project.test.ts`:

```ts
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
        label({ id: item.id, name: item.name, color: {
          id: index + 1,
          slug: "red",
          name: "Красный",
          hex: "#DC2626",
        } }),
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
```

Интеграционные кейсы:
- `task-detail-card.test.ts`: обновить ожидание `Теги` → `Метки`; без
  `onLabelsClick` строка не кнопка; с `onLabelsClick` есть
  `aria-label="Изменить метки"` и `<button>`.
- `task-detail-view.test.ts`: добавить
  `expect(render({ onLabelsClick: () => {} })).toContain('aria-label="Изменить метки"')`.
- `task-detail.test.ts`: добавить `onLabelsClick?: () => void` в
  `TaskDetailViewState`; кейс
  `routeState.viewProps?.onLabelsClick?.()` →
  `navigate("/tasks/42/labels")`.
- `route-skeleton.test.ts`: mock `TaskLabelsSkeleton` →
  `LABELS_SKELETON`; `renderAt("/tasks/42/labels")` содержит его и не
  содержит `DETAIL_SKELETON`; повторить с trailing slash.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/routes/task-labels.test.ts app/routes/task-detail.test.ts app/components/tasks/labels app/components/tasks/detail app/components/layout/route-skeleton.test.ts`
Expected: FAIL — route и обработчики отсутствуют.

- [ ] **Step 3: Реализовать route**

`app/routes/task-labels.tsx`:
```tsx
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { TaskDetailError } from "~/components/tasks/detail/task-detail-error";
import { TaskLabelsSkeleton } from "~/components/tasks/labels/task-labels-skeleton";
import { TaskLabelsView } from "~/components/tasks/labels/task-labels-view";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import { useTaskDetail } from "~/hooks/use-task-detail";
import { useTelegramBackButton } from "~/hooks/use-telegram-back-button";
import { useUpdateTaskLabels } from "~/hooks/use-update-task-labels";
import { ApiError } from "~/lib/api/errors";
import { shouldGoBack } from "~/lib/errors/navigation";
import { labelsQueryOptions } from "~/lib/labels/labels-query";
import { CONTENT_BOTTOM_PADDING } from "~/lib/layout";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/task-labels";

const MAX_TASK_LABELS = 100;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Метки — Milly" },
    { name: "description", content: "Изменение меток задачи в Milly" },
  ];
}

export default function TaskLabels() {
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const labelsQuery = useQuery({
    ...labelsQueryOptions,
    enabled: isValidId,
  });
  const mutation = useUpdateTaskLabels(taskId);
  useTelegramBackButton(handleBack);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate(isValidId ? `/tasks/${taskId}` : "/tasks");
  }

  function handleToggle(labelId: number) {
    const task = taskQuery.data;

    if (!task) return;

    const selectedIds = new Set(task.labels.map((label) => label.id));
    const isSelected = selectedIds.has(labelId);

    if (!isSelected && selectedIds.size >= MAX_TASK_LABELS) {
      return;
    }

    if (isSelected) {
      selectedIds.delete(labelId);
    } else {
      selectedIds.add(labelId);
    }

    const nextLabels = (labelsQuery.data ?? [])
      .filter((label) => selectedIds.has(label.id))
      .map((label) => ({ id: label.id, name: label.name }));

    haptics.selection();
    mutation.mutate({
      labelIds: nextLabels.map((label) => label.id),
      labels: nextLabels,
    });
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
    content = <TaskLabelsSkeleton />;
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
      <TaskLabelsView
        isLabelsError={labelsQuery.isError}
        isLabelsLoading={labelsQuery.isPending}
        labels={labelsQuery.data ?? []}
        onRetryLabels={() => void labelsQuery.refetch()}
        onToggle={handleToggle}
        selectedIds={taskQuery.data.labels.map((label) => label.id)}
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

- [ ] **Step 4: Подключить маршрут, строку «Метки» и RouteSkeleton**

- `app/routes.ts`: добавить
  `route("tasks/:id/labels", "routes/task-labels.tsx")` после project.
- `task-detail-card.tsx`:
  - добавить в пропсы `onLabelsClick?: () => void`;
  - строку «Теги» заменить на «Метки», передать
    `ariaLabel="Изменить метки"` и `onClick={onLabelsClick}`;
  - остальные строки и значение меток не менять.
- `task-detail-view.tsx`: добавить `onLabelsClick?: () => void` и
  передать в `TaskDetailCard`.
- `task-detail.tsx`: добавить
  ```ts
  function handleLabelsClick() {
    if (!task) return;

    haptics.selection();
    void navigate(`/tasks/${task.id}/labels`);
  }
  ```
  и передать `onLabelsClick={handleLabelsClick}`.
- `route-skeleton.tsx`:
  ```ts
  const isTaskLabels = /^\/tasks\/[^/]+\/labels\/?$/.test(pathname);
  ```
  и в цепочке `isSearch ? ... : isTaskLabels ? <TaskLabelsSkeleton /> :
  isTaskProject ? ... : isTaskPriority ? ... : isTaskReminders ? ... :
  isTaskDetail ? ... : ...`.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run app/routes/task-labels.test.ts app/routes/task-detail.test.ts app/components/tasks/labels app/components/tasks/detail app/components/layout/route-skeleton.test.ts`
Expected: PASS.

---

### Task 4: Документация и финальная проверка

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/agents/features/task-labels.md`
- Modify: `docs/agents/structure.md`
- Modify: `docs/agents/features/task-detail.md`
- Modify: `docs/agents/ui.md`
- Modify: `docs/agents/qa.md`
- Modify: `docs/specs/2026-11-08-task-detail/spec.md`
- Create: `docs/specs/2026-11-09-task-labels/spec.md` (создан)
- Create: `docs/specs/2026-11-09-task-labels/plan.md` (этот файл)

- [ ] **Step 1: Обновить `AGENTS.md`**

- В таблицу «Тема → файл» добавить строку про экран выбора меток
  (`docs/agents/features/task-labels.md`).
- В «Быстрая карта» добавить папку `app/components/tasks/labels/`, хук
  `app/hooks/use-update-task-labels.ts`, маршрут `/tasks/:id/labels`.
- В инварианты добавить: каждое нажатие на метку сразу отправляет PATCH
  `{ label_ids }` (полная замена, `[]` — очистка), остаётся на странице,
  оптимистично обновляет кэш; мутации сериализуются через
  `scope: "task-labels"`; ошибка — toast, при `404` дополнительно
  инвалидируются детали и `["labels"]`; лимит 100; строка «Метки» на
  деталях открывает страницу; кнопка «Создать метку» пока ничего не
  делает.
- В «Проверка перед завершением» сослаться на QA-раздел.

- [ ] **Step 2: Обновить `docs/agents/structure.md`**

Добавить:
- `tasks/labels/` — экран «Выбор меток задачи»;
- `use-update-task-labels.ts` — PATCH меток, оптимистичный кэш, scope;
- `routes/task-labels.tsx` — маршрут `/tasks/:id/labels`;
- в `task-detail-cache.ts` — оптимистичные метки;
- в `task-detail.ts` — без изменений (сводка меток уже там).

- [ ] **Step 3: Создать `docs/agents/features/task-labels.md`**

Кратко описать:
- маршрут и открытие из строки «Метки»;
- заголовок, подзаголовок, кнопку-заглушку «Создать метку», поиск,
  карточку меток и пояснение;
- метки из `GET /labels` в порядке backend, цвет `label.color.hex`;
- автосохранение каждого нажатия: полный `label_ids`, `[]` для очистки,
  `scope: "task-labels"`, лимит 100, отсутствие кнопки сохранения;
- оптимистичный кэш и возврат;
- ошибки: toast для любого статуса, при `404` дополнительно
  инвалидируются детали и `["labels"]`;
- загрузка/ошибка/пустой список и «Повторить»; поиск только при
  наличии меток;
- проверки в `docs/agents/qa.md`.

- [ ] **Step 4: Обновить `docs/agents/features/task-detail.md`**

- В строке про интерактивность карточки добавить «Метки» к «Срок»,
  «Напоминание», «Приоритет» и «Проект».
- Заменить упоминание строки «Теги» на «Метки».
- Добавить, что «Метки» открывает `/tasks/:id/labels`; значение
  остаётся сводкой «первая метка + N» с цветной иконкой.

- [ ] **Step 5: Обновить `docs/agents/ui.md`**

- Уточнить, что `tag-raw.svg` `18×18` используется в строках меток
  страницы `/tasks/:id/labels` с цветом `label.color.hex`.
- Зафиксировать кнопку «Создать метку»: `tag-plus.svg` `18×18`,
  фон `app-card`, радиус `25px`, высота `50px`, текст `app-accent`.

- [ ] **Step 6: Обновить `docs/agents/qa.md`**

Добавить раздел `/tasks/:id/labels`:
- открытие из строки «Метки»;
- заголовок, подзаголовок, кнопка создания (ничего не делает), поиск,
  карточка, пояснение;
- выбор нескольких меток: каждый tap сохраняется, страница не
  закрывается, значение на деталях обновляется;
- снятие последней метки отправляет `[]`;
- быстрые нажатия и итоговый набор;
- лимит 100;
- ошибка PATCH — откат, toast и error haptic; `404` — дополнительная
  инвалидация деталей и меток;
- метки loading/error/empty и «Повторить»;
- light/dark, 320/412/448 px, safe-area, Telegram BackButton;
- SSR без данных задачи и меток, meta «Метки — Milly».

- [ ] **Step 7: Добавить blockquote в спецификацию деталей**

В `docs/specs/2026-11-08-task-detail/spec.md`:
```md
> Примечание (2026-11-09): строка «Теги» переименована в «Метки» и
> теперь открывает `/tasks/:id/labels` (см.
> `docs/specs/2026-11-09-task-labels/spec.md`). Пункт «Редактирование …
> меток» из «Вне scope» больше не действует.
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
curl -s http://localhost:3000/tasks/1/labels | grep -E "Выбор меток|Создать метку|Загружаем метки" || true
```
Expected: SSR-ответ не содержит защищённых данных задачи и меток;
допустим только скелетон. Остановить сервер после проверки.

---

## Self-Review

- **Spec coverage:** FR-1 → Task 3; FR-2 → Task 1; FR-3–FR-5 → Task 2;
  FR-6 → Tasks 1–3; FR-7 → Tasks 2–3; FR-8 → Task 3; FR-9 → Tasks 1–3;
  FR-10 → Tasks 1–4. Все пункты покрыты.
- **Step scan:** каждый шаг содержит конкретный файл, сигнатуру,
  тестовые assertions и команду; открытых «handle edge cases» нет.
- **Type consistency:** `TaskLabelsUpdateInput`,
  `createUpdateTaskLabelsMutationOptions`, `applyTaskDetailLabels`,
  `TaskLabelsViewProps`, `TaskLabelsSkeleton` используются одинаково во
  всех задачах; `label_ids` — `number[]`, `labels` — `LabelRef[]`,
  `selectedIds` — `readonly number[]`.
- **Review Focus:** рискованные классы покрыты тестами Task 1
  (оптимистичный кэш, откат, toast, `404`, явный `[]`, scope) и Task 3
  (переключение, снятие последней метки, лимит 100, отсутствие
  перехода, loading/error меток, невалидный id, возврат).
- **Search:** фильтрация проверяется через `filterLabels`; отображение
  «Ничего не найдено» следует из пустого результата `filterLabels` и
  проверяется в ручном QA, потому что query хранится в локальном
  состоянии view и не задаётся через SSR-пропсы.
