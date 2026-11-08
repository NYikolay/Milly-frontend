# Экран детальной информации о задаче — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить read-only экран `/tasks/:id` с переходом из обоих списков задач, оптимистичным завершением/возвратом, подтверждающей модалкой удаления и возвратом назад по истории.

**Architecture:** Детали — отдельный route под `_app`, данные — React Query после `AuthGate`. Чистые помощники форматирования и кэш детального запроса живут в `app/lib/tasks/`; мутации — в `app/hooks/use-task-detail.ts`. Карточка свойств и модалка удаления — отдельные презентационные компоненты; `Modal` и `Skeleton` переиспользуются.

**Tech Stack:** React 19, React Router 8 (SSR), TypeScript 5.9 strict, Tailwind CSS 4, TanStack Query 5, Vitest, motion/react.

**Spec:** `docs/specs/2026-11-08-task-detail/spec.md`

## Global Constraints

- Только токены `app-*`; `dark:` для цветов не использовать, light/dark — через `[data-app-theme]`.
- Новые зависимости и пакеты не добавлять.
- Backend, `docs/api.md`, `root.tsx` и глобальные провайдеры не менять.
- TypeScript strict: без `any`, `import type` для типов.
- Файлы — `kebab-case`, компоненты — `PascalCase`, импорты через `~/*`.
- Тесты — Vitest, `app/**/*.test.ts`; линтера нет, `npm run lint` не добавлять.
- SSR включён; защищённые данные задачи, проектов и меток не попадают в SSR-ответ.
- Редактирование задачи не реализуется; шевроны строк карточки декоративные.
- Переиспользовать `Modal`, `Skeleton`, `AssetIcon`, `BottomNavigationDock`; новых примитивов не вводить.
- Детальный ключ кэша обязан начинаться с `["tasks"]`, чтобы существующие инвалидации работали.
- Не коммитить изменения без явного разрешения пользователя.
- Не начинать реализацию до утверждения spec и этого плана.

## Review Focus

- **Возврат после удаления:** успех и `404` очищают кэш и вызывают `navigate(-1)` при наличии истории, иначе `/tasks`; ошибка не уводит со экрана. Тесты `use-task-detail.test.ts`, `task-detail.test.ts`; ручная проверка.
- **Строка vs чекбокс:** кнопка открытия деталей не вложена в чекбокс и не открывает детали при завершении; без `onOpen` разметка остаётся прежней. Тесты `today-task-row.test.ts`, `today-tasks-view.test.ts`, `search-results.test.ts`; ручная проверка.
- **Завершение:** оптимистичное обновление детального кэша, откат при ошибке, смена текста «Отметить выполненной» ↔ «Сделать активной», инвалидация `["tasks"]`/`["projects"]`. Тесты `task-detail-cache.test.ts`, `use-task-detail.test.ts`, `task-detail-view.test.ts`.
- **Каскадное предупреждение:** модалка предупреждает о будущих задачах серии только при `series_id !== null && completed_at === null && due_at > now`; завершённая/просроченная задача серии удаляется без предупреждения. Тесты `delete-task-modal.test.ts`, `task-detail.test.ts`.
- **SSR и bootstrap:** `/tasks/:id` в SSR показывает `TaskDetailSkeleton` без данных; `RouteSkeleton` отличает детальный путь от `/tasks/search`. Тесты `route-skeleton.test.ts`, `task-detail.test.ts`; `curl` проверка.

---

## File Structure

**Create:**
- `app/lib/tasks/task-detail.ts` + `task-detail.test.ts`
- `app/lib/tasks/task-detail-cache.ts` + `task-detail-cache.test.ts`
- `app/hooks/use-task-detail.ts` + `use-task-detail.test.ts`
- `app/lib/telegram/back-button.ts` + `back-button.test.ts`
- `app/hooks/use-telegram-back-button.ts`
- `app/components/tasks/detail/task-detail-card.tsx` + `.test.ts`
- `app/components/tasks/detail/task-detail-view.tsx` + `.test.ts`
- `app/components/tasks/detail/task-detail-error.tsx` + `.test.ts`
- `app/components/tasks/detail/task-detail-skeleton.tsx` + `.test.ts`
- `app/components/tasks/detail/delete-task-modal.tsx` + `.test.ts`
- `app/routes/task-detail.tsx` + `task-detail.test.ts`
- `app/assets/icons/bell.svg`

**Modify:**
- `app/routes.ts`
- `app/lib/tasks/tasks-api.ts` + `tasks-api.test.ts`
- `app/lib/tasks/date-time.ts` + `date-time.test.ts`
- `app/components/tasks/today/today-task-row.tsx` + `.test.ts`
- `app/components/tasks/today/today-task-group.tsx`
- `app/components/tasks/today/today-tasks-view.tsx` + `.test.ts`
- `app/components/tasks/search/search-results.tsx` + `.test.ts`
- `app/routes/tasks.tsx` + `tasks.test.ts`
- `app/routes/task-search.tsx` + `task-search.test.ts`
- `app/components/layout/route-skeleton.tsx` + `.test.ts`
- `AGENTS.md`
- `docs/specs/2026-11-06-today-tasks/spec.md`
- `docs/specs/2026-11-07-task-search/spec.md`

---

### Task 1: API-обёртки деталей и удаления

**Files:**
- Modify: `app/lib/tasks/tasks-api.ts`
- Test: `app/lib/tasks/tasks-api.test.ts`

**Interfaces:**
- Consumes: `apiRequest`, `TaskResponse`.
- Produces:
  - `fetchTask(taskId: number, signal?: AbortSignal): Promise<TaskResponse>`
  - `deleteTask(taskId: number, signal?: AbortSignal): Promise<void>`

- [ ] **Step 1: Добавить падающие тесты API**

Дополнить импорт функциями `deleteTask` и `fetchTask` и добавить в конец
`app/lib/tasks/tasks-api.test.ts`:

```ts
describe("task detail API", () => {
  it("fetches a task with GET /tasks/{id}", async () => {
    apiRequestMock.mockResolvedValue({ id: 100 });
    await expect(fetchTask(100)).resolves.toEqual({ id: 100 });
    expect(apiRequestMock).toHaveBeenCalledWith("/tasks/100", {
      signal: undefined,
    });
  });

  it("deletes a task with DELETE /tasks/{id}", async () => {
    apiRequestMock.mockResolvedValue(undefined);
    await expect(deleteTask(100)).resolves.toBeUndefined();
    expect(apiRequestMock).toHaveBeenCalledWith("/tasks/100", {
      method: "DELETE",
      signal: undefined,
    });
  });
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/tasks/tasks-api.test.ts`
Expected: FAIL — `fetchTask`/`deleteTask` не экспортированы.

- [ ] **Step 3: Реализовать обёртки**

Добавить в `app/lib/tasks/tasks-api.ts` после `fetchTasks`:

```ts
export function fetchTask(
  taskId: number,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${taskId}`, { signal });
}

export function deleteTask(
  taskId: number,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest<void>(`/tasks/${taskId}`, {
    method: "DELETE",
    signal,
  });
}
```

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/tasks/tasks-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Не коммитить**

---

### Task 2: Форматирование локальных даты и времени

**Files:**
- Modify: `app/lib/tasks/date-time.ts`
- Test: `app/lib/tasks/date-time.test.ts`

**Interfaces:**
- Consumes: `getZonedNow`, `formatDate`, `formatNumericDate`, `formatZonedTime`.
- Produces:
  - `formatZonedDate(iso: string, timeZone: string): string` — `YYYY-MM-DD` в зоне.
  - `formatZonedDateTime(iso: string, timeZone: string): string` — `DD.MM.YYYY, HH:mm` в зоне.

- [ ] **Step 1: Добавить падающие тесты**

Добавить в `app/lib/tasks/date-time.test.ts`:

```ts
describe("zoned date formatting", () => {
  it("formats a zoned calendar date across midnight", () => {
    expect(
      formatZonedDate("2026-11-06T21:30:00.000Z", "Europe/Moscow"),
    ).toBe("2026-11-07");
  });

  it("formats a zoned date and time", () => {
    expect(
      formatZonedDateTime("2026-11-06T07:00:00.000Z", "Europe/Moscow"),
    ).toBe("06.11.2026, 10:00");
  });
});
```

Импортировать `formatZonedDate`, `formatZonedDateTime`.

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/tasks/date-time.test.ts`
Expected: FAIL — функции не экспортированы.

- [ ] **Step 3: Реализовать**

Добавить после `formatZonedTime`:

```ts
export function formatZonedDate(iso: string, timeZone: string): string {
  const { year, month, day } = getZonedNow(new Date(iso), timeZone);

  return formatDate(year, month, day);
}

export function formatZonedDateTime(
  iso: string,
  timeZone: string,
): string {
  return `${formatNumericDate(
    formatZonedDate(iso, timeZone),
  )}, ${formatZonedTime(iso, timeZone)}`;
}
```

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/tasks/date-time.test.ts`
Expected: PASS.

- [ ] **Step 5: Не коммитить**

---

### Task 3: Чистые помощники деталей

**Files:**
- Create: `app/lib/tasks/task-detail.ts`
- Test: `app/lib/tasks/task-detail.test.ts`

**Interfaces:**
- Consumes: `formatDueChip`, `formatZonedDate`, `formatZonedTime`, `formatZonedDateTime`, `PRIORITY_OPTIONS`, `LabelRef`, `Priority`, `ReminderResponse`, `TaskResponse`, `LabelResponse`.
- Produces:
  - `formatTaskDueValue(task: Pick<TaskResponse, "due_at">, timeZone: string, now: Date): string`
  - `formatTaskCreatedAt(createdAt: string, timeZone: string): string`
  - `formatTaskReminderSummary(task: Pick<TaskResponse, "reminders_enabled" | "reminders">): string`
  - `formatTaskLabelsSummary(labels: readonly LabelRef[]): string`
  - `findTaskLabelColor(labels: readonly LabelRef[], labelColors: readonly LabelResponse[]): string | null`
  - `formatTaskPriority(priority: Priority): string`

- [ ] **Step 1: Написать падающие тесты**

Создать `app/lib/tasks/task-detail.test.ts` с фабриками `task()`,
`reminder()`, `label()` и тестами:

```ts
describe("formatTaskDueValue", () => {
  it("formats today, tomorrow and another day", () => {
    expect(
      formatTaskDueValue({ due_at: "2026-11-08T13:00:00.000Z" }, "Europe/Moscow", NOW),
    ).toBe("Сегодня, 16:00");
    expect(
      formatTaskDueValue({ due_at: "2026-11-09T13:00:00.000Z" }, "Europe/Moscow", NOW),
    ).toBe("Завтра, 16:00");
    expect(
      formatTaskDueValue({ due_at: "2026-11-10T13:00:00.000Z" }, "Europe/Moscow", NOW),
    ).toBe("На 10.11.2026, 16:00");
  });
});
// NOW = new Date("2026-11-08T10:00:00.000Z")
```

```ts
describe("formatTaskCreatedAt", () => {
  it("formats creation time in the user's time zone", () => {
    expect(
      formatTaskCreatedAt("2026-11-05T07:00:00.000Z", "Europe/Moscow"),
    ).toBe("05.11.2026, 10:00");
  });
});
```

```ts
describe("formatTaskReminderSummary", () => {
  it("returns Нет when disabled or empty", () => {
    expect(formatTaskReminderSummary(task({ reminders_enabled: false }))).toBe("Нет");
    expect(formatTaskReminderSummary(task({ reminders: [] }))).toBe("Нет");
  });

  it("formats before_due offsets", () => {
    expect(formatTaskReminderSummary(task({ reminders: [reminder()] }))).toBe(
      "За 30 минут",
    );
    expect(
      formatTaskReminderSummary(
        task({ reminders: [reminder({ offset_minutes: 60 })] }),
      ),
    ).toBe("За 1 час");
    expect(
      formatTaskReminderSummary(
        task({ reminders: [reminder({ offset_minutes: 2880 })] }),
      ),
    ).toBe("За 2 дня");
    expect(
      formatTaskReminderSummary(
        task({ reminders: [reminder({ offset_minutes: 0 })] }),
      ),
    ).toBe("В момент срока");
  });

  it("formats scheduled reminders", () => {
    expect(
      formatTaskReminderSummary(
        task({
          reminders: [
            reminder({
              kind: "scheduled",
              offset_minutes: null,
              interval_days: 3,
              time_of_day: "09:00:00",
            }),
          ],
        }),
      ),
    ).toBe("Каждые 3 дня в 09:00");
  });

  it("appends the count of additional rules", () => {
    expect(
      formatTaskReminderSummary(
        task({
          reminders: [
            reminder(),
            reminder({
              id: 2,
              kind: "scheduled",
              offset_minutes: null,
              interval_days: 1,
              time_of_day: "09:00:00",
            }),
          ],
        }),
      ),
    ).toBe("За 30 минут + 1");
  });
});
```

```ts
describe("labels and priority helpers", () => {
  it("summarizes labels", () => {
    expect(formatTaskLabelsSummary([])).toBe("Нет");
    expect(formatTaskLabelsSummary([{ id: 3, name: "Личное" }])).toBe("Личное");
    expect(
      formatTaskLabelsSummary([
        { id: 3, name: "Личное" },
        { id: 4, name: "Работа" },
        { id: 5, name: "Дом" },
        { id: 6, name: "Спорт" },
      ]),
    ).toBe("Личное + 3");
  });

  it("finds the first label color", () => {
    expect(
      findTaskLabelColor([{ id: 3, name: "Личное" }], [label()]),
    ).toBe("#40DD82");
    expect(findTaskLabelColor([{ id: 99, name: "Нет" }], [label()])).toBeNull();
  });

  it("formats all priority labels", () => {
    expect(formatTaskPriority("urgent_important")).toBe("Срочные и важные");
    expect(formatTaskPriority("neither")).toBe("Не срочные и не важные");
  });
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/tasks/task-detail.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `app/lib/tasks/task-detail.ts`**

Ключевые функции:

```ts
function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function formatBeforeDue(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "В момент срока";
  if (offsetMinutes < 60) {
    return `За ${offsetMinutes} ${pluralizeRu(offsetMinutes, "минуту", "минуты", "минут")}`;
  }
  if (offsetMinutes < 1440 && offsetMinutes % 60 === 0) {
    const hours = offsetMinutes / 60;
    return `За ${hours} ${pluralizeRu(hours, "час", "часа", "часов")}`;
  }
  if (offsetMinutes >= 1440 && offsetMinutes % 1440 === 0) {
    const days = offsetMinutes / 1440;
    return `За ${days} ${pluralizeRu(days, "день", "дня", "дней")}`;
  }
  return `За ${offsetMinutes} ${pluralizeRu(offsetMinutes, "минуту", "минуты", "минут")}`;
}

function formatScheduled(rule: ReminderResponse): string {
  const time = rule.time_of_day?.slice(0, 5) ?? "";
  if (rule.interval_days === 1) return `Каждый день в ${time}`;
  if (rule.interval_days !== null && rule.interval_days >= 2) {
    return `Каждые ${rule.interval_days} ${pluralizeRu(rule.interval_days, "день", "дня", "дней")} в ${time}`;
  }
  return "По расписанию";
}

export function formatTaskReminderSummary(
  task: Pick<TaskResponse, "reminders_enabled" | "reminders">,
): string {
  if (!task.reminders_enabled) return "Нет";
  const enabled = task.reminders.filter((rule) => rule.enabled);
  if (enabled.length === 0) return "Нет";
  const [first, ...rest] = enabled;
  const summary =
    first.kind === "before_due"
      ? first.offset_minutes !== null
        ? formatBeforeDue(first.offset_minutes)
        : "До срока"
      : formatScheduled(first);
  return rest.length > 0 ? `${summary} + ${rest.length}` : summary;
}
```

`formatTaskDueValue` использует `formatDueChip(formatZonedDate(...),
formatZonedTime(...), timeZone, now)`. `formatTaskCreatedAt` возвращает
`formatZonedDateTime(createdAt, timeZone)`. `formatTaskLabelsSummary`:
`labels.length === 0 ? "Нет" : rest.length > 0 ? `${first.name} + ${rest.length}`
: first.name`. `findTaskLabelColor`: первый label, поиск по `id`, вернуть
`color.hex` или `null`. `formatTaskPriority`: поиск в `PRIORITY_OPTIONS`.

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/tasks/task-detail.test.ts`
Expected: PASS.

- [ ] **Step 5: Не коммитить**

---

### Task 4: Кэш детального запроса

**Files:**
- Create: `app/lib/tasks/task-detail-cache.ts`
- Test: `app/lib/tasks/task-detail-cache.test.ts`

**Interfaces:**
- Produces:
  - `taskDetailQueryKey(taskId: number): readonly ["tasks", "detail", number]`
  - `applyTaskDetailCompletion(task: TaskResponse | undefined, completedAt: string | null): TaskResponse | undefined`

- [ ] **Step 1: Написать падающие тесты**

```ts
describe("taskDetailQueryKey", () => {
  it("keeps the detail key under the tasks prefix", () => {
    expect(taskDetailQueryKey(42)).toEqual(["tasks", "detail", 42]);
  });
});

describe("applyTaskDetailCompletion", () => {
  it("completes a task optimistically", () => {
    const next = applyTaskDetailCompletion(task(), "2026-11-08T10:00:00.000Z");
    expect(next?.completed_at).toBe("2026-11-08T10:00:00.000Z");
    expect(next?.updated_at).toBe("2026-11-08T10:00:00.000Z");
  });

  it("uncompletes a task and preserves updated_at", () => {
    const next = applyTaskDetailCompletion(
      task({ completed_at: "2026-11-08T10:00:00.000Z", updated_at: "2026-11-08T10:00:00.000Z" }),
      null,
    );
    expect(next?.completed_at).toBeNull();
    expect(next?.updated_at).toBe("2026-11-08T10:00:00.000Z");
  });

  it("returns the same task for a no-op transition", () => {
    const current = task();
    expect(applyTaskDetailCompletion(current, null)).toBe(current);
  });

  it("returns undefined for missing data", () => {
    expect(applyTaskDetailCompletion(undefined, null)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/tasks/task-detail-cache.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

```ts
import type { TaskResponse } from "./types";

export function taskDetailQueryKey(taskId: number) {
  return ["tasks", "detail", taskId] as const;
}

export function applyTaskDetailCompletion(
  task: TaskResponse | undefined,
  completedAt: string | null,
): TaskResponse | undefined {
  if (!task) return task;
  const wasCompleted = task.completed_at !== null;
  const isCompleted = completedAt !== null;
  if (wasCompleted === isCompleted) return task;
  return {
    ...task,
    completed_at: completedAt,
    updated_at: completedAt ?? task.updated_at,
  };
}
```

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/tasks/task-detail-cache.test.ts`
Expected: PASS.

- [ ] **Step 5: Не коммитить**

### Task 5: Хуки деталей, завершения и удаления

**Files:**
- Create: `app/hooks/use-task-detail.ts`
- Test: `app/hooks/use-task-detail.test.ts`

**Interfaces:**
- Consumes: `fetchTask`, `completeTask`, `uncompleteTask`, `deleteTask`; `taskDetailQueryKey`, `applyTaskDetailCompletion`; `ApiError`; `QueryClient`, `TelegramHaptics`.
- Produces:
  - `useTaskDetail(taskId: number, enabled: boolean)`
  - `createToggleTaskDetailMutationOptions({ queryClient, haptics, taskId })`
  - `useToggleTaskDetailCompletion(taskId: number)`
  - `createDeleteTaskMutationOptions({ queryClient, haptics, taskId, onDeleted })`
  - `useDeleteTask(taskId: number, onDeleted: () => void)`

- [ ] **Step 1: Написать падающие тесты опций мутаций**

Создать `app/hooks/use-task-detail.test.ts` по образцу
`app/hooks/use-today-tasks.test.ts`. Обязательные тесты:

```ts
it("snapshots and optimistically completes the detail task", async () => {
  const current = task();
  queryClient.setQueryData(queryKey, current);
  const options = createToggleTaskDetailMutationOptions({
    queryClient, haptics, taskId: TASK_ID,
  });
  const context = await options.onMutate({
    taskId: TASK_ID, nextCompleted: true,
  });
  expect(context.previous).toBe(current);
  expect(haptics.selection).toHaveBeenCalledTimes(1);
  expect(queryClient.getQueryData<TaskResponse>(queryKey)?.completed_at)
    .toEqual(expect.any(String));
});

it("restores the snapshot and reports an error", async () => {
  const current = task();
  queryClient.setQueryData(queryKey, current);
  const options = createToggleTaskDetailMutationOptions({
    queryClient, haptics, taskId: TASK_ID,
  });
  const context = await options.onMutate({
    taskId: TASK_ID, nextCompleted: true,
  });
  options.onError(new Error("failed"), { taskId: TASK_ID, nextCompleted: true }, context);
  expect(queryClient.getQueryData(queryKey)).toBe(current);
  expect(haptics.notification).toHaveBeenCalledWith("error");
});

it("invalidates tasks and projects after settling", () => {
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
    .mockResolvedValue(undefined);
  const options = createToggleTaskDetailMutationOptions({
    queryClient, haptics, taskId: TASK_ID,
  });
  options.onSettled();
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["projects"] });
});

it("removes the detail query and reports success on delete", () => {
  const onDeleted = vi.fn();
  queryClient.setQueryData(queryKey, task());
  const options = createDeleteTaskMutationOptions({
    queryClient, haptics, taskId: TASK_ID, onDeleted,
  });
  const removeQueries = vi.spyOn(queryClient, "removeQueries");
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
    .mockResolvedValue(undefined);
  options.onSuccess();
  expect(removeQueries).toHaveBeenCalledWith({ queryKey });
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
  expect(haptics.notification).toHaveBeenCalledWith("success");
  expect(onDeleted).toHaveBeenCalledTimes(1);
});

it("treats 404 as a successful deletion", () => {
  const onDeleted = vi.fn();
  const options = createDeleteTaskMutationOptions({
    queryClient, haptics, taskId: TASK_ID, onDeleted,
  });
  options.onError(new ApiError("Not found", {
    status: 404, code: "not_found", requestId: "test",
  }));
  expect(haptics.notification).toHaveBeenCalledWith("success");
  expect(onDeleted).toHaveBeenCalledTimes(1);
});

it("keeps the detail query on other delete failures", () => {
  const onDeleted = vi.fn();
  queryClient.setQueryData(queryKey, task());
  const options = createDeleteTaskMutationOptions({
    queryClient, haptics, taskId: TASK_ID, onDeleted,
  });
  const removeQueries = vi.spyOn(queryClient, "removeQueries");
  options.onError(new ApiError("Server error", {
    status: 500, code: "internal_error", requestId: "test",
  }));
  expect(removeQueries).not.toHaveBeenCalled();
  expect(haptics.notification).toHaveBeenCalledWith("error");
  expect(onDeleted).not.toHaveBeenCalled();
});
```

Фабрики `task()` и `haptics` — как в `use-today-tasks.test.ts`;
`queryKey = taskDetailQueryKey(TASK_ID)`; `TASK_ID = 1`;
`beforeEach` создаёт `new QueryClient()` и haptics-моки.

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/hooks/use-task-detail.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `app/hooks/use-task-detail.ts`**

```ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { ApiError } from "~/lib/api/errors";
import {
  applyTaskDetailCompletion,
  taskDetailQueryKey,
} from "~/lib/tasks/task-detail-cache";
import {
  completeTask,
  deleteTask,
  fetchTask,
  uncompleteTask,
} from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export function useTaskDetail(taskId: number, enabled: boolean) {
  return useQuery({
    queryKey: taskDetailQueryKey(taskId),
    queryFn: ({ signal }) => fetchTask(taskId, signal),
    enabled,
  });
}

export interface ToggleTaskDetailVariables {
  taskId: number;
  nextCompleted: boolean;
}

export interface ToggleTaskDetailContext {
  previous: TaskResponse | undefined;
}

export interface ToggleTaskDetailMutationOptions {
  mutationFn: (variables: ToggleTaskDetailVariables) => Promise<TaskResponse>;
  onMutate: (
    variables: ToggleTaskDetailVariables,
  ) => Promise<ToggleTaskDetailContext>;
  onError: (
    error: Error,
    variables: ToggleTaskDetailVariables,
    context: ToggleTaskDetailContext | undefined,
  ) => void;
  onSuccess: (updatedTask: TaskResponse) => void;
  onSettled: () => void;
}

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

  return {
    mutationFn: ({ nextCompleted }) =>
      nextCompleted ? completeTask(taskId) : uncompleteTask(taskId),
    onMutate: async ({ nextCompleted }) => {
      haptics.selection();
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskResponse>(queryKey);
      queryClient.setQueryData<TaskResponse>(queryKey, (current) =>
        applyTaskDetailCompletion(
          current,
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
      queryClient.setQueryData<TaskResponse>(queryKey, updatedTask);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  };
}

export function useToggleTaskDetailCompletion(taskId: number) {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();
  return useMutation(
    createToggleTaskDetailMutationOptions({ queryClient, haptics, taskId }),
  );
}

export interface DeleteTaskMutationOptions {
  mutationFn: () => Promise<void>;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export function createDeleteTaskMutationOptions({
  queryClient,
  haptics,
  taskId,
  onDeleted,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
  onDeleted: () => void;
}): DeleteTaskMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  function finishDeletion() {
    queryClient.removeQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    haptics.notification("success");
    onDeleted();
  }

  return {
    mutationFn: () => deleteTask(taskId),
    onSuccess: finishDeletion,
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        finishDeletion();
        return;
      }
      haptics.notification("error");
    },
  };
}

export function useDeleteTask(taskId: number, onDeleted: () => void) {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();
  return useMutation(
    createDeleteTaskMutationOptions({
      queryClient,
      haptics,
      taskId,
      onDeleted,
    }),
  );
}
```

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/hooks/use-task-detail.test.ts`
Expected: PASS.

- [ ] **Step 5: Не коммитить**

---

### Task 6: Telegram BackButton

**Files:**
- Create: `app/lib/telegram/back-button.ts`
- Test: `app/lib/telegram/back-button.test.ts`
- Create: `app/hooks/use-telegram-back-button.ts`

**Interfaces:**
- Produces:
  - `bindTelegramBackButton(webApp: TelegramWebApp | null, onBack: () => void): () => void`
  - `useTelegramBackButton(onBack: () => void): void`

- [ ] **Step 1: Написать падающие тесты**

```ts
function createWebApp(versionAtLeast: boolean) {
  const onClick = vi.fn();
  const offClick = vi.fn();
  const show = vi.fn();
  const hide = vi.fn();
  const app = {
    isVersionAtLeast: () => versionAtLeast,
    BackButton: { isVisible: false, onClick, offClick, show, hide },
  } as unknown as TelegramWebApp;
  return { app, onClick, offClick, show, hide };
}

it("shows the native back button and cleans up", () => {
  const { app, onClick, offClick, show, hide } = createWebApp(true);
  const onBack = vi.fn();
  const cleanup = bindTelegramBackButton(app, onBack);
  expect(onClick).toHaveBeenCalledWith(onBack);
  expect(show).toHaveBeenCalledTimes(1);
  cleanup();
  expect(offClick).toHaveBeenCalledWith(onBack);
  expect(hide).toHaveBeenCalledTimes(1);
});

it("does nothing when the API is too old", () => {
  const { app, onClick, show } = createWebApp(false);
  const cleanup = bindTelegramBackButton(app, () => {});
  expect(onClick).not.toHaveBeenCalled();
  expect(show).not.toHaveBeenCalled();
  expect(() => cleanup()).not.toThrow();
});

it("does nothing without a web app", () => {
  expect(() => bindTelegramBackButton(null, () => {})()).not.toThrow();
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/telegram/back-button.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

`app/lib/telegram/back-button.ts`:

```ts
import { supportsVersion } from "./client";
import type { TelegramWebApp } from "./types";

export function bindTelegramBackButton(
  webApp: TelegramWebApp | null,
  onBack: () => void,
): () => void {
  const backButton = webApp?.BackButton;

  if (!webApp || !backButton || !supportsVersion("6.1", webApp)) {
    return () => {};
  }

  backButton.onClick(onBack);
  backButton.show();

  return () => {
    backButton.offClick(onBack);
    backButton.hide();
  };
}
```

`app/hooks/use-telegram-back-button.ts`:

```ts
import { useEffect, useRef } from "react";

import { bindTelegramBackButton } from "~/lib/telegram/back-button";
import { useTelegram } from "~/providers/telegram-provider";

export function useTelegramBackButton(onBack: () => void): void {
  const { webApp } = useTelegram();
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    return bindTelegramBackButton(webApp, () => onBackRef.current());
  }, [webApp]);
}
```

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/telegram/back-button.test.ts`
Expected: PASS.

- [ ] **Step 5: Не коммитить**

---

### Task 7: Переход в детали из строк задач

**Files:**
- Modify: `app/components/tasks/today/today-task-row.tsx`
- Modify: `app/components/tasks/today/today-task-row.test.ts`
- Modify: `app/components/tasks/today/today-task-group.tsx`
- Modify: `app/components/tasks/today/today-tasks-view.tsx`
- Modify: `app/components/tasks/today/today-tasks-view.test.ts`
- Modify: `app/components/tasks/search/search-results.tsx`
- Modify: `app/components/tasks/search/search-results.test.ts`
- Modify: `app/routes/tasks.tsx` + `tasks.test.ts`
- Modify: `app/routes/task-search.tsx` + `task-search.test.ts`

**Interfaces:**
- Produces:
  - `TodayTaskRowProps.onOpen?: (task: TaskResponse) => void`
  - `TodayTaskGroupProps.onOpenTask: (task: TaskResponse) => void`
  - `TodayTasksViewProps.onOpenTask: (task: TaskResponse) => void`
  - `SearchResultsProps.onOpenTask: (task: TaskResponse) => void`

- [ ] **Step 1: Написать падающие тесты строки**

Добавить в `today-task-row.test.ts`:

```ts
it("renders a detail button when onOpen is provided", () => {
  const html = render({ onOpen: () => {} });
  expect(html).toContain('aria-label="Открыть задачу: Задача"');
  expect(html.match(/type="button"/g)?.length).toBe(2);
});

it("keeps the row content non-interactive without onOpen", () => {
  const html = render();
  expect(html).not.toContain("Открыть задачу");
  expect(html.match(/type="button"/g)?.length).toBe(1);
});
```

В `today-tasks-view.test.ts` и `search-results.test.ts` добавить
`onOpenTask: () => {}` в дефолтные props и проверить:

```ts
const html = renderView({ tasks: [task({ id: 7, title: "Открыть меня" })] });
expect(html).toContain('aria-label="Открыть задачу: Открыть меня"');
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/components/tasks/today/today-task-row.test.ts app/components/tasks/today/today-tasks-view.test.ts app/components/tasks/search/search-results.test.ts`
Expected: FAIL — проп не поддержан.

- [ ] **Step 3: Реализовать строку и проброс**

В `today-task-row.tsx` добавить `onOpen?: (task: TaskResponse) => void`,
вынести контент в `const content = (<>…</>)` и заменить контейнер:

```tsx
{onOpen ? (
  <button
    aria-label={`Открыть задачу: ${task.title}`}
    className={cn(
      "flex min-w-0 flex-1 items-center gap-[12px] self-stretch border-app-stroke text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70",
      isLast ? "border-b-0" : "border-b",
    )}
    onClick={() => onOpen(task)}
    type="button"
  >
    {content}
  </button>
) : (
  <div
    className={cn(
      "flex min-w-0 flex-1 items-center gap-[12px] self-stretch border-app-stroke",
      isLast ? "border-b-0" : "border-b",
    )}
  >
    {content}
  </div>
)}
```

`content` — существующие title/meta/flag/chevron.
`today-task-group.tsx`: добавить `onOpenTask` и `onOpen={onOpenTask}`.
`today-tasks-view.tsx`: добавить `onOpenTask` и передать в обе группы.
`search-results.tsx`: добавить `onOpenTask` и передать в строки.

В `routes/tasks.tsx` и `routes/task-search.tsx`:

```ts
function handleOpenTask(task: TaskResponse) {
  haptics.selection();
  void navigate(`/tasks/${task.id}`);
}
```

Передать `onOpenTask={handleOpenTask}` в `TodayTasksView`/`SearchResults`.

- [ ] **Step 4: Обновить route-тесты навигации**

В `tasks.test.ts` и `task-search.test.ts` вынести `navigate` в hoisted
состояние, в моках `TodayTasksView`/`SearchResults` сохранять
`onOpenTask` и добавить:

```ts
it("navigates to the task detail from a row", () => {
  renderTasks();
  routeState.onOpenTask?.({ id: 42 });
  expect(routeState.navigate).toHaveBeenCalledWith("/tasks/42");
});
```

- [ ] **Step 5: Запустить тесты и увидеть успех**

Run: `npx vitest run app/components/tasks/today/today-task-row.test.ts app/components/tasks/today/today-tasks-view.test.ts app/components/tasks/search/search-results.test.ts app/routes/tasks.test.ts app/routes/task-search.test.ts`
Expected: PASS.

- [ ] **Step 6: Не коммитить**

---

### Task 8: Карточка свойств и иконка колокольчика

**Files:**
- Create: `app/assets/icons/bell.svg`
- Create: `app/components/tasks/detail/task-detail-card.tsx`
- Test: `app/components/tasks/detail/task-detail-card.test.ts`

**Interfaces:**
- Consumes: `TaskResponse`, `ProjectResponse`, `LabelResponse`, `formatTaskDueValue`, `formatTaskReminderSummary`, `formatTaskPriority`, `formatTaskLabelsSummary`, `findTaskLabelColor`, `AssetIcon`.
- Produces:
  - `TaskDetailCardProps { task: TaskResponse; project?: ProjectResponse; labels: readonly LabelResponse[]; timeZone: string; now: Date }`
  - `TaskDetailCard(props): ReactElement`

- [ ] **Step 1: Создать `app/assets/icons/bell.svg`**

```svg
<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.5 6.75C13.5 5.55653 13.0259 4.41193 12.182 3.56802C11.3381 2.72411 10.1935 2.25 9 2.25C7.80653 2.25 6.66193 2.72411 5.81802 3.56802C4.97411 4.41193 4.5 5.55653 4.5 6.75C4.5 12 2.25 13.5 2.25 13.5H15.75C15.75 13.5 13.5 12 13.5 6.75Z" stroke="#303033" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8.175 15.75C8.32138 16.0013 8.53061 16.2092 8.78255 16.354C9.03449 16.4988 9.3202 16.5753 9.61125 16.5753C9.9023 16.5753 10.188 16.4988 10.44 16.354C10.6919 16.2092 10.9011 16.0013 11.0475 15.75" stroke="#303033" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 2: Написать падающие тесты карточки**

Создать `task-detail-card.test.ts` с фабриками `task()`, `project()`,
`label()` и тестами:

```ts
it("renders all five property rows and their values", () => {
  const html = render({
    task: task({
      project_id: 10,
      priority: "urgent_important",
      labels: [
        { id: 3, name: "Личное" },
        { id: 4, name: "Работа" },
        { id: 5, name: "Дом" },
        { id: 6, name: "Спорт" },
      ],
    }),
    project: project(),
    labels: [label()],
  });

  expect(html).toContain("Срок");
  expect(html).toContain("Сегодня, 16:00");
  expect(html).toContain("Напоминание");
  expect(html).toContain("За 30 минут");
  expect(html).toContain("Приоритет");
  expect(html).toContain("Срочные и важные");
  expect(html).toContain("Теги");
  expect(html).toContain("Личное + 3");
  expect(html).toContain("Проект");
  expect(html).toContain("Работа");
  expect(html).toContain("calendar.svg");
  expect(html).toContain("bell.svg");
  expect(html).toContain("flag.svg");
  expect(html).toContain("tag.svg");
  expect(html).toContain("tag-raw.svg");
  expect(html).toContain("folder.svg");
  expect(html).toContain("chevron-right.svg");
  expect(html).toContain("text-app-accent");
  expect(html).toContain("#40DD82");
  expect(html).not.toContain("<button");
});

it("renders dividers between rows but not after the last one", () => {
  expect(render().match(/border-b border-app-stroke/g)?.length).toBe(4);
});

it("renders fallbacks for empty labels, missing project and no reminders", () => {
  const html = render({
    task: task({ reminders_enabled: false, reminders: [] }),
  });
  expect(html).toContain("Нет");
  expect(html).toContain("Без проекта");
  expect(html).not.toContain("tag-raw.svg");
});

it("falls back to app-success for an unknown label color", () => {
  const html = render({
    task: task({ labels: [{ id: 99, name: "Неизвестная" }] }),
    labels: [label()],
  });
  expect(html).toContain("var(--app-success)");
});
```

- [ ] **Step 3: Запустить тесты и увидеть падение**

Run: `npx vitest run app/components/tasks/detail/task-detail-card.test.ts`
Expected: FAIL — компонент не найден.

- [ ] **Step 4: Реализовать `task-detail-card.tsx`**

Внутренний `DetailRow`:

```tsx
interface DetailRowProps {
  iconSrc: string;
  label: string;
  value: ReactNode;
  valueClassName?: string;
  isLast: boolean;
}

function DetailRow({
  iconSrc,
  label,
  value,
  valueClassName,
  isLast,
}: DetailRowProps): ReactElement {
  return (
    <div
      className={cn(
        "flex h-[47px] items-center gap-[11px]",
        !isLast && "border-b border-app-stroke",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-[5px]">
        <AssetIcon className="size-[18px] shrink-0 text-app-text" src={iconSrc} />
        <span className="truncate text-[15px] leading-[1.3] text-app-text">
          {label}
        </span>
      </span>
      <span
        className={cn(
          "flex min-w-0 max-w-[55%] items-center justify-end gap-[5px] text-right text-[13px] leading-[1.4]",
          valueClassName,
        )}
      >
        {value}
      </span>
      <AssetIcon className="size-6 shrink-0 text-app-text-secondary" src={chevronRightIcon} />
    </div>
  );
}
```

Значение меток:

```tsx
const labelsSummary = formatTaskLabelsSummary(task.labels);
const labelColor =
  findTaskLabelColor(task.labels, labels) ?? "var(--app-success)";
const labelsValue =
  task.labels.length > 0 ? (
    <>
      <span className="shrink-0" style={{ color: labelColor }}>
        <AssetIcon className="size-[18px]" src={tagRawIcon} />
      </span>
      <span className="min-w-0 truncate text-app-text">{labelsSummary}</span>
    </>
  ) : (
    <span className="text-app-text-secondary">{labelsSummary}</span>
  );
```

Карточка:

```tsx
return (
  <div className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]">
    <DetailRow iconSrc={calendarIcon} isLast={false} label="Срок"
      value={formatTaskDueValue(task, timeZone, now)}
      valueClassName="text-app-accent" />
    <DetailRow iconSrc={bellIcon} isLast={false} label="Напоминание"
      value={formatTaskReminderSummary(task)}
      valueClassName="text-app-text-secondary" />
    <DetailRow iconSrc={flagIcon} isLast={false} label="Приоритет"
      value={formatTaskPriority(task.priority)}
      valueClassName="text-app-text-secondary" />
    <DetailRow iconSrc={tagIcon} isLast={false} label="Теги" value={labelsValue} />
    <DetailRow iconSrc={folderIcon} isLast label="Проект"
      value={project?.name ?? "Без проекта"}
      valueClassName="text-app-text-secondary" />
  </div>
);
```

Импорты: `bell.svg?no-inline`, `calendar.svg?no-inline`,
`chevron-right.svg?no-inline`, `flag.svg?no-inline`,
`folder.svg?no-inline`, `tag.svg?no-inline`, `tag-raw.svg?no-inline`.

- [ ] **Step 5: Запустить тесты и увидеть успех**

Run: `npx vitest run app/components/tasks/detail/task-detail-card.test.ts`
Expected: PASS.

- [ ] **Step 6: Не коммитить**

### Task 9: Экран деталей, ошибка и скелетон

**Files:**
- Create: `app/components/tasks/detail/task-detail-view.tsx`
- Create: `app/components/tasks/detail/task-detail-view.test.ts`
- Create: `app/components/tasks/detail/task-detail-error.tsx`
- Create: `app/components/tasks/detail/task-detail-error.test.ts`
- Create: `app/components/tasks/detail/task-detail-skeleton.tsx`
- Create: `app/components/tasks/detail/task-detail-skeleton.test.ts`

**Interfaces:**
- Produces:
  - `TaskDetailViewProps { task; project?; labels; timeZone; now; isCompletionPending; completionError; onToggleCompleted; onDelete }`
  - `TaskDetailErrorProps { kind: "not-found" | "load-error"; onBack: () => void; onRetry: () => void }`
  - `TaskDetailSkeleton(): ReactElement`

- [ ] **Step 1: Написать падающие тесты**

`task-detail-view.test.ts`:

```ts
it("renders the title, description, created date and actions", () => {
  const html = render();
  expect(html).toContain("Записаться к доктору наук по теоретическому занятию");
  expect(html).toContain("Описание");
  expect(html).toContain("Собрать результаты за октябрь.");
  expect(html).toContain("Создано 05.11.2026, 10:00");
  expect(html).toContain("Отметить выполненной");
  expect(html).toContain("Удалить задачу");
  expect(html).not.toContain("Изменить название и описание задачи");
});

it("hides the description block when description is empty", () => {
  expect(render({ task: task({ description: null }) })).not.toContain("Описание");
});

it("shows Сделать активной for a completed task", () => {
  const html = render({ task: task({ completed_at: "2026-11-08T10:00:00.000Z" }) });
  expect(html).toContain("Сделать активной");
  expect(html).not.toContain("Отметить выполненной");
});

it("disables the completion button while pending", () => {
  const html = render({ isCompletionPending: true });
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("opacity-50");
  expect(html).toContain("disabled");
});

it("shows the completion error alert", () => {
  expect(
    render({ completionError: "Не удалось обновить задачу. Попробуйте ещё раз." }),
  ).toContain('role="alert"');
});
```

Фабрика `task()` — как в `today-task-row.test.ts`; `NOW =
new Date("2026-11-08T10:00:00.000Z")`, `TIME_ZONE = "Europe/Moscow"`.

`task-detail-error.test.ts`:

```ts
it("renders not found with a back action", () => {
  const html = renderToStaticMarkup(
    createElement(TaskDetailError, {
      kind: "not-found", onBack: () => {}, onRetry: () => {},
    }),
  );
  expect(html).toContain("Задача не найдена");
  expect(html).toContain("Назад");
  expect(html).not.toContain("Повторить");
});

it("renders a load error with retry", () => {
  const html = renderToStaticMarkup(
    createElement(TaskDetailError, {
      kind: "load-error", onBack: () => {}, onRetry: () => {},
    }),
  );
  expect(html).toContain("Не удалось загрузить задачу");
  expect(html).toContain("Повторить");
});
```

`task-detail-skeleton.test.ts`:

```ts
it("renders a busy detail skeleton", () => {
  const html = renderToStaticMarkup(createElement(TaskDetailSkeleton));
  expect(html).toContain('aria-label="Загружаем задачу"');
  expect(html).toContain('aria-busy="true"');
  expect(html.match(/h-\[47px\]/g)?.length).toBe(5);
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/components/tasks/detail/task-detail-view.test.ts app/components/tasks/detail/task-detail-error.test.ts app/components/tasks/detail/task-detail-skeleton.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать компоненты**

`task-detail-view.tsx`:

```tsx
return (
  <div className="flex flex-1 flex-col gap-2">
    <div className="px-[15px] py-[15px]">
      <h1 className="text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">
        {task.title}
      </h1>
    </div>
    {description ? (
      <div className="flex flex-col gap-[5px] px-[15px] pb-[15px]">
        <h2 className="text-[15px] font-semibold leading-[1.4] text-app-text">
          Описание
        </h2>
        <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.4] text-app-text-secondary">
          {description}
        </p>
      </div>
    ) : null}
    <TaskDetailCard labels={labels} now={now} project={project} task={task} timeZone={timeZone} />
    <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
      Создано {formatTaskCreatedAt(task.created_at, timeZone)}
    </p>
    {completionError ? (
      <p className="px-[15px] text-[13px] leading-[1.4] text-app-destructive" role="alert">
        {completionError}
      </p>
    ) : null}
    <div className="flex flex-col gap-[10px] pt-[15px]">
      <button
        aria-busy={isCompletionPending || undefined}
        className={cn(
          "h-[50px] w-full rounded-[25px] bg-app-card text-[15px] font-semibold text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70",
          isCompletionPending && "opacity-50",
        )}
        disabled={isCompletionPending}
        onClick={onToggleCompleted}
        type="button"
      >
        {task.completed_at === null ? "Отметить выполненной" : "Сделать активной"}
      </button>
      <button
        className="h-[50px] w-full rounded-[25px] bg-app-card text-[15px] font-semibold text-app-destructive focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70 disabled:opacity-50"
        disabled={isCompletionPending}
        onClick={onDelete}
        type="button"
      >
        Удалить задачу
      </button>
    </div>
  </div>
);
```

`description = task.description?.trim() ?? ""`.
`task-detail-error.tsx`: карточка `role="alert"`, `pt-4`,
`rounded-[25px] bg-app-card p-[15px]`, заголовок `17px` Semi Bold,
кнопка `15px` Semi Bold `app-accent`; для `not-found` — «Задача не
найдена» / «Назад» → `onBack`; для `load-error` — «Не удалось загрузить
задачу» / «Повторить» → `onRetry`.

`task-detail-skeleton.tsx`: `role="status"`, `aria-busy="true"`,
`aria-label="Загружаем задачу"`; заголовок из двух `Skeleton` строк,
блок описания, карточка из пяти строк `h-[47px]` (иконка, название,
значение, шеврон; разделитель у первых четырёх), строка `Создано`,
две кнопки `h-[50px] rounded-[25px]`.

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/components/tasks/detail/task-detail-view.test.ts app/components/tasks/detail/task-detail-error.test.ts app/components/tasks/detail/task-detail-skeleton.test.ts`
Expected: PASS.

- [ ] **Step 5: Не коммитить**

---

### Task 10: Модалка удаления

**Files:**
- Create: `app/components/tasks/detail/delete-task-modal.tsx`
- Test: `app/components/tasks/detail/delete-task-modal.test.ts`

**Interfaces:**
- Consumes: `Modal` из `~/components/ui/modal`.
- Produces:
  - `DeleteTaskModalProps { open; onOpenChange; showSeriesWarning; isPending; error; onConfirm }`

- [ ] **Step 1: Написать падающие тесты**

В тесте замокать `~/components/ui/modal`, сохраняя props и рендеря
children:

```ts
const modal = vi.hoisted(() => ({
  props: undefined as Record<string, unknown> | undefined,
}));

vi.mock("~/components/ui/modal", () => ({
  Modal: (props: { children: ReactNode } & Record<string, unknown>) => {
    modal.props = props;
    return createElement("div", null, props.children);
  },
}));
```

Тесты:

```ts
it("renders the question, series warning and actions", () => {
  const html = render({ open: true, showSeriesWarning: true });
  expect(html).toContain("Вы точно хотите удалить задачу?");
  expect(html).toContain("При удалении регулярной задачи также удаляются и будущие задачи этой серии");
  expect(html).toContain("Удалить задачу");
  expect(html).toContain("Отмена");
  expect(html).not.toContain("Удалить проект");
  expect(modal.props?.describedBy).toBe("delete-task-description");
});

it("hides the series warning for a one-off task", () => {
  const html = render({ open: true, showSeriesWarning: false });
  expect(html).not.toContain("При удалении регулярной задачи");
  expect(modal.props?.describedBy).toBeUndefined();
});

it("disables actions while pending and blocks overlay/escape", () => {
  const html = render({ open: true, isPending: true });
  expect(html.match(/disabled/g)?.length).toBe(2);
  expect(html).toContain('aria-busy="true"');
  expect(modal.props?.closeOnOverlayClick).toBe(false);
  expect(modal.props?.closeOnEscape).toBe(false);
});

it("renders the delete error", () => {
  const html = render({
    open: true,
    error: "Не удалось удалить задачу. Попробуйте ещё раз.",
  });
  expect(html).toContain('role="alert"');
  expect(html).toContain("Не удалось удалить задачу");
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/components/tasks/detail/delete-task-modal.test.ts`
Expected: FAIL — компонент не найден.

- [ ] **Step 3: Реализовать `delete-task-modal.tsx`**

```tsx
const cancelRef = useRef<HTMLButtonElement>(null);

return (
  <Modal
    className="inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md pb-[max(15px,var(--app-inset-bottom))] pl-[max(16px,var(--app-inset-left))] pr-[max(16px,var(--app-inset-right))]"
    closeOnEscape={!isPending}
    closeOnOverlayClick={!isPending}
    describedBy={showSeriesWarning ? "delete-task-description" : undefined}
    initialFocusRef={cancelRef}
    labelledBy="delete-task-title"
    onOpenChange={onOpenChange}
    open={open}
    variant="sheet"
  >
    <div className="flex flex-col gap-[10px]">
      <div className="overflow-hidden rounded-[25px] bg-app-card">
        <div className="border-b border-app-stroke px-[15px] py-[15px] text-center">
          <h2
            className="text-[15px] font-semibold leading-[1.4] text-app-text"
            id="delete-task-title"
          >
            Вы точно хотите удалить задачу?
          </h2>
          {showSeriesWarning ? (
            <p
              className="mt-[5px] text-[13px] leading-[1.4] text-app-text-secondary"
              id="delete-task-description"
            >
              При удалении регулярной задачи также удаляются и будущие задачи этой серии
            </p>
          ) : null}
          {error ? (
            <p
              className="mt-[10px] text-[13px] leading-[1.4] text-app-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
        <button
          aria-busy={isPending || undefined}
          className="h-[50px] w-full text-[15px] font-semibold text-app-destructive focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70 disabled:opacity-50"
          disabled={isPending}
          onClick={onConfirm}
          type="button"
        >
          Удалить задачу
        </button>
      </div>
      <button
        aria-busy={isPending || undefined}
        className="h-[50px] w-full rounded-[25px] bg-app-card text-[15px] font-semibold text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70 disabled:opacity-50"
        disabled={isPending}
        onClick={() => onOpenChange(false)}
        ref={cancelRef}
        type="button"
      >
        Отмена
      </button>
    </div>
  </Modal>
);
```

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/components/tasks/detail/delete-task-modal.test.ts`
Expected: PASS.

- [ ] **Step 5: Не коммитить**

---

### Task 11: Route деталей и RouteSkeleton

**Files:**
- Create: `app/routes/task-detail.tsx`
- Create: `app/routes/task-detail.test.ts`
- Modify: `app/routes.ts`
- Modify: `app/components/layout/route-skeleton.tsx`
- Modify: `app/components/layout/route-skeleton.test.ts`

**Interfaces:**
- Consumes: `useTaskDetail`, `useToggleTaskDetailCompletion`, `useDeleteTask`, `useTelegramBackButton`, `TaskDetailView`, `TaskDetailError`, `TaskDetailSkeleton`, `DeleteTaskModal`, `useAuth`, `useTelegram`, `useBottomNavigation`, `shouldGoBack`, `ApiError`.
- Produces: route `/tasks/:id`; `RouteSkeleton` выбирает `TaskDetailSkeleton` для детального пути.

- [ ] **Step 1: Добавить маршрут**

В `app/routes.ts`:

```ts
route("tasks/search", "routes/task-search.tsx"),
route("tasks/:id", "routes/task-detail.tsx"),
```

- [ ] **Step 2: Написать падающий route-тест**

Создать `app/routes/task-detail.test.ts`. Моки: `react-router`
(`useParams`, `useNavigate`), `@tanstack/react-query` (`useQuery`),
`~/hooks/use-task-detail`, `~/hooks/use-bottom-navigation`,
`~/hooks/use-telegram-back-button`, `~/providers/auth-provider`,
`~/providers/telegram-provider`, UI-компоненты
(`BottomNavigationDock`, `TaskDetailView`, `TaskDetailError`,
`TaskDetailSkeleton`, `DeleteTaskModal`). Обязательные тесты:

```ts
it("shows the skeleton while the task is loading", () => {
  routeState.task = { isPending: true, data: undefined, error: null, refetch: vi.fn() };
  expect(renderRoute()).toContain("SKELETON");
});

it("shows the view when the task is loaded", () => {
  routeState.task = { isPending: false, data: task(), error: null, refetch: vi.fn() };
  expect(renderRoute()).toContain("VIEW");
  expect(routeState.bottomNavActive).toBe("tasks");
});

it("shows not found for a 404", () => {
  routeState.task = {
    isPending: false,
    data: undefined,
    error: new ApiError("Not found", {
      status: 404, code: "not_found", requestId: "test",
    }),
    refetch: vi.fn(),
  };
  expect(renderRoute()).toContain("ERROR:not-found");
});

it("shows a load error for a non-404 failure", () => {
  routeState.task = {
    isPending: false,
    data: undefined,
    error: new ApiError("Server error", {
      status: 500, code: "internal_error", requestId: "test",
    }),
    refetch: vi.fn(),
  };
  expect(renderRoute()).toContain("ERROR:load-error");
});

it("shows not found for an invalid id", () => {
  routeState.params = { id: "abc" };
  expect(renderRoute()).toContain("ERROR:not-found");
});

it("keeps cached task data when a background refetch fails", () => {
  routeState.task = {
    isPending: false,
    data: task(),
    error: new ApiError("Server error", {
      status: 500, code: "internal_error", requestId: "test",
    }),
    refetch: vi.fn(),
  };
  expect(renderRoute()).toContain("VIEW");
});

it("returns back after deletion", () => {
  vi.stubGlobal("window", { history: { state: { idx: 1 } } });
  routeState.task = { isPending: false, data: task(), error: null, refetch: vi.fn() };
  renderRoute();
  routeState.onConfirmDelete?.();
  expect(routeState.navigate).toHaveBeenCalledWith(-1);
});
```

`useParams` возвращает `routeState.params` (в `beforeEach`
сбрасывать на `{ id: "42" }`); мок `BottomNavigationDock` сохраняет
`active` в `routeState.bottomNavActive`; `useDeleteTask` возвращает
`mutate: () => onDeleted()` и сохраняет `onDeleted`; `DeleteTaskModal`
сохраняет `onConfirm`. Мок `TaskDetailError` рендерит `ERROR:${kind}`,
мок `TaskDetailView` — `VIEW`, мок `TaskDetailSkeleton` — `SKELETON`.
В `afterEach` вызывать `vi.unstubAllGlobals()`.

- [ ] **Step 3: Запустить тест и увидеть падение**

Run: `npx vitest run app/routes/task-detail.test.ts`
Expected: FAIL — route-модуль не найден.

- [ ] **Step 4: Реализовать `app/routes/task-detail.tsx`**

```tsx
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Задача — Milly" },
    { name: "description", content: "Детали задачи в Milly" },
  ];
}

export default function TaskDetail() {
  const { user } = useAuth();
  const timeZone = user?.timezone ?? "UTC";
  const now = new Date();
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const task = taskQuery.data;
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: ({ signal }) => fetchProjects(signal),
    enabled: task !== undefined && task.project_id !== null,
  });
  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: ({ signal }) => fetchLabels(signal),
    enabled: task !== undefined && task.labels.length > 0,
  });
  const toggleMutation = useToggleTaskDetailCompletion(taskId);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteMutation = useDeleteTask(taskId, handleDeleted);
  useTelegramBackButton(handleBack);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate("/tasks");
  }

  function handleDeleted() {
    setIsDeleteOpen(false);
    handleBack();
  }

  function handleToggleCompleted() {
    if (!task) return;
    toggleMutation.mutate({
      taskId: task.id,
      nextCompleted: task.completed_at === null,
    });
  }

  function handleDeleteOpenChange(open: boolean) {
    deleteMutation.reset();
    setIsDeleteOpen(open);
    if (open) haptics.selection();
  }

  const project =
    task?.project_id != null
      ? projectsQuery.data?.find((item) => item.id === task.project_id)
      : undefined;
  const showSeriesWarning =
    task !== undefined &&
    task.series_id !== null &&
    task.completed_at === null &&
    new Date(task.due_at) > now;
  const completionError = toggleMutation.isError
    ? "Не удалось обновить задачу. Попробуйте ещё раз."
    : null;
  const deleteError =
    deleteMutation.isError &&
    !(deleteMutation.error instanceof ApiError &&
      deleteMutation.error.status === 404)
      ? "Не удалось удалить задачу. Попробуйте ещё раз."
      : null;

  let content: ReactNode;

  if (!isValidId) {
    content = (
      <TaskDetailError kind="not-found" onBack={handleBack} onRetry={handleBack} />
    );
  } else if (taskQuery.isPending) {
    content = <TaskDetailSkeleton />;
  } else if (!task) {
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
      <TaskDetailView
        completionError={completionError}
        isCompletionPending={toggleMutation.isPending}
        labels={labelsQuery.data ?? []}
        now={now}
        onDelete={() => handleDeleteOpenChange(true)}
        onToggleCompleted={handleToggleCompleted}
        project={project}
        task={task}
        timeZone={timeZone}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="flex flex-1 flex-col gap-2 px-4"
        style={{
          paddingBottom:
            "calc(89px + max(0px, 30px - var(--app-inset-bottom)))",
        }}
      >
        {content}
      </div>
      <BottomNavigationDock active="tasks" onSelect={onSelectTab} />
      {task ? (
        <DeleteTaskModal
          error={deleteError}
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onOpenChange={handleDeleteOpenChange}
          open={isDeleteOpen}
          showSeriesWarning={showSeriesWarning}
        />
      ) : null}
    </main>
  );
}
```

Импорты: `useState`, `type ReactNode`; `useQuery`; `useNavigate`,
`useParams`; `fetchProjects`, `fetchLabels`; `ApiError`;
`shouldGoBack`; все хуки и компоненты деталей.

`app/components/layout/route-skeleton.tsx`:

```tsx
import { TaskDetailSkeleton } from "~/components/tasks/detail/task-detail-skeleton";

const isTaskDetail =
  pathname.startsWith("/tasks/") &&
  !pathname.startsWith("/tasks/search");

// в JSX:
{pathname.startsWith("/tasks/search") ? (
  <SearchTasksPageSkeleton />
) : isTaskDetail ? (
  <TaskDetailSkeleton />
) : (
  <TodayTasksSkeleton />
)}
```

- [ ] **Step 5: Обновить тест RouteSkeleton**

Замокать `TaskDetailSkeleton` как `DETAIL_SKELETON` и добавить:

```ts
it("renders the task detail skeleton on a detail path", () => {
  const html = renderAt("/tasks/42");
  expect(html).toContain("DETAIL_SKELETON");
  expect(html).not.toContain("TASKS_SKELETON");
  expect(html).not.toContain("SEARCH_SKELETON");
});
```

- [ ] **Step 6: Запустить тесты и увидеть успех**

Run: `npx vitest run app/routes/task-detail.test.ts app/components/layout/route-skeleton.test.ts`
Expected: PASS.

- [ ] **Step 7: Не коммитить**

---

### Task 12: Документация и пометки о замене старых требований

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/specs/2026-11-06-today-tasks/spec.md`
- Modify: `docs/specs/2026-11-07-task-search/spec.md`

- [ ] **Step 1: Обновить `AGENTS.md`**

Добавить в дерево структуры:

```text
app/components/tasks/detail/   # экран деталей, карточка, модалка удаления
app/hooks/use-task-detail.ts
app/hooks/use-telegram-back-button.ts
app/lib/tasks/task-detail.ts
app/lib/tasks/task-detail-cache.ts
app/routes/task-detail.tsx
```

Добавить в раздел данных правило:

```text
- `/tasks/:id` использует `GET /tasks/{id}`, `POST /tasks/{id}/complete`,
  `POST /tasks/{id}/uncomplete`, `DELETE /tasks/{id}`. Данные загружаются
  React Query после `AuthGate`; ключ — `["tasks","detail",id]`; проекты и
  метки читаются через существующие `["projects"]`/`["labels"]`. Строки
  `/tasks` и `/tasks/search` открывают детали, чекбокс остаётся отдельным.
  Завершение оптимистично; удаление — через модалку, после успеха или
  `404` — назад по истории (fallback `/tasks`). Детальный ключ обязан
  оставаться под `["tasks"]`.
```

Добавить в раздел UI правило о карточке `47px`, модалке и `bell.svg`, а
в раздел проверок — ручные сценарии из spec §7. Указать, что в Telegram
показывается нативная `BackButton` (6.1+), а в браузере — история.

- [ ] **Step 2: Добавить blockquote-пометки**

В `docs/specs/2026-11-06-today-tasks/spec.md` после metadata:

```markdown
> Примечание (2026-11-08): строка задачи теперь открывает экран
> детальной информации `/tasks/:id`; утверждения FR-4 «строка не
> является кнопкой перехода», «chevron декоративный» и пункты
> «Экран детальной информации задачи и переход по строке/chevron» из
> «Вне scope» заменены спецификацией
> `docs/specs/2026-11-08-task-detail/spec.md`. Чекбокс и оптимистичное
> завершение сохраняются.
```

В `docs/specs/2026-11-07-task-search/spec.md` после metadata:

```markdown
> Примечание (2026-11-08): строка результата поиска теперь открывает
> `/tasks/:id`; утверждение «Строка не является ссылкой; интерактивен
> только чекбокс» и пункт «Переход в детали задачи по строке» из
> «Вне scope» заменены спецификацией
> `docs/specs/2026-11-08-task-detail/spec.md`. Поиск, фильтры и
> завершение сохраняются.
```

- [ ] **Step 3: Проверить пометки**

Run: `grep -n "2026-11-08-task-detail" docs/specs/2026-11-06-today-tasks/spec.md docs/specs/2026-11-07-task-search/spec.md AGENTS.md`
Expected: три файла содержат путь новой спецификации.

- [ ] **Step 4: Не коммитить**

---

### Task 13: Финальная проверка

**Files:**
- Verify: весь рабочий tree.

- [ ] **Step 1: Полный прогон тестов**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS; `react-router typegen` создаёт типы нового route.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: SSR-проверка деталей**

Run:

```bash
npm run build
PORT=3000 npm start
curl -s http://localhost:3000/tasks/123
```

Expected: в ответе есть скелетон/`Загружаем задачу`, нет названий задач,
проектов, меток и других защищённых данных.

- [ ] **Step 5: SSR-регрессия 404**

Run: `curl -i http://localhost:3000/does-not-exist`
Expected: HTTP `404` и тексты 404-экрана с нижней навигацией.

- [ ] **Step 6: Ручные проверки**

При поднятом backend `http://127.0.0.1:8000`:

- строки `/tasks` и `/tasks/search` открывают `/tasks/:id`; чекбокс
  завершает задачу и не открывает детали;
- завершение меняет текст кнопки, обновляет список/прогресс после
  возврата; ошибка откатывается и показывает alert;
- модалка удаления: отмена/оверлей/Escape, каскадное предупреждение,
  ошибка, `404`, возврат назад;
- `BackButton` Telegram (6.1+) и история браузера;
- light/dark, ширины 320/412/448 px, safe-area и Telegram;
- пустые метки/проект/напоминания показывают fallback’и.

- [ ] **Step 7: Не коммитить**

Оставить изменения в рабочем дереве; в отчёте перечислить файлы и
результаты команд.

---

## Self-Review

- **Spec coverage:** FR-1 → Task 11; FR-2 → Tasks 1, 4, 5; FR-3 → Task 9;
  FR-4 → Tasks 3, 8, 9; FR-5 → Task 3; FR-6 → Tasks 3, 8; FR-7 → Tasks 5,
  9; FR-8 → Task 10; FR-9 → Tasks 5, 9, 11; FR-10 → Task 7; FR-11 → Tasks
  6, 8–11; FR-12 → Tasks 1–13.
- **Placeholder scan:** во всех шагах указаны файлы, сигнатуры, тесты
  или команды; TBD/«обработать edge cases» отсутствуют.
- **Type consistency:** `TaskDetailViewProps`, `TaskDetailCardProps`,
  `TaskDetailErrorProps`, `DeleteTaskModalProps`,
  `ToggleTaskDetailMutationOptions`, `DeleteTaskMutationOptions`,
  `taskDetailQueryKey`, `applyTaskDetailCompletion` определены один раз и
  используются далее с теми же именами.
- **Review Focus coverage:** возврат после удаления — Tasks 5, 11;
  строка vs чекбокс — Task 7; завершение — Tasks 5, 9; каскадное
  предупреждение — Task 10; SSR/bootstrap — Tasks 11, 13.
- **Proportion:** план фиксирует интерфейсы, файлы и проверки; тела
  компонентов приведены только там, где геометрия/логика неочевидны.

## Execution Handoff

Implementation must not start until the user reviews and approves the spec
and this plan. After approval, choose the execution method:
subagent-driven development is recommended, because the tasks have clear
interfaces and independent review gates; native execution is acceptable if
the user prefers one session.


