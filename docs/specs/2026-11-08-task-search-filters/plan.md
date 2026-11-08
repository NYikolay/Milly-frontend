# Фильтрация на экране «Поиск задач» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать все 14 фреймов фильтрации на `/tasks/search`: единую шторку фильтров с под-шагами, черновик/применение/сброс, серверные фильтры и клиентскую AND-фильтрацию меток.

**Architecture:** Модель `SearchTaskFilters` и чистые помощники живут в `app/lib/tasks/`; состояние «черновик/применено/шаг» — чистый reducer. Одна `BottomSheet` переключает содержимое между шагами; каждая под-шторка держит локальный выбор и коммитит его в черновик. Сервер получает дату, проекты, приоритеты, статус, регулярность и `q`; метки применяются к загруженной странице в `filterTasksForDisplay`.

**Tech Stack:** React 19, React Router 8 (SSR), TypeScript 5.9 strict, Tailwind CSS 4, TanStack Query 5, Vitest, motion/react.

**Spec:** `docs/specs/2026-11-08-task-search-filters/spec.md`

## Global Constraints

- Только токены `app-*`; `dark:` для цветов темы не использовать, light/dark — через `[data-app-theme]`.
- Новые зависимости и пакеты не добавлять.
- Backend, `docs/api.md`, `root.tsx` и глобальные провайдеры не менять.
- TypeScript strict: без `any`, `import type` для типов.
- Файлы — `kebab-case`, компоненты — `PascalCase`, импорты через `~/*`.
- Тесты — Vitest, `app/**/*.test.ts`; линтера нет, `npm run lint` не добавлять.
- SSR включён; шторки не рендерятся на сервере и не содержат защищённых данных.
- Шторки: `BottomSheet` с `expanded`, `showCloseButton`, `swipeToClose`, `panelAnimateLayout`, body `p-[15px]`.
- Быстрый add не менять, кроме технического re-export `matchesSearchQuery`.
- Не коммитить изменения без явного разрешения пользователя.
- Не начинать реализацию до утверждения spec и этого плана.

## Review Focus

- **Изоляция черновика:** «Назад» отбрасывает правки текущего шага, но сохраняет ранее применённые под-фильтры; крестик/оверлей/Escape/свайп отбрасывают весь черновик; общий «Применить» коммитит. Тесты `search-filters-reducer.test.ts`, `search-filters-sheet.test.ts`; ручная проверка.
- **Сброс:** «Сбросить фильтры» мгновенно очищает применённые фильтры и закрывает шторку, список возвращается на сегодня. Тест reducer + ручная проверка.
- **Метки AND на клиенте:** задача показывается только при наличии всех выбранных меток; количество и пустое состояние считаются после фильтрации. Тесты `search-filters.test.ts` + ручная проверка.
- **«Без проекта»:** очищает выбор проектов, а не фильтрует `project_id = null`; реальные проекты уходят в `project_ids`. Тесты модели + ручная проверка.
- **Статус + оптимистичное завершение:** при `status=open/completed` завершение/возврат сразу скрывает/возвращает строку и откатывается при ошибке. Тесты `filterTasksForDisplay`, `use-search-tasks.test.ts`; ручная проверка.
- **Дата:** выбранная дата меняет день списка и заголовок; сегодняшняя дата нормализуется в отсутствие фильтра; сброс возвращает на сегодня. Тесты модели/route + ручная проверка.
- **Pruning:** исчезнувшие проекты и метки вычищаются из черновика и применённых фильтров, не оставляя «мёртвый» фильтр. Тесты `pruneMissingIds` + route; ручная проверка.
- **Чипы и back:** чипы открывают под-шторку напрямую, «назад» ведёт в «Все фильтры». Тесты route/bar + ручная проверка.

---

### Task 1: Модель фильтров и чистые помощники

**Files:**
- Create: `app/lib/tasks/search-filters.ts`
- Test: `app/lib/tasks/search-filters.test.ts`

**Interfaces:**
- Produces:
  - `type SearchStatusFilter = "all" | "open" | "completed"`
  - `type SearchRecurrenceFilter = "all" | "regular" | "one_off"`
  - `type SearchStatusValue = Exclude<SearchStatusFilter, "all">`
  - `type SearchRecurrenceValue = Exclude<SearchRecurrenceFilter, "all">`
  - `type FiltersStep = "all" | "project" | "labels" | "priority" | "status" | "recurrence" | "date"`
  - `interface FilterChoiceOption<T extends string> { value: T; label: string }`
  - `interface SearchTaskFilters { date: string | null; projectIds: number[]; priorities: Priority[]; status: SearchStatusFilter; recurrence: SearchRecurrenceFilter; labelIds: number[] }`
  - `const STATUS_FILTER_OPTIONS: readonly FilterChoiceOption<SearchStatusValue>[]`
  - `const RECURRENCE_FILTER_OPTIONS: readonly FilterChoiceOption<SearchRecurrenceValue>[]`
  - `function createDefaultSearchFilters(): SearchTaskFilters`
  - `function resolveFilterDate(filters: SearchTaskFilters, today: string): string`
  - `function normalizeFilterDate(date: string, today: string): string | null`
  - `function isDateFilterActive(filters: SearchTaskFilters): boolean`
  - `function isProjectFilterActive(filters: SearchTaskFilters): boolean`
  - `function isLabelsFilterActive(filters: SearchTaskFilters): boolean`
  - `function isPriorityFilterActive(filters: SearchTaskFilters): boolean`
  - `function isStatusFilterActive(filters: SearchTaskFilters): boolean`
  - `function isRecurrenceFilterActive(filters: SearchTaskFilters): boolean`
  - `function countActiveFilterGroups(filters: SearchTaskFilters): number`
  - `function canonicalizeSearchFilters(filters: SearchTaskFilters): SearchTaskFilters`
  - `function searchFiltersFingerprint(filters: SearchTaskFilters): string`
  - `function toggleSelection<T>(values: T[], value: T): T[]`
  - `function toggleOptionalValue<T extends string>(current: T | "all", value: T): T | "all"`
  - `function toggleProjectSelection(ids: number[], id: number | null): number[]`
  - `function pruneMissingIds(selected: number[], available: readonly number[]): number[]`
  - `function matchesStatusFilter(task: TaskResponse, status: SearchStatusFilter): boolean`
  - `function matchesLabelFilter(task: Pick<TaskResponse, "labels">, labelIds: number[]): boolean`
  - `function filterTasksForDisplay(tasks: TaskResponse[], filters: SearchTaskFilters): TaskResponse[]`
  - `function formatProjectsFound(count: number): string`

- [ ] **Step 1: Написать падающие тесты модели**

```ts
import { describe, expect, it } from "vitest";

import type { TaskResponse } from "./types";
import {
  canonicalizeSearchFilters,
  countActiveFilterGroups,
  createDefaultSearchFilters,
  filterTasksForDisplay,
  formatProjectsFound,
  normalizeFilterDate,
  pruneMissingIds,
  resolveFilterDate,
  searchFiltersFingerprint,
  toggleOptionalValue,
  toggleProjectSelection,
  toggleSelection,
} from "./search-filters";

const TODAY = "2026-11-08";

function task(overrides: Partial<TaskResponse>): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T09:00:00Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T08:00:00Z",
    updated_at: "2026-11-08T08:00:00Z",
    ...overrides,
  };
}

describe("search filters model", () => {
  it("creates empty default filters", () => {
    expect(createDefaultSearchFilters()).toEqual({
      date: null,
      projectIds: [],
      priorities: [],
      status: "all",
      recurrence: "all",
      labelIds: [],
    });
  });

  it("resolves and normalizes the filter date", () => {
    expect(resolveFilterDate(createDefaultSearchFilters(), TODAY)).toBe(TODAY);
    expect(normalizeFilterDate(TODAY, TODAY)).toBeNull();
    expect(normalizeFilterDate("2026-11-09", TODAY)).toBe("2026-11-09");
  });

  it("counts active groups including date and labels", () => {
    expect(
      countActiveFilterGroups({
        date: "2026-11-09",
        projectIds: [2],
        priorities: ["neither"],
        status: "open",
        recurrence: "regular",
        labelIds: [4],
      }),
    ).toBe(6);
  });

  it("builds a stable fingerprint independent of array order", () => {
    const left = canonicalizeSearchFilters({
      ...createDefaultSearchFilters(),
      projectIds: [3, 1, 3],
      priorities: ["neither", "urgent_important"],
      labelIds: [9, 2],
      status: "open",
    });
    const right = canonicalizeSearchFilters({
      ...createDefaultSearchFilters(),
      projectIds: [1, 3],
      priorities: ["urgent_important", "neither"],
      labelIds: [2, 9],
      status: "open",
    });

    expect(searchFiltersFingerprint(left)).toBe(searchFiltersFingerprint(right));
    expect(left.projectIds).toEqual([1, 3]);
    expect(left.labelIds).toEqual([2, 9]);
  });

  it("toggles values and optional single values", () => {
    expect(toggleSelection([1, 2], 2)).toEqual([1]);
    expect(toggleSelection([1, 2], 3)).toEqual([1, 2, 3]);
    expect(toggleOptionalValue("open", "open")).toBe("all");
    expect(toggleOptionalValue("all", "completed")).toBe("completed");
    expect(toggleProjectSelection([1, 2], 2)).toEqual([1]);
    expect(toggleProjectSelection([1, 2], null)).toEqual([]);
  });

  it("prunes missing and duplicate ids", () => {
    expect(pruneMissingIds([3, 1, 3, 5], [1, 3])).toEqual([3, 1]);
  });

  it("matches status and requires all labels (AND)", () => {
    const openTask = task({ completed_at: null, labels: [{ id: 1, name: "A" }, { id: 2, name: "B" }] });
    const doneTask = task({ id: 2, completed_at: "2026-11-08T10:00:00Z", labels: [{ id: 1, name: "A" }] });

    expect(filterTasksForDisplay([openTask, doneTask], { ...createDefaultSearchFilters(), status: "open" })).toEqual([openTask]);
    expect(filterTasksForDisplay([openTask, doneTask], { ...createDefaultSearchFilters(), status: "completed" })).toEqual([doneTask]);
    expect(filterTasksForDisplay([openTask, doneTask], { ...createDefaultSearchFilters(), labelIds: [1, 2] })).toEqual([openTask]);
    expect(filterTasksForDisplay([openTask, doneTask], { ...createDefaultSearchFilters(), labelIds: [1] })).toEqual([openTask, doneTask]);
  });

  it("pluralizes the projects count", () => {
    expect(formatProjectsFound(0)).toBe("Найдено 0 проектов");
    expect(formatProjectsFound(1)).toBe("Найдено 1 проект");
    expect(formatProjectsFound(2)).toBe("Найдено 2 проекта");
    expect(formatProjectsFound(4)).toBe("Найдено 4 проекта");
    expect(formatProjectsFound(5)).toBe("Найдено 5 проектов");
    expect(formatProjectsFound(11)).toBe("Найдено 11 проектов");
    expect(formatProjectsFound(21)).toBe("Найдено 21 проект");
    expect(formatProjectsFound(22)).toBe("Найдено 22 проекта");
  });
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/tasks/search-filters.test.ts`
Expected: FAIL — модуль `./search-filters` не найден.

- [ ] **Step 3: Реализовать `app/lib/tasks/search-filters.ts`**

- Импортировать типы `Priority`, `TaskResponse` из `./types`.
- Реализовать функции строго по интерфейсам выше.
- `isDateFilterActive` и остальные `is*` возвращают соответствующие
  проверки из FR-1 (`date !== null`, длины массивов, `!== "all"`);
  `countActiveFilterGroups` складывает их.
- `canonicalizeSearchFilters`: дедупликация + сортировка `projectIds`/`labelIds`
  по возрастанию, `priorities` — `Array.from(new Set(...)).sort()`.
- `searchFiltersFingerprint`: `p:${projectIds.join(",")}|pr:${priorities.join(",")}|s:${status}|r:${recurrence}|l:${labelIds.join(",")}`.
- `filterTasksForDisplay`: один проход, сохраняющий порядок.
- `matchesLabelFilter`: Set id из `task.labels`, затем `labelIds.every`.
- `formatProjectsFound`: стандартные русские правила по `count % 100` и
  `count % 10`.
- `STATUS_FILTER_OPTIONS` и `RECURRENCE_FILTER_OPTIONS` — `as const`
  с типом `readonly FilterChoiceOption<...>[]`.

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/tasks/search-filters.test.ts`
Expected: PASS.

---

### Task 2: API, query key и хуки

**Files:**
- Modify: `app/lib/tasks/types.ts`
- Modify: `app/lib/tasks/tasks-api.ts`
- Modify: `app/lib/tasks/search-filters.ts`
- Modify: `app/lib/tasks/search-tasks-cache.ts`
- Modify: `app/hooks/use-search-tasks.ts`
- Test: `app/lib/tasks/tasks-api.test.ts`
- Test: `app/lib/tasks/search-tasks-cache.test.ts`
- Test: `app/lib/tasks/search-filters.test.ts`
- Test: `app/hooks/use-search-tasks.test.ts`

**Interfaces:**
- Consumes: Task 1 (`SearchTaskFilters`, `resolveFilterDate`, `searchFiltersFingerprint`).
- Produces:
  - `TaskListQuery` с `project_ids?: number[]`, `priorities?: Priority[]`, `recurrence?: TaskRecurrence | "all"`.
  - `function buildSearchTaskListQuery(filters: SearchTaskFilters, today: string, query: string): TaskListQuery`
  - `function searchTasksQueryKey(timeZone: string, date: string, query: string, filters: SearchTaskFilters)`
  - `function useSearchTasksData(timeZone: string, today: string, query: string, filters: SearchTaskFilters)`
  - `function useToggleSearchTaskCompletion(timeZone: string, today: string, query: string, filters: SearchTaskFilters)`

- [ ] **Step 1: Написать падающие тесты API и ключа**

В импорты `search-filters.test.ts` добавить `buildSearchTaskListQuery`.
В импорты `search-tasks-cache.test.ts` добавить
`createDefaultSearchFilters`.

В `tasks-api.test.ts` добавить:

```ts
it("serializes repeated project and priority filters", async () => {
  await fetchTasks({
    date: "2026-11-08",
    project_ids: [3, 1],
    priorities: ["neither", "urgent_important"],
    status: "open",
    recurrence: "regular",
    limit: 100,
    q: "созвон",
  });

  expect(apiRequest).toHaveBeenCalledWith(
    "/tasks?date=2026-11-08&project_ids=1&project_ids=3&priorities=neither&priorities=urgent_important&status=open&recurrence=regular&limit=100&q=%D1%81%D0%BE%D0%B7%D0%B2%D0%BE%D0%BD",
    { signal: undefined },
  );
});

it("omits empty repeated filters and recurrence=all", async () => {
  await fetchTasks({
    date: "2026-11-08",
    project_ids: [],
    priorities: [],
    status: "all",
    recurrence: "all",
    limit: 100,
  });

  expect(apiRequest).toHaveBeenCalledWith(
    "/tasks?date=2026-11-08&status=all&limit=100",
    { signal: undefined },
  );
});
```

В `search-filters.test.ts` добавить:

```ts
it("builds the server query with resolved date and limit", () => {
  expect(
    buildSearchTaskListQuery(
      { ...createDefaultSearchFilters(), projectIds: [2], priorities: ["neither"], status: "open" },
      TODAY,
      "  ",
    ),
  ).toEqual({
    date: TODAY,
    project_ids: [2],
    priorities: ["neither"],
    status: "open",
    recurrence: "all",
    limit: 100,
    q: undefined,
  });
});

```

В `search-tasks-cache.test.ts` обновить вызовы `searchTasksQueryKey` четвёртым
аргументом `createDefaultSearchFilters()` и добавить:

```ts
it("builds the search query key with the filters fingerprint", () => {
  const key = searchTasksQueryKey("Europe/Moscow", TODAY, "созвон", {
    ...createDefaultSearchFilters(),
    projectIds: [2, 1],
  });

  expect(key).toEqual([
    "tasks",
    "search",
    "Europe/Moscow",
    TODAY,
    "созвон",
    "p:1,2|pr:|s:all|r:all|l:",
  ]);
});
```

В `use-search-tasks.test.ts` обновить вызовы хуков/фабрики с фильтрами и
проверить, что `useSearchTasksData` вызывает `fetchTasks` с
`buildSearchTaskListQuery(...)`.

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/tasks/tasks-api.test.ts app/lib/tasks/search-tasks-cache.test.ts app/lib/tasks/search-filters.test.ts app/hooks/use-search-tasks.test.ts`
Expected: FAIL — новые поля/аргументы отсутствуют.

- [ ] **Step 3: Реализовать изменения**

- `types.ts`: расширить `TaskListQuery` тремя полями.
- `tasks-api.ts`:
  - в `buildTaskListPath` добавить `project_ids` (sorted asc) и
    `priorities` (sorted) через `params.append`;
  - `recurrence` — `params.set`, только если задан и не `"all"`;
  - сохранить порядок: `date`, `project_ids`, `priorities`, `status`,
    `recurrence`, `limit`, `cursor`, `q`.
- `search-filters.ts`: добавить `buildSearchTaskListQuery` с `limit: 100`,
  `q: query.trim() === "" ? undefined : query.trim()`, массивы из фильтров.
  Порядок полей в объекте — как в тесте.
- `search-tasks-cache.ts`: новый ключ
  `["tasks", "search", timeZone, date, query, searchFiltersFingerprint(filters)]`.
- `use-search-tasks.ts`:
  - `useSearchTasksData(timeZone, today, query, filters)`:
    `const taskQuery = buildSearchTaskListQuery(filters, today, query);`
    `queryKey: searchTasksQueryKey(timeZone, taskQuery.date ?? today, query, filters)`,
    `queryFn: fetchTasks(taskQuery, signal)`.
  - `useToggleSearchTaskCompletion(...)` строит тот же ключ.
  - Импортировать `buildSearchTaskListQuery`, `SearchTaskFilters`.

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/tasks/tasks-api.test.ts app/lib/tasks/search-tasks-cache.test.ts app/lib/tasks/search-filters.test.ts app/hooks/use-search-tasks.test.ts`
Expected: PASS.

---

### Task 3: Общие строки выбора, generic-шаги и иконки

**Files:**
- Create: `app/assets/icons/folder.svg`
- Create: `app/assets/icons/square-check.svg`
- Create: `app/components/tasks/search/filters/filter-option-row.tsx`
- Create: `app/components/tasks/search/filters/multi-select-filter-step.tsx`
- Create: `app/components/tasks/search/filters/single-select-filter-step.tsx`
- Test: `app/components/tasks/search/filters/multi-select-filter-step.test.ts`
- Test: `app/components/tasks/search/filters/single-select-filter-step.test.ts`

**Interfaces:**
- Consumes: `FilterChoiceOption`, `toggleSelection`, `toggleOptionalValue`
  из Task 1; `BottomSheetPrimaryAction`; `AssetIcon`; `cn`.
- Produces:
  - `interface FilterOptionRowProps { selected: boolean; role: "checkbox" | "radio"; label: string; onClick: () => void; leading?: ReactNode; heightClassName?: string; showSeparator?: boolean; labelStyle?: CSSProperties }`
  - `function FilterOptionRow(props: FilterOptionRowProps): ReactElement`
  - `interface MultiSelectFilterStepProps<T extends string> { ariaLabel: string; options: readonly FilterChoiceOption<T>[]; initialSelected: T[]; onApply: (selected: T[]) => void }`
  - `function MultiSelectFilterStep<T extends string>(props: MultiSelectFilterStepProps<T>): ReactElement`
  - `interface SingleSelectFilterStepProps<T extends string> { ariaLabel: string; options: readonly FilterChoiceOption<T>[]; initialValue: T | null; onApply: (value: T | null) => void }`
  - `function SingleSelectFilterStep<T extends string>(props: SingleSelectFilterStepProps<T>): ReactElement`

- [ ] **Step 1: Написать падающие тесты шагов**

`multi-select-filter-step.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MultiSelectFilterStep } from "./multi-select-filter-step";

const OPTIONS = [
  { value: "urgent_important", label: "Срочные и важные" },
  { value: "neither", label: "Не срочные и не важные" },
] as const;

describe("MultiSelectFilterStep", () => {
  it("renders checkbox rows with the initial selection and apply button", () => {
    const html = renderToStaticMarkup(
      createElement(MultiSelectFilterStep, {
        ariaLabel: "Приоритет задачи",
        options: OPTIONS,
        initialSelected: ["neither"],
        onApply: vi.fn(),
      }),
    );

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Приоритет задачи"');
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("border-b border-app-stroke");
    expect(html).toContain("Применить");
  });
});
```

`single-select-filter-step.test.ts`:

```ts
it("renders radio rows and the initial value", () => {
  const html = renderToStaticMarkup(
    createElement(SingleSelectFilterStep, {
      ariaLabel: "Статус задачи",
      options: [
        { value: "completed", label: "Выполненные" },
        { value: "open", label: "Не выполненные" },
      ] as const,
      initialValue: "open",
      onApply: vi.fn(),
    }),
  );

  expect(html).toContain('role="radiogroup"');
  expect(html).toContain('aria-label="Статус задачи"');
  expect(html).toContain('role="radio"');
  expect(html).toContain('aria-checked="true"');
  expect(html).toContain("Применить");
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/components/tasks/search/filters/multi-select-filter-step.test.ts app/components/tasks/search/filters/single-select-filter-step.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать иконки и компоненты**

`folder.svg` (18×18, `currentColor`):

```svg
<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2.25 4.5C2.25 3.672 2.922 3 3.75 3H6.879C7.277 3 7.658 3.158 7.939 3.439L8.561 4.061C8.842 4.342 9.223 4.5 9.621 4.5H14.25C15.078 4.5 15.75 5.172 15.75 6V13.5C15.75 14.328 15.078 15 14.25 15H3.75C2.922 15 2.25 14.328 2.25 13.5V4.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
</svg>
```

`square-check.svg` (18×18, `currentColor`):

```svg
<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2.25" y="2.25" width="13.5" height="13.5" rx="3" stroke="currentColor" stroke-width="1.5"/>
  <path d="M5.25 9L7.5 11.25L12.75 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

`filter-option-row.tsx`:

- Кнопка `type="button"`, `role`, `aria-checked`.
- Классы: `flex w-full items-center gap-[15px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent`;
  высота — `heightClassName ?? "h-[50px]"`.
- Круг: `flex size-5 shrink-0 items-center justify-center rounded-full border`;
  выбран — `border-app-accent` + `<span className="size-[15px] rounded-full bg-app-accent" />`;
  не выбран — `border-app-text-secondary/55`.
- Контент: `flex h-full min-w-0 flex-1 items-center gap-[5px]`,
  `showSeparator && "border-b border-app-stroke"`.
- `leading`, затем `<span className="min-w-0 flex-1 truncate text-[15px] leading-[1.3]" style={labelStyle}>{label}</span>`.

`multi-select-filter-step.tsx`:

- `useState(initialSelected)`.
- `role="group" aria-label={ariaLabel}`.
- `options.map` → `FilterOptionRow` с `role="checkbox"`,
  `selected={selected.includes(option.value)}`,
  `onClick={() => setSelected((current) => toggleSelection(current, option.value))}`,
  `showSeparator={index < options.length - 1}`.
- Корень `flex flex-1 flex-col`; кнопка «Применить» в
  `<div className="mt-auto pt-[15px]">`.

`single-select-filter-step.tsx`:

- `useState<T | null>(initialValue)`.
- `role="radiogroup"`.
- `onClick={() => setValue((current) => current === option.value ? null : option.value)}`,
  либо через `toggleOptionalValue` и приведение `"all"` → `null`.
- Остальное как в multi.

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/components/tasks/search/filters/multi-select-filter-step.test.ts app/components/tasks/search/filters/single-select-filter-step.test.ts`
Expected: PASS.

---

### Task 4: Шаг «Все фильтры»

**Files:**
- Create: `app/components/tasks/search/filters/all-filters-step.tsx`
- Test: `app/components/tasks/search/filters/all-filters-step.test.ts`

**Interfaces:**
- Consumes: Task 1 (`SearchTaskFilters`, `FiltersStep`, active helpers),
  `AssetIcon`, `BottomSheetPrimaryAction`.
- Produces:
  - `interface AllFiltersStepProps { filters: SearchTaskFilters; onOpenStep: (step: FiltersStep) => void; onApply: () => void }`
  - `function AllFiltersStep(props: AllFiltersStepProps): ReactElement`

- [ ] **Step 1: Написать падающий тест**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createDefaultSearchFilters } from "~/lib/tasks/search-filters";

import { AllFiltersStep } from "./all-filters-step";

describe("AllFiltersStep", () => {
  it("renders groups in figma order and marks active groups", () => {
    const html = renderToStaticMarkup(
      createElement(AllFiltersStep, {
        filters: {
          ...createDefaultSearchFilters(),
          projectIds: [1],
          recurrence: "regular",
        },
        onOpenStep: vi.fn(),
        onApply: vi.fn(),
      }),
    );

    const project = html.indexOf("Проект");
    const labels = html.indexOf("Метки");
    const priority = html.indexOf("Приоритет");
    const status = html.indexOf("Статус");
    const recurrence = html.indexOf("Регулярность");

    expect(project).toBeGreaterThan(-1);
    expect(project).toBeLessThan(labels);
    expect(labels).toBeLessThan(priority);
    expect(priority).toBeLessThan(status);
    expect(status).toBeLessThan(recurrence);
    expect(html).toContain("Проект, активно");
    expect(html).toContain("Регулярность, активно");
    expect(html).toContain("Применить");
  });
});
```

- [ ] **Step 2: Запустить тест и увидеть падение**

Run: `npx vitest run app/components/tasks/search/filters/all-filters-step.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать шаг**

- Конфиг строк:
  ```ts
  const ROWS = [
    { step: "project", label: "Проект", icon: folderIcon, active: isProjectFilterActive },
    { step: "labels", label: "Метки", icon: tagIcon, active: isLabelsFilterActive },
    { step: "priority", label: "Приоритет", icon: flagIcon, active: isPriorityFilterActive },
    { step: "status", label: "Статус", icon: squareCheckIcon, active: isStatusFilterActive },
    { step: "recurrence", label: "Регулярность", icon: repeatIcon, active: isRecurrenceFilterActive },
  ] as const;
  ```
  Добавить в Task 1 экспорты `isProjectFilterActive`, `isLabelsFilterActive`,
  `isPriorityFilterActive`, `isStatusFilterActive`, `isRecurrenceFilterActive`,
  `isDateFilterActive`; реализовать через поля фильтров.
- Строка — `<button type="button" aria-haspopup="dialog" aria-label={active ? `${label}, активно` : label}>`:
  `flex h-[47px] w-full items-center gap-[5px] border-b border-app-stroke text-left text-[15px] leading-[1.3] transition-opacity active:opacity-70 focus-visible:...`;
  активная — `text-app-accent`, иначе `text-app-text`.
- Внутри: `AssetIcon className="size-[18px]"`, `<span className="min-w-0 flex-1 truncate">`,
  `AssetIcon className="size-6 text-app-text-secondary"` (chevron-right).
- Контейнер строк: `flex flex-col gap-[15px]`; у последней строки убрать
  `border-b` (`index === ROWS.length - 1 && "border-b-0"`).
- Корень `flex flex-1 flex-col`; «Применить» — `BottomSheetPrimaryAction`
  в `mt-auto pt-[15px]`, `onClick={onApply}`.

- [ ] **Step 4: Запустить тест и увидеть успех**

Run: `npx vitest run app/components/tasks/search/filters/all-filters-step.test.ts`
Expected: PASS.

---

### Task 5: Фильтр по проекту и общий текстовый поиск

**Files:**
- Create: `app/lib/text-search.ts`
- Create: `app/lib/text-search.test.ts`
- Modify: `app/components/tasks/quick-add/search-filter.ts`
- Create: `app/components/tasks/search/filters/project-filter-step.tsx`
- Test: `app/components/tasks/search/filters/project-filter-step.test.ts`

**Interfaces:**
- Consumes: `matchesSearchQuery`, `ProjectResponse`, `ProjectIconBadge`,
  `NO_PROJECT_ICON`, `getProjectIcon`, `formatProjectsFound`,
  `toggleProjectSelection`, `pruneMissingIds`, `SearchField`.
- Produces:
  - `function matchesSearchQuery(value: string, query: string): boolean` в `~/lib/text-search`.
  - `function filterProjectList(projects: ProjectResponse[], query: string): ProjectResponse[]`
  - `interface ProjectFilterStepProps { projects: ProjectResponse[]; isLoading: boolean; isError: boolean; onRetry: () => void; initialSelectedIds: number[]; onApply: (ids: number[]) => void }`
  - `function ProjectFilterStep(props: ProjectFilterStepProps): ReactElement`

- [ ] **Step 1: Написать падающие тесты**

`text-search.test.ts` — перенести кейсы из
`app/components/tasks/quick-add/search-filter.test.ts` (пустой запрос, регистр,
подстрока, без совпадений).

`project-filter-step.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProjectFilterStep } from "./project-filter-step";

const PROJECTS = [
  {
    id: 1,
    name: "Работа",
    description: null,
    icon: "briefcase",
    color: { id: 1, slug: "green", name: "Зелёный", hex: "#48a981" },
    progress: 0,
    archived_at: null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
];

describe("ProjectFilterStep", () => {
  it("renders search, count, no-project row and project rows", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectFilterStep, {
        projects: PROJECTS,
        isLoading: false,
        isError: false,
        onRetry: vi.fn(),
        initialSelectedIds: [1],
        onApply: vi.fn(),
      }),
    );

    expect(html).toContain('aria-label="Поиск проектов"');
    expect(html).toContain("Найдено 1 проект");
    expect(html).toContain("Сбросить");
    expect(html).toContain("Без проекта");
    expect(html).toContain("Работа");
    expect(html).toContain("h-[59px]");
    expect(html).toContain("h-[50px]");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Применить");
  });

  it("shows loading, error and no-match states", () => {
    const loading = renderToStaticMarkup(
      createElement(ProjectFilterStep, {
        projects: [],
        isLoading: true,
        isError: false,
        onRetry: vi.fn(),
        initialSelectedIds: [],
        onApply: vi.fn(),
      }),
    );
    const error = renderToStaticMarkup(
      createElement(ProjectFilterStep, {
        projects: [],
        isLoading: false,
        isError: true,
        onRetry: vi.fn(),
        initialSelectedIds: [],
        onApply: vi.fn(),
      }),
    );

    expect(loading).toContain("Загружаем проекты…");
    expect(error).toContain("Не удалось загрузить проекты");
    expect(error).toContain("Повторить");
  });
});
```

- [ ] **Step 2: Запустить тесты и увидеть падение**

Run: `npx vitest run app/lib/text-search.test.ts app/components/tasks/search/filters/project-filter-step.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать**

- `app/lib/text-search.ts` — перенести реализацию `matchesSearchQuery` из
  quick-add; `app/components/tasks/quick-add/search-filter.ts` заменить на
  `export { matchesSearchQuery } from "~/lib/text-search";`, чтобы старые
  импорты и тесты продолжили работать.
- `project-filter-step.tsx`:
  - локальный `useState(initialSelectedIds)` и `useState("")`;
  - `filteredProjects = filterProjectList(projects, query)`;
  - `SearchField ariaLabel="Поиск проектов"`;
  - строка статистики только при `!isLoading && !isError`:
    `formatProjectsFound(filteredProjects.length)` и кнопка «Сбросить»
    `text-[13px] leading-[1.4] text-app-destructive`;
  - «Без проекта»: `FilterOptionRow` (Task 3) с `heightClassName="h-[50px]"`,
    `selected={selectedIds.length === 0}`, `onClick={() => setSelectedIds([])}`,
    `leading={<ProjectIconBadge icon={NO_PROJECT_ICON} colorHex={null} />`;
  - проекты: `h-[59px]`, `selected={selectedIds.includes(project.id)}`,
    `leading={<ProjectIconBadge .../>}`, `role="checkbox"`,
    `onClick={() => setSelectedIds((current) => toggleProjectSelection(current, project.id))}`;
  - `showSeparator` — `true` для всех строк;
  - loading/error после строки «Без проекта», тексты
    «Загружаем проекты…», «Не удалось загрузить проекты», «Повторить»;
  - «Ничего не найдено» при непустом query и пустом результате;
  - «Применить» — `mt-auto pt-[15px]`, `onApply(pruneMissingIds(selectedIds, projects.map(p => p.id)))`.

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/text-search.test.ts app/components/tasks/search/filters/project-filter-step.test.ts app/components/tasks/quick-add/search-filter.test.ts`
Expected: PASS.

---

### Task 6: Фильтр по меткам

**Files:**
- Create: `app/components/tasks/search/filters/labels-filter-step.tsx`
- Test: `app/components/tasks/search/filters/labels-filter-step.test.ts`

**Interfaces:**
- Consumes: `LabelResponse`, `matchesSearchQuery`, `pruneMissingLabelIds`,
  `FilterOptionRow`, `SearchField`, `BottomSheetPrimaryAction`, `tag-raw.svg`.
- Produces:
  - `interface LabelsFilterStepProps { labels: LabelResponse[]; isLoading: boolean; isError: boolean; onRetry: () => void; initialSelectedIds: number[]; onApply: (ids: number[]) => void }`
  - `function LabelsFilterStep(props: LabelsFilterStepProps): ReactElement`

- [ ] **Step 1: Написать падающий тест**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LabelsFilterStep } from "./labels-filter-step";

const LABELS = [
  { id: 1, name: "Продолжить", color: { id: 1, slug: "pink", name: "Розовый", hex: "#d82f70" }, created_at: "", updated_at: "" },
  { id: 2, name: "Дрочить", color: { id: 2, slug: "green", name: "Зелёный", hex: "#40de82" }, created_at: "", updated_at: "" },
];

describe("LabelsFilterStep", () => {
  it("renders search, colored rows and checkbox selection", () => {
    const html = renderToStaticMarkup(
      createElement(LabelsFilterStep, {
        labels: LABELS,
        isLoading: false,
        isError: false,
        onRetry: vi.fn(),
        initialSelectedIds: [1],
        onApply: vi.fn(),
      }),
    );

    expect(html).toContain('aria-label="Поиск меток"');
    expect(html).toContain("Продолжить");
    expect(html).toContain("Дрочить");
    expect(html).toContain("#d82f70");
    expect(html).toContain("#40de82");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Готово");
  });

  it("renders loading, error, empty and no-match states", () => {
    const loading = renderToStaticMarkup(
      createElement(LabelsFilterStep, { labels: [], isLoading: true, isError: false, onRetry: vi.fn(), initialSelectedIds: [], onApply: vi.fn() }),
    );
    const error = renderToStaticMarkup(
      createElement(LabelsFilterStep, { labels: [], isLoading: false, isError: true, onRetry: vi.fn(), initialSelectedIds: [], onApply: vi.fn() }),
    );
    const empty = renderToStaticMarkup(
      createElement(LabelsFilterStep, { labels: [], isLoading: false, isError: false, onRetry: vi.fn(), initialSelectedIds: [], onApply: vi.fn() }),
    );

    expect(loading).toContain("Загружаем метки…");
    expect(error).toContain("Не удалось загрузить метки");
    expect(empty).toContain("На текущий момент у вас не создано ни 1 метки");
  });
});
```

- [ ] **Step 2: Запустить тест и увидеть падение**

Run: `npx vitest run app/components/tasks/search/filters/labels-filter-step.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

- Локальные `selectedIds`, `query`; дедупликация меток по id; фильтрация
  через `matchesSearchQuery`.
- `SearchField ariaLabel="Поиск меток"`.
- Список: `flex flex-col gap-[10px]`; строки через `FilterOptionRow`
  `heightClassName="h-[50px]"`, `role="checkbox"`,
  `leading={<span style={{ color: label.color.hex }}><AssetIcon className="size-[18px]" src={tagIcon} /></span>}`,
  `label={label.name}`, `labelStyle={{ color: label.color.hex }}`.
- Состояния — тексты из спецификации; «Ничего не найдено» при непустом
  query и пустом результате.
- «Готово» — `mt-auto pt-[15px]`;
  `onApply(pruneMissingLabelIds(selectedIds, items))`, чтобы скрытые
  поиском выбранные значения сохранялись, а отсутствующие — вычищались.

- [ ] **Step 4: Запустить тест и увидеть успех**

Run: `npx vitest run app/components/tasks/search/filters/labels-filter-step.test.ts`
Expected: PASS.

---

### Task 7: Фильтр по дате

**Files:**
- Create: `app/components/tasks/search/filters/date-filter-step.tsx`
- Test: `app/components/tasks/search/filters/date-filter-step.test.ts`

**Interfaces:**
- Consumes: `Calendar`, `formatNumericDate`, `BottomSheetPrimaryAction`.
- Produces:
  - `interface DateFilterStepProps { today: string; initialDate: string; onApply: (date: string) => void }`
  - `function DateFilterStep(props: DateFilterStepProps): ReactElement`

- [ ] **Step 1: Написать падающий тест**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DateFilterStep } from "./date-filter-step";

describe("DateFilterStep", () => {
  it("renders the calendar, selected date caption and apply button", () => {
    const html = renderToStaticMarkup(
      createElement(DateFilterStep, {
        today: "2026-11-08",
        initialDate: "2026-11-01",
        onApply: vi.fn(),
      }),
    );

    expect(html).toContain("Ноябрь 2026");
    expect(html).toContain("Показать все задачи на 01.11.2026");
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Готово");
    expect(html).toContain('aria-label="Предыдущий месяц"');
  });
});
```

- [ ] **Step 2: Запустить тест и увидеть падение**

Run: `npx vitest run app/components/tasks/search/filters/date-filter-step.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

- `const [selectedDate, setSelectedDate] = useState(initialDate);`
- `<Calendar value={selectedDate} today={today} onSelect={setSelectedDate} />`
  без `minDate`/`maxDate`.
- Подпись:
  `<p className="mt-[15px] text-[13px] leading-[1.4] text-app-text-secondary">Показать все задачи на {formatNumericDate(selectedDate)}</p>`.
- «Готово» — `mt-auto pt-[15px]`, `onClick={() => onApply(selectedDate)}`.
- Корень `flex flex-1 flex-col`.

- [ ] **Step 4: Запустить тест и увидеть успех**

Run: `npx vitest run app/components/tasks/search/filters/date-filter-step.test.ts`
Expected: PASS.

---

### Task 8: Reducer состояния и шторка фильтров

**Files:**
- Create: `app/lib/tasks/search-filters-reducer.ts`
- Test: `app/lib/tasks/search-filters-reducer.test.ts`
- Modify: `app/components/ui/bottom-sheet.tsx`
- Test: `app/components/ui/bottom-sheet-action.test.ts`
- Create: `app/components/tasks/search/filters/search-filters-sheet.tsx`
- Test: `app/components/tasks/search/filters/search-filters-sheet.test.ts`

**Interfaces:**
- Consumes: `SearchTaskFilters`, `FiltersStep`, `createDefaultSearchFilters`,
  `canonicalizeSearchFilters`; все шаги Task 4–7; `BottomSheet`,
  `BottomSheetAction`; `PRIORITY_OPTIONS`, `STATUS_FILTER_OPTIONS`,
  `RECURRENCE_FILTER_OPTIONS`.
- Produces:
  - `interface SearchFiltersState { step: FiltersStep | null; draft: SearchTaskFilters; applied: SearchTaskFilters }`
  - `type SearchFiltersAction = { type: "open"; step: FiltersStep } | { type: "back" } | { type: "close" } | { type: "applyStep"; patch: Partial<SearchTaskFilters> } | { type: "applyAll" } | { type: "reset" } | { type: "patchAll"; patch: Partial<SearchTaskFilters> }`
  - `function createSearchFiltersState(): SearchFiltersState`
  - `function searchFiltersReducer(state: SearchFiltersState, action: SearchFiltersAction): SearchFiltersState`
  - `const FILTER_STEP_TITLES: Record<FiltersStep, string>`
  - `interface SearchFiltersSheetProps { state: SearchFiltersState; today: string; labels: LabelResponse[]; isLabelsLoading: boolean; isLabelsError: boolean; onRetryLabels: () => void; projects: ProjectResponse[]; isProjectsLoading: boolean; isProjectsError: boolean; onRetryProjects: () => void; onOpenStep: (step: FiltersStep) => void; onBack: () => void; onClose: () => void; onApplyStep: (patch: Partial<SearchTaskFilters>) => void; onApplyAll: () => void; onReset: () => void }`
  - `function SearchFiltersSheet(props: SearchFiltersSheetProps): ReactElement`

- [ ] **Step 1: Написать падающие тесты reducer**

```ts
import { describe, expect, it } from "vitest";

import { createDefaultSearchFilters } from "./search-filters";
import {
  createSearchFiltersState,
  searchFiltersReducer,
} from "./search-filters-reducer";

describe("searchFiltersReducer", () => {
  it("opens with a draft copied from applied filters", () => {
    const initial = createSearchFiltersState();
    const applied = { ...initial.applied, projectIds: [1] };
    const state = searchFiltersReducer(
      { ...initial, applied },
      { type: "open", step: "project" },
    );

    expect(state.step).toBe("project");
    expect(state.draft).toEqual(applied);
  });

  it("keeps the draft when moving from all filters to a sub-step", () => {
    const initial = createSearchFiltersState();
    const opened = searchFiltersReducer(initial, { type: "open", step: "all" });
    const patched = searchFiltersReducer(opened, {
      type: "applyStep",
      patch: { projectIds: [2] },
    });
    const reopened = searchFiltersReducer(patched, { type: "open", step: "priority" });

    expect(reopened.draft.projectIds).toEqual([2]);
    expect(reopened.step).toBe("priority");
  });

  it("returns to all filters on back and discards nothing else", () => {
    const state = searchFiltersReducer(
      createSearchFiltersState(),
      { type: "open", step: "status" },
    );
    const back = searchFiltersReducer(state, { type: "back" });

    expect(back.step).toBe("all");
  });

  it("applies a step patch to the draft and returns to all filters", () => {
    const state = searchFiltersReducer(
      createSearchFiltersState(),
      { type: "open", step: "labels" },
    );
    const applied = searchFiltersReducer(state, {
      type: "applyStep",
      patch: { labelIds: [3, 1, 3] },
    });

    expect(applied.step).toBe("all");
    expect(applied.draft.labelIds).toEqual([1, 3]);
    expect(applied.applied.labelIds).toEqual([]);
  });

  it("applies the draft to the list and closes", () => {
    const state = searchFiltersReducer(
      { step: "all", draft: { ...createSearchFiltersState().draft, labelIds: [1] }, applied: createSearchFiltersState().applied },
      { type: "applyAll" },
    );

    expect(state.step).toBeNull();
    expect(state.applied.labelIds).toEqual([1]);
  });

  it("closes and discards the draft", () => {
    const state = searchFiltersReducer(
      { step: "date", draft: { ...createSearchFiltersState().draft, date: "2026-11-09" }, applied: createSearchFiltersState().applied },
      { type: "close" },
    );

    expect(state.step).toBeNull();
    expect(state.draft).toEqual(createDefaultSearchFilters());
  });

  it("resets applied and draft immediately and closes", () => {
    const initial = createSearchFiltersState();
    const state = searchFiltersReducer(
      { step: "all", draft: { ...initial.draft, status: "open" }, applied: { ...initial.applied, status: "open" } },
      { type: "reset" },
    );

    expect(state).toEqual({
      step: null,
      draft: createDefaultSearchFilters(),
      applied: createDefaultSearchFilters(),
    });
  });

  it("patches both applied and draft for pruning", () => {
    const initial = createSearchFiltersState();
    const state = searchFiltersReducer(
      { step: "all", draft: { ...initial.draft, projectIds: [1] }, applied: { ...initial.applied, projectIds: [1] } },
      { type: "patchAll", patch: { projectIds: [] } },
    );

    expect(state.draft.projectIds).toEqual([]);
    expect(state.applied.projectIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить тест и увидеть падение**

Run: `npx vitest run app/lib/tasks/search-filters-reducer.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать reducer**

- `createSearchFiltersState(): { step: null, draft: createDefaultSearchFilters(), applied: createDefaultSearchFilters() }` (два независимых объекта).
- `open`: `draft: state.step === null ? state.applied : state.draft`, `step: action.step`.
- `back`: `step: "all"`.
- `close`: `step: null, draft: state.applied`.
- `applyStep`: `draft: canonicalizeSearchFilters({ ...state.draft, ...action.patch })`, `step: "all"`.
- `applyAll`: `applied: canonicalizeSearchFilters(state.draft)`, `draft` — тот же канонизированный объект, `step: null`.
- `reset`: оба default, `step: null`.
- `patchAll`: оба `canonicalizeSearchFilters({ ...current, ...patch })`.
- Не мутировать входное состояние.

- [ ] **Step 4: Добавить `tone` в `BottomSheetAction`**

Сначала тест `app/components/ui/bottom-sheet-action.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BottomSheetAction } from "./bottom-sheet";

describe("BottomSheetAction", () => {
  it("uses the accent tone by default", () => {
    const html = renderToStaticMarkup(
      createElement(BottomSheetAction, null, "Сбросить"),
    );

    expect(html).toContain("text-app-accent");
    expect(html).not.toContain("text-app-destructive");
  });

  it("uses the destructive tone when requested", () => {
    const html = renderToStaticMarkup(
      createElement(BottomSheetAction, { tone: "destructive" }, "Сбросить"),
    );

    expect(html).toContain("text-app-destructive");
    expect(html).not.toContain("text-app-accent");
  });
});
```

Реализация: в `BottomSheetActionProps` добавить
`tone?: "accent" | "destructive"` (по умолчанию `"accent"`); вынести
цвет текста в тернарник:
`tone === "destructive" ? "text-app-destructive" : "text-app-accent"`.
`BottomSheetPrimaryAction` не меняется.

Run: `npx vitest run app/components/ui/bottom-sheet-action.test.ts`
Expected: FAIL, затем PASS после правки.

- [ ] **Step 5: Написать падающий тест шторки**

```ts
import { createElement } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createSearchFiltersState } from "~/lib/tasks/search-filters-reducer";

import { SearchFiltersSheet } from "./search-filters-sheet";

type SheetMockProps = {
  title: string;
  open: boolean;
  onBack?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
};

type ActionMockProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
};

vi.mock("~/components/ui/bottom-sheet", () => ({
  BottomSheet: ({ title, onBack, footer, children, open }: SheetMockProps) =>
    createElement("section", { "data-title": title, "data-open": String(open), "data-back": String(Boolean(onBack)) }, footer, children),
  BottomSheetAction: ({ children, ...props }: ActionMockProps) => createElement("button", props, children),
  BottomSheetPrimaryAction: ({ children, ...props }: ActionMockProps) => createElement("button", props, children),
}));

const BASE_PROPS = {
  state: createSearchFiltersState(),
  today: "2026-11-08",
  labels: [],
  isLabelsLoading: false,
  isLabelsError: false,
  onRetryLabels: vi.fn(),
  projects: [],
  isProjectsLoading: false,
  isProjectsError: false,
  onRetryProjects: vi.fn(),
  onOpenStep: vi.fn(),
  onBack: vi.fn(),
  onClose: vi.fn(),
  onApplyStep: vi.fn(),
  onApplyAll: vi.fn(),
  onReset: vi.fn(),
};

describe("SearchFiltersSheet", () => {
  it("shows the reset footer only on the all-filters step", () => {
    const all = renderToStaticMarkup(
      createElement(SearchFiltersSheet, {
        ...BASE_PROPS,
        state: { ...BASE_PROPS.state, step: "all" },
      }),
    );
    const date = renderToStaticMarkup(
      createElement(SearchFiltersSheet, {
        ...BASE_PROPS,
        state: { ...BASE_PROPS.state, step: "date" },
      }),
    );

    expect(all).toContain("Сбросить фильтры");
    expect(all).toContain("Фильтры");
    expect(all).toContain('data-back="false"');
    expect(date).not.toContain("Сбросить фильтры");
    expect(date).toContain("Фильтр по дате");
    expect(date).toContain('data-back="true"');
  });

  it("uses the figma titles for every step", () => {
    const titles = {
      all: "Фильтры",
      project: "Фильтр по проекту",
      labels: "Метки",
      priority: "Фильтр по приоритету",
      status: "Фильтр по статусу",
      recurrence: "Фильтр по регулярности",
      date: "Фильтр по дате",
    } as const;

    for (const [step, title] of Object.entries(titles)) {
      const html = renderToStaticMarkup(
        createElement(SearchFiltersSheet, {
          ...BASE_PROPS,
          state: { ...BASE_PROPS.state, step: step as keyof typeof titles },
        }),
      );
      expect(html).toContain(`data-title="${title}"`);
    }
  });
});
```

- [ ] **Step 5: Запустить тест и увидеть падение**

Run: `npx vitest run app/components/tasks/search/filters/search-filters-sheet.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 6: Реализовать шторку**

- `FILTER_STEP_TITLES` строго по тесту; `""` для `null`.
- `<BottomSheet open={state.step !== null} onOpenChange={(open) => { if (!open) onClose(); }} title={state.step ? FILTER_STEP_TITLES[state.step] : ""} onBack={state.step !== null && state.step !== "all" ? onBack : undefined} expanded showCloseButton swipeToClose panelAnimateLayout bodyClassName="p-[15px]" footer={state.step === "all" ? <BottomSheetAction tone="destructive" onClick={onReset}>Сбросить фильтры</BottomSheetAction> : undefined}>`.
- Содержимое по шагу:
  - `all` → `AllFiltersStep filters={state.draft} onOpenStep={onOpenStep} onApply={onApplyAll}`;
  - `project` → `ProjectFilterStep` с `initialSelectedIds={state.draft.projectIds}` и `onApply={(ids) => onApplyStep({ projectIds: ids })}`;
  - `labels` → `LabelsFilterStep` с `initialSelectedIds={state.draft.labelIds}` и `onApply={(ids) => onApplyStep({ labelIds: ids })}`;
  - `priority` → `MultiSelectFilterStep` с `PRIORITY_OPTIONS`, `initialSelected={state.draft.priorities}`, `onApply={(priorities) => onApplyStep({ priorities })}`;
  - `status` → `SingleSelectFilterStep` с `STATUS_FILTER_OPTIONS`, `initialValue={state.draft.status === "all" ? null : state.draft.status}`, `onApply={(status) => onApplyStep({ status: status ?? "all" })}`;
  - `recurrence` — аналогично с `RECURRENCE_FILTER_OPTIONS`;
  - `date` → `DateFilterStep` с `today`, `initialDate={state.draft.date ?? today}`, `onApply={(date) => onApplyStep({ date: normalizeFilterDate(date, today) })}`.
- При `null` — не рендерить ничего (вернуть `null` до `BottomSheet` или пустой children).

- [ ] **Step 7: Запустить тесты и увидеть успех**

Run: `npx vitest run app/lib/tasks/search-filters-reducer.test.ts app/components/tasks/search/filters/search-filters-sheet.test.ts`
Expected: PASS.

---

### Task 9: Панель фильтров с активными состояниями

**Files:**
- Modify: `app/components/tasks/search/search-filter-bar.tsx`
- Test: `app/components/tasks/search/search-filter-bar.test.ts`

**Interfaces:**
- Consumes: `OptionChip`, `AssetIcon`.
- Produces:
  - `interface SearchFilterBarProps { activeFilterCount: number; activeDate: boolean; activePriority: boolean; activeProject: boolean; activeRecurrence: boolean; onOpenAll: () => void; onOpenDate: () => void; onOpenPriority: () => void; onOpenProject: () => void; onOpenRecurrence: () => void }`
  - `function SearchFilterBar(props: SearchFilterBarProps): ReactElement`

- [ ] **Step 1: Обновить падающие тесты**

- Заменить проверки «5 disabled» на:
  - все пять кнопок доступны (`aria-disabled` отсутствует, `tabindex` отсутствует);
  - у всех `aria-haspopup="dialog"`;
  - обработчики: передать `vi.fn()` и проверить, что в разметке нет
    `aria-disabled="true"`.
- Добавить:
  - `activeFilterCount={3}`, `activeProject` → бейдж «3», доступное имя
    «Все фильтры, активно: 3», чип проекта с `border-app-accent`;
  - `activeDate` → иконка календаря с активными классами;
  - `activeRecurrence` → чип «Периодичность» активен;
  - `activePriority` → чип «По приоритету» активен.

- [ ] **Step 2: Запустить тест и увидеть падение**

Run: `npx vitest run app/components/tasks/search/search-filter-bar.test.ts`
Expected: FAIL — старые пропсы/`disabled`.

- [ ] **Step 3: Реализовать**

- Удалить `noop` и `disabled` у всех `OptionChip`.
- Передать соответствующие `onClick`.
- Добавить `active` для даты (`activeDate`), приоритета, проекта,
  периодичности.
- Сохранить бейдж и доступное имя; `aria-label` для даты остаётся
  «Фильтр по дате».
- Не менять визуальные классы.

- [ ] **Step 4: Запустить тест и увидеть успех**

Run: `npx vitest run app/components/tasks/search/search-filter-bar.test.ts`
Expected: PASS.

---

### Task 10: Интеграция в маршрут `/tasks/search`

**Files:**
- Modify: `app/routes/task-search.tsx`
- Test: `app/routes/task-search.test.ts`

**Interfaces:**
- Consumes: все предыдущие задачи; `fetchLabels`, `fetchProjects`;
  `searchFiltersReducer`, `createSearchFiltersState`;
  `filterTasksForDisplay`, `countActiveFilterGroups`,
  `resolveFilterDate`, `pruneMissingIds`.
- Produces: рабочее состояние фильтров на маршруте; новых экспортов нет,
  кроме существующего default-компонента.

- [ ] **Step 1: Обновить падающие тесты маршрута**

- Обновить моки `useSearchTasksData` и `useToggleSearchTaskCompletion`
  под четвёртый аргумент `filters`.
- Добавить мок `~/lib/labels/labels-api`:
  `vi.mock("~/lib/labels/labels-api", () => ({ fetchLabels: vi.fn(async () => []) }))`.
- Мок `SearchFilterBar` должен рендерить пропсы, например:
  `createElement("div", { "data-filter-bar": JSON.stringify(props) })`.
- Мок `SearchFiltersSheet`:
  `SearchFiltersSheet: ({ state }) => createElement("div", null, "SHEET:" + (state.step ?? "none"))`.
- Проверить:
  - без preview: `activeFilterCount = 0`, все `active* = false`;
  - `?state=filter` в DEV: `activeFilterCount = 1`, `activeProject = true`;
  - `SearchResults` получает `date = today` по умолчанию;
  - начальный `SearchFiltersSheet` получает `step = null` (маркер
    `SHEET:none`).
- Сохранить существующие проверки skeleton/error/results/preview/loader.
- Тест клиентской фильтрации меток делать не в route-тесте, а в
  `search-filters.test.ts` (Task 1), чтобы не строить DOM.

- [ ] **Step 2: Запустить тест и увидеть падение**

Run: `npx vitest run app/routes/task-search.test.ts`
Expected: FAIL — новые пропсы/аргументы.

- [ ] **Step 3: Реализовать интеграцию**

- Импорты:
  `useReducer`, `fetchLabels`, `SearchFiltersSheet`,
  `createSearchFiltersState`, `searchFiltersReducer`,
  `countActiveFilterGroups`, `filterTasksForDisplay`,
  `resolveFilterDate`, `pruneMissingIds`, `formatZonedToday` (уже есть).
- Состояние:
  ```ts
  const [filtersState, dispatchFilters] = useReducer(
    searchFiltersReducer,
    undefined,
    createSearchFiltersState,
  );
  const appliedFilters = filtersState.applied;
  const filteredDate = resolveFilterDate(appliedFilters, today);
  ```
- Запросы:
  `useSearchTasksData(timeZone, today, query, appliedFilters)`;
  `useToggleSearchTaskCompletion(timeZone, today, query, appliedFilters)`;
  `useQuery({ queryKey: ["labels"], queryFn: ({ signal }) => fetchLabels(signal) })`.
- Pruning:
  ```ts
  useEffect(() => {
    const projects = projectsQuery.data;
    if (!projects) return;
    const projectIds = pruneMissingIds(
      appliedFilters.projectIds,
      projects.map((project) => project.id),
    );
    if (projectIds.join(",") !== appliedFilters.projectIds.join(",")) {
      dispatchFilters({ type: "patchAll", patch: { projectIds } });
    }
  }, [projectsQuery.data, appliedFilters.projectIds]);

  useEffect(() => {
    const labels = labelsQuery.data;
    if (!labels) return;
    const labelIds = pruneMissingIds(
      appliedFilters.labelIds,
      labels.map((label) => label.id),
    );
    if (labelIds.join(",") !== appliedFilters.labelIds.join(",")) {
      dispatchFilters({ type: "patchAll", patch: { labelIds } });
    }
  }, [labelsQuery.data, appliedFilters.labelIds]);
  ```
- Отображение:
  ```ts
  const displayedTasks = filterTasksForDisplay(
    results?.items ?? [],
    appliedFilters,
  );
  ```
  `SearchResults` получает `date={filteredDate}`, `tasks={displayedTasks}`.
- Панель:
  ```ts
  const previewActive = loaderData.activeFilterPreview;
  const activeFilterCount = previewActive
    ? 1
    : countActiveFilterGroups(appliedFilters);
  const activeProject = previewActive || appliedFilters.projectIds.length > 0;
  const activeDate = appliedFilters.date !== null;
  const activePriority = appliedFilters.priorities.length > 0;
  const activeRecurrence = appliedFilters.recurrence !== "all";
  ```
  Обработчики открытия:
  ```ts
  function openFilters(step: FiltersStep) {
    haptics.selection();
    dispatchFilters({ type: "open", step });
  }
  ```
  Передать `onOpenAll={() => openFilters("all")}`,
  `onOpenDate={() => openFilters("date")}` и т.д.
- `SearchFiltersSheet`:
  - `state={filtersState}`;
  - `today`, `labels={labelsQuery.data ?? []}`,
    `isLabelsLoading={labelsQuery.isPending}`,
    `isLabelsError={labelsQuery.isError}`,
    `onRetryLabels={() => void labelsQuery.refetch()}`;
  - проекты — из `projectsQuery`;
  - `onOpenStep={(step) => openFilters(step)}`;
  - `onBack={() => dispatchFilters({ type: "back" })}`;
  - `onClose={() => dispatchFilters({ type: "close" })}`;
  - `onApplyStep={(patch) => dispatchFilters({ type: "applyStep", patch })}`;
  - `onApplyAll={() => dispatchFilters({ type: "applyAll" })}`;
  - `onReset={() => dispatchFilters({ type: "reset" })}`.
- Удалить старые `activeChip` и preview-логику.
- Не добавлять фильтры в loader и не рендерить шторку на сервере вручную:
  `Modal` уже возвращает `null` до mount.

- [ ] **Step 4: Запустить тесты и увидеть успех**

Run: `npx vitest run app/routes/task-search.test.ts`
Expected: PASS.

- [ ] **Step 5: Прогнать все затронутые тесты**

Run:
`npx vitest run app/lib/tasks app/hooks/use-search-tasks.test.ts app/components/tasks/search app/routes/task-search.test.ts`
Expected: PASS.

---

### Task 11: Документация и полная проверка

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/specs/2026-11-07-task-search/spec.md`

**Interfaces:**
- Consumes: реализованное поведение.
- Produces: обновлённые инженерные правила и пометка о замене требований.

- [ ] **Step 1: Обновить `AGENTS.md`**

- В структуру `app/` добавить:
  - `components/tasks/search/filters/` — шаг «Все фильтры», шаги
    проекта/меток/приоритета/статуса/регулярности/даты, общие строки;
  - `lib/tasks/search-filters.ts` — модель фильтров и чистые помощники;
  - `lib/tasks/search-filters-reducer.ts` — черновик/применено/шаг;
  - `lib/text-search.ts` — общий `matchesSearchQuery`.
- В разделе про данные/состояние описать:
  - `/tasks/search` использует серверные `date`, `project_ids`,
    `priorities`, `status`, `recurrence`, `q`;
  - метки — клиентский AND по загруженным `limit=100`;
  - «Без проекта» очищает выбор проектов;
  - дата по умолчанию сегодня, `date=null` — сегодня, выбор даты меняет
    день списка;
  - черновик/применение/назад/закрытие/сброс;
  - чипы открывают под-шаги, бейдж считает группы;
  - периодические серии отдельно не фильтруются.
- В разделе UI добавить визуальные константы шторок и правило про
  `app-*`.
- В разделе проверок добавить ручные сценарии:
  - light/dark, 320/412/448, safe-area, клавиатура в поиске проектов/меток;
  - открытие всех шагов с чипов и из «Все фильтры», back/крестик/оверлей/
    Escape/свайп;
  - черновик: назад отбрасывает шаг, крестик — весь черновик, общий
    «Применить» применяет;
  - сброс мгновенно закрывает и возвращает сегодня;
  - проект: поиск, «Без проекта», «Сбросить», мультивыбор;
  - статус/регулярность: повторный тап снимает;
  - метки: AND, пустое состояние, ошибка/повтор;
  - дата: заголовок и список меняются, сброс возвращает сегодня;
  - завершение при статус-фильтре, откат при ошибке;
  - `?state=filter` только в DEV;
  - SSR `curl -s http://localhost:3000/tasks/search` без защищённых
    данных.

- [ ] **Step 2: Добавить пометку в старую спецификацию**

В `docs/specs/2026-11-07-task-search/spec.md` после метаданных добавить:

```markdown
> Примечание (2026-11-08): фильтры-заглушки из FR-4 и ограничение
> «фильтры не передаются» из FR-8 заменены спецификацией
> `docs/specs/2026-11-08-task-search-filters/spec.md`. Поиск, сегменты,
> результаты, завершение задач и dev-preview сохраняются.
```

- [ ] **Step 3: Полная автоматическая проверка**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: все команды завершаются успешно.

- [ ] **Step 4: Проверить SSR**

```bash
npm run build
PORT=3000 npm start
curl -s http://localhost:3000/tasks/search
```

Expected: в SSR-ответе нет защищённых данных задач, меток, проектов,
счётчиков и прогресса; шторки не рендерятся; публичное meta description
допускается.

- [ ] **Step 5: Ручные проверки**

Пройти список из Step 1 в браузере/Telegram: light/dark, ширины
`320/412/448`, safe-area, клавиатура, все шаги, back/close/reset,
проект/метки/статус/регулярность/дата, оптимистичное завершение,
dev-preview, SSR.

- [ ] **Step 6: Не коммитить**

Не создавать коммит. Сообщить рабочее дерево и результаты проверок.

---

## Self-Review

- **Spec coverage:** FR-1 → Task 1; FR-2/FR-12 → Tasks 9–10; FR-3 → Task 4;
  FR-4 → Task 5; FR-5 → Tasks 3, 8; FR-6/FR-7 → Tasks 3, 8; FR-8 → Task 6;
  FR-9 → Task 7; FR-10 → Task 8; FR-11 → Tasks 1–2, 10; FR-13 → Task 10;
  FR-14 → Tasks 3–9; FR-15 → Tasks 1–11.
- **Placeholder scan:** все шаги содержат конкретные файлы, сигнатуры,
  тесты или команды; TBD/«обработать edge cases» отсутствуют.
- **Type consistency:** `SearchTaskFilters`, `FiltersStep`,
  `FilterChoiceOption`, `SearchFiltersState`, `SearchFiltersAction`,
  `SearchFiltersSheetProps` определены один раз и используются далее с
  теми же именами.
- **Review Focus coverage:** изоляция черновика (Task 8), сброс (Task 8),
  метки AND (Task 1, 6), «Без проекта» (Task 1, 5), статус+завершение
  (Task 1, 2, 10), дата (Task 1, 7, 10), pruning (Task 1, 10), чипы/back
  (Task 9, 10).
- **Proportion:** план описывает интерфейсы и проверки; тела компонентов
  не переписаны полностью, кроме неочевидных мест (svg, reducer, ключи).
