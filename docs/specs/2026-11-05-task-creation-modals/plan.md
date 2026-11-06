# Task Creation Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести шапку голосового окна к Figma и реализовать форму быстрого создания задачи (разовой и ежедневной серии) с метками, приоритетом, сроком, напоминаниями, плавными переходами подэкранов и реальным API.

**Architecture:** `BottomSheet` расширяется шапкой с back/close и разделителем. `QuickAddSheet` держит единый `react-hook-form`-черновик и переключает подэкраны внутри одной панели через `AnimatePresence` + Motion `layout`. Чистые модули `date-time`, `quick-task-schema`, `quick-task-payload` собирают `due_at` в часовом поясе пользователя и payload для `POST /tasks` или `POST /task-series`. Метки и создание задачи идут через `apiRequest` и React Query.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Tailwind CSS 4, Motion 14 (`motion/react`), react-hook-form 7, zod 4, React Query 5, Vitest.

**Spec:** `docs/specs/2026-11-05-task-creation-modals/spec.md`

## Global Constraints

- Новые зависимости не добавлять: `motion`, `react-hook-form`, `zod`, `@tanstack/react-query` уже установлены.
- Motion импортировать только из `motion/react`; `MotionConfig reducedMotion="user"` уже стоит в `AppProviders`.
- Только токены `app-*`; `dark:`-классы и хардкод цветов Telegram не добавлять.
- Формы — `react-hook-form` + zod-схема как единственный источник валидации; resolver реализуется локально без `@hookform/resolvers`.
- Все API-запросы — через `apiRequest` из `app/lib/api/client.ts`; прямых `fetch`/`axios` в компонентах нет.
- `AuthUser.timezone` — обязательное поле; backend всегда его возвращает.
- Метки только читаются (`GET /labels`); создания/редактирования меток нет.
- Ползунок регулярности создаёт только `frequency: "daily"`; `periodic` вне scope.
- Дата/время по умолчанию — текущие локальные дата/время пользователя в `user.timezone`, секунды `0`.
- Приоритет по умолчанию — `important_not_urgent` (P2).
- Автонапоминания по умолчанию: мастер включён, «До срока» включено на 1 час, «По расписанию» выключено.
- Overlay-клик не закрывает форму; X/Escape/«Закрыть» закрывают; «назад» отбрасывает изменения подэкрана.
- Кнопка «Добавить задачу» активна только при `title.trim().length > 0` и вне pending.
- Файлы — kebab-case, компоненты — PascalCase, алиас `~/`, типы — `import type`.
- Нет доступа к `window`/`document` на верхнем уровне модулей.
- Токены, refresh cookie и `initData` не логируются и не сохраняются в хранилищах.
- Тесты — Vitest, файлы `app/**/*.test.ts`; компонентные тесты — `createElement` + `renderToStaticMarkup`.
- Проверки перед завершением: `npm test`, `npm run typecheck`, `npm run build`.
- Коммитить только файлы задачи.

## Review Focus

- **DST и часовой пояс.** `due_at` для Europe/Moscow, America/New_York и UTC должен соответствовать выбранным локальным дате/времени; переходы на летнее/зимнее время не должны сдвигать день. Тест — в Task 1.
- **Регулярная серия в прошлом.** `starts_on` может быть сегодня или в прошлом; UI не должен обещать экземпляр сегодня и не должен падать. Тест payload — в Task 3, ручная проверка — в Task 10.
- **Малый viewport.** На 320px и при открытой клавиатуре панель не должна обрезать кнопку «Применить», ломать высоту или давать горизонтальный скролл страницы. Тесты статической разметки — в Tasks 6–8, ручная проверка — в Task 10.
- **Пустые/удалённые метки.** Пустой список показывает точную фразу; `404` при создании из-за удалённой метки не теряет черновик. Тесты — в Tasks 2, 6 и 10.
- **Двойная отправка и закрытие во время мутации.** Повторное нажатие не создаёт две задачи; закрытие абортит запрос и не обновляет состояние после unmount. Проверка — в Task 9 и Task 10.

---

## File Structure

**Create**

```text
app/assets/icons/
  calendar.svg
  check.svg
  chevron-down.svg
  chevron-left.svg
  chevron-right.svg
  clock.svg
  flag.svg
  repeat.svg
  tag.svg
  tag-plus.svg

app/components/tasks/quick-add/
  calendar.tsx
  due-step.tsx
  labels-step.tsx
  priority-step.tsx
  quick-add-chips.tsx
  quick-add-form.tsx
  quick-add-sheet.tsx
  quick-add-step.ts
  reminders-step.tsx
  use-create-quick-task.ts
  use-quick-task-form.ts

app/components/ui/
  option-chip.tsx
  select-field.tsx
  sheet-header.tsx
  switch.tsx
  time-input.tsx

app/lib/labels/
  labels-api.ts
  types.ts

app/lib/tasks/
  date-time.ts
  priority.ts
  quick-task-errors.ts
  quick-task-payload.ts
  quick-task-schema.ts
  tasks-api.ts
  types.ts
```

**Modify**

```text
app/components/ui/bottom-sheet.tsx
app/components/voice/voice-recorder-sheet.tsx
app/lib/api/types.ts
app/routes/home.tsx
AGENTS.md
```

**Tests**

```text
app/lib/tasks/date-time.test.ts
app/lib/tasks/quick-task-schema.test.ts
app/lib/tasks/quick-task-payload.test.ts
app/lib/tasks/quick-task-errors.test.ts
app/lib/tasks/tasks-api.test.ts
app/lib/labels/labels-api.test.ts
app/components/ui/sheet-header.test.ts
app/components/ui/switch.test.ts
app/components/ui/select-field.test.ts
app/components/tasks/quick-add/calendar.test.ts
app/components/tasks/quick-add/labels-step.test.ts
app/components/tasks/quick-add/priority-step.test.ts
app/components/tasks/quick-add/due-step.test.ts
app/components/tasks/quick-add/reminders-step.test.ts
app/components/tasks/quick-add/quick-add-step.test.ts
```

---

### Task 1: Auth timezone and local date/time utilities

**Files:**
- Modify: `app/lib/api/types.ts:14-18`
- Modify: `app/lib/api/client.test.ts:38-55`
- Modify: `app/lib/auth/bootstrap-auth.test.ts:14-30`
- Modify: `app/lib/auth/auth-api.test.ts:34-50`
- Create: `app/lib/tasks/date-time.ts`
- Test: `app/lib/tasks/date-time.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface ZonedNow { year: number; month: number; day: number; hour: number; minute: number }`
  - `interface MonthCell { date: string; day: number; inCurrentMonth: boolean }`
  - `getZonedNow(now: Date, timeZone: string): ZonedNow`
  - `getDefaultDue(now: Date, timeZone: string): { date: string; time: string }`
  - `zonedDateTimeToIso(date: string, time: string, timeZone: string): string`
  - `addDays(date: string, days: number): string`
  - `formatDueChip(date: string, time: string, timeZone: string, now: Date): string`
  - `formatDueHint(date: string, time: string, timeZone: string, now: Date, isRecurring: boolean): string`
  - `formatMonthTitle(year: number, month: number): string` (`month` 1-based)
  - `getMonthGrid(year: number, month: number): MonthCell[]` (42 cells, Monday first)
  - `isDateInRange(date: string): boolean` (`2025-01-01 … 2100-12-31`)

- [ ] **Step 1: Write the failing date/time tests**

```ts
import { describe, expect, it } from "vitest";

import {
  addDays,
  formatDueChip,
  formatDueHint,
  formatMonthTitle,
  getDefaultDue,
  getMonthGrid,
  getZonedNow,
  isDateInRange,
  zonedDateTimeToIso,
} from "./date-time";

const now = new Date("2026-11-05T13:07:42Z");

describe("getZonedNow", () => {
  it("returns local parts in the user timezone", () => {
    expect(getZonedNow(now, "Europe/Moscow")).toEqual({
      year: 2026,
      month: 11,
      day: 5,
      hour: 16,
      minute: 7,
    });
  });
});

describe("getDefaultDue", () => {
  it("uses the current local minute with zero seconds", () => {
    expect(getDefaultDue(now, "Europe/Moscow")).toEqual({
      date: "2026-11-05",
      time: "16:07",
    });
  });

  it("keeps the user timezone across UTC day boundaries", () => {
    expect(getDefaultDue(new Date("2026-11-05T22:30:00Z"), "Europe/Moscow")).toEqual({
      date: "2026-11-06",
      time: "01:30",
    });
  });
});

describe("zonedDateTimeToIso", () => {
  it("converts a Moscow local time to UTC", () => {
    expect(zonedDateTimeToIso("2026-11-06", "10:00", "Europe/Moscow")).toBe(
      "2026-11-06T07:00:00.000Z",
    );
  });

  it("handles the New York spring-forward offset", () => {
    expect(
      zonedDateTimeToIso("2026-03-08", "03:30", "America/New_York"),
    ).toBe("2026-03-08T07:30:00.000Z");
  });

  it("handles the New York standard-time offset", () => {
    expect(
      zonedDateTimeToIso("2026-11-01", "03:30", "America/New_York"),
    ).toBe("2026-11-01T08:30:00.000Z");
  });
});

describe("date formatting", () => {
  it("formats today, tomorrow and other dates in the chip", () => {
    expect(formatDueChip("2026-11-05", "16:00", "Europe/Moscow", now)).toBe(
      "Сегодня, 16:00",
    );
    expect(formatDueChip("2026-11-06", "16:00", "Europe/Moscow", now)).toBe(
      "Завтра, 16:00",
    );
    expect(formatDueChip("2026-11-11", "16:00", "Europe/Moscow", now)).toBe(
      "На 11.11.2026, 16:00",
    );
  });

  it("formats the recurring and one-off hints", () => {
    expect(
      formatDueHint("2026-11-11", "16:00", "Europe/Moscow", now, true),
    ).toBe("С 11.11.2026, ежедневно в 16:00");
    expect(
      formatDueHint("2026-11-05", "16:00", "Europe/Moscow", now, false),
    ).toBe("Сегодня, 16:00");
    expect(
      formatDueHint("2026-11-11", "16:00", "Europe/Moscow", now, false),
    ).toBe("На 11.11.2026, 16:00");
  });
});

describe("calendar helpers", () => {
  it("builds a Monday-first 42-cell grid", () => {
    const grid = getMonthGrid(2026, 11);

    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({
      date: "2026-10-26",
      day: 26,
      inCurrentMonth: false,
    });
    expect(grid[41]).toEqual({
      date: "2026-12-06",
      day: 6,
      inCurrentMonth: false,
    });
  });

  it("formats the month title and adds calendar days", () => {
    expect(formatMonthTitle(2026, 11)).toBe("Ноябрь 2026");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("accepts only the API date range", () => {
    expect(isDateInRange("2025-01-01")).toBe(true);
    expect(isDateInRange("2100-12-31")).toBe(true);
    expect(isDateInRange("2024-12-31")).toBe(false);
    expect(isDateInRange("2101-01-01")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/lib/tasks/date-time.test.ts`
Expected: FAIL — module `./date-time` not found.

- [ ] **Step 3: Add `timezone` to `AuthUser` and fixtures**

```ts
export interface AuthUser {
  id: number;
  timezone: string;
  created_at: string;
  telegram_profile: TelegramProfile;
}
```

Во всех трёх фикстурах (`client.test.ts`, `bootstrap-auth.test.ts`, `auth-api.test.ts`) добавить `timezone: "UTC"` рядом с `id`.

- [ ] **Step 4: Implement `app/lib/tasks/date-time.ts`**

Алгоритм `zonedDateTimeToIso`: собрать `Date.UTC` из компонентов, вычислить offset зоны через `Intl.DateTimeFormat` с `formatToParts` и `hourCycle: "h23"`, скорректировать момент, повторить расчёт offset и вернуть `toISOString()`. Для `formatDueChip`/`formatDueHint` сравнить локальную дату `now` в `timeZone` с выбранной датой через строки `YYYY-MM-DD`. Для `addDays` использовать `Date.UTC` и календарную арифметику. Для `getMonthGrid` — понедельник как первый день, 42 ячейки.

- [ ] **Step 5: Run date/time tests and full suite**

Run: `npm test -- app/lib/tasks/date-time.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS; фикстуры с `timezone` не ломают auth-тесты.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/lib/tasks/date-time.ts app/lib/tasks/date-time.test.ts \
  app/lib/api/types.ts app/lib/api/client.test.ts \
  app/lib/auth/bootstrap-auth.test.ts app/lib/auth/auth-api.test.ts
git commit -m "feat(tasks): add timezone-aware task date helpers"
```

---

### Task 2: Task and label API modules

**Files:**
- Create: `app/lib/labels/types.ts`
- Create: `app/lib/labels/labels-api.ts`
- Test: `app/lib/labels/labels-api.test.ts`
- Create: `app/lib/tasks/types.ts`
- Create: `app/lib/tasks/tasks-api.ts`
- Test: `app/lib/tasks/tasks-api.test.ts`
- Create: `app/lib/tasks/quick-task-errors.ts`
- Test: `app/lib/tasks/quick-task-errors.test.ts`

**Interfaces:**
- Consumes: `apiRequest` из `app/lib/api/client.ts`; `ApiError`, `ApiNetworkError`.
- Produces:
  - `Priority`, `TaskRecurrence`, `ColorResponse`, `LabelResponse`, `ReminderInput`, `TaskCreateInput`, `SeriesCreateInput`, `TaskResponse`, `SeriesResponse`.
  - `fetchLabels(signal?: AbortSignal): Promise<LabelResponse[]>`
  - `createTask(input: TaskCreateInput, signal?: AbortSignal): Promise<TaskResponse>`
  - `createSeries(input: SeriesCreateInput, signal?: AbortSignal): Promise<SeriesResponse>`
  - `describeQuickAddError(error: unknown): string`

- [ ] **Step 1: Write failing API tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "~/lib/api/client";
import { fetchLabels } from "./labels-api";

vi.mock("~/lib/api/client", () => ({ apiRequest: vi.fn() }));

const apiRequestMock = vi.mocked(apiRequest);

beforeEach(() => apiRequestMock.mockReset());

describe("fetchLabels", () => {
  it("returns label items from GET /labels", async () => {
    const label = {
      id: 3,
      name: "Личное",
      color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
      created_at: "2026-11-05T09:00:00Z",
      updated_at: "2026-11-05T09:00:00Z",
    };
    apiRequestMock.mockResolvedValue({ items: [label] });

    await expect(fetchLabels()).resolves.toEqual([label]);
    expect(apiRequestMock).toHaveBeenCalledWith("/labels", {
      signal: undefined,
    });
  });
});
```

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "~/lib/api/client";
import { createSeries, createTask } from "./tasks-api";
import type { SeriesCreateInput, TaskCreateInput } from "./types";

vi.mock("~/lib/api/client", () => ({ apiRequest: vi.fn() }));

const apiRequestMock = vi.mocked(apiRequest);

const taskInput: TaskCreateInput = {
  title: "Позвонить врачу",
  due_at: "2026-11-06T07:00:00.000Z",
  priority: "important_not_urgent",
  label_ids: [3],
  reminders_enabled: true,
  reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
};

const seriesInput: SeriesCreateInput = {
  title: "Зарядка",
  priority: "important_not_urgent",
  frequency: "daily",
  time_of_day: "07:00:00",
  timezone: "Europe/Moscow",
  starts_on: "2026-11-06",
  label_ids: [],
  reminders_enabled: false,
  reminders: [],
};

beforeEach(() => apiRequestMock.mockReset());

describe("tasks API", () => {
  it("creates a one-off task with POST /tasks", async () => {
    apiRequestMock.mockResolvedValue({ id: 100 });
    await createTask(taskInput);
    expect(apiRequestMock).toHaveBeenCalledWith("/tasks", {
      method: "POST",
      body: taskInput,
      signal: undefined,
    });
  });

  it("creates a daily series with POST /task-series", async () => {
    apiRequestMock.mockResolvedValue({ id: 7 });
    await createSeries(seriesInput);
    expect(apiRequestMock).toHaveBeenCalledWith("/task-series", {
      method: "POST",
      body: seriesInput,
      signal: undefined,
    });
  });
});
```

- [ ] **Step 2: Write failing error-copy tests**

```ts
import { describe, expect, it } from "vitest";

import { ApiError, ApiNetworkError } from "~/lib/api/errors";
import { describeQuickAddError } from "./quick-task-errors";

describe("describeQuickAddError", () => {
  it("maps network and timeout errors", () => {
    expect(describeQuickAddError(new ApiNetworkError("Network request failed"))).toBe(
      "Не удалось подключиться. Проверьте сеть и попробуйте ещё раз.",
    );
  });

  it("maps HTTP statuses to user-facing copy", () => {
    const error = (status: number) =>
      new ApiError("technical", { status, code: "x", requestId: "r" });

    expect(describeQuickAddError(error(422))).toBe(
      "Проверьте заполнение формы и попробуйте ещё раз.",
    );
    expect(describeQuickAddError(error(404))).toBe(
      "Метки больше недоступны. Обновите список.",
    );
    expect(describeQuickAddError(error(429))).toBe(
      "Слишком много запросов. Попробуйте позже.",
    );
    expect(describeQuickAddError(error(500))).toBe(
      "Сервис временно недоступен. Попробуйте ещё раз.",
    );
  });

  it("falls back to the generic copy", () => {
    expect(describeQuickAddError(new Error("boom"))).toBe(
      "Не удалось добавить задачу. Попробуйте ещё раз.",
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- app/lib/labels/labels-api.test.ts app/lib/tasks/tasks-api.test.ts app/lib/tasks/quick-task-errors.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement types and API modules**

`fetchLabels` разворачивает `{ items }`. `createTask`/`createSeries` передают тело как есть. `describeQuickAddError` проверяет `ApiNetworkError`, затем `ApiError.status` (`400/422`, `404`, `429`, `>=500`). `TaskResponse`/`SeriesResponse` описывают поля, которые используются в проекте (id, title, priority, recurrence/frequency, due_at/time_of_day, labels, reminders и служебные даты).

- [ ] **Step 5: Run tests, typecheck, commit**

Run: `npm test -- app/lib/labels/labels-api.test.ts app/lib/tasks/tasks-api.test.ts app/lib/tasks/quick-task-errors.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/lib/labels app/lib/tasks/types.ts app/lib/tasks/tasks-api.ts \
  app/lib/tasks/tasks-api.test.ts app/lib/tasks/quick-task-errors.ts \
  app/lib/tasks/quick-task-errors.test.ts
git commit -m "feat(tasks): add labels and task creation API clients"
```

---

### Task 3: Form schema, defaults, priority mapping and payload builders

**Files:**
- Create: `app/lib/tasks/priority.ts`
- Create: `app/lib/tasks/quick-task-schema.ts`
- Create: `app/lib/tasks/quick-task-payload.ts`
- Test: `app/lib/tasks/quick-task-schema.test.ts`
- Test: `app/lib/tasks/quick-task-payload.test.ts`

**Interfaces:**
- Consumes: `Priority`, `ReminderInput`, `TaskCreateInput`, `SeriesCreateInput`; `getDefaultDue`, `zonedDateTimeToIso`.
- Produces:
  - `type DueUnit = "minutes" | "hours" | "days"`
  - `interface QuickTaskDraft { title: string; dueDate: string; dueTime: string; isRecurring: boolean; priority: Priority; labelIds: number[]; remindersEnabled: boolean; beforeDueEnabled: boolean; beforeDueAmount: number; beforeDueUnit: DueUnit; scheduledEnabled: boolean; scheduledIntervalDays: number; scheduledTime: string }`
  - `PRIORITY_OPTIONS: readonly { value: Priority; label: string; shortLabel: "P1" | "P2" | "P3" | "P4" }[]`
  - `priorityShortLabel(priority: Priority): "P1" | "P2" | "P3" | "P4"`
  - `createQuickTaskDefaults(now: Date, timeZone: string): QuickTaskDraft`
  - `quickTaskSchema: z.ZodType<QuickTaskDraft>`
  - `quickTaskResolver: Resolver<QuickTaskDraft>`
  - `isQuickTaskSubmittable(draft: Pick<QuickTaskDraft, "title">, isPending: boolean): boolean`
  - `buildReminderInputs(draft: QuickTaskDraft): { enabled: boolean; reminders: ReminderInput[] }`
  - `toTaskCreateInput(draft: QuickTaskDraft, timeZone: string): TaskCreateInput`
  - `toSeriesCreateInput(draft: QuickTaskDraft, timeZone: string): SeriesCreateInput`

- [ ] **Step 1: Write failing schema/defaults tests**

```ts
import { describe, expect, it } from "vitest";

import {
  createQuickTaskDefaults,
  isQuickTaskSubmittable,
  quickTaskSchema,
} from "./quick-task-schema";
import { PRIORITY_OPTIONS, priorityShortLabel } from "./priority";

const now = new Date("2026-11-05T13:07:42Z");

describe("quick task defaults", () => {
  it("uses the spec defaults", () => {
    expect(createQuickTaskDefaults(now, "Europe/Moscow")).toEqual({
      title: "",
      dueDate: "2026-11-05",
      dueTime: "16:07",
      isRecurring: false,
      priority: "important_not_urgent",
      labelIds: [],
      remindersEnabled: true,
      beforeDueEnabled: true,
      beforeDueAmount: 1,
      beforeDueUnit: "hours",
      scheduledEnabled: false,
      scheduledIntervalDays: 1,
      scheduledTime: "14:00",
    });
  });
});

describe("quick task schema", () => {
  it("rejects empty and too-long titles", () => {
    const base = createQuickTaskDefaults(now, "Europe/Moscow");

    expect(
      quickTaskSchema.safeParse({ ...base, title: "   " }).success,
    ).toBe(false);
    expect(
      quickTaskSchema.safeParse({ ...base, title: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      quickTaskSchema.safeParse({ ...base, title: "Задача" }).success,
    ).toBe(true);
  });

  it("keeps the submit button disabled for empty titles and pending state", () => {
    expect(isQuickTaskSubmittable({ title: "  " }, false)).toBe(false);
    expect(isQuickTaskSubmittable({ title: "Задача" }, true)).toBe(false);
    expect(isQuickTaskSubmittable({ title: "Задача" }, false)).toBe(true);
  });
});

describe("priority mapping", () => {
  it("maps the four priorities to P1-P4 and the exact copy", () => {
    expect(PRIORITY_OPTIONS.map((option) => option.label)).toEqual([
      "Срочные и важные",
      "Важные, но не срочные",
      "Срочные, но не важные",
      "Не срочные и не важные",
    ]);
    expect(priorityShortLabel("urgent_important")).toBe("P1");
    expect(priorityShortLabel("important_not_urgent")).toBe("P2");
    expect(priorityShortLabel("urgent_not_important")).toBe("P3");
    expect(priorityShortLabel("neither")).toBe("P4");
  });
});
```

- [ ] **Step 2: Write failing payload tests**

```ts
import { describe, expect, it } from "vitest";

import { createQuickTaskDefaults } from "./quick-task-schema";
import {
  buildReminderInputs,
  toSeriesCreateInput,
  toTaskCreateInput,
} from "./quick-task-payload";

const now = new Date("2026-11-05T13:07:42Z");
const moscow = "Europe/Moscow";

function draft(overrides: Partial<ReturnType<typeof createQuickTaskDefaults>> = {}) {
  return {
    ...createQuickTaskDefaults(now, moscow),
    title: "  Позвонить врачу  ",
    dueDate: "2026-11-06",
    dueTime: "10:00",
    ...overrides,
  };
}

describe("toTaskCreateInput", () => {
  it("builds a one-off task with a zoned due_at and deduped labels", () => {
    const input = toTaskCreateInput(
      draft({ labelIds: [3, 3, 4], priority: "urgent_important" }),
      moscow,
    );

    expect(input).toEqual({
      title: "Позвонить врачу",
      due_at: "2026-11-06T07:00:00.000Z",
      priority: "urgent_important",
      label_ids: [3, 4],
      reminders_enabled: true,
      reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
    });
  });
});

describe("toSeriesCreateInput", () => {
  it("builds a daily series without interval_days or project", () => {
    const input = toSeriesCreateInput(
      draft({ isRecurring: true, labelIds: [3] }),
      moscow,
    );

    expect(input).toEqual({
      title: "Позвонить врачу",
      priority: "important_not_urgent",
      frequency: "daily",
      time_of_day: "10:00:00",
      timezone: moscow,
      starts_on: "2026-11-06",
      label_ids: [3],
      reminders_enabled: true,
      reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
    });
  });

  it("starts from a past date without changing it", () => {
    const input = toSeriesCreateInput(
      draft({ isRecurring: true, dueDate: "2026-01-01" }),
      moscow,
    );

    expect(input.starts_on).toBe("2026-01-01");
  });
});

describe("buildReminderInputs", () => {
  it("converts hours and days to minutes", () => {
    expect(
      buildReminderInputs(draft({ beforeDueAmount: 2, beforeDueUnit: "days" })),
    ).toEqual({
      enabled: true,
      reminders: [
        { kind: "before_due", enabled: true, offset_minutes: 2880 },
      ],
    });
  });

  it("adds the scheduled rule when enabled", () => {
    expect(
      buildReminderInputs(
        draft({
          scheduledEnabled: true,
          scheduledIntervalDays: 7,
          scheduledTime: "09:30",
        }),
      ),
    ).toEqual({
      enabled: true,
      reminders: [
        { kind: "before_due", enabled: true, offset_minutes: 60 },
        {
          kind: "scheduled",
          enabled: true,
          interval_days: 7,
          time_of_day: "09:30:00",
        },
      ],
    });
  });

  it("disables reminders when the master or both rules are off", () => {
    expect(
      buildReminderInputs(draft({ remindersEnabled: false })),
    ).toEqual({ enabled: false, reminders: [] });
    expect(
      buildReminderInputs(
        draft({ beforeDueEnabled: false, scheduledEnabled: false }),
      ),
    ).toEqual({ enabled: false, reminders: [] });
  });

  it("clamps the offset to the API maximum", () => {
    expect(
      buildReminderInputs(
        draft({ beforeDueAmount: 999999, beforeDueUnit: "days" }),
      ).reminders[0]?.offset_minutes,
    ).toBe(525600);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- app/lib/tasks/quick-task-schema.test.ts app/lib/tasks/quick-task-payload.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement the schema, resolver, priority and payload modules**

`quickTaskResolver` вызывает `quickTaskSchema.safeParse` и маппит `issues` в `FieldErrors<QuickTaskDraft>` по `issue.path.join(".")`. `createQuickTaskDefaults` использует `getDefaultDue`. `buildReminderInputs` считает `offset_minutes` как `amount * multiplier`, где минуты `1`, часы `60`, дни `1440`, и ограничивает `525600`. `toTaskCreateInput`/`toSeriesCreateInput` не передают `project_id`, `description`, `ends_on`, `interval_days`; title обрезается; `label_ids` дедуплицируются.

- [ ] **Step 5: Run tests, typecheck, commit**

Run: `npm test -- app/lib/tasks/quick-task-schema.test.ts app/lib/tasks/quick-task-payload.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/lib/tasks/priority.ts app/lib/tasks/quick-task-schema.ts \
  app/lib/tasks/quick-task-payload.ts \
  app/lib/tasks/quick-task-schema.test.ts \
  app/lib/tasks/quick-task-payload.test.ts
git commit -m "feat(tasks): add quick task form model and payload builders"
```

---

### Task 4: Sheet header, bottom sheet refactor, switch and icons

**Files:**
- Create: `app/components/ui/sheet-header.tsx`
- Test: `app/components/ui/sheet-header.test.ts`
- Modify: `app/components/ui/bottom-sheet.tsx`
- Create: `app/components/ui/switch.tsx`
- Test: `app/components/ui/switch.test.ts`
- Modify: `app/components/voice/voice-recorder-sheet.tsx:192-236`
- Create: `app/assets/icons/{calendar,check,chevron-down,chevron-left,chevron-right,clock,flag,repeat,tag,tag-plus}.svg`

**Interfaces:**
- Consumes: `cn`, `AssetIcon`, `Modal`.
- Produces:
  - `SheetHeader({ titleId, title, onClose, onBack?, closeLabel?, backLabel? })`
  - `BottomSheet` добавляет `onBack?: () => void`, `showCloseButton?: boolean` (default `true`), `panelHeight?: number | "auto"` (default `"auto"`), `panelAnimateLayout?: boolean` (default `false`).
  - `BottomSheetPrimaryAction` — синяя кнопка действия внутри панели (`50px`, `app-accent`).
  - `Switch({ checked, onCheckedChange, label, disabled?, className? })`
  - SVG-ассеты для `AssetIcon`.

- [ ] **Step 1: Write failing header and switch tests**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SheetHeader } from "./sheet-header";

const noop = () => {};

describe("SheetHeader", () => {
  it("renders a centered title, close button and divider", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Добавление задачи",
        onClose: noop,
      }),
    );

    expect(html).toContain("Добавление задачи");
    expect(html).toContain('aria-label="Закрыть"');
    expect(html).toContain("border-b");
    expect(html).not.toContain('aria-label="Назад"');
  });

  it("renders the back button when onBack is provided", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Метки",
        onClose: noop,
        onBack: noop,
      }),
    );

    expect(html).toContain('aria-label="Назад"');
  });
});
```

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("exposes the switch role and checked state", () => {
    const html = renderToStaticMarkup(
      createElement(Switch, {
        checked: true,
        onCheckedChange: () => {},
        label: "Регулярная задача",
      }),
    );

    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-label="Регулярная задача"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/components/ui/sheet-header.test.ts app/components/ui/switch.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `SheetHeader`**

Структура: `relative flex h-[54px] shrink-0 items-center justify-between border-b border-app-stroke px-[15px]`. Заголовок — `absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold leading-[1.4] text-app-text whitespace-nowrap`. Кнопки back/close — `relative flex size-11 -m-[10px] items-center justify-center rounded-full text-app-text active:opacity-70 focus-visible:outline-2 focus-visible:outline-app-accent`, внутри иконка `size-6`; левый спейсер `size-6` при отсутствии `onBack`.

- [ ] **Step 4: Refactor `BottomSheet`**

- Убрать фиксированные `h-[380px]` и `p-[15px]` из панели.
- Панель: `motion.div layout={panelAnimateLayout}` с классами
  `relative flex w-full flex-col overflow-hidden rounded-[25px] bg-app-card`.
- `panelHeight === "auto"` → без inline-height; число → `style={{ height: panelHeight }}`.
- Вставить `SheetHeader`; `onClose={() => onOpenChange(false)}`; `onBack`.
- Body: `flex min-h-0 flex-auto flex-col overflow-y-auto overscroll-contain`
  + `bodyClassName`. `flex-auto` (basis auto), а не `flex-1`, чтобы панель с
  auto-height не схлопывалась; при max-height body скроллится.
- Добавить `BottomSheetPrimaryAction` рядом с `BottomSheetAction`:
  `h-[50px] w-full rounded-[25px] bg-app-accent text-[15px] font-semibold
  text-white disabled:opacity-40`.
- Footer остаётся внешним блоком под панелью.

- [ ] **Step 5: Update voice sheet to the new header and padding**

В `VoiceRecorderSheet` передать `panelHeight={380}` и `bodyClassName="items-center justify-between gap-5 px-6 pb-[30px] pt-[15px]"`. Удалить внутренний `div` с `flex min-h-0 flex-1 ...` или оставить его, но без дублирующих отступов. Копирайт и состояния не менять.

- [ ] **Step 6: Implement `Switch` and add icons**

`Switch` — `<button type="button" role="switch" aria-checked={checked} aria-label={label}>` с треком `h-7 w-12 rounded-full` (28×48) и бегунком `size-[22px]`; позиция бегунка анимируется Motion `animate={{ x: checked ? 23 : 3 }}` с spring stiffness 500/damping 32; цвет трека `transition-colors` (`bg-app-accent` / `bg-app-track`). Добавить SVG-иконки с `currentColor` и без встроенных цветов.

- [ ] **Step 7: Run tests, typecheck, build, commit**

Run: `npm test -- app/components/ui/sheet-header.test.ts app/components/ui/switch.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

```bash
git add app/components/ui/sheet-header.tsx app/components/ui/sheet-header.test.ts \
  app/components/ui/bottom-sheet.tsx app/components/ui/switch.tsx \
  app/components/ui/switch.test.ts app/components/voice/voice-recorder-sheet.tsx \
  app/assets/icons
git commit -m "feat(ui): add sheet header, switch and task icons"
```

---

### Task 5: Select, calendar, time input and chip primitives

**Files:**
- Create: `app/components/ui/select-field.tsx`
- Test: `app/components/ui/select-field.test.ts`
- Create: `app/components/ui/time-input.tsx`
- Create: `app/components/ui/option-chip.tsx`
- Test: `app/components/ui/option-chip.test.ts`
- Create: `app/components/tasks/quick-add/calendar.tsx`
- Test: `app/components/tasks/quick-add/calendar.test.ts`

**Interfaces:**
- Consumes: `getMonthGrid`, `formatMonthTitle`, `AssetIcon`, `cn`, Motion.
- Produces:
  - `interface SelectOption<T extends string | number> { value: T; label: string }`
  - `SelectField<T>({ value, options, onChange, ariaLabel, className? })`
  - `TimeInput({ value, onChange, ariaLabel, className? })`
  - `OptionChip({ icon, label?, endIcon?, active?, onClick, ariaLabel, className? })` — кнопка с `aria-haspopup="dialog"`.
  - `Calendar({ value, today?, minDate?, maxDate?, onSelect, className? })`

- [ ] **Step 1: Write failing static-render tests**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SelectField } from "./select-field";

describe("SelectField", () => {
  it("renders the selected label and a collapsed listbox trigger", () => {
    const html = renderToStaticMarkup(
      createElement(SelectField, {
        value: 1,
        options: [
          { value: 1, label: "Каждый день" },
          { value: 7, label: "Каждую неделю" },
        ],
        onChange: () => {},
        ariaLabel: "Повторять",
      }),
    );

    expect(html).toContain("Каждый день");
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
  });
});
```

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Calendar } from "./calendar";

describe("Calendar", () => {
  it("renders a Monday-first November 2026 grid with the selected day", () => {
    const html = renderToStaticMarkup(
      createElement(Calendar, {
        value: "2026-11-11",
        today: "2026-11-05",
        onSelect: () => {},
      }),
    );

    expect(html).toContain("Ноябрь 2026");
    expect(html).toContain("ПН");
    expect(html).toContain('aria-selected="true"');
    expect(html.match(/role="gridcell"/g)).toHaveLength(42);
  });
});
```

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OptionChip } from "./option-chip";

describe("OptionChip", () => {
  it("renders the label and active state", () => {
    const html = renderToStaticMarkup(
      createElement(OptionChip, {
        icon: createElement("span"),
        label: "Сегодня, 16:00",
        active: true,
        onClick: () => {},
        ariaLabel: "Изменить дату и время",
      }),
    );

    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain('aria-label="Изменить дату и время"');
    expect(html).toContain("text-app-accent");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/components/ui/select-field.test.ts app/components/ui/option-chip.test.ts app/components/tasks/quick-add/calendar.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `OptionChip` and `TimeInput`**

`OptionChip` — кнопка `h-[45px] rounded-[50px] border border-app-stroke bg-app-card px-[10px] text-[13px]`, active → `border-app-accent text-app-accent`, `aria-haspopup="dialog"`. `TimeInput` — `<input type="time" step={60} value={value} onChange>` с классами pill `h-11 w-[114px] rounded-xl bg-app-track text-center text-[17px] font-semibold text-app-accent`.

- [ ] **Step 4: Implement `Calendar`**

Локальный `view` (год/месяц, месяц 1-based) из `value`; `getMonthGrid`; заголовок `formatMonthTitle`; кнопки навигации с ограничением `2025-01 … 2100-12`; ячейки `role="gridcell"`, выбранная `aria-selected`, сегодня `aria-current="date"`, дни соседних месяцев `text-app-stroke`. Высота ячейки `36px`, выбранная — `bg-app-accent text-white rounded-[25px]`.

- [ ] **Step 5: Implement `SelectField` with portal popup**

Триггер по FR-9. Popup — `createPortal` в `document.body`, `position: fixed`, координаты из `getBoundingClientRect()`; `role="listbox"`; варианты — кнопки `role="option"` с `aria-selected`. Закрытие по Escape, pointerdown вне, scroll (capture) и resize. Анимация `AnimatePresence` + `motion.div` (`opacity`, `scale`, 160ms). Keyboard: ArrowUp/Down, Enter/Space, Escape.

- [ ] **Step 6: Run tests, typecheck, commit**

Run: `npm test -- app/components/ui/select-field.test.ts app/components/ui/option-chip.test.ts app/components/tasks/quick-add/calendar.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/components/ui/select-field.tsx app/components/ui/select-field.test.ts \
  app/components/ui/time-input.tsx app/components/ui/option-chip.tsx \
  app/components/ui/option-chip.test.ts app/components/tasks/quick-add/calendar.tsx \
  app/components/tasks/quick-add/calendar.test.ts
git commit -m "feat(ui): add select, calendar and chip primitives"
```

---

### Task 6: Labels and priority steps

**Files:**
- Create: `app/components/tasks/quick-add/labels-step.tsx`
- Test: `app/components/tasks/quick-add/labels-step.test.ts`
- Create: `app/components/tasks/quick-add/priority-step.tsx`
- Test: `app/components/tasks/quick-add/priority-step.test.ts`

**Interfaces:**
- Consumes: `LabelResponse`, `Priority`, `PRIORITY_OPTIONS`, `AssetIcon`, `cn`.
- Produces:
  - `LabelsStep({ labels, isLoading, isError, selectedIds, onRetry, onApply })`
  - `PriorityStep({ value, onApply })`
  - `getLabelsStepMessage(state: "loading" | "error" | "empty"): string`

- [ ] **Step 1: Write failing labels-step tests**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LabelsStep, getLabelsStepMessage } from "./labels-step";

const label = {
  id: 3,
  name: "Личное",
  color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
  created_at: "2026-11-05T09:00:00Z",
  updated_at: "2026-11-05T09:00:00Z",
};

function render(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(LabelsStep, {
      labels: [],
      isLoading: false,
      isError: false,
      selectedIds: [],
      onRetry: () => {},
      onApply: () => {},
      ...overrides,
    }),
  );
}

describe("LabelsStep", () => {
  it("uses the exact empty-state copy", () => {
    expect(getLabelsStepMessage("empty")).toBe(
      "На текущий момент у вас не создано ни 1 метки",
    );
    expect(render()).toContain(
      "На текущий момент у вас не создано ни 1 метки",
    );
  });

  it("renders labels with their color and selected state", () => {
    const html = render({ labels: [label], selectedIds: [3] });

    expect(html).toContain("Личное");
    expect(html).toContain("#16A34A");
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Применить");
  });

  it("renders loading and retry states", () => {
    expect(render({ isLoading: true })).toContain("Загружаем метки…");
    const error = render({ isError: true });
    expect(error).toContain("Не удалось загрузить метки");
    expect(error).toContain("Повторить");
  });
});
```

- [ ] **Step 2: Write failing priority-step test**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PriorityStep } from "./priority-step";

describe("PriorityStep", () => {
  it("renders all four priorities and marks the selected one", () => {
    const html = renderToStaticMarkup(
      createElement(PriorityStep, {
        value: "important_not_urgent",
        onApply: () => {},
      }),
    );

    expect(html).toContain("Срочные и важные");
    expect(html).toContain("Важные, но не срочные");
    expect(html).toContain("Срочные, но не важные");
    expect(html).toContain("Не срочные и не важные");
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain("Применить");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- app/components/tasks/quick-add/labels-step.test.ts app/components/tasks/quick-add/priority-step.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `LabelsStep`**

Строки `47px` с `border-b border-app-stroke`, левый индикатор `size-5 rounded-full border` (selected — `border-app-accent` + внутренняя точка `size-2.5 bg-app-accent`), `role="checkbox"` + `aria-checked`, иконка тега цветом `label.color.hex`, имя тем же цветом. Список — `flex flex-col`; при большом количестве — тело шторки скроллится. `onApply` получает выбранные id. Loading/error/empty — по `getLabelsStepMessage`; ошибка показывает кнопку «Повторить».

- [ ] **Step 5: Implement `PriorityStep`**

Четыре строки из `PRIORITY_OPTIONS`, высота `50px`, разделители; каждая строка — `role="radio"` + `aria-checked`; выбранная — `aria-checked="true"` и синяя галочка `AssetIcon check`, остальные — пустой спейсер `24×24`. Кнопка `BottomSheetPrimaryAction` «Применить» внизу.

- [ ] **Step 6: Run tests, typecheck, commit**

Run: `npm test -- app/components/tasks/quick-add/labels-step.test.ts app/components/tasks/quick-add/priority-step.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/components/tasks/quick-add/labels-step.tsx \
  app/components/tasks/quick-add/labels-step.test.ts \
  app/components/tasks/quick-add/priority-step.tsx \
  app/components/tasks/quick-add/priority-step.test.ts
git commit -m "feat(tasks): add labels and priority form steps"
```

---

### Task 7: Due date and time step

**Files:**
- Create: `app/components/tasks/quick-add/due-step.tsx`
- Test: `app/components/tasks/quick-add/due-step.test.ts`

**Interfaces:**
- Consumes: `Calendar`, `TimeInput`, `Switch`, `BottomSheetPrimaryAction`, `formatDueHint`, `getZonedNow`.
- Produces:
  - `DueStep({ date, time, isRecurring, timeZone, now, onApply })`
  - `onApply({ date: string; time: string; isRecurring: boolean }): void`

- [ ] **Step 1: Write failing due-step tests**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DueStep } from "./due-step";

const now = new Date("2026-11-05T13:07:42Z");

function render(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(DueStep, {
      date: "2026-11-05",
      time: "16:00",
      isRecurring: false,
      timeZone: "Europe/Moscow",
      now,
      onApply: () => {},
      ...overrides,
    }),
  );
}

describe("DueStep", () => {
  it("renders the calendar, time input, toggle and one-off hint", () => {
    const html = render();

    expect(html).toContain("Ноябрь 2026");
    expect(html).toContain('type="time"');
    expect(html).toContain("Регулярная задача");
    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain("Готово");
  });

  it("renders the recurring hint", () => {
    const html = render({
      date: "2026-11-11",
      isRecurring: true,
    });

    expect(html).toContain("С 11.11.2026, ежедневно в 16:00");
  });

  it("renders the one-off hint for another date", () => {
    const html = render({ date: "2026-11-11" });

    expect(html).toContain("На 11.11.2026, 16:00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/components/tasks/quick-add/due-step.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DueStep`**

Локальный state `date`, `time`, `isRecurring`, инициализируется пропсами. Календарь — `Calendar` с `minDate="2025-01-01"` и `maxDate="2100-12-31"`, `today` из `getZonedNow(now, timeZone)` (собрать `YYYY-MM-DD`). Строка времени: подпись `Время` + `TimeInput`. Строка переключения: `Регулярная задача` + `Switch`. Подсказка — `formatDueHint(...)`, обёрнутая в `AnimatePresence mode="wait"` с `key={isRecurring ? "recurring" : formatDueHint(...)}` и `aria-live="polite"`. Кнопка `BottomSheetPrimaryAction` «Готово» вызывает `onApply`.

- [ ] **Step 4: Run test, typecheck, commit**

Run: `npm test -- app/components/tasks/quick-add/due-step.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/components/tasks/quick-add/due-step.tsx \
  app/components/tasks/quick-add/due-step.test.ts
git commit -m "feat(tasks): add due date and recurrence step"
```

---

### Task 8: Reminders step

**Files:**
- Create: `app/components/tasks/quick-add/reminders-step.tsx`
- Test: `app/components/tasks/quick-add/reminders-step.test.ts`

**Interfaces:**
- Consumes: `Switch`, `SelectField`, `TimeInput`, `DueUnit`-подобные значения из `quick-task-schema`, `AssetIcon`.
- Produces:
  - `interface ReminderDraft { remindersEnabled: boolean; beforeDueEnabled: boolean; beforeDueAmount: number; beforeDueUnit: DueUnit; scheduledEnabled: boolean; scheduledIntervalDays: number; scheduledTime: string }`
  - `RemindersStep({ value, onApply })`
  - `REMINDER_UNIT_OPTIONS`, `REMINDER_INTERVAL_OPTIONS`

- [ ] **Step 1: Write failing reminders-step tests**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RemindersStep } from "./reminders-step";

const defaults = {
  remindersEnabled: true,
  beforeDueEnabled: true,
  beforeDueAmount: 1,
  beforeDueUnit: "hours" as const,
  scheduledEnabled: false,
  scheduledIntervalDays: 1,
  scheduledTime: "14:00",
};

function render(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(RemindersStep, {
      value: defaults,
      onApply: () => {},
      ...overrides,
    }),
  );
}

describe("RemindersStep", () => {
  it("renders the master switch, before-due settings and apply button", () => {
    const html = render();

    expect(html).toContain("Автонапоминания");
    expect(html).toContain("До срока задачи");
    expect(html).toContain("Часов");
    expect(html).toContain("Применить");
    expect(html).not.toContain("Каждый день");
  });

  it("shows scheduled controls when the scheduled rule is on", () => {
    const html = render({
      value: { ...defaults, scheduledEnabled: true },
    });

    expect(html).toContain("По расписанию");
    expect(html).toContain("Каждый день");
    expect(html).toContain("14:00");
  });

  it("hides settings when the master switch is off", () => {
    const html = render({
      value: { ...defaults, remindersEnabled: false },
    });

    expect(html).toContain("Автонапоминания");
    expect(html).not.toContain("До срока задачи");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/components/tasks/quick-add/reminders-step.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `RemindersStep`**

Локальный state из `value`. Мастер-строка всегда видна; блок настроек обёрнут в `AnimatePresence` + `motion.div` с `initial={{height:0, opacity:0}}`, `animate={{height:"auto", opacity:1}}`, `exit={{height:0, opacity:0}}`, `overflow:hidden`. Внутри:
- `До срока задачи` + `Switch`; при включении — число (`<input inputMode="numeric">`), `SelectField` единиц, helper.
- `По расписанию` + `Switch`; при включении — `SelectField` интервала, `TimeInput`, helper.
- Кнопка `BottomSheetPrimaryAction` «Применить» вызывает `onApply` с локальным состоянием и disabled при невалидном числе.
Число нормализуется в целое `>= 1`; при пустом/невалидном значении кнопка «Применить» disabled.

- [ ] **Step 4: Run test, typecheck, commit**

Run: `npm test -- app/components/tasks/quick-add/reminders-step.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/components/tasks/quick-add/reminders-step.tsx \
  app/components/tasks/quick-add/reminders-step.test.ts
git commit -m "feat(tasks): add reminders form step"
```

---

### Task 9: Quick-add sheet, main form, transitions and home integration

**Files:**
- Create: `app/components/tasks/quick-add/quick-add-step.ts`
- Test: `app/components/tasks/quick-add/quick-add-step.test.ts`
- Create: `app/components/tasks/quick-add/quick-add-form.tsx`
- Create: `app/components/tasks/quick-add/quick-add-chips.tsx`
- Create: `app/components/tasks/quick-add/use-quick-task-form.ts`
- Create: `app/components/tasks/quick-add/use-create-quick-task.ts`
- Create: `app/components/tasks/quick-add/quick-add-sheet.tsx`
- Modify: `app/routes/home.tsx:59-112`

**Interfaces:**
- Consumes: всё из Tasks 1–8; `useAuth`; `useTelegram`; React Query; `useRevalidator`.
- Produces:
  - `type QuickAddStep = "form" | "labels" | "priority" | "due" | "reminders"`
  - `getQuickAddHeader(step: QuickAddStep): { title: string; showBack: boolean }`
  - `QuickAddSheet({ open, onOpenChange })`
  - `useQuickTaskForm({ now, timeZone }): UseFormReturn<QuickTaskDraft> & { resetToDefaults: () => void }`
  - `useCreateQuickTask({ onSuccess, onError }): UseMutationResult<...>` + `mutate({ draft, timeZone, signal })`

- [ ] **Step 1: Write failing step-header tests**

```ts
import { describe, expect, it } from "vitest";

import { getQuickAddHeader } from "./quick-add-step";

describe("getQuickAddHeader", () => {
  it("uses the exact titles and back visibility", () => {
    expect(getQuickAddHeader("form")).toEqual({
      title: "Добавление задачи",
      showBack: false,
    });
    expect(getQuickAddHeader("labels")).toEqual({
      title: "Метки",
      showBack: true,
    });
    expect(getQuickAddHeader("priority")).toEqual({
      title: "Приоритет задачи",
      showBack: true,
    });
    expect(getQuickAddHeader("due")).toEqual({
      title: "Дата и время задачи",
      showBack: true,
    });
    expect(getQuickAddHeader("reminders")).toEqual({
      title: "Автонапоминания",
      showBack: true,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/components/tasks/quick-add/quick-add-step.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `quick-add-step.ts` and `use-quick-task-form.ts`**

`quick-add-step.ts` содержит тип и `getQuickAddHeader`. `use-quick-task-form` создаёт `useForm<QuickTaskDraft>` с `defaultValues: createQuickTaskDefaults(now, timeZone)`, `resolver: quickTaskResolver`, `mode: "onChange"`. Начальный фокус — контейнер диалога, не поле. Хук также возвращает `resetToDefaults()` — `form.reset(createQuickTaskDefaults(new Date(), timeZone))`; вызывать её при каждом переходе `open: false → true`, чтобы новая сессия не наследовала старую дату/время.

- [ ] **Step 4: Implement `use-create-quick-task.ts`**

```ts
interface CreateQuickTaskVariables {
  draft: QuickTaskDraft;
  timeZone: string;
  signal: AbortSignal;
}
```

`useMutation` вызывает `toTaskCreateInput(draft, timeZone)` или `toSeriesCreateInput(draft, timeZone)` по `draft.isRecurring`, затем `createTask`/`createSeries` с `signal`. `onSuccess`: инвалидировать `["tasks"]` и `["task-series"]`, вызвать переданный `onSuccess`. `onError`: вызвать переданный `onError` с исходной ошибкой; текст для UI строит `QuickAddSheet` через `describeQuickAddError`.

- [ ] **Step 5: Implement `quick-add-chips.tsx`**

Чипы по FR-4: дата/время (active всегда), метки, приоритет, напоминание. Использовать `OptionChip`; строка `flex gap-[10px] overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`. Для меток — цвет первой метки и формат `Name... + N`. Для даты — иконки `calendar`, `repeat` при `isRecurring`. Для приоритета — `priorityShortLabel`. Для напоминаний — active при `remindersEnabled && (beforeDueEnabled || scheduledEnabled)`.

- [ ] **Step 6: Implement `quick-add-form.tsx`**

`FormProvider` не обязателен: принять `form: UseFormReturn<QuickTaskDraft>`, `labels`, `onOpenStep`, `onSubmit`, `isPending`, `error`. Поле названия — `register("title")` с `maxLength=120`, `textarea` с placeholder; счётчик — `watch("title").length`; строка «Название»/счётчик имеет `px-[15px]`; чипы; кнопка `BottomSheetPrimaryAction` `Добавить задачу`/`Добавляем...`; ошибка `role="alert"` над кнопкой. Кнопка disabled по `isQuickTaskSubmittable`.

- [ ] **Step 7: Implement `quick-add-sheet.tsx`**

- `useAuth()` → `user.timezone`; `useTelegram()` → haptics.
- `useQuery({ queryKey: ["labels"], queryFn: ({signal}) => fetchLabels(signal), enabled: open })`.
- `useQuickTaskForm({ now: new Date(), timeZone: user?.timezone ?? "UTC" })`. `new Date()` вычислять при открытии/в рендере компонента, не на верхнем уровне модуля.
- `useEffect` на `open`: при `false → true` вызвать `resetToDefaults()`, `setStep("form")`, `setDirection(1)`, очистить локальную ошибку; при `false` — `abortRef.current?.abort()`.
- Локальный `step`, `direction`; `handleOpenStep(step)` ставит `direction=1`; back — `direction=-1`.
- `BottomSheet` с `title`/`onBack`/`showCloseButton`, `panelAnimateLayout`, `bodyClassName="p-[15px]"`, без `panelHeight`; footer — `BottomSheetAction` «Закрыть». `closeOnOverlayClick={false}`.
- Внутри body — `motion.div layout` + `AnimatePresence mode="popLayout"` с `custom={direction}`; ключ — `step`. Прямой ребёнок `AnimatePresence` — `motion.div` с ключом (не кастомный компонент), внутри — `QuickAddForm` или соответствующий step. Варианты из FR-11.
- `onApply` каждого step: `LabelsStep` → `form.setValue("labelIds", ids, { shouldDirty: true })`; `PriorityStep` → `form.setValue("priority", value, ...)`; `DueStep` → `setValue` для `dueDate`, `dueTime`, `isRecurring`; `RemindersStep` → `setValue` для шести полей напоминаний. Затем haptic selection, `direction=-1`, `step="form"`, вернуть фокус на чип, который открыл шаг (ref по `step`).
- Submit: создать `AbortController`, сохранить в ref, `mutate({ draft: form.getValues(), timeZone, signal })`. На success — success haptic, `onOpenChange(false)`, `resetToDefaults()`, `revalidator.revalidate()`. На error — локальный state с `describeQuickAddError`, error haptic, форма остаётся открытой; если это `ApiError` со `status === 404`, дополнительно инвалидировать `["labels"]`. На close/unmount — `abortRef.current?.abort()`.
- При переходе на подэкран — `document.activeElement instanceof HTMLElement && document.activeElement.blur()`.
- X/escape/«Закрыть» — `onOpenChange(false)`; при следующем открытии `resetToDefaults()` очистит черновик.

- [ ] **Step 8: Wire home**

В `home.tsx`:
- `const [activeModal, setActiveModal] = useState<"voice" | "quick-add" | null>(null);`
- `onAction`: `voice` → `activeModal="voice"`; `interactive` → `activeModal="quick-add"`; остальное — только haptic.
- `VoiceRecorderSheet open={activeModal === "voice"}` и `QuickAddSheet open={activeModal === "quick-add"}`; `onOpenChange(false)` → `setActiveModal(null)`.
- Удалить `isVoiceOpen`.

- [ ] **Step 9: Run tests, typecheck, build, commit**

Run: `npm test -- app/components/tasks/quick-add/quick-add-step.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

```bash
git add app/components/tasks/quick-add app/routes/home.tsx
git commit -m "feat(tasks): add quick task creation flow"
```

---

### Task 10: Documentation and end-to-end verification

**Files:**
- Modify: `AGENTS.md` (структура, данные, UI-паттерны)
- Optionally modify: `README.md` only if new scripts/env appear (не должны).

**Interfaces:**
- Consumes: результат Tasks 1–9.
- Produces: актуальная документация и подтверждённые проверки.

- [ ] **Step 1: Update `AGENTS.md`**

Добавить в раздел структуры:
- `app/components/tasks/quick-add/` — форма быстрого создания;
- `app/components/ui/` — `sheet-header`, `switch`, `select-field`, `time-input`, `option-chip`;
- `app/lib/labels/`, `app/lib/tasks/` — API и модель формы.
В разделе данных уточнить: метки читаются через `GET /labels`; создание — `POST /tasks` / `POST /task-series`; `AuthUser.timezone` используется для `due_at` и серии. В разделе UI — шапка шторки с back/close, переходы Motion `layout` + `AnimatePresence`.

- [ ] **Step 2: Run the full automated suite**

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Verify SSR and 404**

Run: `npm run build && PORT=3000 npm start`
Expected: сервер стартует.

Run: `curl -s http://localhost:3000/`
Expected: SSR-ответ не содержит разметку открытой формы и не падает.

Run: `curl -i http://localhost:3000/does-not-exist`
Expected: HTTP `404`, тексты 404-экрана, нижняя навигация.

- [ ] **Step 4: Manual browser/TMA checks**

Проверить в браузере и Telegram:
- 320 / 412 / 448px, light/dark, safe-area;
- открытие формы, переключение всех подэкранов, анимации без скачков и горизонтального скролла;
- пустые метки, ошибка загрузки меток, повторная загрузка;
- нативный time-picker, клавиатура, скрытие настроек напоминаний;
- создание разовой задачи и ежедневной серии, проверка `due_at`/`starts_on` в Network;
- ошибка 401/5xx не теряет черновик;
- закрытие во время отправки не создаёт задачу;
- голосовая шапка: X, разделитель, сброс записи;
- reduced motion: transform-анимации отключены.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document quick task creation flow"
```
