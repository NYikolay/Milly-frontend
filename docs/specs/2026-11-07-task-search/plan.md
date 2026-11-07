# Task Search Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать защищённый экран `/tasks/search` с серверным поиском задач на сегодня и состояниями «дефолт / активен фильтр / задач не нашлось» в светлой и тёмной темах.

**Architecture:** Новый маршрут внутри `routes/_app.tsx` использует `GET /tasks?date=<today>&status=all&limit=100&q=<query>` через React Query после `AuthGate`. Общий `TaskSegments` связывает `/tasks` и `/tasks/search`; `SearchField`, `OptionChip`, `TodayTaskRow` переиспользуются. Панель фильтров — визуальные заглушки; состояние активного фильтра доступно только в dev-preview `?state=filter`.

**Tech Stack:** React 19, React Router 8 (SSR), TypeScript 5.9 (strict), Tailwind CSS 4, React Query 5, Vitest 5.

**Spec:** `docs/specs/2026-11-07-task-search/spec.md`

## Global Constraints

- Только токены `app-*`; без `dark:`-классов и хардкода цветов Telegram.
- Без новых зависимостей и изменений backend/OpenAPI.
- Фильтры — визуальные заглушки: `aria-disabled`, `tabIndex={-1}`, без `aria-haspopup`; шторки фильтров не реализуются.
- Поиск только за сегодняшний локальный день; пагинация не реализуется (`limit=100`, `next_cursor` игнорируется).
- Поиск при каждом изменении поля, без debounce; `q.trim()`, пустой `q` не отправляется.
- TypeScript strict, без `any`; типы — через `import type`.
- Файлы — `kebab-case`, компоненты — `PascalCase`, алиас `~/`.
- Тесты — Vitest, окружение `node`, файлы `app/**/*.test.ts`, `createElement` + `renderToStaticMarkup`; без testing-library/jsdom.
- Линтера нет; `npm run lint` не добавлять.
- Не коммитить: пользователь не давал разрешения.
- Не начинать реализацию до утверждения спецификации и плана.

## Review Focus

- **SSR без утечки данных:** `/tasks/search` в SSR содержит только публичную оболочку/скелетон; названия задач, проектов и счётчики не попадают в HTML. Тест `search-tasks-skeleton.test.ts` + ручной `curl`.
- **Навигация сегментов:** «Поиск задач» на `/tasks` включён, «Сегодня» на поиске возвращает на `/tasks`, повторный тап активного сегмента не пушит историю, «Проекты» disabled; haptics один раз. Тесты `task-segments.test.ts`, `use-task-segment-navigation.test.ts`.
- **Фон поискового поля:** на странице `bg-app-stroke`, в шторках быстрого создания по умолчанию `bg-app-track`. Тест `search-field.test.ts`.
- **Фильтры-заглушки:** 5 элементов, все `aria-disabled`, `tabIndex={-1}`, без `aria-haspopup`, без шторок; бейдж/активный чип только в dev-preview. Тесты `search-filter-bar.test.ts`, `option-chip.test.ts`, `task-search.test.ts`.
- **Сегодняшняя дата и счётчик:** `Задачи на DD.MM.YYYY (N)` всегда с количеством, включая `(0)`, в часовом поясе пользователя; завершённые задачи не исчезают. Тесты `date-time.test.ts`, `search-results.test.ts`.
- **Оптимистичное завершение:** кэш поиска обновляется и откатывается, `next_cursor` сохраняется, pending только у выбранной строки. Тесты `search-tasks-cache.test.ts`, `use-search-tasks.test.ts`.
- **Состояния:** скелетон только при первой загрузке, пустое состояние только после успешного ответа, при ошибке с предыдущими данными список сохраняется. Тест `task-search.test.ts`.
- **Заголовок страницы:** «Поиск задач» и подзаголовок видны на всех состояниях, включая загрузку/ошибку. Тесты `search-header.test.ts`, `task-search.test.ts`.

---

### Task 1: Search query parameter and numeric date helper

**Files:**
- Modify: `app/lib/tasks/types.ts`
- Modify: `app/lib/tasks/tasks-api.ts`
- Modify: `app/lib/tasks/date-time.ts`
- Test: `app/lib/tasks/tasks-api.test.ts`
- Test: `app/lib/tasks/date-time.test.ts`

**Interfaces:**
- Consumes: existing `TaskListQuery`, `buildTaskListPath`, private `formatNumericDate(date: string): string`.
- Produces: `TaskListQuery.q?: string`; exported `formatNumericDate(date: string): string` (`DD.MM.YYYY`).

- [ ] **Step 1: Add failing tests**

Append to `tasks-api.test.ts` under `describe("tasks list API")`:

```ts
it("fetches tasks with a search query", async () => {
  apiRequestMock.mockResolvedValue({ items: [], next_cursor: null });

  await fetchTasks({
    date: "2026-11-06",
    status: "all",
    limit: 100,
    q: "report",
  });

  expect(apiRequestMock).toHaveBeenCalledWith(
    "/tasks?date=2026-11-06&status=all&limit=100&q=report",
    { signal: undefined },
  );
});

it("omits an empty search query", async () => {
  apiRequestMock.mockResolvedValue({ items: [], next_cursor: null });

  await fetchTasks({ q: "" });

  expect(apiRequestMock).toHaveBeenCalledWith("/tasks", {
    signal: undefined,
  });
});
```

Add `formatNumericDate` to the imports in `date-time.test.ts` and append:

```ts
describe("formatNumericDate", () => {
  it("formats an ISO date as DD.MM.YYYY", () => {
    expect(formatNumericDate("2026-10-29")).toBe("29.10.2026");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/lib/tasks/tasks-api.test.ts app/lib/tasks/date-time.test.ts`
Expected: FAIL — `q` is not in `TaskListQuery`, query string mismatch, `formatNumericDate` not exported.

- [ ] **Step 3: Implement**

- In `TaskListQuery`, add `q?: string`.
- At the end of `buildTaskListPath`, before computing `search`:
  `if (query.q !== undefined && query.q !== "") params.set("q", query.q);`
- Export the existing private `formatNumericDate` in `date-time.ts` unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/lib/tasks/tasks-api.test.ts app/lib/tasks/date-time.test.ts`
Expected: PASS.

---

### Task 2: Search cache, query hook and completion mutation

**Files:**
- Create: `app/lib/tasks/search-tasks-cache.ts`
- Create: `app/hooks/use-search-tasks.ts`
- Test: `app/lib/tasks/search-tasks-cache.test.ts`
- Test: `app/hooks/use-search-tasks.test.ts`

**Interfaces:**
- Consumes: `TaskListResponse`, `TaskResponse`, `completeTask`, `uncompleteTask`, `fetchTasks`, `QueryClient`, `TelegramHaptics`.
- Produces:
  - `searchTasksQueryKey(timeZone: string, date: string, query: string): readonly ["tasks", "search", string, string, string]`
  - `applySearchTaskCompletion(data: TaskListResponse | undefined, taskId: number, completedAt: string | null): TaskListResponse | undefined`
  - `ToggleSearchTaskMutationOptions` (`previous: TaskListResponse | undefined`)
  - `createToggleSearchTaskMutationOptions({ queryClient, haptics, queryKey })`
  - `useSearchTasksData(timeZone: string, date: string, query: string)`
  - `useToggleSearchTaskCompletion(timeZone: string, date: string, query: string)`

- [ ] **Step 1: Write failing cache tests**

Create `search-tasks-cache.test.ts`. Reuse the task factory shape from `today-tasks-view.test.ts` and assert:

```ts
it("keeps the search key under the tasks prefix", () => {
  expect(searchTasksQueryKey("Europe/Moscow", "2026-11-06", "отчёт")).toEqual([
    "tasks",
    "search",
    "Europe/Moscow",
    "2026-11-06",
    "отчёт",
  ]);
});

it("completes a task and preserves the cursor", () => {
  const next = applySearchTaskCompletion(
    data(),
    1,
    "2026-11-06T10:00:00.000Z",
  );

  expect(next?.items[0].completed_at).toBe("2026-11-06T10:00:00.000Z");
  expect(next?.items[0].updated_at).toBe("2026-11-06T10:00:00.000Z");
  expect(next?.next_cursor).toBe("next-page");
});

it("uncompletes a task", () => {
  expect(applySearchTaskCompletion(data(), 2, null)?.items[1].completed_at)
    .toBeNull();
});

it("returns the same data for unknown tasks and no-op transitions", () => {
  const unchanged = data();

  expect(applySearchTaskCompletion(unchanged, 99, null)).toBe(unchanged);
  expect(applySearchTaskCompletion(unchanged, 1, null)).toBe(unchanged);
  expect(applySearchTaskCompletion(undefined, 1, null)).toBeUndefined();
});
```

Use `TaskListResponse` data with `items: [task({ id: 1 }), task({ id: 2, completed_at: "..." })]` and `next_cursor: "next-page"`.

- [ ] **Step 2: Write failing mutation tests**

Create `use-search-tasks.test.ts` by copying `use-today-tasks.test.ts` and replacing `TodayTasksData` with `TaskListResponse` / `items`. Keep the same four cases:

- optimistic completion updates `items[0].completed_at` and fires `haptics.selection`;
- optimistic uncompletion clears `items[1].completed_at`;
- `onError` restores the exact previous snapshot and fires `notification("error")`;
- `onSuccess` replaces the matching task with the server response and fires `notification("success")`;
- `onSettled` invalidates `["tasks"]` and `["projects"]`.

Add one assertion that the optimistic result keeps `next_cursor`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run app/lib/tasks/search-tasks-cache.test.ts app/hooks/use-search-tasks.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 4: Implement the cache helper**

Create `search-tasks-cache.ts`:

```ts
import type { TaskListResponse } from "./types";

export function searchTasksQueryKey(
  timeZone: string,
  date: string,
  query: string,
) {
  return ["tasks", "search", timeZone, date, query] as const;
}

export function applySearchTaskCompletion(
  data: TaskListResponse | undefined,
  taskId: number,
  completedAt: string | null,
): TaskListResponse | undefined {
  if (!data) return data;

  const current = data.items.find((task) => task.id === taskId);

  if (!current) return data;

  const wasCompleted = current.completed_at !== null;
  const isCompleted = completedAt !== null;

  if (wasCompleted === isCompleted) return data;

  return {
    ...data,
    items: data.items.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completed_at: completedAt,
            updated_at: completedAt ?? task.updated_at,
          }
        : task,
    ),
  };
}
```

- [ ] **Step 5: Implement the hooks**

Create `use-search-tasks.ts`.

`useSearchTasksData(timeZone, date, query)` is a `useQuery` with:

- `queryKey: searchTasksQueryKey(timeZone, date, query)`;
- `queryFn: ({ signal }) => fetchTasks({ date, status: "all", limit: 100, q: query === "" ? undefined : query }, signal)`;
- `placeholderData: keepPreviousData` imported from `@tanstack/react-query`.

The mutation is the existing `createToggleTaskMutationOptions` / `useToggleTaskCompletion` pattern from `app/hooks/use-today-tasks.ts`, with these exact differences:

- cache type is `TaskListResponse` (not `TodayTasksData`);
- optimistic helper is `applySearchTaskCompletion`;
- success maps `data.items` instead of `data.tasks`;
- invalidation, haptics and mutation functions stay identical (`completeTask` / `uncompleteTask`, `["tasks"]`, `["projects"]`).

Export `createToggleSearchTaskMutationOptions`, its option/context interfaces, `useSearchTasksData` and `useToggleSearchTaskCompletion`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run app/lib/tasks/search-tasks-cache.test.ts app/hooks/use-search-tasks.test.ts`
Expected: PASS.

---

### Task 3: Shared task segments and navigation

**Files:**
- Create: `app/components/tasks/task-segments.tsx`
- Create: `app/hooks/use-task-segment-navigation.ts`
- Modify: `app/components/tasks/today/today-tasks-view.tsx`
- Modify: `app/components/tasks/today/today-tasks-error.tsx`
- Modify: `app/routes/tasks.tsx`
- Test: `app/components/tasks/task-segments.test.ts`
- Test: `app/hooks/use-task-segment-navigation.test.ts`
- Test: `app/components/tasks/today/today-tasks-view.test.ts`

**Interfaces:**
- Consumes: existing `SegmentedControl`, `useNavigate`, `useLocation`, `useTelegram().haptics`.
- Produces:
  - `TaskSegmentId = "today" | "search" | "projects"`
  - `TASK_SEGMENTS`
  - `TaskSegments({ value, onSelect }: { value: TaskSegmentId; onSelect: (id: TaskSegmentId) => void })`
  - `useTaskSegmentNavigation(): (id: TaskSegmentId) => void`
  - `TodayTasksViewProps.onSelectSegment: (id: TaskSegmentId) => void`
  - `TodayTasksErrorProps.onSelectSegment: (id: TaskSegmentId) => void`

- [ ] **Step 1: Write failing tests**

Create `task-segments.test.ts`:

```ts
it("enables today and search and keeps projects disabled", () => {
  const html = render("today");

  expect(html).toContain('aria-label="Разделы задач"');
  expect(html.match(/aria-disabled="true"/g)?.length).toBe(1);
  expect(html.match(/tabindex="-1"/g)?.length).toBe(2);
  expect(html).toContain("Сегодня");
  expect(html).toContain("Поиск задач");
  expect(html).toContain("Проекты");
});

it("marks the search segment active on the search screen", () => {
  const html = render("search");

  expect(html.match(/aria-selected="true"/g)?.length).toBe(1);
});
```

`render(value)` uses `createElement(TaskSegments, { value, onSelect: () => {} })`.

Create `use-task-segment-navigation.test.ts` using the `Probe` pattern from `use-bottom-navigation.test.ts`. Mock `react-router` (`useLocation`, `useNavigate`) and `~/providers/telegram-provider`; assert:

- from `/tasks`, `onSelect("search")` fires `haptics.selection` once and `navigate("/tasks/search")`;
- from `/tasks/search`, `onSelect("today")` navigates to `/tasks`;
- re-tapping the active segment fires selection and does not navigate;
- `onSelect("projects")` fires selection and does not navigate.

Update `today-tasks-view.test.ts`: add `onSelectSegment: () => {}` to the `renderView` defaults and to the `TodayTasksError` props, and assert exactly one `aria-disabled="true"` in the default state.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/components/tasks/task-segments.test.ts app/hooks/use-task-segment-navigation.test.ts app/components/tasks/today/today-tasks-view.test.ts`
Expected: FAIL — modules do not exist, `onSelectSegment` missing.

- [ ] **Step 3: Implement `TaskSegments`**

Create `task-segments.tsx` with the three options in order: `today` («Сегодня», `circle-check.svg`), `search` («Поиск задач», `search.svg`), `projects` («Проекты», `dashboard.svg`, `disabled: true`). Render `SegmentedControl` with `ariaLabel="Разделы задач"`, the options, the `value`, and `onChange={(id) => onSelect(id as TaskSegmentId)}`.

- [ ] **Step 4: Implement the navigation hook**

Create `use-task-segment-navigation.ts`: `SEGMENT_PATHS = { today: "/tasks", search: "/tasks/search" }`; always call `haptics.selection()`; navigate only when the target path exists and differs from `location.pathname`; no-op for `projects`.

- [ ] **Step 5: Update `/tasks`**

- `TodayTasksView`: remove `TODAY_SEGMENTS` and icon imports; import `TaskSegments` / `TaskSegmentId`; add `onSelectSegment: (id: TaskSegmentId) => void`; render `<TaskSegments onSelect={onSelectSegment} value="today" />` in the existing `pb-[15px] pt-[15px]` wrapper.
- `TodayTasksError`: same replacement; add the prop.
- `tasks.tsx`: `const onSelectSegment = useTaskSegmentNavigation();` and pass it to both components.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run app/components/tasks/task-segments.test.ts app/hooks/use-task-segment-navigation.test.ts app/components/tasks/today/today-tasks-view.test.ts`
Expected: PASS.

---

### Task 4: Search field variant, disabled chips, header and filter bar

**Files:**
- Create: `app/assets/icons/adjustments-horizontal.svg`
- Modify: `app/components/ui/search-field.tsx`
- Modify: `app/components/ui/option-chip.tsx`
- Create: `app/components/tasks/search/search-header.tsx`
- Create: `app/components/tasks/search/search-filter-bar.tsx`
- Test: `app/components/ui/search-field.test.ts`
- Test: `app/components/ui/option-chip.test.ts`
- Test: `app/components/tasks/search/search-header.test.ts`
- Test: `app/components/tasks/search/search-filter-bar.test.ts`

**Interfaces:**
- Consumes: existing `SearchField`, `OptionChip`, `AssetIcon`.
- Produces:
  - `SearchFieldProps.variant?: "track" | "stroke"` (default `"track"`)
  - `OptionChipProps.disabled?: boolean` (default `false`)
  - `SearchHeader()`
  - `SearchFilterBar({ activeFilterCount, activeChip }: { activeFilterCount: number; activeChip: "priority" | "project" | "recurrence" | null })`

- [ ] **Step 1: Write failing tests**

`search-field.test.ts` — extend the helper with `variant?: "track" | "stroke"` and assert:

```ts
it("keeps the track surface by default", () => {
  const html = render("");

  expect(html).toContain("bg-app-track");
  expect(html).not.toContain("bg-app-stroke");
});

it("uses the stroke surface on the search page", () => {
  const html = render("", "stroke");

  expect(html).toContain("bg-app-stroke");
  expect(html).not.toContain("bg-app-track");
});
```

`option-chip.test.ts` — append:

```ts
it("marks a disabled placeholder and removes dialog semantics", () => {
  const html = renderToStaticMarkup(
    createElement(OptionChip, {
      disabled: true,
      label: "Проект",
      onClick: () => {},
      ariaLabel: "Фильтр по проекту",
    }),
  );

  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('tabindex="-1"');
  expect(html).not.toContain("aria-haspopup");
});
```

`search-header.test.ts` — assert the title, subtitle and classes `text-[24px]`, `tracking-[-0.8px]`, `text-[13px]`, `text-app-text-secondary`, `px-[15px]`, `gap-[5px]`.

`search-filter-bar.test.ts`:

```ts
it("renders five disabled placeholders in the Figma order", () => {
  const html = render();

  expect(html).toContain("Все фильтры");
  expect(html).toContain("Фильтр по дате");
  expect(html).toContain("По приоритету");
  expect(html).toContain("Проект");
  expect(html).toContain("Периодичность");
  expect(html).toContain("adjustments-horizontal.svg");
  expect(html).toContain("calendar.svg");
  expect(html.match(/aria-disabled="true"/g)?.length).toBe(5);
  expect(html).not.toContain("aria-haspopup");
  expect(html).toContain("[scrollbar-width:none]");
  expect(html).toContain("overflow-x-auto");
});

it("shows the active badge and project chip only in the preview state", () => {
  const html = render(1, "project");

  expect(html).toContain("Все фильтры, активно: 1");
  expect(html).toContain("bg-app-accent");
  expect(html).toContain("border-app-accent");
  expect(html).toContain("text-app-accent");
  expect(html).toContain(">1<");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/components/ui/search-field.test.ts app/components/ui/option-chip.test.ts app/components/tasks/search/search-header.test.ts app/components/tasks/search/search-filter-bar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add the sliders icon**

Create `app/assets/icons/adjustments-horizontal.svg` with three horizontal lines and three knobs, `stroke="currentColor"`, `stroke-width="1.5"`, `24×24` (Tabler `adjustments-horizontal` shape).

- [ ] **Step 4: Add `SearchField` variant and `OptionChip` disabled**

`SearchField`: add `variant?: "track" | "stroke"`; compute
`const surfaceClassName = variant === "stroke" ? "bg-app-stroke" : "bg-app-track";`
and use it instead of the hardcoded `bg-app-track`. Change nothing else.

`OptionChip`: add `disabled?: boolean`; when true render `aria-disabled="true"`, `tabIndex={-1}`, omit `aria-haspopup`, and guard `onClick`. Enabled chips keep `aria-haspopup="dialog"`.

- [ ] **Step 5: Implement `SearchHeader` and `SearchFilterBar`**

`SearchHeader`: `header` with `flex flex-col gap-[5px] px-[15px]`; `h1` «Поиск задач» with `text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text`; `p` with the exact subtitle and `text-[13px] leading-[1.4] text-app-text-secondary`.

`SearchFilterBar`: root
`-mx-4 flex shrink-0 gap-[5px] overflow-x-auto pl-4 pt-[5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`.
Children in order:

1. relative wrapper with `OptionChip` (icon-only, `adjustments-horizontal.svg` at `24px`, `active={activeFilterCount > 0}`, `disabled`, aria-label `Все фильтры` or `Все фильтры, активно: N`) and a conditional badge `absolute right-[4px] top-[5px] flex size-[10px] items-center justify-center rounded-full bg-app-accent text-[6px] font-semibold leading-none text-white`, `aria-hidden`.
2. icon-only `OptionChip` «Фильтр по дате» with `calendar.svg`.
3. chips «По приоритету» / «Проект» / «Периодичность» with `chevron-down.svg` at `size-4`, `disabled`, `active` matching `activeChip`.

All five controls are `disabled` with no-op `onClick`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run app/components/ui/search-field.test.ts app/components/ui/option-chip.test.ts app/components/tasks/search/search-header.test.ts app/components/tasks/search/search-filter-bar.test.ts`
Expected: PASS.

---

### Task 5: Results list, empty state, skeleton and error card

**Files:**
- Create: `app/components/tasks/search/search-empty-card.tsx`
- Create: `app/components/tasks/search/search-results.tsx`
- Create: `app/components/tasks/search/search-tasks-skeleton.tsx`
- Create: `app/components/tasks/search/search-tasks-error.tsx`
- Test: `app/components/tasks/search/search-results.test.ts`
- Test: `app/components/tasks/search/search-tasks-skeleton.test.ts`
- Test: `app/components/tasks/search/search-tasks-error.test.ts`

**Interfaces:**
- Consumes: `TodayTaskRow`, `Skeleton`, `formatNumericDate`, `TaskResponse`, `ProjectResponse`.
- Produces:
  - `SearchResults({ date, tasks, projects, timeZone, pendingTaskId, completionError, onToggleTask })`
  - `SearchEmptyCard()`
  - `SearchTasksSkeleton()`
  - `SearchTasksError({ onRetry })`

- [ ] **Step 1: Write failing tests**

`search-results.test.ts` — reuse the task/project factories from `today-tasks-view.test.ts`; render with defaults (`date: "2026-10-29"`, empty tasks/projects). Assert:

- one task + project: `Задачи на 29.10.2026 (1)`, title, project name, `role="checkbox"`, `aria-labelledby="search-results-title"`;
- empty tasks: `Задачи на 29.10.2026 (0)`, `К сожалению задач не найдено`, `😔`, `min-h-[90px]`, `rounded-[25px] bg-app-card p-[15px]`;
- completion error: `role="alert"`, exact copy «Не удалось обновить задачу. Попробуйте ещё раз.», `text-app-destructive`;
- missing project: `Без проекта` and `file.svg`.

`search-tasks-skeleton.test.ts` — assert `aria-busy="true"`, `aria-label="Загружаем задачи"`, `role="status"`, `skeleton-shimmer`, `min-h-[67px]`, and no `Задачи на` / `Повторить`.

`search-tasks-error.test.ts` — assert «Не удалось загрузить задачи», `role="alert"`, «Повторить», `rounded-[25px] bg-app-card p-[15px]`, `text-[15px] font-semibold text-app-accent`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/components/tasks/search/search-results.test.ts app/components/tasks/search/search-tasks-skeleton.test.ts app/components/tasks/search/search-tasks-error.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the four components**

`SearchEmptyCard`: card `rounded-[25px] bg-app-card p-[15px]`; inside `flex min-h-[90px] w-full flex-col items-center justify-center gap-[6px]`; `span aria-hidden="true"` with `text-[50px] leading-[1.3]` and `😔`; `p` with «К сожалению задач не найдено», `text-center text-[15px] leading-[1.3] text-app-text-secondary`.

`SearchResults`: `section aria-labelledby="search-results-title"` with `flex flex-1 flex-col gap-2 pt-4`; completion error `p role="alert"` with `px-[15px] text-[13px] leading-[1.4] text-app-destructive`; `h2 id="search-results-title"` with `px-[15px] text-[15px] font-semibold leading-[18px] text-app-text-secondary` and text `Задачи на {formatNumericDate(date)} ({tasks.length})`; if empty render `SearchEmptyCard`, else `ul` with `rounded-[25px] bg-app-card px-[15px] py-[15px]` and map `TodayTaskRow` with `isLast={index === tasks.length - 1}`, `isPending`, project lookup, `timeZone`, `onToggle`.

`SearchTasksSkeleton`: `section role="status" aria-busy="true" aria-label="Загружаем задачи"` with `pt-4`; title `Skeleton` `mx-[15px] h-[18px] w-1/2 rounded-[6px]`; card `rounded-[25px] bg-app-card px-[15px] py-[15px]`; three rows mirroring `TodayTasksSkeleton` (`min-h-[67px]`, 35px circle, title/meta skeletons, 24px circle, divider except last).

`SearchTasksError`: `div pt-4` with card `flex flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]` `role="alert"`; `p` «Не удалось загрузить задачи» `text-[17px] font-semibold leading-[1.4] text-app-text`; retry button with the exact classes from `TodayTasksError`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/components/tasks/search/search-results.test.ts app/components/tasks/search/search-tasks-skeleton.test.ts app/components/tasks/search/search-tasks-error.test.ts`
Expected: PASS.

---

### Task 6: Search route composition and dev preview

**Files:**
- Create: `app/routes/task-search.tsx`
- Modify: `app/routes.ts`
- Test: `app/routes/task-search.test.ts`

**Interfaces:**
- Consumes: `TaskSegments`, `SearchHeader`, `SearchField`, `SearchFilterBar`, `SearchResults`, `SearchTasksSkeleton`, `SearchTasksError`, `AddTaskButton`, `BottomNavigationDock`, `useSearchTasksData`, `useToggleSearchTaskCompletion`, `useTaskSegmentNavigation`, `useBottomNavigation`, `fetchProjects`, `formatZonedToday`.
- Produces: protected `/tasks/search`; `loader` returns `{ activeFilterPreview: boolean }`.

- [ ] **Step 1: Write the failing route test**

Create `task-search.test.ts` following the mock structure of `app/routes/tasks.test.ts`:

- `@tanstack/react-query`: `useQuery: () => ({ data: [] })`;
- `react-router`: `useNavigate` no-op;
- `~/hooks/use-search-tasks`: controlled `useSearchTasksData` and `useToggleSearchTaskCompletion`;
- `~/hooks/use-task-segment-navigation` and `~/hooks/use-bottom-navigation`: no-op callbacks;
- auth (timezone `UTC`) and Telegram haptics;
- child mocks rendering `SEGMENTS:<value>`, `HEADER`, `FILTERS:<count>:<chip|null>`, `RESULTS:<titles>:<completionError>`, `SKELETON`, `ERROR`;
- `AddTaskButton` / `BottomNavigationDock` return null.

Render with `createElement(TaskSearch, { loaderData: { activeFilterPreview } } as never)`. Assert:

- data: `SEGMENTS:search`, `HEADER`, `RESULTS:Плановая задача:`, `FILTERS:0:none`;
- pending: `SKELETON`;
- no data: `ERROR`;
- toggle error: `RESULTS:Плановая задача:Не удалось обновить задачу. Попробуйте ещё раз.`;
- preview: `FILTERS:1:project`.

Loader tests (call `loader({ request })` with a `Request`):

- `vi.stubEnv("DEV", true)` + `?state=filter` → `{ activeFilterPreview: true }`; without the param → `false`;
- `vi.stubEnv("DEV", false)` + `?state=filter` → `false`;
- `afterEach(() => vi.unstubAllEnvs())`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/routes/task-search.test.ts`
Expected: FAIL — route module does not exist.

- [ ] **Step 3: Implement the route**

Create `task-search.tsx`:

- `meta`: title `Поиск задач — Milly`, description `Поиск задач в Milly`.
- `loader`: `const state = new URL(request.url).searchParams.get("state"); return { activeFilterPreview: import.meta.env.DEV && state === "filter" };`
- Component:
  - `useAuth` timezone `UTC` fallback; `now = new Date()`; `today = formatZonedToday(now, timeZone)`;
  - `const [inputValue, setInputValue] = useState(""); const query = inputValue.trim();`
  - `useTelegram().haptics`, `useNavigate`, `useBottomNavigation`, `useTaskSegmentNavigation`;
  - `useSearchTasksData(timeZone, today, query)`, `useQuery(["projects"], fetchProjects)`, `useToggleSearchTaskCompletion(timeZone, today, query)`;
  - `pendingTaskId` / `completionError` exactly as in `tasks.tsx`;
  - `activeFilterCount = loaderData.activeFilterPreview ? 1 : 0`; `activeChip = loaderData.activeFilterPreview ? "project" as const : null`;
  - `handleToggleTask` calls `toggleMutation.mutate`; `handleAddTask` fires `haptics.selection()` and navigates to `/`;
  - render `main` with the same content wrapper as `/tasks` (`px-4`, `gap-2`, bottom padding `calc(145px + max(0px, 30px - var(--app-inset-bottom)))`), then the `pb-[15px] pt-[15px]` wrapper with `<TaskSegments value="search" onSelect={onSelectSegment} />`, `<SearchHeader />`, `<SearchField ariaLabel="Поиск задач" value={inputValue} onChange={setInputValue} variant="stroke" />`, `<SearchFilterBar activeFilterCount={activeFilterCount} activeChip={activeChip} />`;
  - result branch: `isPending` → `SearchTasksSkeleton`; `data === undefined` → `SearchTasksError` with `onRetry={() => void searchQuery.refetch()}`; else `SearchResults` with `date={today}`, `tasks={data.items}`, `projects={projectsQuery.data ?? []}`, `timeZone`, `pendingTaskId`, `completionError`, `onToggleTask`;
  - `AddTaskButton` and `BottomNavigationDock active="tasks"`.

- [ ] **Step 4: Register the route**

In `app/routes.ts`, add inside the `_app` layout after `route("tasks", ...)`:

```ts
route("tasks/search", "routes/task-search.tsx"),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/routes/task-search.test.ts`
Expected: PASS.

- [ ] **Step 6: Generate route types and typecheck**

Run: `npm run typecheck`
Expected: PASS; `.react-router/types/+types/task-search.d.ts` is generated.

---

### Task 7: Documentation and full verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/specs/2026-11-06-today-tasks/spec.md`

- [ ] **Step 1: Update `AGENTS.md` structure**

Add to the structure block:

```text
    tasks/search/             # экран «Поиск задач»
    ...
    use-search-tasks.ts       # данные и оптимистичное завершение задач поиска
    use-task-segment-navigation.ts  # навигация «Сегодня»/«Поиск задач»
    ...
      search-tasks-cache.ts   # кэш и оптимистичное завершение задач поиска
    ...
    task-search.tsx           # экран «Поиск задач» на /tasks/search
```

Place each line in its matching section (`tasks/`, hooks, `lib/tasks/`, routes).

- [ ] **Step 2: Update `AGENTS.md` data rules**

Add after the `/tasks` bullet in section 3:

```text
- `/tasks/search` использует `GET /tasks?date=<today>&status=all&limit=100&q=<query>`
  и `GET /projects?limit=100`; данные загружаются React Query после `AuthGate`.
  Поиск серверный по `title`/`description`, выполняется при каждом изменении поля
  (`q.trim()`, пустой `q` не отправляется); предыдущие результаты остаются до
  ответа нового запроса. Завершение задачи оптимистично обновляет кэш поиска и
  инвалидирует `["tasks"]` и `["projects"]`. Пагинация не реализована
  (`limit=100`, `next_cursor` игнорируется). Кнопки и чипы фильтров — визуальные
  заглушки, шторки фильтров вне scope. Dev-preview `?state=filter` показывает
  бейдж «1» и активный чип «Проект» только в dev-режиме.
```

- [ ] **Step 3: Update `AGENTS.md` UI and manual-check rules**

Add to section 5:

```text
- Экран «Поиск задач» повторяет каркас `/tasks`: сегменты «Сегодня/Поиск задач/
  Проекты», заголовок «Поиск задач», поисковое поле `SearchField`
  с `variant="stroke"`, горизонтальная панель фильтров и карточка результатов
  на `TodayTaskRow`. Заголовок и подзаголовок показываются всегда; заголовок
  списка — `Задачи на DD.MM.YYYY (N)`, включая `(0)`. Только токены `app-*`;
  ширины `320 / 412 / 448px`, light/dark и safe-area не ломаются.
```

Add to section 7 before the final tests bullet:

```text
- `/tasks/search` вручную проверить в light/dark, на ширинах 320/412/448 px
  и с safe-area: сегмент «Поиск задач» активен, «Сегодня» возвращает на `/tasks`,
  «Проекты» недоступен; нижняя вкладка «Задачи», FAB ведёт на `/`. Поиск
  фильтрует задачи на сегодня; пустой запрос возвращает весь список; пустое
  состояние показывает 😔 и «К сожалению задач не найдено»; количество в
  заголовке `(N)`/`(0)`; завершение и возврат задачи оптимистичны, ошибка
  откатывается и показывает alert; фильтры — заглушки с `aria-disabled`.
  Dev `?state=filter` показывает бейдж «1» и активный чип «Проект».
  SSR `curl -s http://localhost:3000/tasks/search` не содержит защищённых
  данных задач.
```

- [ ] **Step 4: Add the historical-spec note**

In `docs/specs/2026-11-06-today-tasks/spec.md` FR-2, above the bullet list:

```text
> Примечание (2026-11-07): сегмент «Поиск задач» теперь доступен и
> навигирует на `/tasks/search`; поведение заменено спецификацией
> `docs/specs/2026-11-07-task-search/spec.md`.
```

- [ ] **Step 5: Run the full verification**

Run, in order:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests pass, typecheck clean, build succeeds.

- [ ] **Step 6: Verify SSR does not leak task data**

Run:

```bash
npm run build
PORT=3000 npm start
curl -s http://localhost:3000/tasks/search
```

Expected: HTTP 200; public meta/loading shell only; no task titles, project names, `Задачи на`, counts or progress.

- [ ] **Step 7: Do not commit; report working-tree changes**

Leave changes uncommitted. Report every changed file and the verification outcomes.

---

## Self-Review

**Spec coverage:** FR-1 → Tasks 3, 6, 7; FR-2 → Task 3; FR-3 → Tasks 4, 6; FR-4 → Tasks 4, 6; FR-5 → Tasks 1, 5; FR-6 → Tasks 5, 6; FR-7 → Tasks 2, 6; FR-8 → Tasks 1, 2, 6; FR-9 → Task 6; FR-10 → Tasks 3, 4, 5; FR-11 → Tasks 1–7. No gaps.

**Review Focus tests:** SSR/no-leak → `search-tasks-skeleton.test.ts` + Task 7 curl; navigation → `task-segments.test.ts`, `use-task-segment-navigation.test.ts`; field surface → `search-field.test.ts`; filter placeholders/preview → `search-filter-bar.test.ts`, `option-chip.test.ts`, `task-search.test.ts`; date/count → `date-time.test.ts`, `search-results.test.ts`; optimistic completion → `search-tasks-cache.test.ts`, `use-search-tasks.test.ts`; states → `task-search.test.ts`, `search-tasks-skeleton.test.ts`, `search-tasks-error.test.ts`; header → `search-header.test.ts`, `task-search.test.ts`.

**Type consistency:** `TaskSegmentId`, `searchTasksQueryKey`, `TaskListResponse`, `SearchResultsProps`, `SearchFilterBarProps`, `SearchFieldProps.variant` are defined once and reused. No duplicate names.

**Proportion:** implementation steps pin signatures, exact copy/classes and the existing pattern to mirror; test steps pin assertions; full bodies are limited to the cache helper and test scaffolding.

## Execution Handoff

Implementation must not start until the user reviews and approves the spec and this plan. After approval, choose the execution method; subagent-driven development is recommended because the tasks have clear interfaces and independent review gates.
