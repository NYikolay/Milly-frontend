# Экран «Задачи на сегодня» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить защищённый маршрут `/tasks` с экраном «Задачи на
сегодня»: сегментированный переключатель, дневной прогресс, группы
«В планах»/«Выполнено», завершение задач и блок создания задачи — в
светлой и тёмной темах, с реальными данными backend.

**Architecture:** Новый route-модуль `app/routes/tasks.tsx` рендерит
чистое представление `TodayTasksView` и загружает данные через React
Query после `AuthGate`. Доменные типы и API-обёртки живут в
`app/lib/tasks`, чистые хелперы группировки — в `today-tasks.ts`,
оптимистичное обновление кэша — в `today-tasks-cache.ts`. Компоненты
экрана — в `app/components/tasks/today/`, общий сегментированный
контрол — в `app/components/ui/`. Главный экран `/` не переделывается,
кроме навигации нижних вкладок «Главная»/«Задачи».

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR),
TypeScript 5.9 strict, Tailwind CSS 4, React Query 5, Vitest.

**Spec:** `docs/specs/2026-11-06-today-tasks/spec.md`

## Global Constraints

- Реализацию начинать только после утверждения spec и plan
  владельцем продукта.
- Не трогать незакоммиченные изменения auth-слоя:
  `app/lib/auth/*`, `app/providers/auth-provider.tsx`, `docs/api.md`.
- Новые зависимости не добавлять.
- Только токены `app-*`; `dark:`-классы и хардкод цветов Telegram не
  добавлять. Новый токен — только `app-progress-track`.
- Все запросы — через `apiRequest` из `app/lib/api/client.ts`.
- SSR включён; `/tasks` до аутентификации показывает только
  `AuthScreen`, защищённые задачи в SSR не попадают.
- Данные экрана — только React Query после `AuthGate`; loader и
  `clientLoader` не используются.
- Серверные данные не кладутся в Zustand; раскрытие групп — локальный
  `useState`.
- Файлы — `kebab-case`, компоненты — `PascalCase`, алиас `~/`, типы —
  `import type`.
- TypeScript strict, без `any`.
- Тесты — Vitest, `app/**/*.test.ts`; компонентные тесты —
  `renderToStaticMarkup`.
- Линтера в проекте нет; `npm run lint` не добавлять.
- Haptics — только через `useTelegram`.
- Не коммитить без отдельной просьбы.
- Проверки перед завершением: `npm test`, `npm run typecheck`,
  `npm run build`.

## Review Focus

- **320px и сегменты.** На ширине 320px три подписи с иконками не
  помещаются; иконки должны скрываться ниже 360px, подписи не должны
  обрезаться или вызывать горизонтальный скролл.
- **Оптимистичное завершение и откат.** При ошибке `complete`/
  `uncomplete` задача обязана вернуться в прежнюю группу, а прогресс — к
  прежним числам; повторное нажатие не должно отправлять второй запрос.
- **Пусто vs всё выполнено.** Оба состояния дают пустой `status=open`,
  поэтому состояние определяется по `total/completed` из progress
  endpoint, а не по пустоте списка.
- **Приоритет и завершённая строка.** Флаг и акцентное время — только
  у незавершённых с `priority !== "neither"`; завершённые строки без
  флага, с серым временем и без иконки проекта.
- **Проект недоступен.** Удалённый/архивный/не загрузившийся проект не
  должен ломать строку: fallback «Без проекта» и `no-project`.
- **Часовой пояс.** Дата заголовка и время `due_at` считаются в
  `AuthUser.timezone`, а не в часовом поясе браузера; дата запроса
  совпадает с датой заголовка.
- **SSR.** `/tasks` не должен отдавать названия задач, проекты или
  прогресс до аутентификации.

---

## Baseline

- [ ] **Step 1: Зафиксировать состояние рабочего дерева**

Run: `git status --short`

Expected: есть незакоммиченные auth-файлы и `docs/api.md`; их не
изменять и не откатывать.

- [ ] **Step 2: Прочитать spec и проверить Figma-идентификаторы**

Run: `sed -n '1,80p' docs/specs/2026-11-06-today-tasks/spec.md`

Expected: в шапке перечислены все шесть фреймов; дальнейшая работа
ссылается на этот документ.

---

## File Structure

**Create:**
- `app/assets/icons/circle-check.svg`
- `app/assets/icons/search.svg`
- `app/assets/icons/check-check.svg`
- `app/components/ui/segmented-control.tsx`
- `app/components/ui/segmented-control.test.ts`
- `app/components/tasks/today/today-header.tsx`
- `app/components/tasks/today/today-header.test.ts`
- `app/components/tasks/today/today-progress-card.tsx`
- `app/components/tasks/today/today-progress-card.test.ts`
- `app/components/tasks/today/today-task-row.tsx`
- `app/components/tasks/today/today-task-row.test.ts`
- `app/components/tasks/today/today-task-group.tsx`
- `app/components/tasks/today/today-task-group.test.ts`
- `app/components/tasks/today/create-task-section.tsx`
- `app/components/tasks/today/create-task-section.test.ts`
- `app/components/tasks/today/today-tasks-view.tsx`
- `app/components/tasks/today/today-tasks-view.test.ts`
- `app/components/tasks/today/today-tasks-skeleton.tsx`
- `app/components/tasks/today/today-tasks-error.tsx`
- `app/lib/tasks/today-tasks.ts`
- `app/lib/tasks/today-tasks.test.ts`
- `app/lib/tasks/today-tasks-cache.ts`
- `app/lib/tasks/today-tasks-cache.test.ts`
- `app/hooks/use-today-tasks.ts`
- `app/hooks/use-bottom-navigation.ts`
- `app/routes/tasks.tsx`

**Modify:**
- `app/app.css` — токен `app-progress-track`.
- `app/lib/tasks/types.ts` — типы списка и прогресса.
- `app/lib/tasks/tasks-api.ts` — `fetchTasks`, `fetchTodayProgress`,
  `completeTask`, `uncompleteTask`.
- `app/lib/tasks/tasks-api.test.ts` — тесты новых обёрток.
- `app/lib/tasks/date-time.ts` — `formatZonedTodayLabel`,
  `formatZonedTime`.
- `app/lib/tasks/date-time.test.ts` — тесты форматирования.
- `app/routes.ts` — маршрут `tasks`.
- `app/routes/home.tsx` — навигация нижних вкладок.
- `AGENTS.md` — структура, данные и проверки нового экрана.

---

### Task 1: Форматирование даты и времени в часовом поясе

**Files:**
- Modify: `app/lib/tasks/date-time.ts`
- Test: `app/lib/tasks/date-time.test.ts`

**Interfaces:**
- Produces:
  - `formatZonedTodayLabel(now: Date, timeZone: string): string`
  - `formatZonedTime(iso: string, timeZone: string): string`

- [ ] **Step 1: Написать падающие тесты**

Добавить в `date-time.test.ts`:

```ts
import { formatZonedTime, formatZonedTodayLabel } from "./date-time";

describe("formatZonedTodayLabel", () => {
  it("formats the weekday, day and month in the user timezone", () => {
    expect(
      formatZonedTodayLabel(
        new Date("2026-11-05T13:07:42Z"),
        "Europe/Moscow",
      ),
    ).toBe("Четверг, 5 ноября");
  });

  it("uses the user timezone at the UTC day boundary", () => {
    expect(
      formatZonedTodayLabel(
        new Date("2026-11-05T22:30:00Z"),
        "Europe/Moscow",
      ),
    ).toBe("Пятница, 6 ноября");
  });
});

describe("formatZonedTime", () => {
  it("formats an ISO instant in the user timezone", () => {
    expect(
      formatZonedTime("2026-11-06T08:00:00.000Z", "Europe/Moscow"),
    ).toBe("11:00");
    expect(formatZonedTime("2026-11-06T08:00:00.000Z", "UTC")).toBe(
      "08:00",
    );
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run:
`npx vitest run app/lib/tasks/date-time.test.ts -t "formatZonedTodayLabel|formatZonedTime"`

Expected: FAIL — функции не экспортированы.

- [ ] **Step 3: Реализовать хелперы**

В `app/lib/tasks/date-time.ts`:

```ts
export function formatZonedTodayLabel(
  now: Date,
  timeZone: string,
): string {
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatZonedTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
```

- [ ] **Step 4: Проверить тесты**

Run:
`npx vitest run app/lib/tasks/date-time.test.ts`

Expected: PASS.

---

### Task 2: API-обёртки задач и дневного прогресса

**Files:**
- Modify: `app/lib/tasks/types.ts`
- Modify: `app/lib/tasks/tasks-api.ts`
- Test: `app/lib/tasks/tasks-api.test.ts`

**Interfaces:**
- Produces:
  - `TaskListStatus`, `TaskListQuery`, `TaskListResponse`,
    `TodayProgressResponse`
  - `fetchTasks(query?: TaskListQuery, signal?: AbortSignal):
    Promise<TaskListResponse>`
  - `fetchTodayProgress(signal?: AbortSignal):
    Promise<TodayProgressResponse>`
  - `completeTask(taskId: number, signal?: AbortSignal):
    Promise<TaskResponse>`
  - `uncompleteTask(taskId: number, signal?: AbortSignal):
    Promise<TaskResponse>`

- [ ] **Step 1: Написать падающие тесты**

Добавить в `app/lib/tasks/tasks-api.test.ts`:

```ts
import {
  completeTask,
  createSeries,
  createTask,
  fetchTasks,
  fetchTodayProgress,
  uncompleteTask,
} from "./tasks-api";

describe("tasks list API", () => {
  it("fetches tasks with date, status and limit", async () => {
    apiRequestMock.mockResolvedValue({ items: [], next_cursor: null });

    await expect(
      fetchTasks({ date: "2026-11-06", status: "all", limit: 100 }),
    ).resolves.toEqual({ items: [], next_cursor: null });

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/tasks?date=2026-11-06&status=all&limit=100",
      { signal: undefined },
    );
  });

  it("omits empty query parameters", async () => {
    apiRequestMock.mockResolvedValue({ items: [], next_cursor: null });

    await fetchTasks();

    expect(apiRequestMock).toHaveBeenCalledWith("/tasks", {
      signal: undefined,
    });
  });

  it("fetches today progress", async () => {
    apiRequestMock.mockResolvedValue({
      total: 5,
      completed: 2,
      remaining: 3,
    });

    await expect(fetchTodayProgress()).resolves.toEqual({
      total: 5,
      completed: 2,
      remaining: 3,
    });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/tasks/today/progress",
      { signal: undefined },
    );
  });
});

describe("tasks completion API", () => {
  it("completes a task with POST /tasks/{id}/complete", async () => {
    apiRequestMock.mockResolvedValue({ id: 100 });

    await completeTask(100);

    expect(apiRequestMock).toHaveBeenCalledWith("/tasks/100/complete", {
      method: "POST",
      signal: undefined,
    });
  });

  it("uncompletes a task with POST /tasks/{id}/uncomplete", async () => {
    apiRequestMock.mockResolvedValue({ id: 100 });

    await uncompleteTask(100);

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/tasks/100/uncomplete",
      { method: "POST", signal: undefined },
    );
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run app/lib/tasks/tasks-api.test.ts`

Expected: FAIL — новых функций нет.

- [ ] **Step 3: Добавить типы**

В `app/lib/tasks/types.ts`:

```ts
export type TaskListStatus = "all" | "open" | "completed" | "overdue";

export interface TaskListQuery {
  date?: string;
  status?: TaskListStatus;
  limit?: number;
  cursor?: string;
}

export interface TaskListResponse {
  items: TaskResponse[];
  next_cursor: string | null;
}

export interface TodayProgressResponse {
  total: number;
  completed: number;
  remaining: number;
}
```

- [ ] **Step 4: Реализовать обёртки**

В `app/lib/tasks/tasks-api.ts`:

```ts
function buildTaskListPath(query: TaskListQuery): string {
  const params = new URLSearchParams();

  if (query.date !== undefined) params.set("date", query.date);
  if (query.status !== undefined) params.set("status", query.status);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.cursor !== undefined) params.set("cursor", query.cursor);

  const search = params.toString();

  return search === "" ? "/tasks" : `/tasks?${search}`;
}

export function fetchTasks(
  query: TaskListQuery = {},
  signal?: AbortSignal,
): Promise<TaskListResponse> {
  return apiRequest<TaskListResponse>(buildTaskListPath(query), {
    signal,
  });
}

export function fetchTodayProgress(
  signal?: AbortSignal,
): Promise<TodayProgressResponse> {
  return apiRequest<TodayProgressResponse>("/tasks/today/progress", {
    signal,
  });
}

export function completeTask(
  taskId: number,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${taskId}/complete`, {
    method: "POST",
    signal,
  });
}

export function uncompleteTask(
  taskId: number,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${taskId}/uncomplete`, {
    method: "POST",
    signal,
  });
}
```

Не забыть импортировать новые типы через `import type`.

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run app/lib/tasks/tasks-api.test.ts`

Expected: PASS.

---

### Task 3: Чистые хелперы состояния «Задачи на сегодня»

**Files:**
- Create: `app/lib/tasks/today-tasks.ts`
- Test: `app/lib/tasks/today-tasks.test.ts`

**Interfaces:**
- Produces:
  - `TodayTasksState = "default" | "empty" | "completed"`
  - `PLANNED_PREVIEW_LIMIT = 3`, `COMPLETED_PREVIEW_LIMIT = 2`
  - `getTodayTasksState(total: number, completed: number):
    TodayTasksState`
  - `splitTodayTasks(tasks: TaskResponse[]): { planned:
    TaskResponse[]; completed: TaskResponse[] }`
  - `getTodayProgressCopy(total: number, completed: number):
    { title: string; description: string }`
  - `getVisibleTasks(tasks: TaskResponse[], limit: number,
    expanded: boolean): TaskResponse[]`
  - `shouldShowSearchCard(plannedCount: number): boolean`

- [ ] **Step 1: Написать падающие тесты**

```ts
import { describe, expect, it } from "vitest";

import type { TaskResponse } from "./types";
import {
  COMPLETED_PREVIEW_LIMIT,
  PLANNED_PREVIEW_LIMIT,
  getTodayProgressCopy,
  getTodayTasksState,
  getVisibleTasks,
  shouldShowSearchCard,
  splitTodayTasks,
} from "./today-tasks";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-06T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-06T07:00:00.000Z",
    updated_at: "2026-11-06T07:00:00.000Z",
    ...overrides,
  };
}

describe("getTodayTasksState", () => {
  it("treats zero tasks as empty", () => {
    expect(getTodayTasksState(0, 0)).toBe("empty");
  });

  it("treats all completed tasks as completed", () => {
    expect(getTodayTasksState(5, 5)).toBe("completed");
    expect(getTodayTasksState(5, 6)).toBe("completed");
  });

  it("treats the rest as default", () => {
    expect(getTodayTasksState(5, 2)).toBe("default");
  });
});

describe("splitTodayTasks", () => {
  it("splits by completed_at preserving order", () => {
    const planned = task({ id: 1 });
    const completed = task({ id: 2, completed_at: "2026-11-06T09:00:00Z" });

    expect(splitTodayTasks([planned, completed])).toEqual({
      planned: [planned],
      completed: [completed],
    });
  });
});

describe("getTodayProgressCopy", () => {
  it("returns the default copy", () => {
    expect(getTodayProgressCopy(6, 2)).toEqual({
      title: "Всё идёт по плану",
      description: "2 из 6 задач выполнено",
    });
  });

  it("returns the all-completed copy", () => {
    expect(getTodayProgressCopy(20, 20)).toEqual({
      title: "На сегодня всё 🥳",
      description: "20 из 20 задач выполнено ✌",
    });
  });

  it("clamps completed into the total", () => {
    expect(getTodayProgressCopy(3, 5).description).toBe(
      "3 из 3 задач выполнено ✌",
    );
  });
});

describe("preview helpers", () => {
  it("uses 3 planned and 2 completed previews", () => {
    expect(PLANNED_PREVIEW_LIMIT).toBe(3);
    expect(COMPLETED_PREVIEW_LIMIT).toBe(2);
  });

  it("cuts the list when collapsed and keeps it when expanded", () => {
    const tasks = [task({ id: 1 }), task({ id: 2 }), task({ id: 3 })];

    expect(getVisibleTasks(tasks, 2, false)).toEqual(tasks.slice(0, 2));
    expect(getVisibleTasks(tasks, 2, true)).toBe(tasks);
  });

  it("shows the search card only when there are no planned tasks", () => {
    expect(shouldShowSearchCard(0)).toBe(true);
    expect(shouldShowSearchCard(3)).toBe(false);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run app/lib/tasks/today-tasks.test.ts`

Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать хелперы**

```ts
import type { TaskResponse } from "./types";

export type TodayTasksState = "default" | "empty" | "completed";

export const PLANNED_PREVIEW_LIMIT = 3;
export const COMPLETED_PREVIEW_LIMIT = 2;

export function getTodayTasksState(
  total: number,
  completed: number,
): TodayTasksState {
  if (total <= 0) return "empty";
  if (completed >= total) return "completed";
  return "default";
}

export function splitTodayTasks(tasks: TaskResponse[]) {
  const planned: TaskResponse[] = [];
  const completed: TaskResponse[] = [];

  for (const task of tasks) {
    (task.completed_at === null ? planned : completed).push(task);
  }

  return { planned, completed };
}

export function getTodayProgressCopy(total: number, completed: number) {
  const normalizedTotal = Math.max(total, 0);
  const normalizedCompleted =
    normalizedTotal === 0
      ? 0
      : Math.min(Math.max(completed, 0), normalizedTotal);

  if (normalizedTotal > 0 && normalizedCompleted >= normalizedTotal) {
    return {
      title: "На сегодня всё 🥳",
      description: `${normalizedCompleted} из ${normalizedTotal} задач выполнено ✌`,
    };
  }

  return {
    title: "Всё идёт по плану",
    description: `${normalizedCompleted} из ${normalizedTotal} задач выполнено`,
  };
}

export function getVisibleTasks(
  tasks: TaskResponse[],
  limit: number,
  expanded: boolean,
): TaskResponse[] {
  return expanded ? tasks : tasks.slice(0, limit);
}

export function shouldShowSearchCard(plannedCount: number): boolean {
  return plannedCount === 0;
}
```

- [ ] **Step 4: Проверить тесты**

Run: `npx vitest run app/lib/tasks/today-tasks.test.ts`

Expected: PASS.

---

### Task 4: Сегментированный переключатель и иконки

**Files:**
- Create: `app/assets/icons/circle-check.svg`
- Create: `app/assets/icons/search.svg`
- Create: `app/components/ui/segmented-control.tsx`
- Test: `app/components/ui/segmented-control.test.ts`

**Interfaces:**
- Produces:
  - `SegmentedControlOption { id: string; label: string; iconSrc:
    string; disabled?: boolean }`
  - `SegmentedControlProps { ariaLabel: string; options:
    readonly SegmentedControlOption[]; value: string; onChange?: (id:
    string) => void; className?: string }`
  - `SegmentedControl(props: SegmentedControlProps): ReactElement`

- [ ] **Step 1: Добавить иконки**

`app/assets/icons/circle-check.svg`:

```svg
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="10" cy="10" r="8.333" stroke="currentColor" stroke-width="1.2"/>
  <path d="M6.4 10.2L8.7 12.5L13.6 7.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

`app/assets/icons/search.svg`:

```svg
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="9" cy="9" r="5.833" stroke="currentColor" stroke-width="1.2"/>
  <path d="M13.4 13.4L17 17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Написать падающий тест**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SegmentedControl } from "./segmented-control";

const options = [
  { id: "today", label: "Сегодня", iconSrc: "/circle-check.svg" },
  { id: "search", label: "Поиск задач", iconSrc: "/search.svg", disabled: true },
  { id: "projects", label: "Проекты", iconSrc: "/dashboard.svg", disabled: true },
] as const;

describe("SegmentedControl", () => {
  it("renders an accessible tab list with the active tab", () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl, {
        ariaLabel: "Разделы задач",
        options,
        value: "today",
      }),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Разделы задач"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("bg-app-track");
    expect(html).toContain("text-app-accent");
  });

  it("marks search and projects as disabled and unfocusable", () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl, {
        ariaLabel: "Разделы задач",
        options,
        value: "today",
      }),
    );

    expect(html.match(/aria-disabled="true"/g)?.length).toBe(2);
    expect(html.match(/tabindex="-1"/g)?.length).toBe(2);
  });

  it("keeps icons above 360px and hides them below", () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl, {
        ariaLabel: "Разделы задач",
        options,
        value: "today",
      }),
    );

    expect(html).toContain("max-[359px]:hidden");
    expect(html).toContain("circle-check.svg");
    expect(html).toContain("search.svg");
  });
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npx vitest run app/components/ui/segmented-control.test.ts`

Expected: FAIL — компонент не найден.

- [ ] **Step 4: Реализовать компонент**

Ключевые значения:

- контейнер: `flex h-[50px] items-stretch rounded-[36px] bg-app-card p-[5px]`;
- сегмент: `flex min-w-0 flex-1 items-center justify-center gap-[2px] rounded-[25px] text-[13px] leading-[1.4] transition-colors`;
- активный: `bg-app-track text-app-accent`;
- неактивный: `text-app-text`;
- иконка: `size-5 max-[359px]:hidden`, цвет `currentColor`;
- недоступный: `aria-disabled="true"`, `tabIndex={-1}`, обработчик не
  вызывается;
- активный `tabIndex={0}`, `aria-selected={true}`;
- `onClick={() => { if (!option.disabled) onChange?.(option.id); }}`.

Не добавлять `role="tabpanel"` — панель одна и находится вне компонента.

- [ ] **Step 5: Проверить тест**

Run: `npx vitest run app/components/ui/segmented-control.test.ts`

Expected: PASS.

---

### Task 5: Заголовок и карточка прогресса

**Files:**
- Create: `app/assets/icons/check-check.svg`
- Modify: `app/app.css`
- Create: `app/components/tasks/today/today-header.tsx`
- Test: `app/components/tasks/today/today-header.test.ts`
- Create: `app/components/tasks/today/today-progress-card.tsx`
- Test: `app/components/tasks/today/today-progress-card.test.ts`

**Interfaces:**
- Consumes: `getTodayProgressCopy` из Task 3.
- Produces:
  - `TodayHeaderProps { title: string; dateLabel: string }`
  - `TodayHeader(props: TodayHeaderProps): ReactElement`
  - `TodayProgressCardProps { total: number; completed: number }`
  - `TodayProgressCard(props: TodayProgressCardProps): ReactElement`

- [ ] **Step 1: Добавить иконку и токен**

`app/assets/icons/check-check.svg`:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 13L7.5 17.5L18 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 13L13.5 16.5L21 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

В `app/app.css` в `@theme inline` добавить:

```css
--color-app-progress-track: var(--app-progress-track);
```

В `:root`:

```css
--app-progress-track: #f2f2f7;
```

В `:root[data-app-theme="dark"]`:

```css
--app-progress-track: #7a7d83;
```

- [ ] **Step 2: Написать падающие тесты**

`today-header.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TodayHeader } from "./today-header";

describe("TodayHeader", () => {
  it("renders the title and date", () => {
    const html = renderToStaticMarkup(
      createElement(TodayHeader, {
        title: "Задачи на сегодня",
        dateLabel: "Четверг, 5 ноября",
      }),
    );

    expect(html).toContain("Задачи на сегодня");
    expect(html).toContain("Четверг, 5 ноября");
    expect(html).toContain("text-[24px]");
    expect(html).toContain("tracking-[-0.8px]");
    expect(html).toContain("text-app-text-secondary");
  });
});
```

`today-progress-card.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TodayProgressCard } from "./today-progress-card";

describe("TodayProgressCard", () => {
  it("renders the default progress copy", () => {
    const html = renderToStaticMarkup(
      createElement(TodayProgressCard, { total: 6, completed: 2 }),
    );

    expect(html).toContain("Всё идёт по плану");
    expect(html).toContain("2 из 6 задач выполнено");
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain("check-check.svg");
    expect(html).toContain("bg-app-progress-track");
  });

  it("renders the all-completed copy and a full bar", () => {
    const html = renderToStaticMarkup(
      createElement(TodayProgressCard, { total: 20, completed: 20 }),
    );

    expect(html).toContain("На сегодня всё 🥳");
    expect(html).toContain("20 из 20 задач выполнено ✌");
    expect(html).toContain('aria-valuenow="20"');
    expect(html).toContain("width:100%");
  });
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run:
`npx vitest run app/components/tasks/today/today-header.test.ts app/components/tasks/today/today-progress-card.test.ts`

Expected: FAIL — компоненты не найдены.

- [ ] **Step 4: Реализовать компоненты**

`TodayHeader`: `header` с `flex flex-col gap-[5px] px-[15px]`,
`h1` — `text-[24px] font-bold leading-[29px] tracking-[-0.8px]
text-app-text`, дата — `text-[13px] leading-[1.4]
text-app-text-secondary`.

`TodayProgressCard`: карточка `flex w-full flex-col gap-[10px]
rounded-[25px] bg-app-card p-[15px]`; верхний ряд `flex items-start
gap-[10px]`; текстовая колонка `flex min-w-0 flex-1 flex-col gap-[3px]`;
заголовок `text-[17px] font-semibold leading-[1.4] text-app-text`;
описание `text-[13px] leading-[1.4] text-app-text-secondary`; иконка в
`flex size-[38px] shrink-0 items-center justify-center` с
`AssetIcon className="size-6 text-app-accent" src={checkCheckIcon}`;
прогресс `span` с `role="progressbar"`, `aria-label="Прогресс дня"`,
`aria-valuemin={0}`, `aria-valuemax={Math.max(total, 1)}`,
`aria-valuenow={normalized}`, `block h-1 w-full overflow-hidden
rounded-full bg-app-progress-track`; заливка `block h-full rounded-full
bg-app-accent` с `width`.

Нормализация: `total === 0 ? 0 : min(max(completed, 0), total)`;
`width = total === 0 ? "0%" : `${(normalized / total) * 100}%``.

- [ ] **Step 5: Проверить тесты**

Run:
`npx vitest run app/components/tasks/today/today-header.test.ts app/components/tasks/today/today-progress-card.test.ts`

Expected: PASS.

---

### Task 6: Строка и группа задач

**Files:**
- Create: `app/components/tasks/today/today-task-row.tsx`
- Test: `app/components/tasks/today/today-task-row.test.ts`
- Create: `app/components/tasks/today/today-task-group.tsx`
- Test: `app/components/tasks/today/today-task-group.test.ts`

**Interfaces:**
- Consumes: `formatZonedTime` (Task 1), `getProjectIcon`,
  `AssetIcon`, `ProjectResponse`, `TaskResponse`.
- Produces:
  - `TodayTaskRowProps { task: TaskResponse; project?:
    ProjectResponse; timeZone: string; isPending: boolean; isLast:
    boolean; onToggle: (task: TaskResponse, nextCompleted: boolean) =>
    void }`
  - `TodayTaskRow(props: TodayTaskRowProps): ReactElement`
  - `TodayTaskGroupProps { id: string; title: string; tasks:
    TaskResponse[]; previewLimit: number; expanded: boolean;
    onToggleExpanded: () => void; projectsById: ReadonlyMap<number,
    ProjectResponse>; timeZone: string; pendingTaskId: number | null;
    onToggleTask: (task: TaskResponse, nextCompleted: boolean) => void }`
  - `TodayTaskGroup(props: TodayTaskGroupProps): ReactElement`

- [ ] **Step 1: Написать падающие тесты строки**

Фикстуры: `task()` как в Task 3; `project` с `icon: "leaf"`,
`color.hex: "#16A34A"`.

Проверить:

- незавершённая задача с проектом `leaf` и приоритетом
  `important_not_urgent`:
  - `role="checkbox"`, `aria-checked="false"`,
    `aria-label="Обсудить макет: отметить выполненной"`;
  - `leaf.svg`, `#16A34A`, `запуск сайта`, `· 11:00`;
  - `flag.svg`, `text-app-accent`;
  - `border-app-text-secondary/[0.55]`;
  - `size-[35px]`, `size-[28px]`;
  - `chevron-right.svg`;
  - `· Регулярные` при `recurrence: "regular"`;
  - нет `check.svg` внутри чекбокса.
- завершённая задача:
  - `aria-checked="true"`;
  - `bg-app-accent`, `check.svg`, `text-white`;
  - заголовок `text-app-text-secondary`;
  - нет `flag.svg`;
  - нет иконки проекта (нет `leaf.svg`);
  - время `text-app-text-secondary`.
- задача без проекта: `no-project.svg`, `Без проекта`.
- задача с `priority: "neither"`: нет `flag.svg`, время
  `text-app-text-secondary`.
- последняя строка: нет `border-b`; не последняя: есть `border-b
  border-app-stroke`.

- [ ] **Step 2: Убедиться, что тест строки падает**

Run: `npx vitest run app/components/tasks/today/today-task-row.test.ts`

Expected: FAIL — компонент не найден.

- [ ] **Step 3: Реализовать строку**

Ключевая структура:

```tsx
<li className="flex min-h-[67px] items-center gap-[12px]">
  <button
    aria-busy={isPending || undefined}
    aria-checked={completed}
    aria-label={`${task.title}: ${
      completed ? "отметить невыполненной" : "отметить выполненной"
    }`}
    className={cn(
      "flex size-[35px] shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70",
      isPending && "opacity-50",
    )}
    disabled={isPending}
    onClick={() => onToggle(task, !completed)}
    role="checkbox"
    type="button"
  >
    <span
      className={cn(
        "flex size-[28px] items-center justify-center rounded-full",
        completed
          ? "bg-app-accent"
          : "border-[1.3px] border-app-text-secondary/[0.55]",
      )}
    >
      {completed ? (
        <AssetIcon className="size-[15px] text-white" src={checkIcon} />
      ) : null}
    </span>
  </button>
  <div
    className={cn(
      "flex min-w-0 flex-1 items-center gap-[12px] border-app-stroke",
      isLast ? "border-b-0" : "border-b",
    )}
  >
    <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
      <span
        className={cn(
          "truncate text-[15px] leading-[1.3]",
          completed ? "text-app-text-secondary" : "text-app-text",
        )}
      >
        {task.title}
      </span>
      <div className="flex min-w-0 items-center gap-[5px] text-[12px] leading-[1.4] text-app-text-secondary">
        {!completed ? (
          <span
            className="shrink-0"
            style={project ? { color: project.color.hex } : undefined}
          >
            <AssetIcon
              className="size-[15px]"
              src={getProjectIcon(project?.icon ?? null)}
            />
          </span>
        ) : null}
        <span className="truncate">{project?.name ?? "Без проекта"}</span>
        <span
          className={cn(
            "shrink-0",
            showAccentTime ? "text-app-accent" : "text-app-text-secondary",
          )}
        >
          · {formatZonedTime(task.due_at, timeZone)}
        </span>
        {task.recurrence !== "one_off" ? (
          <span className="shrink-0">· Регулярные</span>
        ) : null}
      </div>
    </div>
    {showFlag ? (
      <span className="flex size-[18px] shrink-0 items-center justify-center text-app-accent">
        <AssetIcon className="size-[18px]" src={flagIcon} />
      </span>
    ) : null}
    <span className="flex size-6 shrink-0 items-center justify-center text-app-text-secondary">
      <AssetIcon className="size-6" src={chevronRightIcon} />
    </span>
  </div>
</li>
```

Где `completed = task.completed_at !== null`; `showFlag = !completed &&
task.priority !== "neither"`; `showAccentTime = showFlag`.

- [ ] **Step 4: Написать падающие тесты группы**

Проверить:

- заголовок `В планах`, `h2`;
- при 4 задачах и `previewLimit={3}`:
  - `Посмотреть все (4)`, `aria-expanded="false"`;
  - 3 чекбокса (`role="checkbox"`);
  - `aria-controls` указывает на id списка;
- при `expanded={true}`: 4 чекбокса, `Свернуть`,
  `aria-expanded="true"`;
- при 2 задачах и `previewLimit={2}`: ссылки
  «Посмотреть все» нет;
- карточка списка: `rounded-[25px] bg-app-card`, внутренние отступы
  `15px`.

- [ ] **Step 5: Убедиться, что тест группы падает**

Run: `npx vitest run app/components/tasks/today/today-task-group.test.ts`

Expected: FAIL — компонент не найден.

- [ ] **Step 6: Реализовать группу**

```tsx
<section aria-labelledby={`${id}-title`} className="flex flex-col gap-2 pt-4">
  <div className="flex items-center gap-[5px] px-[15px]">
    <h2
      className="text-[15px] font-semibold leading-[18px] text-app-text-secondary"
      id={`${id}-title`}
    >
      {title}
    </h2>
    {tasks.length > previewLimit ? (
      <button
        aria-controls={`${id}-list`}
        aria-expanded={expanded}
        className="text-[13px] leading-[1.4] text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
        onClick={onToggleExpanded}
        type="button"
      >
        {expanded ? "Свернуть" : `Посмотреть все (${tasks.length})`}
      </button>
    ) : null}
  </div>
  <ul
    className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]"
    id={`${id}-list`}
  >
    {getVisibleTasks(tasks, previewLimit, expanded).map((task, index, visible) => (
      <TodayTaskRow
        isLast={index === visible.length - 1}
        isPending={pendingTaskId === task.id}
        key={task.id}
        onToggle={onToggleTask}
        project={
          task.project_id === null
            ? undefined
            : projectsById.get(task.project_id)
        }
        task={task}
        timeZone={timeZone}
      />
    ))}
  </ul>
</section>
```

- [ ] **Step 7: Проверить тесты**

Run:
`npx vitest run app/components/tasks/today/today-task-row.test.ts app/components/tasks/today/today-task-group.test.ts`

Expected: PASS.

---

### Task 7: Блок «Создать задачу»

**Files:**
- Create: `app/components/tasks/today/create-task-section.tsx`
- Test: `app/components/tasks/today/create-task-section.test.ts`

**Interfaces:**
- Produces:
  - `CreateTaskSectionProps { showSearchCard: boolean; onVoice: () =>
    void; onInteractive: () => void; onSearch: () => void }`
  - `CreateTaskSection(props: CreateTaskSectionProps): ReactElement`

- [ ] **Step 1: Написать падающий тест**

Проверить:

- заголовок `Создать задачу`;
- карточки `Голосом` и `Интерактивно`;
- тексты `Опишите словами задачу, мы добавим её в ваш список дел` и
  `Заполните форму для добавления задачи`;
- эмодзи `📝`;
- `min-h-[165px]`, `grid grid-cols-2 gap-[10px]`;
- при `showSearchCard={false}` нет `🔍` и
  `Ищите, фильтруйте и сортируйте ваши задачи`;
- при `showSearchCard={true}` есть `🔍`, `Поиск задач`,
  `Ищите, фильтруйте и сортируйте ваши задачи`;
- карточки — кнопки (`type="button"`).

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run app/components/tasks/today/create-task-section.test.ts`

Expected: FAIL — компонент не найден.

- [ ] **Step 3: Реализовать секцию**

Структура:

```tsx
<section aria-labelledby="create-task-title" className="flex flex-col gap-2 pt-4">
  <h2
    className="px-[15px] text-[15px] font-semibold leading-[18px] text-app-text-secondary"
    id="create-task-title"
  >
    Создать задачу
  </h2>
  <div className="grid grid-cols-2 gap-[10px]">
    <button
      className="flex min-h-[165px] flex-col items-center gap-[10px] rounded-[25px] bg-app-card p-[15px] text-center active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
      onClick={onVoice}
      type="button"
    >
      <span className="flex size-[50px] items-center justify-center rounded-full bg-app-accent-soft">
        <span className="flex size-[40px] items-center justify-center rounded-full bg-app-accent shadow-[0_8px_20px_rgba(0,122,255,0.15)]">
          <MicIcon className="size-[25px] text-white" />
        </span>
      </span>
      <span className="flex flex-col gap-[5px]">
        <span className="text-[15px] font-semibold leading-[18px] text-app-text">
          Голосом
        </span>
        <span className="text-[12px] leading-[1.4] text-app-text-secondary">
          Опишите словами задачу, мы добавим её в ваш список дел
        </span>
      </span>
    </button>
    <button ...>
      <span aria-hidden="true" className="text-[40px] leading-none">📝</span>
      <span className="flex flex-col gap-[5px]">
        <span className="text-[15px] font-semibold leading-[18px] text-app-text">
          Интерактивно
        </span>
        <span className="text-[12px] leading-[1.4] text-app-text-secondary">
          Заполните форму для добавления задачи
        </span>
      </span>
    </button>
    {showSearchCard ? (
      <button ...>
        <span aria-hidden="true" className="text-[40px] leading-none">🔍</span>
        <span className="flex flex-col gap-[5px]">
          <span className="text-[15px] font-semibold leading-[18px] text-app-text">
            Поиск задач
          </span>
          <span className="text-[12px] leading-[1.4] text-app-text-secondary">
            Ищите, фильтруйте и сортируйте ваши задачи
          </span>
        </span>
      </button>
    ) : null}
  </div>
</section>
```

- [ ] **Step 4: Проверить тест**

Run: `npx vitest run app/components/tasks/today/create-task-section.test.ts`

Expected: PASS.

---

### Task 8: Композиция экрана, скелетон и ошибка загрузки

**Files:**
- Create: `app/components/tasks/today/today-tasks-view.tsx`
- Create: `app/components/tasks/today/today-tasks-skeleton.tsx`
- Create: `app/components/tasks/today/today-tasks-error.tsx`
- Test: `app/components/tasks/today/today-tasks-view.test.ts`

**Interfaces:**
- Consumes: `SegmentedControl`, `TodayHeader`, `TodayProgressCard`,
  `TodayTaskGroup`, `CreateTaskSection`, `getTodayTasksState`,
  `splitTodayTasks`, `shouldShowSearchCard`,
  `PLANNED_PREVIEW_LIMIT`, `COMPLETED_PREVIEW_LIMIT`,
  `formatZonedTodayLabel`.
- Produces:
  - `TodayTasksViewProps { now: Date; timeZone: string; tasks:
    TaskResponse[]; progress: TodayProgressResponse; projects:
    ProjectResponse[]; expanded: { planned: boolean; completed: boolean
    }; onToggleExpanded: (group: "planned" | "completed") => void;
    pendingTaskId: number | null; completionError: string | null;
    onToggleTask: (task: TaskResponse, nextCompleted: boolean) => void;
    onVoice: () => void; onInteractive: () => void; onSearch: () =>
    void }`
  - `TodayTasksView(props: TodayTasksViewProps): ReactElement`
  - `TodayTasksSkeleton(): ReactElement`
  - `TodayTasksErrorProps { dateLabel: string; onRetry: () => void }`
  - `TodayTasksError(props: TodayTasksErrorProps): ReactElement`

- [ ] **Step 1: Написать падающие тесты представления**

Минимальные проверки:

- **default**: 3 planned + 2 completed, progress `{total:5,completed:2}`:
  - `Задачи на сегодня`, `Четверг, 5 ноября`;
  - `Всё идёт по плану`, `2 из 5 задач выполнено`;
  - `В планах`, `Выполнено`;
  - `Создать задачу`, `Голосом`, `Интерактивно`;
  - нет `Ищите, фильтруйте и сортируйте ваши задачи`;
  - `Сегодня` есть в сегментах.
- **empty**: `tasks: []`, progress `{total:0,completed:0,remaining:0}`:
  - `Задач на сегодня нету 😴`;
  - нет `Всё идёт по плану`;
  - нет `В планах`, нет `Выполнено`;
  - есть `🔍` и `Ищите, фильтруйте и сортируйте ваши задачи`.
- **completed**: 2 completed, progress `{total:2,completed:2}`:
  - `На сегодня всё 🥳`, `2 из 2 задач выполнено ✌`;
  - нет `В планах`, есть `Выполнено`;
  - есть `🔍`.
- **completionError**: передать строку ошибки, проверить
  `role="alert"` и текст.
- **projects missing**: задача с `project_id: 10`, `projects: []` —
  `Без проекта` и `no-project.svg`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run app/components/tasks/today/today-tasks-view.test.ts`

Expected: FAIL — компоненты не найдены.

- [ ] **Step 3: Реализовать представление**

Алгоритм:

```ts
const { planned, completed } = splitTodayTasks(tasks);
const state = getTodayTasksState(progress.total, progress.completed);
const title =
  state === "empty"
    ? "Задач на сегодня нету 😴"
    : "Задачи на сегодня";
const dateLabel = formatZonedTodayLabel(now, timeZone);
const projectsById = new Map(
  projects.map((project) => [project.id, project]),
);
const showProgress = state !== "empty";
const showSearchCard = shouldShowSearchCard(planned.length);
```

Разметка:

```tsx
<div className="flex flex-1 flex-col gap-2">
  <div className="pb-[15px] pt-[15px]">
    <SegmentedControl
      ariaLabel="Разделы задач"
      options={TODAY_SEGMENTS}
      value="today"
    />
  </div>
  <div className="flex flex-col gap-2">
    <TodayHeader dateLabel={dateLabel} title={title} />
    {showProgress ? (
      <TodayProgressCard
        completed={progress.completed}
        total={progress.total}
      />
    ) : null}
  </div>
  {completionError ? (
    <p
      className="px-[15px] text-[13px] leading-[1.4] text-app-destructive"
      role="alert"
    >
      {completionError}
    </p>
  ) : null}
  {planned.length > 0 ? (
    <TodayTaskGroup
      expanded={expanded.planned}
      id="planned"
      onToggleExpanded={() => onToggleExpanded("planned")}
      onToggleTask={onToggleTask}
      pendingTaskId={pendingTaskId}
      previewLimit={PLANNED_PREVIEW_LIMIT}
      projectsById={projectsById}
      tasks={planned}
      timeZone={timeZone}
      title="В планах"
    />
  ) : null}
  {completed.length > 0 ? (
    <TodayTaskGroup
      expanded={expanded.completed}
      id="completed"
      onToggleExpanded={() => onToggleExpanded("completed")}
      onToggleTask={onToggleTask}
      pendingTaskId={pendingTaskId}
      previewLimit={COMPLETED_PREVIEW_LIMIT}
      projectsById={projectsById}
      tasks={completed}
      timeZone={timeZone}
      title="Выполнено"
    />
  ) : null}
  <CreateTaskSection
    onInteractive={onInteractive}
    onSearch={onSearch}
    onVoice={onVoice}
    showSearchCard={showSearchCard}
  />
</div>
```

`TODAY_SEGMENTS`:

```ts
import circleCheckIcon from "~/assets/icons/circle-check.svg";
import dashboardIcon from "~/assets/icons/dashboard.svg";
import searchIcon from "~/assets/icons/search.svg";

const TODAY_SEGMENTS = [
  { id: "today", label: "Сегодня", iconSrc: circleCheckIcon },
  { id: "search", label: "Поиск задач", iconSrc: searchIcon, disabled: true },
  { id: "projects", label: "Проекты", iconSrc: dashboardIcon, disabled: true },
] as const;
```

- [ ] **Step 4: Реализовать скелетон**

`TodayTasksSkeleton`:

- контейнер `aria-busy="true" aria-label="Загружаем задачи"`,
  `flex flex-1 flex-col gap-2`;
- сегменты: `h-[50px] rounded-[36px] bg-app-card`;
- заголовок: `mt-[15px] h-[29px] w-2/3 rounded bg-app-card`;
- дата: `h-[18px] w-1/3 rounded bg-app-card`;
- карточка прогресса: `h-[89px] rounded-[25px] bg-app-card`;
- две группы: `h-[231px] rounded-[25px] bg-app-card` и
  `h-[164px] rounded-[25px] bg-app-card`;
- `animate-pulse` на контейнере.

- [ ] **Step 5: Реализовать состояние ошибки**

`TodayTasksError`:

- `SegmentedControl` с теми же опциями и `value="today"`;
- `TodayHeader` с `title="Задачи на сегодня"` и переданной датой;
- карточка `rounded-[25px] bg-app-card p-[15px]` с текстом
  `Не удалось загрузить задачи` и кнопкой `Повторить`
  (`text-[15px] font-semibold text-app-accent`, focus-стили);
- кнопка вызывает `onRetry`.

- [ ] **Step 6: Проверить тесты**

Run: `npx vitest run app/components/tasks/today/today-tasks-view.test.ts`

Expected: PASS.

---

### Task 9: React Query, оптимистичное завершение и откат

**Files:**
- Create: `app/lib/tasks/today-tasks-cache.ts`
- Test: `app/lib/tasks/today-tasks-cache.test.ts`
- Create: `app/hooks/use-today-tasks.ts`

**Interfaces:**
- Consumes: `fetchTasks`, `fetchTodayProgress`, `completeTask`,
  `uncompleteTask` (Task 2), `TaskResponse`, `TodayProgressResponse`.
- Produces:
  - `TodayTasksData { tasks: TaskResponse[]; progress:
    TodayProgressResponse }`
  - `todayTasksQueryKey(timeZone: string, date: string)`
  - `applyTaskCompletion(data: TodayTasksData | undefined, taskId:
    number, completedAt: string | null): TodayTasksData | undefined`
  - `useTodayTasksData(timeZone: string, date: string)`
  - `ToggleTaskCompletionVariables { taskId: number; nextCompleted:
    boolean }`
  - `useToggleTaskCompletion(timeZone: string, date: string)`

- [ ] **Step 1: Написать падающие тесты кэша**

```ts
import { describe, expect, it } from "vitest";

import { applyTaskCompletion } from "./today-tasks-cache";
import type { TodayTasksData } from "./today-tasks-cache";
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
    due_at: "2026-11-06T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-06T07:00:00.000Z",
    updated_at: "2026-11-06T07:00:00.000Z",
    ...overrides,
  };
}

const data: TodayTasksData = {
  tasks: [
    task({ id: 1 }),
    task({ id: 2, completed_at: "2026-11-06T09:00:00.000Z" }),
  ],
  progress: { total: 2, completed: 1, remaining: 1 },
};

describe("applyTaskCompletion", () => {
  it("completes a task and increments progress", () => {
    const next = applyTaskCompletion(
      data,
      1,
      "2026-11-06T10:00:00.000Z",
    );

    expect(next?.tasks[0].completed_at).toBe("2026-11-06T10:00:00.000Z");
    expect(next?.progress).toEqual({
      total: 2,
      completed: 2,
      remaining: 0,
    });
  });

  it("uncompletes a task and decrements progress", () => {
    const next = applyTaskCompletion(data, 2, null);

    expect(next?.tasks[1].completed_at).toBeNull();
    expect(next?.progress).toEqual({
      total: 2,
      completed: 0,
      remaining: 2,
    });
  });

  it("returns the same data for unknown tasks and no-op transitions", () => {
    expect(applyTaskCompletion(data, 99, null)).toBe(data);
    expect(applyTaskCompletion(data, 1, null)).toBe(data);
    expect(applyTaskCompletion(undefined, 1, null)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run app/lib/tasks/today-tasks-cache.test.ts`

Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать кэш-хелпер**

```ts
export interface TodayTasksData {
  tasks: TaskResponse[];
  progress: TodayProgressResponse;
}

export function todayTasksQueryKey(timeZone: string, date: string) {
  return ["tasks", "today", timeZone, date] as const;
}

export function applyTaskCompletion(
  data: TodayTasksData | undefined,
  taskId: number,
  completedAt: string | null,
): TodayTasksData | undefined {
  if (!data) return data;

  const current = data.tasks.find((task) => task.id === taskId);

  if (!current) return data;

  const wasCompleted = current.completed_at !== null;
  const isCompleted = completedAt !== null;

  if (wasCompleted === isCompleted) return data;

  const tasks = data.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          completed_at: completedAt,
          updated_at: completedAt ?? task.updated_at,
        }
      : task,
  );
  const completed = Math.min(
    data.progress.total,
    Math.max(0, data.progress.completed + (isCompleted ? 1 : -1)),
  );

  return {
    tasks,
    progress: {
      ...data.progress,
      completed,
      remaining: data.progress.total - completed,
    },
  };
}
```

- [ ] **Step 4: Проверить тесты кэша**

Run: `npx vitest run app/lib/tasks/today-tasks-cache.test.ts`

Expected: PASS.

- [ ] **Step 5: Реализовать хук загрузки**

```ts
import { useQuery } from "@tanstack/react-query";

import {
  todayTasksQueryKey,
  type TodayTasksData,
} from "~/lib/tasks/today-tasks-cache";
import { fetchTasks, fetchTodayProgress } from "~/lib/tasks/tasks-api";

async function fetchTodayTasks(
  date: string,
  signal: AbortSignal,
): Promise<TodayTasksData> {
  const [tasks, progress] = await Promise.all([
    fetchTasks({ date, status: "all", limit: 100 }, signal),
    fetchTodayProgress(signal),
  ]);

  return { tasks: tasks.items, progress };
}

export function useTodayTasksData(timeZone: string, date: string) {
  return useQuery({
    queryKey: todayTasksQueryKey(timeZone, date),
    queryFn: ({ signal }) => fetchTodayTasks(date, signal),
  });
}
```

- [ ] **Step 6: Реализовать мутацию с оптимистичным обновлением**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { completeTask, uncompleteTask } from "~/lib/tasks/tasks-api";
import {
  applyTaskCompletion,
  todayTasksQueryKey,
  type TodayTasksData,
} from "~/lib/tasks/today-tasks-cache";
import { useTelegram } from "~/providers/telegram-provider";

export interface ToggleTaskCompletionVariables {
  taskId: number;
  nextCompleted: boolean;
}

export function useToggleTaskCompletion(timeZone: string, date: string) {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();
  const queryKey = todayTasksQueryKey(timeZone, date);

  return useMutation({
    mutationFn: ({ taskId, nextCompleted }: ToggleTaskCompletionVariables) =>
      nextCompleted ? completeTask(taskId) : uncompleteTask(taskId),
    onMutate: async ({ taskId, nextCompleted }) => {
      haptics.selection();
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TodayTasksData>(queryKey);

      queryClient.setQueryData<TodayTasksData>(queryKey, (data) =>
        applyTaskCompletion(
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
      queryClient.setQueryData<TodayTasksData>(queryKey, (data) =>
        data
          ? {
              ...data,
              tasks: data.tasks.map((task) =>
                task.id === updatedTask.id ? updatedTask : task,
              ),
            }
          : data,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
```

Ключ `todayTasksQueryKey` объявлен в `today-tasks-cache.ts` и
импортируется в оба хука; query и mutation обязаны использовать один и
тот же ключ.

- [ ] **Step 7: Проверить типы и тесты**

Run:
`npx vitest run app/lib/tasks/today-tasks-cache.test.ts && npm run typecheck`

Expected: PASS и отсутствие ошибок типов.

---

### Task 10: Маршрут `/tasks`, навигация и документация

**Files:**
- Create: `app/hooks/use-bottom-navigation.ts`
- Create: `app/routes/tasks.tsx`
- Modify: `app/routes.ts`
- Modify: `app/routes/home.tsx`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `useTodayTasksData`, `useToggleTaskCompletion`,
  `fetchProjects`, `TodayTasksView`, `TodayTasksSkeleton`,
  `TodayTasksError`, `VoiceRecorderSheet`, `BottomNavigationDock`,
  `useBottomNavigation`.
- Produces: route `/tasks`; навигация нижних вкладок «Главная» /
  «Задачи».

- [ ] **Step 1: Реализовать навигационный хук**

```ts
import { useCallback } from "react";
import { useNavigate } from "react-router";

import type { TabId } from "~/components/home/bottom-navigation";
import { useTelegram } from "~/providers/telegram-provider";

export function useBottomNavigation(): (id: TabId) => void {
  const navigate = useNavigate();
  const { haptics } = useTelegram();

  return useCallback(
    (id: TabId) => {
      haptics.selection();

      if (id === "home") {
        void navigate("/");
      } else if (id === "tasks") {
        void navigate("/tasks");
      }
    },
    [haptics, navigate],
  );
}
```

- [ ] **Step 2: Подключить навигацию на главном экране**

В `app/routes/home.tsx`:

```ts
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
```

В компоненте:

```ts
const onSelectTab = useBottomNavigation();
```

Заменить у `BottomNavigationDock`:

```tsx
<BottomNavigationDock
  active="home"
  hidden={isEditing}
  onSelect={onSelectTab}
/>
```

Хаптика выбора вкладки теперь внутри хука; остальные вызовы `haptics`
(прогресс, FAQ, голос) не трогать.

- [ ] **Step 3: Реализовать route-модуль**

`app/routes/tasks.tsx`:

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { TodayTasksError } from "~/components/tasks/today/today-tasks-error";
import { TodayTasksSkeleton } from "~/components/tasks/today/today-tasks-skeleton";
import { TodayTasksView } from "~/components/tasks/today/today-tasks-view";
import { VoiceRecorderSheet } from "~/components/voice/voice-recorder-sheet";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import {
  useTodayTasksData,
  useToggleTaskCompletion,
} from "~/hooks/use-today-tasks";
import { formatZonedToday, formatZonedTodayLabel } from "~/lib/tasks/date-time";
import { fetchProjects } from "~/lib/projects/projects-api";
import type { TaskResponse } from "~/lib/tasks/types";
import { useAuth } from "~/providers/auth-provider";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/tasks";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Задачи — Milly" },
    { name: "description", content: "Задачи на сегодня в Milly" },
  ];
}

export default function Tasks() {
  const { user } = useAuth();
  const timeZone = user?.timezone ?? "UTC";
  const now = new Date();
  const today = formatZonedToday(now, timeZone);
  const dateLabel = formatZonedTodayLabel(now, timeZone);
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();

  const [expanded, setExpanded] = useState({
    planned: false,
    completed: false,
  });
  const [activeModal, setActiveModal] = useState<"voice" | null>(null);

  const overviewQuery = useTodayTasksData(timeZone, today);
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: ({ signal }) => fetchProjects(signal),
  });
  const toggleMutation = useToggleTaskCompletion(timeZone, today);

  const pendingTaskId = toggleMutation.isPending
    ? (toggleMutation.variables?.taskId ?? null)
    : null;
  const completionError = toggleMutation.isError
    ? "Не удалось обновить задачу. Попробуйте ещё раз."
    : null;
  const overview = overviewQuery.data;

  function handleToggleTask(
    task: TaskResponse,
    nextCompleted: boolean,
  ) {
    toggleMutation.mutate({ taskId: task.id, nextCompleted });
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
        {overviewQuery.isPending ? (
          <TodayTasksSkeleton />
        ) : overviewQuery.isError || overview === undefined ? (
          <TodayTasksError
            dateLabel={dateLabel}
            onRetry={() => void overviewQuery.refetch()}
          />
        ) : (
          <TodayTasksView
            completionError={completionError}
            expanded={expanded}
            now={now}
            onInteractive={() => {
              haptics.selection();
              void navigate("/");
            }}
            onSearch={() => haptics.selection()}
            onToggleExpanded={(group) => {
              haptics.selection();
              setExpanded((current) => ({
                ...current,
                [group]: !current[group],
              }));
            }}
            onToggleTask={handleToggleTask}
            onVoice={() => {
              haptics.impact("light");
              setActiveModal("voice");
            }}
            pendingTaskId={pendingTaskId}
            progress={overview.progress}
            projects={projectsQuery.data ?? []}
            tasks={overview.tasks}
            timeZone={timeZone}
          />
        )}
      </div>

      <BottomNavigationDock active="tasks" onSelect={onSelectTab} />

      <VoiceRecorderSheet
        open={activeModal === "voice"}
        onOpenChange={(open) => setActiveModal(open ? "voice" : null)}
      />
    </main>
  );
}
```

- [ ] **Step 4: Добавить маршрут**

`app/routes.ts`:

```ts
import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/_app.tsx", [
    index("routes/home.tsx"),
    route("tasks", "routes/tasks.tsx"),
  ]),
] satisfies RouteConfig;
```

- [ ] **Step 5: Обновить AGENTS.md**

Добавить в структуру:

- `app/components/tasks/today/` — экран «Задачи на сегодня»;
- `app/lib/tasks/today-tasks.ts`, `today-tasks-cache.ts`;
- `app/hooks/use-today-tasks.ts`, `use-bottom-navigation.ts`;
- `app/routes/tasks.tsx`.

В раздел данных добавить:

- `/tasks` использует `GET /tasks?date=<today>&status=all&limit=100`,
  `GET /tasks/today/progress`,
  `POST /tasks/{id}/complete`, `POST /tasks/{id}/uncomplete`;
- данные загружаются React Query после `AuthGate`, не в loader;
- нижние вкладки «Главная»/«Задачи» навигируют на `/` и `/tasks`.

В проверку перед завершением добавить:

- `/tasks` в light/dark, 320/412/448, safe-area;
- завершение/возврат задачи и откат при ошибке;
- раскрытие групп;
- SSR `/tasks` без задач;
- «Голосом» и «Интерактивно».

- [ ] **Step 6: Сгенерировать типы и проверить типы**

Run: `npm run typecheck`

Expected: PASS; появился `app/routes/+types/tasks.ts` (файл
генерируется, руками не править).

- [ ] **Step 7: Запустить все тесты**

Run: `npm test`

Expected: PASS.

- [ ] **Step 8: Собрать production-сборку**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 9: Проверить SSR**

Run:

```bash
PORT=3000 npm start
curl -s http://localhost:3000/tasks | grep -E "Задачи на сегодня|В планах|Выполнено"
```

Expected: совпадений нет; в SSR только экран загрузки/аутентификации.
Проверить, что `/` по-прежнему отдаёт экран загрузки без защищённого
контента.

- [ ] **Step 10: Проверить 404**

Run: `curl -i http://localhost:3000/does-not-exist`

Expected: HTTP `404` и тексты 404-экрана с нижней навигацией.

- [ ] **Step 11: Ручная проверка**

Проверить в браузере/Telegram:

- `/tasks` в light/dark, 320/412/448px, safe-area;
- активная вкладка «Задачи», переходы «Главная»/«Задачи»;
- сегменты: «Сегодня» активен, иконки скрыты на 320px, поиск/проекты
  не навигируют;
- превью 3/2, «Посмотреть все (N)»/«Свернуть»;
- завершение и возврат задачи, обновление прогресса, haptics;
- ошибка завершения (остановить backend) — откат и alert;
- пустое состояние и все выполнены;
- «Голосом» открывает шторку, «Интерактивно» ведёт на `/`;
- ошибка загрузки и «Повторить»;
- проект без иконки/удалённый проект — fallback.

---

## Self-Review

### 1. Покрытие спецификации

- FR-1 — Task 10.
- FR-2 — Task 4, Task 5, Task 8, Task 10.
- FR-3 — Task 3, Task 5, Task 8.
- FR-4 — Task 1, Task 3, Task 6, Task 8.
- FR-5 — Task 9, Task 10.
- FR-6 — Task 7, Task 10.
- FR-7 — Task 3, Task 8, Task 10.
- FR-8 — Task 2, Task 9, Task 10.
- FR-9 — Task 4, Task 5, Task 6, Task 7, Task 8.
- Визуальная спецификация — Tasks 4–8.
- Тёмная тема и токен `app-progress-track` — Task 5.
- Навигация — Task 10.
- Документация — Task 10.

### 2. Проверка шагов

Каждый шаг содержит либо тест с утверждениями, либо сигнатуру/ключевые
значения, либо команду с ожидаемым результатом. Нет шагов «сделать
красиво» или «обработать крайние случаи» без конкретики.

### 3. Согласованность типов

- `TodayTasksData` определён в `today-tasks-cache.ts`, импортируется в
  `use-today-tasks.ts` и `TodayTasksView`/route.
- `TaskListQuery`, `TaskListResponse`, `TodayProgressResponse` — Task 2.
- `TodayTaskRow`/`TodayTaskGroup` используют `ProjectResponse` и
  `TaskResponse` из существующих модулей.
- `TodayTasksView` получает `expanded` и `onToggleExpanded`; route
  владеет `useState`.
- `useToggleTaskCompletion` использует тот же ключ, что и
  `useTodayTasksData`.
- `SegmentedControl` options используют `id`, `label`, `iconSrc`,
  `disabled`; `value="today"`.

### 4. Review Focus

- 320px и сегменты — Task 4 (`max-[359px]:hidden`), Task 10 (ручная
  проверка).
- Оптимистичное завершение и откат — Task 9 (кэш-тесты), Task 10
  (ручная проверка ошибки).
- Пусто vs всё выполнено — Task 3 (state), Task 8 (view-тесты).
- Приоритет и завершённая строка — Task 6 (row-тесты).
- Проект недоступен — Task 6 (fallback), Task 8 (projects missing).
- Часовой пояс — Task 1 (тесты), Task 10 (ручная проверка).
- SSR — Task 10 (curl).

### 5. Пропорция

План описывает интерфейсы, тесты и ключевые алгоритмы; тела
компонентов не переписываются целиком, кроме точной разметки, которую
нельзя вывести из спеки. Реализация остаётся за исполнителем.

---

## Execution Handoff

После утверждения спецификации и плана выбрать способ выполнения:

- **Subagent-driven** — каждая задача выполняется отдельным субагентом,
  затем проверяется ревьюером; подходит, если важна независимая
  проверка задач.
- **Native** — исполнитель проходит задачи в текущей сессии; быстрее и
  дешевле, одна финальная проверка.

Рекомендуется **Subagent-driven** для Tasks 1–9 (много независимых
файлов и тестов) и финальная ручная проверка Task 10. Реализацию не
начинать до подтверждения spec и plan.
