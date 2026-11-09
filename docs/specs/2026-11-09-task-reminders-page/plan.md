# Экран «Автоматические напоминания» задачи — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать страницу `/tasks/:id/reminders` с автосохранением правил «До срока задачи» и «По расписанию» по фреймам Figma `34:8403`, `34:8036`, `57:8848`, `34:9032`.

**Architecture:** Новый route под `_app` открывается из строки «Напоминание» на `/tasks/:id`. Чистые помощники в `app/lib/tasks/reminders.ts` преобразуют `TaskResponse` в черновик и обратно в `TaskUpdateInput`; хук `useUpdateTaskReminders` отправляет сериализованные PATCH-запросы и обновляет кэш. Компонент `TaskRemindersView` держит локальный черновик и вызывает `onSave` сразу при валидном изменении.

**Tech Stack:** React Router 8 Framework Mode, React 19, TypeScript 5.9 strict, Tailwind CSS 4, TanStack React Query 5, Vitest 5 (node, `renderToStaticMarkup`).

**Spec:** `docs/specs/2026-11-09-task-reminders-page/spec.md`

## Global Constraints

- Только токены `app-*`; light/dark через `data-app-theme`, без `dark:` и хардкода цветов.
- SSR включён; защищённые данные задачи не попадают в SSR-ответ; `useQuery` только после `AuthGate`.
- Новые зависимости не добавляются.
- Все API-запросы — через `apiRequest` / `updateTask`; `fetch` в компонентах не используется.
- Детальный ключ кэша обязан оставаться под `["tasks"]`: `["tasks","detail",taskId]`.
- `TaskUpdateInput` расширяется `reminders_enabled?: boolean` и `reminders?: ReminderInput[]`.
- TypeScript strict, без `any`; типы — через `import type`; алиас `~/*`.
- Файлы — `kebab-case`, компоненты — `PascalCase`; `default export` только у route-модулей.
- Тесты — Vitest, `app/**/*.test.ts`, среда `node`, без jsdom/Testing Library.
- Линтера нет; `npm run lint` не добавлять.
- Тексты: заголовок «Автоматические напоминания», описание «Milly напомнит о задаче в Telegram по заданным правилам.», подсказка off «Включите автонапоминания для настройки.», ошибка «Не удалось сохранить напоминания. Попробуйте ещё раз.».
- Правила: `before_due` — `offset_minutes` 0…525600; `scheduled` — `interval_days` `1/2/3/4/7`, `time_of_day` `HH:mm:00`; выключенные правила не отправляются.
- Ширины 320/412/448 px, light/dark и safe-area не ломаются.

## Review Focus

- Пустое/невалидное число в «До срока задачи»: PATCH не отправляется, видно «Укажите количество»; после ввода валидного — сохраняется.
- Пустое/невалидное время в «По расписанию»: PATCH не отправляется, видно «Укажите время»; валидное `HH:mm` сохраняется как `HH:mm:00`.
- Выключение мастера: PATCH содержит только `reminders_enabled: false`, без `reminders`; правила на сервере сохраняются, повторное включение их не перезаписывает.
- Выключение последнего включённого правила: мастер автоматически выключается, блок настроек скрывается, PATCH содержит `reminders_enabled: false` и `reminders: []`.
- Существующий `interval_days` вне набора `1/2/3/4/7`: показывается дополнительной опцией «Каждые N дней» и сохраняется без потери.

---

### Task 1: Общая модель напоминаний и payload

**Files:**
- Create: `app/lib/tasks/pluralize.ts`
- Create: `app/lib/tasks/reminders.ts`
- Modify: `app/lib/tasks/types.ts`
- Modify: `app/lib/tasks/quick-task-payload.ts`
- Modify: `app/lib/tasks/task-detail.ts:17-51`
- Modify: `app/components/tasks/quick-add/reminders-step.tsx:14-36`
- Test: `app/lib/tasks/reminders.test.ts`
- Test: `app/lib/tasks/quick-task-payload.test.ts` (не менять assertions; прогнать после рефакторинга)

**Interfaces:**
- Produces:
  - `export interface ReminderRuleDraft { beforeDueEnabled: boolean; beforeDueAmount: number; beforeDueUnit: DueUnit; scheduledEnabled: boolean; scheduledIntervalDays: number; scheduledTime: string }`
  - `export type TaskRemindersDraft = ReminderRuleDraft & { remindersEnabled: boolean }`
  - `export type ReminderDraft = TaskRemindersDraft`
  - `export function getTaskRemindersDraft(task: Pick<TaskResponse, "reminders_enabled" | "reminders">): TaskRemindersDraft`
  - `export function buildReminderRules(draft: ReminderRuleDraft): ReminderInput[]`
  - `export function buildTaskRemindersUpdate(draft: TaskRemindersDraft): TaskUpdateInput | null`
  - `export function getReminderIntervalOptions(intervalDays: number): { value: number; label: string }[]`
  - `export function parseReminderAmount(input: string): number | null`
  - `export const REMINDER_UNIT_OPTIONS: { value: DueUnit; label: string }[]`
  - `export const REMINDER_INTERVAL_OPTIONS: { value: number; label: string }[]`
  - `export const DEFAULT_REMINDER_TIME = "14:00"`
  - `export const MAX_REMINDER_OFFSET_MINUTES = 525600`
  - `export const TASK_REMINDERS_SAVE_ERROR = "Не удалось сохранить напоминания. Попробуйте ещё раз."`
  - `export function pluralizeRu(count: number, one: string, few: string, many: string): string` (в `pluralize.ts`)
- Consumes: `TaskResponse`, `ReminderInput`, `TaskUpdateInput` из `./types`; `DueUnit` из `./quick-task-schema`; `isValidTime` из `./date-time`.

- [ ] **Step 1: Написать падающие тесты модели**

Создать `app/lib/tasks/reminders.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildReminderRules,
  buildTaskRemindersUpdate,
  getReminderIntervalOptions,
  getTaskRemindersDraft,
  parseReminderAmount,
} from "./reminders";
import type { TaskResponse } from "./types";

function task(
  overrides: Partial<Pick<TaskResponse, "reminders_enabled" | "reminders">> = {},
): Pick<TaskResponse, "reminders_enabled" | "reminders"> {
  return {
    reminders_enabled: true,
    reminders: [
      {
        id: 1,
        kind: "before_due",
        enabled: true,
        offset_minutes: 840,
        interval_days: null,
        time_of_day: null,
        timezone: null,
        next_run_at: null,
      },
      {
        id: 2,
        kind: "scheduled",
        enabled: true,
        offset_minutes: null,
        interval_days: 3,
        time_of_day: "09:00:00",
        timezone: "Europe/Moscow",
        next_run_at: null,
      },
    ],
    ...overrides,
  };
}

function emptyTask(): Pick<TaskResponse, "reminders_enabled" | "reminders"> {
  return { reminders_enabled: false, reminders: [] };
}

describe("getTaskRemindersDraft", () => {
  it("returns defaults when there are no reminders", () => {
    expect(getTaskRemindersDraft(emptyTask())).toEqual({
      remindersEnabled: false,
      beforeDueEnabled: false,
      beforeDueAmount: 1,
      beforeDueUnit: "hours",
      scheduledEnabled: false,
      scheduledIntervalDays: 1,
      scheduledTime: "14:00",
    });
  });

  it("reads the master switch and the before-due offset in hours", () => {
    expect(getTaskRemindersDraft(task())).toMatchObject({
      remindersEnabled: true,
      beforeDueEnabled: true,
      beforeDueAmount: 14,
      beforeDueUnit: "hours",
      scheduledEnabled: true,
      scheduledIntervalDays: 3,
      scheduledTime: "09:00",
    });
  });

  it("reads days, minutes and zero offsets", () => {
    const days = task({
      reminders: [
        {
          id: 1,
          kind: "before_due",
          enabled: true,
          offset_minutes: 2880,
          interval_days: null,
          time_of_day: null,
          timezone: null,
          next_run_at: null,
        },
      ],
    });
    expect(getTaskRemindersDraft(days).beforeDueAmount).toBe(2);
    expect(getTaskRemindersDraft(days).beforeDueUnit).toBe("days");

    const minutes = task({
      reminders: [
        {
          id: 1,
          kind: "before_due",
          enabled: true,
          offset_minutes: 30,
          interval_days: null,
          time_of_day: null,
          timezone: null,
          next_run_at: null,
        },
      ],
    });
    expect(getTaskRemindersDraft(minutes).beforeDueAmount).toBe(30);
    expect(getTaskRemindersDraft(minutes).beforeDueUnit).toBe("minutes");

    const zero = task({
      reminders: [
        {
          id: 1,
          kind: "before_due",
          enabled: true,
          offset_minutes: 0,
          interval_days: null,
          time_of_day: null,
          timezone: null,
          next_run_at: null,
        },
      ],
    });
    expect(getTaskRemindersDraft(zero).beforeDueAmount).toBe(0);
    expect(getTaskRemindersDraft(zero).beforeDueUnit).toBe("minutes");
  });

  it("keeps rule values while the master switch is off", () => {
    expect(getTaskRemindersDraft(task({ reminders_enabled: false }))).toMatchObject({
      remindersEnabled: false,
      beforeDueEnabled: true,
      scheduledEnabled: true,
    });
  });
});

describe("buildReminderRules", () => {
  it("builds enabled rules with seconds in time_of_day", () => {
    expect(
      buildReminderRules({
        beforeDueEnabled: true,
        beforeDueAmount: 2,
        beforeDueUnit: "hours",
        scheduledEnabled: true,
        scheduledIntervalDays: 7,
        scheduledTime: "09:30",
      }),
    ).toEqual([
      { kind: "before_due", enabled: true, offset_minutes: 120 },
      {
        kind: "scheduled",
        enabled: true,
        interval_days: 7,
        time_of_day: "09:30:00",
      },
    ]);
  });

  it("omits disabled rules", () => {
    expect(
      buildReminderRules({
        beforeDueEnabled: false,
        beforeDueAmount: 2,
        beforeDueUnit: "hours",
        scheduledEnabled: false,
        scheduledIntervalDays: 1,
        scheduledTime: "14:00",
      }),
    ).toEqual([]);
  });

  it("clamps the offset to 0…525600", () => {
    expect(
      buildReminderRules({
        beforeDueEnabled: true,
        beforeDueAmount: 0,
        beforeDueUnit: "minutes",
        scheduledEnabled: false,
        scheduledIntervalDays: 1,
        scheduledTime: "14:00",
      })[0]?.offset_minutes,
    ).toBe(0);

    expect(
      buildReminderRules({
        beforeDueEnabled: true,
        beforeDueAmount: 999999,
        beforeDueUnit: "days",
        scheduledEnabled: false,
        scheduledIntervalDays: 1,
        scheduledTime: "14:00",
      })[0]?.offset_minutes,
    ).toBe(525600);
  });
});

describe("buildTaskRemindersUpdate", () => {
  it("sends only the master switch when it is turned off", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        remindersEnabled: false,
      }),
    ).toEqual({ reminders_enabled: false });
  });

  it("sends rules and enables the master when a rule changes", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        beforeDueAmount: 1,
      }),
    ).toEqual({
      reminders_enabled: true,
      reminders: [
        { kind: "before_due", enabled: true, offset_minutes: 60 },
        {
          kind: "scheduled",
          enabled: true,
          interval_days: 3,
          time_of_day: "09:00:00",
        },
      ],
    });
  });

  it("disables the master and clears rules when both are off", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        beforeDueEnabled: false,
        scheduledEnabled: false,
      }),
    ).toEqual({ reminders_enabled: false, reminders: [] });
  });

  it("returns null for an invalid time", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        scheduledTime: "",
      }),
    ).toBeNull();
  });

  it("returns null for an invalid amount", () => {
    const current = task();
    expect(
      buildTaskRemindersUpdate({
        ...getTaskRemindersDraft(current),
        beforeDueAmount: -1,
      }),
    ).toBeNull();
  });
});

describe("getReminderIntervalOptions", () => {
  it("returns the five standard options", () => {
    expect(getReminderIntervalOptions(1).map((option) => option.value)).toEqual([
      1, 2, 3, 4, 7,
    ]);
  });

  it("adds an option for an unknown existing interval", () => {
    expect(getReminderIntervalOptions(5)).toContainEqual({
      value: 5,
      label: "Каждые 5 дней",
    });
  });
});

describe("parseReminderAmount", () => {
  it("accepts digits from 0 to 525600", () => {
    expect(parseReminderAmount("0")).toBe(0);
    expect(parseReminderAmount("14")).toBe(14);
    expect(parseReminderAmount("525600")).toBe(525600);
  });

  it("rejects empty, non-numeric and out-of-range values", () => {
    expect(parseReminderAmount("")).toBeNull();
    expect(parseReminderAmount("1a")).toBeNull();
    expect(parseReminderAmount("525601")).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run app/lib/tasks/reminders.test.ts`
Expected: FAIL — модуль `./reminders` не найден.

- [ ] **Step 3: Создать `pluralize.ts` и перенести `pluralizeRu`**

```ts
export function pluralizeRu(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;

  return many;
}
```

В `task-detail.ts` удалить локальную функцию и импортировать `pluralizeRu` из `./pluralize`.

- [ ] **Step 4: Создать `app/lib/tasks/reminders.ts`**

Реализовать точные сигнатуры из блока Interfaces. Ключевые правила:
- `getTaskRemindersDraft` выбирает первое правило каждого вида; для `before_due` берёт `offset_minutes ?? 60`, для `scheduled` — `interval_days ?? 1` и `time_of_day?.slice(0, 5)` при валидном `HH:mm`, иначе `14:00`; `remindersEnabled` берётся из `task.reminders_enabled`; флаги правил — `rule?.enabled ?? false`.
- Раскладка offset: `0` → минуты; `% 1440 === 0` → дни; `% 60 === 0` → часы; иначе минуты.
- `buildReminderRules` собирает только включённые правила; `offset_minutes` ограничивается `0…525600`; время — `${scheduledTime}:00`.
- `buildTaskRemindersUpdate`:
  - если оба правила выключены → `{ reminders_enabled: false, reminders: [] }` (проверяется первым, чтобы очистить старые правила);
  - иначе если `draft.remindersEnabled === false` → `{ reminders_enabled: false }` (без `reminders`), правила сохраняются; поля скрытых правил не валидируются;
  - иначе если `beforeDueEnabled` и `beforeDueAmount` не целое или `< 0` → `null`;
  - иначе если `scheduledEnabled` и `!isValidTime(draft.scheduledTime)` → `null`;
  - иначе → `{ reminders_enabled: true, reminders: buildReminderRules(draft) }`.
  - Сравнение с текущими правилами не выполняется: автосохранение отправляет полное желаемое состояние, а очередь мутаций гарантирует порядок.
- `getReminderIntervalOptions` возвращает `REMINDER_INTERVAL_OPTIONS`, добавляя `{ value: intervalDays, label: \`Каждые ${intervalDays} ${pluralizeRu(...)}\` }`, если значения нет среди стандартных.
- `parseReminderAmount`: `/^\d+$/`, целое `0…525600`, иначе `null`.

- [ ] **Step 5: Расширить `TaskUpdateInput` и переиспользовать сборщик в quick-add**

В `types.ts` добавить поля в `TaskUpdateInput`.
В `quick-task-payload.ts`:
- импортировать `buildReminderRules` из `./reminders`;
- заменить тело `buildReminderInputs` на:
  ```ts
  if (!draft.remindersEnabled) return { enabled: false, reminders: [] };
  const reminders = buildReminderRules(draft);
  if (reminders.length === 0) return { enabled: false, reminders: [] };
  return { enabled: true, reminders };
  ```
- удалить локальные `DUE_UNIT_MINUTES`, `MAX_OFFSET_MINUTES`, `toTimeOfDay` (если больше не используются).

В `reminders-step.tsx` заменить локальные `REMINDER_UNIT_OPTIONS`, `REMINDER_INTERVAL_OPTIONS`, `DEFAULT_SCHEDULED_TIME` и тип `DueUnit` на импорт/реэкспорт из `~/lib/tasks/reminders`:
- импортировать `ReminderDraft` из `~/lib/tasks/reminders` и реэкспортировать его (в lib `ReminderDraft` — алиас `TaskRemindersDraft`, поэтому мастер `remindersEnabled` сохраняется);
- `normalizeReminderDraft` оставить в компоненте, используя `DEFAULT_REMINDER_TIME`.
- `parseAmount` оставить локально или заменить на `parseReminderAmount` (поведение quick-add требует `>=1`, поэтому локальный `parseAmount` сохранить).

- [ ] **Step 6: Запустить тесты и typecheck**

Run: `npx vitest run app/lib/tasks/reminders.test.ts app/lib/tasks/quick-task-payload.test.ts app/lib/tasks/task-detail.test.ts app/components/tasks/quick-add/reminders-step.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/lib/tasks/pluralize.ts app/lib/tasks/reminders.ts app/lib/tasks/types.ts app/lib/tasks/quick-task-payload.ts app/lib/tasks/task-detail.ts app/components/tasks/quick-add/reminders-step.tsx app/lib/tasks/reminders.test.ts
git commit -m "feat(tasks): add shared reminder draft and payload helpers"
```

---

### Task 2: Мутация автосохранения напоминаний

**Files:**
- Create: `app/hooks/use-update-task-reminders.ts`
- Test: `app/hooks/use-update-task-reminders.test.ts`

**Interfaces:**
- Consumes: `updateTask(taskId, input)` из `~/lib/tasks/tasks-api`; `taskDetailQueryKey`; `ApiError`; `TelegramHaptics`; `TaskUpdateInput`, `TaskResponse`.
- Produces:
  - `export interface UpdateTaskRemindersMutationOptions { scope: { id: string }; mutationFn: (input: TaskUpdateInput) => Promise<TaskResponse>; onSuccess: (updated: TaskResponse) => void; onError: (error: Error) => void }`
  - `export function createUpdateTaskRemindersMutationOptions({ queryClient, haptics, taskId }: { queryClient: QueryClient; haptics: TelegramHaptics; taskId: number }): UpdateTaskRemindersMutationOptions`
  - `export function useUpdateTaskReminders(taskId: number): UseMutationResult<TaskResponse, Error, TaskUpdateInput>`

- [ ] **Step 1: Написать падающий тест**

Создать `app/hooks/use-update-task-reminders.test.ts` по образцу `use-update-task-due.test.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import { createUpdateTaskRemindersMutationOptions } from "./use-update-task-reminders";

vi.mock("~/lib/tasks/tasks-api", () => ({ updateTask: vi.fn() }));

const updateTaskMock = vi.mocked(updateTask);
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
});

describe("createUpdateTaskRemindersMutationOptions", () => {
  it("calls PATCH for the task and serializes reminder mutations", async () => {
    updateTaskMock.mockResolvedValue(task());
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    await options.mutationFn({
      reminders_enabled: true,
      reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
    });

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      reminders_enabled: true,
      reminders: [{ kind: "before_due", enabled: true, offset_minutes: 60 }],
    });
    expect(options.scope).toEqual({ id: "task-reminders" });
  });

  it("updates the detail cache, invalidates related keys and skips the success haptic", () => {
    const updated = task({ reminders_enabled: true });
    queryClient.setQueryData(queryKey, task());
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(updated);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["task-series"] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["projects"] });
    expect(haptics.notification).not.toHaveBeenCalled();
  });

  it("does not overwrite the current detail when the response has another id", () => {
    const current = task();
    const updated = task({ id: 99 });
    queryClient.setQueryData(queryKey, current);
    vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
  });

  it("invalidates the detail on 404 and reports an error", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onError(
      new ApiError("Not found", { status: 404, code: "not_found", requestId: "test" }),
    );

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });

  it("keeps the detail on other errors and reports an error", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
    });

    options.onError(
      new ApiError("Server error", { status: 500, code: "internal_error", requestId: "test" }),
    );

    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run app/hooks/use-update-task-reminders.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать хук**

`app/hooks/use-update-task-reminders.ts` — по образцу `use-update-task-due.ts`, отличия:
- `scope: { id: "task-reminders" }`;
- успех: `setQueryData` только при совпадении id, инвалидации `queryKey`, `["tasks"]`, `["task-series"]`; **без** `haptics.notification("success")` и **без** инвалидации `["projects"]`;
- ошибка: `haptics.notification("error")`, при `404` — инвалидация `queryKey`;
- `useUpdateTaskReminders(taskId)` использует `useQueryClient` и `useTelegram`.

- [ ] **Step 4: Запустить тест**

Run: `npx vitest run app/hooks/use-update-task-reminders.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/hooks/use-update-task-reminders.ts app/hooks/use-update-task-reminders.test.ts
git commit -m "feat(tasks): add autosave mutation for task reminders"
```

---

### Task 3: Компоненты страницы напоминаний и скелетон

**Files:**
- Create: `app/components/tasks/reminders/task-reminders-view.tsx`
- Create: `app/components/tasks/reminders/task-reminders-skeleton.tsx`
- Test: `app/components/tasks/reminders/task-reminders-view.test.ts`
- Test: `app/components/tasks/reminders/task-reminders-skeleton.test.ts`

**Interfaces:**
- Consumes: `TaskResponse`, `TaskUpdateInput`; `getTaskRemindersDraft`, `buildTaskRemindersUpdate`, `getReminderIntervalOptions`, `parseReminderAmount`, `REMINDER_UNIT_OPTIONS`, `DEFAULT_REMINDER_TIME`, `TASK_REMINDERS_SAVE_ERROR`; `Switch`, `SelectField`, `TimeInput`, `Skeleton`; `isValidTime`.
- Produces:
  - `export interface TaskRemindersViewProps { task: TaskResponse; error: string | null; onSave: (input: TaskUpdateInput) => void; onRetry: () => void; onToggleHaptic?: () => void }`
  - `export function TaskRemindersView(props: TaskRemindersViewProps): ReactElement`
  - `export function TaskRemindersSkeleton(): ReactElement`

- [ ] **Step 1: Написать падающие SSR-тесты**

`task-reminders-view.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TaskResponse } from "~/lib/tasks/types";

import { TaskRemindersView, type TaskRemindersViewProps } from "./task-reminders-view";

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 42,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T13:00:00.000Z",
    completed_at: null,
    reminders_enabled: true,
    labels: [],
    reminders: [
      {
        id: 1,
        kind: "before_due",
        enabled: true,
        offset_minutes: 840,
        interval_days: null,
        time_of_day: null,
        timezone: null,
        next_run_at: null,
      },
      {
        id: 2,
        kind: "scheduled",
        enabled: true,
        offset_minutes: null,
        interval_days: 1,
        time_of_day: "14:00:00",
        timezone: null,
        next_run_at: null,
      },
    ],
    created_at: "2026-11-08T09:00:00.000Z",
    updated_at: "2026-11-08T09:00:00.000Z",
    ...overrides,
  };
}

function render(props: Partial<TaskRemindersViewProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskRemindersView, {
      task: task(),
      error: null,
      onSave: () => {},
      onRetry: () => {},
      ...props,
    }),
  );
}

describe("TaskRemindersView", () => {
  it("renders the header and description", () => {
    const html = render();
    expect(html).toContain("Автоматические напоминания");
    expect(html).toContain(
      "Milly напомнит о задаче в Telegram по заданным правилам.",
    );
  });

  it("renders the off state with the hint and without settings", () => {
    const html = render({
      task: task({ reminders_enabled: false, reminders: [] }),
    });
    expect(html).toContain("Включите автонапоминания для настройки.");
    expect(html).not.toContain("НАСТРОЙКИ");
    expect(html).toContain('aria-checked="false"');
  });

  it("renders both rule cards, values and hints", () => {
    const html = render();
    expect(html).toContain("НАСТРОЙКИ");
    expect(html).toContain("До срока задачи");
    expect(html).toContain("По расписанию");
    expect(html).toContain("14");
    expect(html).toContain("Часов");
    expect(html).toContain("Каждый день");
    expect(html).toContain("14:00");
    expect(html).toContain(
      "Напоминание будет выслано в чат с Milly один раз до её завершения.",
    );
    expect(html).toContain(
      "Напоминание по расписанию будет высылаться в чат с Milly каждый заданный промежуток времени.",
    );
  });

  it("shows the save error with a retry button", () => {
    const html = render({ error: "Не удалось сохранить напоминания. Попробуйте ещё раз." });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Не удалось сохранить напоминания. Попробуйте ещё раз.");
    expect(html).toContain("Повторить");
  });

  it("uses app tokens for cards and text", () => {
    const html = render();
    expect(html).toContain("bg-app-card");
    expect(html).toContain("text-app-text-secondary");
    expect(html).not.toContain("dark:");
  });
});
```

> Неизвестный интервал покрыт в Task 1 через `getReminderIntervalOptions`; в SSR-разметке `SelectField` видна только выбранная опция, поэтому отдельный view-тест не нужен.

`task-reminders-skeleton.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaskRemindersSkeleton } from "./task-reminders-skeleton";

describe("TaskRemindersSkeleton", () => {
  it("renders a status region with the expected label", () => {
    const html = renderToStaticMarkup(createElement(TaskRemindersSkeleton));

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Загружаем напоминания"');
  });

  it("repeats the page geometry", () => {
    const html = renderToStaticMarkup(createElement(TaskRemindersSkeleton));

    expect(html).toContain("h-[29px]");
    expect(html).toContain("h-[58px]");
    expect(html).toContain("rounded-[25px]");
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/components/tasks/reminders`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать `TaskRemindersSkeleton`**

Структура: `div role="status" aria-busy="true" aria-label="Загружаем напоминания" className="flex flex-1 flex-col gap-2"`; внутри:
- блок заголовка `px-[15px] py-[15px]` с двумя `Skeleton` высотой `29px` (85% и 55%);
- блок описания `px-[15px]` с двумя `Skeleton` высотой `13px` (100% и 2/3);
- карточка `Skeleton` `h-[58px] w-full rounded-[25px]`;
- подсказка `px-[15px]` с `Skeleton` `h-[13px] w-3/4`.

- [ ] **Step 4: Реализовать `TaskRemindersView`**

Локальное состояние:
```ts
const [draft, setDraft] = useState<TaskRemindersDraft>(() => getTaskRemindersDraft(task));
const [amountInput, setAmountInput] = useState(() => String(getTaskRemindersDraft(task).beforeDueAmount));
```
`getTaskRemindersDraft` вызвать дважды допустимо; либо один `useState` с объектом.

`commit(next: TaskRemindersDraft)`:
```ts
setDraft(next);
const input = buildTaskRemindersUpdate(next);
if (input) onSave(input);
```

Обработчики:
- `handleMasterChange(checked)`: haptic; если `!checked` → `commit({ ...draft, remindersEnabled: false })`; если включаем и оба правила off → `commit({ ...draft, remindersEnabled: true, beforeDueEnabled: true })`; иначе `commit({ ...draft, remindersEnabled: true })`.
- `handleBeforeDueEnabledChange(checked)`: haptic; `const next = { ...draft, beforeDueEnabled: checked }; commit({ ...next, remindersEnabled: checked || next.scheduledEnabled ? next.remindersEnabled : false })`.
- `handleScheduledEnabledChange(checked)`: аналогично с `scheduledEnabled`.
- `handleAmountChange(value)`: `const digits = value.replace(/\D/g, ""); setAmountInput(digits); const amount = parseReminderAmount(digits); if (amount === null) { setDraft({ ...draft, beforeDueAmount: -1 }); return; } if (amount !== draft.beforeDueAmount) commit({ ...draft, beforeDueAmount: amount }); else setDraft({ ...draft, beforeDueAmount: amount });` — невалидный ввод хранится в черновике как `-1`, поэтому `buildTaskRemindersUpdate` вернёт `null` для любых сохранений, пока мастер и правило используют это значение; master-off/both-off при этом сохраняются.
- `handleUnitChange(unit)`: haptic; если `unit !== draft.beforeDueUnit` → `commit({ ...draft, beforeDueUnit: unit })`.
- `handleIntervalChange(days)`: haptic; если `days !== draft.scheduledIntervalDays` → `commit({ ...draft, scheduledIntervalDays: days })`.
- `handleTimeChange(value)`: `setDraft({ ...draft, scheduledTime: value }); if (isValidTime(value) && value !== draft.scheduledTime) commit({ ...draft, scheduledTime: value });`
- `onRetry` вызывается из кнопки ошибки.

Валидность:
```ts
const isAmountValid = parseReminderAmount(amountInput) !== null;
const isTimeValid = isValidTime(draft.scheduledTime);
```

Разметка:
- root `div className="flex flex-1 flex-col gap-2"`.
- заголовок `h1` с классами из спеки.
- описание `p`.
- ошибка: `div role="alert"` с `p` и `button type="button"` «Повторить».
- мастер-карточка `div className="flex h-[58px] items-center justify-between gap-[30px] rounded-[25px] bg-app-card px-[15px]"`, подпись и `Switch`.
- off-подсказка.
- on-блок: `div className="flex flex-col gap-2 pb-[15px] pt-[15px]"`, `p` «НАСТРОЙКИ» с `uppercase`, затем `div className="flex flex-col gap-[23px]"`.
- каждая карточка: внешний `div className="flex flex-col gap-[5px]"`, карточка `div className="flex flex-col gap-[15px] rounded-[25px] bg-app-card p-[15px]"`, шапка `div className="flex h-7 items-center justify-between gap-[30px]"` + `Switch className="-my-2"`, затем условный контент.
- before-due контент: `div className="flex flex-col gap-[5px]"`, подпись, `div className="flex items-start gap-[15px]"`, input с `aria-label="За сколько до завершения задачи напомнить"`, `aria-invalid={!isAmountValid || undefined}`, классы `h-12 w-[114px] shrink-0 rounded-[28px] bg-app-track p-0 text-center text-[15px] font-semibold text-app-accent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent`, `inputMode="numeric"`, `type="text"`; `div className="w-[215px] max-w-full shrink-0"` с `SelectField` (`ariaLabel="Единица времени"`, `options={REMINDER_UNIT_OPTIONS}`).
- before-due hint: `p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary"`; если невалидно — `Укажите количество` (тоже `px-[15px]`).
- scheduled контент: `div className="flex items-end gap-[15px]"`, колонка 215 с подписью «Повторять» и `SelectField` (`ariaLabel="Повторять"`, `options={getReminderIntervalOptions(draft.scheduledIntervalDays)}`), колонка 114 с подписью «Время» и `TimeInput` (`size="compact"`, `ariaLabel="Время"`); если время невалидно — `Укажите время`.
- подсказки под карточками — тексты из спеки.

Не добавлять `role="button"`/лишние обработчики; `Switch` уже доступный.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run app/components/tasks/reminders`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/tasks/reminders app/components/tasks/reminders/task-reminders-view.test.ts app/components/tasks/reminders/task-reminders-skeleton.test.ts
git commit -m "feat(tasks): add reminders page view and skeleton"
```

---

### Task 4: Маршрут, интеграция с деталями и RouteSkeleton

**Files:**
- Create: `app/routes/task-reminders.tsx`
- Modify: `app/routes.ts`
- Modify: `app/routes/task-detail.tsx:133-195`
- Modify: `app/components/tasks/detail/task-detail-view.tsx`
- Modify: `app/components/tasks/detail/task-detail-card.tsx`
- Modify: `app/components/layout/route-skeleton.tsx`
- Test: `app/routes/task-reminders.test.ts`
- Test: `app/routes/task-detail.test.ts` (добавить кейс)
- Test: `app/components/tasks/detail/task-detail-card.test.ts` (добавить кейс)
- Test: `app/components/tasks/detail/task-detail-view.test.ts` (добавить кейс)
- Test: `app/components/layout/route-skeleton.test.ts` (добавить кейс)

**Interfaces:**
- Consumes: `useTaskDetail`, `useUpdateTaskReminders`, `TaskRemindersView`, `TaskRemindersSkeleton`, `TaskDetailError`, `useTelegramBackButton`, `shouldGoBack`, `useBottomNavigation`, `TASK_REMINDERS_SAVE_ERROR`, `CONTENT_BOTTOM_PADDING`.
- Produces:
  - `default export function TaskReminders(): ReactElement`
  - `export function meta(): { title: string }[]`
  - `TaskDetailCardProps.onReminderClick?: () => void`
  - `TaskDetailViewProps.onReminderClick?: () => void`

- [ ] **Step 1: Написать падающие тесты маршрута и интеграции**

`app/routes/task-reminders.test.ts` — по образцу `task-detail.test.ts`:
- mock `@tanstack/react-query` → `{ queryOptions: (o) => o, useQuery: () => ({ data: [] }) }`;
- mock `react-router` → `useParams`, `useNavigate`;
- mock `~/hooks/use-task-detail` → `useTaskDetail(taskId, enabled)` записывает аргументы, возвращает `routeState.task`;
- mock `~/hooks/use-update-task-reminders` → возвращает `{ mutate, reset, isPending: false, isError, error, variables }`, записывает `onSave`-вызовы через `mutate`;
- mock `~/hooks/use-bottom-navigation`, `~/hooks/use-telegram-back-button`;
- mock `~/providers/auth-provider` (`{ user: { timezone: "UTC" } }`), `~/providers/telegram-provider` (`haptics.selection/impact/notification`);
- mock `~/components/home/bottom-navigation-dock`, `~/components/tasks/reminders/task-reminders-view`, `~/components/tasks/reminders/task-reminders-skeleton`, `~/components/tasks/detail/task-detail-error`.

Тесты:
1. `shows the skeleton while the task is loading` → `SKELETON`.
2. `shows the view when the task is loaded` + `bottomNavActive === "tasks"`.
3. `shows not found for a 404` → `ERROR:not-found`.
4. `shows a load error for a non-404 failure` → `ERROR:load-error`.
5. `shows not found for an invalid id without a request` → `taskArgs` `[0, false]`.
6. `keeps cached task data when a background refetch fails` → `VIEW`.
7. `saves reminder changes through the mutation` → `viewProps.onSave({reminders_enabled:true})` → mutate called.
8. `retries the last failed payload` → `viewProps.onRetry()` → `mutate` called with `variables`.
9. `shows the save error` → `isError: true` → `viewProps.error === TASK_REMINDERS_SAVE_ERROR`.
10. `falls back to /tasks/42 from the back button without history` → stub `window.history.state = {}`; call `onBack`; navigate `/tasks/42`.
11. `goes back through history` → stub `{ idx: 1 }`; navigate `-1`.
12. `returns the public meta title` → `meta()` contains `title: "Напоминания — Milly"`.

Интеграционные кейсы:
- `task-detail-card.test.ts`: с `onReminderClick` есть `aria-label="Изменить напоминание"` и `<button>`; без обработчика — нет.
- `task-detail-view.test.ts`: `onReminderClick` пробрасывается (aria-label появляется).
- `task-detail.test.ts`: `routeState.viewProps?.onReminderClick?.()` → `navigate("/tasks/42/reminders")`.
- `route-skeleton.test.ts`: добавить mock `TaskRemindersSkeleton` → `REMINDERS_SKELETON`; `renderAt("/tasks/42/reminders")` содержит его и не содержит `DETAIL_SKELETON`.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run app/routes/task-reminders.test.ts app/routes/task-detail.test.ts app/components/tasks/detail app/components/layout/route-skeleton.test.ts`
Expected: FAIL — route и обработчики отсутствуют.

- [ ] **Step 3: Реализовать route**

`app/routes/task-reminders.tsx`:
```tsx
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Напоминания — Milly" },
    { name: "description", content: "Автоматические напоминания задачи в Milly" },
  ];
}

export default function TaskReminders() {
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const mutation = useUpdateTaskReminders(taskId);
  useTelegramBackButton(handleBack);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate(isValidId ? `/tasks/${taskId}` : "/tasks");
  }

  const error = mutation.isError ? TASK_REMINDERS_SAVE_ERROR : null;
  ...
}
```
Рендер: обёртка `main > div className="flex flex-1 flex-col gap-2 px-4" style={{ paddingBottom: CONTENT_BOTTOM_PADDING }}`; `BottomNavigationDock active="tasks" onSelect={onSelectTab}`. Внутри:
- невалидный id → `TaskDetailError kind="not-found" onBack={handleBack} onRetry={handleBack}`;
- `isPending` → `TaskRemindersSkeleton`;
- ошибка без data: `404` → not-found, иначе load-error с `refetch`;
- data → `TaskRemindersView task={taskQuery.data} error={error} onSave={(input) => mutation.mutate(input)} onRetry={() => { const input = mutation.variables; if (!input) return; mutation.reset(); mutation.mutate(input); }} onToggleHaptic={() => haptics.selection()}`.

- [ ] **Step 4: Подключить маршрут, строку «Напоминание» и RouteSkeleton**

- `app/routes.ts`: добавить `route("tasks/:id/reminders", "routes/task-reminders.tsx")` после `tasks/:id`.
- `task-detail-card.tsx`: добавить `onReminderClick?: () => void`; строке «Напоминание» передать `ariaLabel="Изменить напоминание"` и `onClick={onReminderClick}`.
- `task-detail-view.tsx`: добавить `onReminderClick?: () => void`; передать в `TaskDetailCard`.
- `task-detail.tsx`: добавить `function handleReminderClick()` с `haptics.selection()` и `void navigate(\`/tasks/${task.id}/reminders\`)`; передать `onReminderClick={handleReminderClick}` в `TaskDetailView`.
- `route-skeleton.tsx`:
  ```ts
  const isTaskReminders = /^\/tasks\/[^/]+\/reminders$/.test(pathname);
  ```
  и в цепочке `isSearch ? ... : isTaskReminders ? <TaskRemindersSkeleton /> : isTaskDetail ? ...`.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run app/routes/task-reminders.test.ts app/routes/task-detail.test.ts app/components/tasks/detail app/components/layout/route-skeleton.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/routes/task-reminders.tsx app/routes.ts app/routes/task-detail.tsx app/components/tasks/detail/task-detail-view.tsx app/components/tasks/detail/task-detail-card.tsx app/components/layout/route-skeleton.tsx app/routes/task-reminders.test.ts app/routes/task-detail.test.ts app/components/tasks/detail/task-detail-card.test.ts app/components/tasks/detail/task-detail-view.test.ts app/components/layout/route-skeleton.test.ts
git commit -m "feat(tasks): add reminders page route and detail entry"
```

---

### Task 5: Документация и финальная проверка

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/specs/2026-11-08-task-detail/spec.md`
- Modify: `docs/specs/2026-11-09-task-reminders-page/spec.md` (статус/пометки, если нужно)
- Create: `docs/specs/2026-11-09-task-reminders-page/plan.md` (этот файл уже создан)

- [ ] **Step 1: Обновить `AGENTS.md`**

Добавить в раздел «Структура»:
- `app/components/tasks/reminders/` — экран «Автоматические напоминания»;
- `app/lib/tasks/reminders.ts` — модель, payload и опции правил;
- `app/hooks/use-update-task-reminders.ts` — автосохранение PATCH.
В раздел «Провайдеры, данные и состояние» добавить абзац:
- `/tasks/:id/reminders` использует `GET /tasks/{id}` и `PATCH /tasks/{id}`;
- мастер-переключатель, два правила, автосохранение, `scope: "task-reminders"`, ошибка и «Повторить»;
- выключение мастера не удаляет правила; последнее выключенное правило выключает мастер;
- строка «Напоминание» на `/tasks/:id` открывает страницу.
В раздел «Проверка перед завершением» добавить ручные проверки:
- открытие страницы, off/on, сохранение каждого поля, ошибка и повтор, возврат;
- light/dark, 320/412/448 px, safe-area, Telegram BackButton;
- SSR `curl -s http://localhost:3000/tasks/1/reminders` без данных задачи.

- [ ] **Step 2: Добавить blockquote в спецификацию деталей**

В `docs/specs/2026-11-08-task-detail/spec.md` после вводного примечания добавить:
```md
> Примечание (2026-11-09): строка «Напоминание» теперь открывает
> `/tasks/:id/reminders` (см.
> `docs/specs/2026-11-09-task-reminders-page/spec.md`). Пункт
> «редактирование … напоминаний» из «Вне scope» больше не действует.
```

- [ ] **Step 3: Полная проверка**

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
curl -s http://localhost:3000/tasks/1/reminders | grep -E "Автоматические напоминания|НАСТРОЙКИ|Автонапоминания" || true
```
Expected: SSR-ответ не содержит защищённых данных задачи и настроек; допустим только скелетон/экран загрузки. Остановить сервер после проверки.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md docs/specs/2026-11-08-task-detail/spec.md docs/specs/2026-11-09-task-reminders-page
git commit -m "docs: document task reminders page"
```

---

## Self-Review

- **Spec coverage:** FR-1 → Task 4; FR-2 → Task 2; FR-3–FR-6 → Task 3; FR-7 → Tasks 1–3; FR-8 → Tasks 3–4; FR-9 → Tasks 3–4; FR-10 → Tasks 1–5. Все пункты покрыты.
- **Step scan:** каждый шаг содержит конкретный файл, сигнатуру, тестовые assertions и команду; открытых «handle edge cases» нет.
- **Type consistency:** `TaskRemindersDraft`, `ReminderRuleDraft`, `buildTaskRemindersUpdate`, `createUpdateTaskRemindersMutationOptions`, `TaskRemindersViewProps` используются одинаково во всех задачах.
- **Review Focus:** пять рискованных классов покрыты тестами Task 1 (невалидное число/время, пустой апдейт, неизвестный интервал) и Task 3/4 (off/on, ошибка, выключение последнего правила).
