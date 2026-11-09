# Task Due-Date Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Figma «Дата и время задачи» bottom sheet on `/tasks/:id` so the «Срок» row can change date, time and daily recurrence through `PATCH /tasks/{id}`.

**Architecture:** Pure domain helpers compute the PATCH payload from a task + draft; a React Query mutation owns cache invalidation and haptics; a thin `TaskDueSheet` reuses the existing `DueStep` / `BottomSheet`; the detail route owns open state and error text.

**Tech Stack:** React Router 8 (SSR), React 19, TypeScript 5.9 strict, Tailwind CSS 4, TanStack React Query 5, Vitest.

**Spec:** `docs/specs/2026-11-09-task-due-modal/spec.md`

## Global Constraints

- Reuse existing primitives: `BottomSheet`, `DueStep`, `Calendar`, `TimeInput`, `Switch`, `BottomSheetPrimaryAction`. No new dependencies.
- Only `app-*` Tailwind tokens; no `dark:` variants and no hardcoded colors.
- Exact copy: title `Дата и время задачи`, toggle `Регулярная задача`, button `Готово`, error `Не удалось изменить срок. Попробуйте ещё раз.`, empty time help `Укажите время`.
- API only through `apiRequest`; never call `fetch` from components.
- `due_at` is sent only when the instant changes; `recurrence` only when the toggle state changes. `periodic` tasks keep their interval when the toggle stays on.
- Turning daily recurrence off sends `recurrence: "one_off"` (backend deletes future incomplete series instances).
- PATCH success invalidates `["tasks","detail",taskId]`, `["tasks"]`, `["task-series"]`, `["projects"]`; PATCH 404 additionally invalidates the detail key.
- Tests are Vitest SSR tests (`renderToStaticMarkup`, no DOM library); files are `app/**/*.test.ts`.
- Verification commands: `npm test`, `npm run typecheck`, `npm run build`.
- No back arrow in the sheet header; the sheet is single-step and uses the existing close button.
- Completed tasks are editable; do not add a completed-state block.

## Review Focus

1. Same instant with a different timezone offset must not send `due_at` (otherwise reminders are recreated) — covered in Task 1.
2. A `periodic` task must not be silently converted to `regular` when the user only changes date/time — covered in Task 1.
3. Turning the toggle off must send explicit `one_off`, including for `periodic` — covered in Task 1.
4. An invalid or empty time must block saving and show `Укажите время` — covered in Task 3.
5. A PATCH response representing another series instance must invalidate the current detail key instead of overwriting it under the wrong id — covered in Task 2.

---

### Task 1: Due-update contract and domain helpers

**Files:**
- Modify: `app/lib/tasks/types.ts`
- Modify: `app/lib/tasks/tasks-api.ts`
- Create: `app/lib/tasks/task-due.ts`
- Test: `app/lib/tasks/task-due.test.ts`
- Test: `app/lib/tasks/tasks-api.test.ts`

**Interfaces:**
- Consumes: `TaskResponse`, `TaskRecurrence`, `zonedDateTimeToIso`, `formatZonedDate`, `formatZonedTime`, `apiRequest`.
- Produces:
  ```ts
  export interface TaskUpdateInput {
    due_at?: string;
    recurrence?: TaskRecurrence;
  }
  export function updateTask(
    taskId: number,
    input: TaskUpdateInput,
    signal?: AbortSignal,
  ): Promise<TaskResponse>;

  export interface TaskDueDraft {
    date: string;
    time: string;
    isRecurring: boolean;
  }
  export function getTaskDueDraft(
    task: Pick<TaskResponse, "due_at" | "recurrence">,
    timeZone: string,
  ): TaskDueDraft;
  export function buildTaskDueUpdate(
    task: Pick<TaskResponse, "due_at" | "recurrence">,
    draft: TaskDueDraft,
    timeZone: string,
  ): TaskUpdateInput | null;
  ```

- [ ] **Step 1: Write failing tests for the due helpers**

Create `app/lib/tasks/task-due.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildTaskDueUpdate, getTaskDueDraft } from "./task-due";
import type { TaskResponse } from "./types";

const TIME_ZONE = "Europe/Moscow";

function task(
  overrides: Partial<Pick<TaskResponse, "due_at" | "recurrence">> = {},
): Pick<TaskResponse, "due_at" | "recurrence"> {
  return {
    due_at: "2026-11-08T13:00:00.000Z",
    recurrence: "one_off",
    ...overrides,
  };
}

describe("getTaskDueDraft", () => {
  it("reads date and time in the user timezone", () => {
    expect(getTaskDueDraft(task(), TIME_ZONE)).toEqual({
      date: "2026-11-08",
      time: "16:00",
      isRecurring: false,
    });
  });

  it.each(["regular", "periodic"] as const)(
    "marks %s tasks as recurring",
    (recurrence) => {
      expect(
        getTaskDueDraft(task({ recurrence }), TIME_ZONE).isRecurring,
      ).toBe(true);
    },
  );
});

describe("buildTaskDueUpdate", () => {
  it("returns null when nothing changed", () => {
    const current = task();

    expect(
      buildTaskDueUpdate(
        current,
        getTaskDueDraft(current, TIME_ZONE),
        TIME_ZONE,
      ),
    ).toBeNull();
  });

  it("sends only due_at when the date changes", () => {
    expect(
      buildTaskDueUpdate(
        task(),
        { date: "2026-11-09", time: "16:00", isRecurring: false },
        TIME_ZONE,
      ),
    ).toEqual({ due_at: "2026-11-09T13:00:00.000Z" });
  });

  it("turns a one-off task into a daily regular task", () => {
    expect(
      buildTaskDueUpdate(
        task(),
        { date: "2026-11-09", time: "16:00", isRecurring: true },
        TIME_ZONE,
      ),
    ).toEqual({
      due_at: "2026-11-09T13:00:00.000Z",
      recurrence: "regular",
    });
  });

  it("sends only recurrence when a regular task is turned off", () => {
    expect(
      buildTaskDueUpdate(
        task({ recurrence: "regular" }),
        { date: "2026-11-08", time: "16:00", isRecurring: false },
        TIME_ZONE,
      ),
    ).toEqual({ recurrence: "one_off" });
  });

  it("keeps periodic recurrence when only the date changes", () => {
    expect(
      buildTaskDueUpdate(
        task({ recurrence: "periodic" }),
        { date: "2026-11-10", time: "16:00", isRecurring: true },
        TIME_ZONE,
      ),
    ).toEqual({ due_at: "2026-11-10T13:00:00.000Z" });
  });

  it("sends one_off when a periodic task is turned off", () => {
    expect(
      buildTaskDueUpdate(
        task({ recurrence: "periodic" }),
        { date: "2026-11-08", time: "16:00", isRecurring: false },
        TIME_ZONE,
      ),
    ).toEqual({ recurrence: "one_off" });
  });

  it("compares instants instead of offset strings", () => {
    const current = task({ due_at: "2026-11-08T16:00:00+03:00" });

    expect(
      buildTaskDueUpdate(
        current,
        getTaskDueDraft(current, TIME_ZONE),
        TIME_ZONE,
      ),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `npx vitest run app/lib/tasks/task-due.test.ts`
Expected: FAIL — cannot resolve `./task-due`.

- [ ] **Step 3: Add `TaskUpdateInput` to types and implement helpers**

In `app/lib/tasks/types.ts`, add after `TaskCreateInput`:

```ts
export interface TaskUpdateInput {
  due_at?: string;
  recurrence?: TaskRecurrence;
}
```

Create `app/lib/tasks/task-due.ts`:

- `getTaskDueDraft` uses `formatZonedDate(task.due_at, timeZone)` and
  `formatZonedTime(task.due_at, timeZone)`; `isRecurring` is
  `task.recurrence !== "one_off"`.
- `buildTaskDueUpdate` computes `due_at = zonedDateTimeToIso(draft.date, draft.time, timeZone)`, compares instants with
  `new Date(...).getTime()`, builds an empty `TaskUpdateInput`, adds
  `due_at` only if changed, adds `recurrence` only if
  `draft.isRecurring !== (task.recurrence !== "one_off")` with value
  `draft.isRecurring ? "regular" : "one_off"`, and returns `null` when
  neither field was added.

- [ ] **Step 4: Add the API test**

Extend `app/lib/tasks/tasks-api.test.ts` imports with `updateTask` and add:

```ts
it("updates a task with PATCH /tasks/{id}", async () => {
  apiRequestMock.mockResolvedValue({ id: 42 });
  const input = {
    due_at: "2026-11-09T13:00:00.000Z",
    recurrence: "regular" as const,
  };

  await updateTask(42, input);

  expect(apiRequestMock).toHaveBeenCalledWith("/tasks/42", {
    method: "PATCH",
    body: input,
    signal: undefined,
  });
});
```

- [ ] **Step 5: Implement `updateTask` in `app/lib/tasks/tasks-api.ts`**

```ts
export function updateTask(
  taskId: number,
  input: TaskUpdateInput,
  signal?: AbortSignal,
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: input,
    signal,
  });
}
```

Import `TaskUpdateInput` in the existing type import block.

- [ ] **Step 6: Run tests and typecheck**

Run: `npx vitest run app/lib/tasks/task-due.test.ts app/lib/tasks/tasks-api.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/lib/tasks/types.ts app/lib/tasks/task-due.ts app/lib/tasks/task-due.test.ts app/lib/tasks/tasks-api.ts app/lib/tasks/tasks-api.test.ts
git commit -m "feat(tasks): add task due update contract and helpers"
```

---

### Task 2: Due-update mutation and cache invalidation

**Files:**
- Create: `app/hooks/use-update-task-due.ts`
- Test: `app/hooks/use-update-task-due.test.ts`

**Interfaces:**
- Consumes: `TaskUpdateInput`, `updateTask`, `taskDetailQueryKey`, `PROJECTS_QUERY_KEY`, `TelegramHaptics`, React Query `QueryClient`.
- Produces:
  ```ts
  export function createUpdateTaskDueMutationOptions(args: {
    queryClient: QueryClient;
    haptics: TelegramHaptics;
    taskId: number;
    onUpdated: (task: TaskResponse) => void;
  }): {
    mutationFn: (input: TaskUpdateInput) => Promise<TaskResponse>;
    onSuccess: (updated: TaskResponse) => void;
    onError: (error: Error) => void;
  };
  export function useUpdateTaskDue(
    taskId: number,
    onUpdated: (task: TaskResponse) => void,
  ): UseMutationResult<TaskResponse, Error, TaskUpdateInput>;
  ```

- [ ] **Step 1: Write the failing hook test**

Create `app/hooks/use-update-task-due.test.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";

import { createUpdateTaskDueMutationOptions } from "./use-update-task-due";

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
  haptics = {
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  };
  updateTaskMock.mockReset();
});

describe("createUpdateTaskDueMutationOptions", () => {
  it("calls PATCH for the task", async () => {
    updateTaskMock.mockResolvedValue(task());
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated: vi.fn(),
    });

    await options.mutationFn({ due_at: "2026-11-09T13:00:00.000Z" });

    expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, {
      due_at: "2026-11-09T13:00:00.000Z",
    });
  });

  it("updates the detail cache, invalidates related keys and reports success", () => {
    const updated = task({ recurrence: "regular" });
    const onUpdated = vi.fn();
    queryClient.setQueryData(queryKey, task());
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated,
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(updated);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["task-series"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["projects"],
    });
    expect(haptics.notification).toHaveBeenCalledWith("success");
    expect(onUpdated).toHaveBeenCalledWith(updated);
  });

  it("does not overwrite the current detail when the response has another id", () => {
    const current = task();
    const updated = task({ id: 99 });
    queryClient.setQueryData(queryKey, current);
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated: vi.fn(),
    });

    options.onSuccess(updated);

    expect(queryClient.getQueryData(queryKey)).toEqual(current);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
  });

  it("invalidates the detail on 404 and reports an error", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const onUpdated = vi.fn();
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated,
    });

    options.onError(
      new ApiError("Not found", {
        status: 404,
        code: "not_found",
        requestId: "test",
      }),
    );

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("keeps the detail query on other errors", () => {
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const options = createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId: TASK_ID,
      onUpdated: vi.fn(),
    });

    options.onError(
      new ApiError("Server error", {
        status: 500,
        code: "internal_error",
        requestId: "test",
      }),
    );

    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey });
    expect(haptics.notification).toHaveBeenCalledWith("error");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run app/hooks/use-update-task-due.test.ts`
Expected: FAIL — cannot resolve `./use-update-task-due`.

- [ ] **Step 3: Implement the mutation hook**

Create `app/hooks/use-update-task-due.ts`:

- `createUpdateTaskDueMutationOptions` returns the three functions.
- `onSuccess(updated)`:
  - if `updated.id === taskId`, `queryClient.setQueryData(taskDetailQueryKey(updated.id), updated)`;
  - always `void queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(taskId) })`,
    `{ queryKey: ["tasks"] }`, `{ queryKey: ["task-series"] }`,
    `{ queryKey: PROJECTS_QUERY_KEY }`;
  - `haptics.notification("success")`;
  - `onUpdated(updated)`.
- `onError(error)`:
  - `haptics.notification("error")`;
  - if `error instanceof ApiError && error.status === 404`, invalidate the
    current detail key;
  - do not call `onUpdated`.
- `useUpdateTaskDue` reads `useQueryClient()` and `useTelegram().haptics` and
  passes them with `taskId` / `onUpdated` to the options factory.

- [ ] **Step 4: Run test and typecheck**

Run: `npx vitest run app/hooks/use-update-task-due.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/hooks/use-update-task-due.ts app/hooks/use-update-task-due.test.ts
git commit -m "feat(tasks): add due update mutation"
```

---

### Task 3: Pending/error states in `DueStep` and the `TaskDueSheet`

**Files:**
- Modify: `app/components/tasks/quick-add/due-step.tsx`
- Modify: `app/components/tasks/quick-add/due-step.test.ts`
- Create: `app/components/tasks/detail/task-due-sheet.tsx`
- Test: `app/components/tasks/detail/task-due-sheet.test.ts`

**Interfaces:**
- Consumes: `DueStep`, `BottomSheet`, `getTaskDueDraft`, `buildTaskDueUpdate`, `TaskUpdateInput`, `TaskResponse`.
- Produces:
  ```ts
  // DueStepProps additions
  isPending?: boolean;
  error?: string | null;

  export interface TaskDueSheetProps {
    open: boolean;
    task: TaskResponse;
    timeZone: string;
    now: Date;
    isPending: boolean;
    error: string | null;
    onOpenChange: (open: boolean) => void;
    onSave: (input: TaskUpdateInput) => void;
  }
  export function TaskDueSheet(props: TaskDueSheetProps): ReactElement;
  ```

- [ ] **Step 1: Add failing `DueStep` tests**

Append to `app/components/tasks/quick-add/due-step.test.ts`:

```ts
it("shows the update error above the apply button", () => {
  const html = render({}, { error: "Не удалось изменить срок. Попробуйте ещё раз." });

  expect(html).toContain('role="alert"');
  expect(html).toContain("Не удалось изменить срок. Попробуйте ещё раз.");
  expect(html.indexOf('role="alert"')).toBeLessThan(html.indexOf("Готово"));
});

it("disables apply and marks it busy while pending", () => {
  const html = render({}, { isPending: true });

  expect(html).toMatch(
    /<button(?=[^>]*aria-busy="true")(?=[^>]*disabled="")[^>]*>Готово<\/button>/,
  );
});
```

Update the local `render` helper signature to
`function render(overrides: Partial<DueStepValue> = {}, props: Partial<DueStepProps> = {})`
and spread `props` after the defaults.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run app/components/tasks/quick-add/due-step.test.ts`
Expected: FAIL — unknown props / missing alert.

- [ ] **Step 3: Extend `DueStep`**

In `app/components/tasks/quick-add/due-step.tsx`:

- add `isPending = false` and `error = null` to `DueStepProps` and the
  destructured parameters;
- render, after the hint block and before the apply wrapper:
  ```tsx
  {error ? (
    <p
      className="pt-[10px] text-[13px] leading-[1.4] text-app-destructive"
      role="alert"
    >
      {error}
    </p>
  ) : null}
  ```
- pass to `BottomSheetPrimaryAction`:
  `aria-busy={isPending || undefined}` and
  `disabled={!isTimeValid || isPending}`.

- [ ] **Step 4: Write failing `TaskDueSheet` tests**

Create `app/components/tasks/detail/task-due-sheet.test.ts`. The real `BottomSheet`
uses a portal that does not mount during SSR, so mock only `BottomSheet` and
render its children; keep the real `BottomSheetPrimaryAction`:

```ts
import { createElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { TaskResponse } from "~/lib/tasks/types";

import { TaskDueSheet, type TaskDueSheetProps } from "./task-due-sheet";

const sheet = vi.hoisted(() => ({
  open: false,
  title: "",
  showCloseButton: false,
  swipeToClose: false,
  panelAnimateLayout: false,
  bodyClassName: "",
}));

vi.mock("~/components/ui/bottom-sheet", async (importActual) => {
  const actual = await importActual<
    typeof import("~/components/ui/bottom-sheet")
  >();

  return {
    ...actual,
    BottomSheet: (props: {
      open: boolean;
      title: string;
      showCloseButton?: boolean;
      swipeToClose?: boolean;
      panelAnimateLayout?: boolean;
      bodyClassName?: string;
      children: ReactNode;
    }) => {
      sheet.open = props.open;
      sheet.title = props.title;
      sheet.showCloseButton = props.showCloseButton === true;
      sheet.swipeToClose = props.swipeToClose === true;
      sheet.panelAnimateLayout = props.panelAnimateLayout === true;
      sheet.bodyClassName = props.bodyClassName ?? "";

      return createElement("div", null, props.children);
    },
  };
});

const NOW = new Date("2026-11-08T10:00:00.000Z");

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
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T09:00:00.000Z",
    updated_at: "2026-11-08T09:00:00.000Z",
    ...overrides,
  };
}

function render(props: Partial<TaskDueSheetProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskDueSheet, {
      open: true,
      task: task(),
      timeZone: "Europe/Moscow",
      now: NOW,
      isPending: false,
      error: null,
      onOpenChange: () => {},
      onSave: () => {},
      ...props,
    }),
  );
}

describe("TaskDueSheet", () => {
  it("configures the bottom sheet for this step", () => {
    render();

    expect(sheet.open).toBe(true);
    expect(sheet.title).toBe("Дата и время задачи");
    expect(sheet.showCloseButton).toBe(true);
    expect(sheet.swipeToClose).toBe(true);
    expect(sheet.panelAnimateLayout).toBe(true);
    expect(sheet.bodyClassName).toBe("p-[15px]");
  });

  it("passes the closed state through", () => {
    render({ open: false });

    expect(sheet.open).toBe(false);
  });

  it("renders the calendar, time, toggle and hint", () => {
    const html = render();

    expect(html).toContain("Ноябрь 2026");
    expect(html).toContain('type="time"');
    expect(html).toContain("Регулярная задача");
    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain("Готово");
  });

  it("initializes the switch from a regular task", () => {
    const html = render({ task: task({ recurrence: "regular" }) });

    expect(html).toContain('aria-checked="true"');
  });

  it("keeps the switch on for a periodic task", () => {
    const html = render({ task: task({ recurrence: "periodic" }) });

    expect(html).toContain('aria-checked="true"');
  });

  it("shows the update error and pending state", () => {
    const html = render({
      isPending: true,
      error: "Не удалось изменить срок. Попробуйте ещё раз.",
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Не удалось изменить срок. Попробуйте ещё раз.");
    expect(html).toMatch(
      /<button(?=[^>]*disabled="")[^>]*>Готово<\/button>/,
    );
  });
});
```

- [ ] **Step 5: Run the test and verify it fails**

Run: `npx vitest run app/components/tasks/detail/task-due-sheet.test.ts`
Expected: FAIL — cannot resolve `./task-due-sheet`.

- [ ] **Step 6: Implement `TaskDueSheet`**

Create `app/components/tasks/detail/task-due-sheet.tsx`:

- `useState<TaskDueDraft>(() => getTaskDueDraft(task, timeZone))`.
- `useEffect` resets the draft to `getTaskDueDraft(task, timeZone)` when
  `open` is true or `task.due_at` / `task.recurrence` / `timeZone` changes.
- `handleApply(next: DueStepValue)`:
  ```ts
  const input = buildTaskDueUpdate(task, next, timeZone);
  if (input === null) {
    onOpenChange(false);
    return;
  }
  onSave(input);
  ```
- Render `BottomSheet` with `open`, `onOpenChange`, `title="Дата и время задачи"`,
  `showCloseButton`, `panelAnimateLayout`, `swipeToClose`, `bodyClassName="p-[15px]"`;
  children: `DueStep` with `value={draft}`, `now`, `timeZone`,
  `onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}`,
  `onApply={handleApply}`, `isPending`, `error`.

- [ ] **Step 7: Run tests and typecheck**

Run: `npx vitest run app/components/tasks/quick-add/due-step.test.ts app/components/tasks/detail/task-due-sheet.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/components/tasks/quick-add/due-step.tsx app/components/tasks/quick-add/due-step.test.ts app/components/tasks/detail/task-due-sheet.tsx app/components/tasks/detail/task-due-sheet.test.ts
git commit -m "feat(tasks): add task due sheet"
```

---

### Task 4: Detail screen wiring and agent documentation

**Files:**
- Modify: `app/components/tasks/detail/task-detail-card.tsx`
- Modify: `app/components/tasks/detail/task-detail-card.test.ts`
- Modify: `app/components/tasks/detail/task-detail-view.tsx`
- Modify: `app/components/tasks/detail/task-detail-view.test.ts`
- Modify: `app/routes/task-detail.tsx`
- Modify: `app/routes/task-detail.test.ts`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `TaskDueSheet`, `useUpdateTaskDue`, `TaskUpdateInput`.
- Produces:
  - `TaskDetailCardProps.onDueClick?: () => void`
  - `TaskDetailViewProps.onDueClick?: () => void`

- [ ] **Step 1: Add failing card/view tests**

In `app/components/tasks/detail/task-detail-card.test.ts` add:

```ts
it("renders the due row as an edit button when a handler is provided", () => {
  const html = render({ onDueClick: () => {} });

  expect(html).toContain('aria-label="Изменить срок"');
  expect(html).toMatch(/<button[^>]*aria-label="Изменить срок"[^>]*>/);
  expect(html).toContain("Срок");
});

it("keeps the due row non-interactive without a handler", () => {
  expect(render()).not.toContain('aria-label="Изменить срок"');
});
```

In `app/components/tasks/detail/task-detail-view.test.ts` add:

```ts
it("forwards the due row handler to the card", () => {
  expect(render({ onDueClick: () => {} })).toContain(
    'aria-label="Изменить срок"',
  );
  expect(render()).not.toContain('aria-label="Изменить срок"');
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run app/components/tasks/detail/task-detail-card.test.ts app/components/tasks/detail/task-detail-view.test.ts`
Expected: FAIL — alert/aria label absent.

- [ ] **Step 3: Add the due-row button**

In `task-detail-card.tsx`:

- `DetailRowProps` gets `onClick?: () => void` and `ariaLabel?: string`.
- When `onClick` is present, render a `<button type="button">` with the same
  flex classes plus `w-full text-left focus-visible:outline-2
  focus-visible:-outline-offset-2 focus-visible:outline-app-accent` and
  `aria-label={ariaLabel}`; otherwise render the existing `<div>`.
- Add `onDueClick?: () => void` to `TaskDetailCardProps`; pass
  `onClick={onDueClick}` and `ariaLabel="Изменить срок"` to the «Срок» row.
- Keep the destructive/accent value classes unchanged.

In `task-detail-view.tsx`, add `onDueClick?: () => void` to props and pass it
to `TaskDetailCard`.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run app/components/tasks/detail/task-detail-card.test.ts app/components/tasks/detail/task-detail-view.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the route**

In `app/routes/task-detail.tsx`:

- import `TaskDueSheet` and `useUpdateTaskDue`, plus `TaskUpdateInput`;
- add `const [isDueOpen, setIsDueOpen] = useState(false);`;
- add `const dueMutation = useUpdateTaskDue(taskId, () => setIsDueOpen(false));`;
- add `const dueError = dueMutation.isError ? "Не удалось изменить срок. Попробуйте ещё раз." : null;`;
- add:
  ```ts
  function handleDueOpenChange(open: boolean) {
    dueMutation.reset();
    setIsDueOpen(open);
    if (open) haptics.selection();
  }

  function handleDueSave(input: TaskUpdateInput) {
    dueMutation.mutate(input);
  }
  ```
- pass `onDueClick={() => handleDueOpenChange(true)}` to `TaskDetailView`;
- render after `DeleteTaskModal`:
  ```tsx
  {task ? (
    <TaskDueSheet
      error={dueError}
      isPending={dueMutation.isPending}
      now={now}
      onOpenChange={handleDueOpenChange}
      onSave={handleDueSave}
      open={isDueOpen}
      task={task}
      timeZone={timeZone}
    />
  ) : null}
  ```

- [ ] **Step 6: Extend the route test**

In `app/routes/task-detail.test.ts`:

- extended `routeState` with `dueOpen`/`dueProps`, `dueMutate`, `dueReset`,
  `duePending`, `dueError`, `onUpdated`;
- mock `~/hooks/use-update-task-due`:
  ```ts
  useUpdateTaskDue: (_taskId: number, onUpdated: () => void) => {
    routeState.onUpdated = onUpdated;
    return {
      mutate: routeState.dueMutate,
      reset: routeState.dueReset,
      isPending: routeState.duePending,
      isError: routeState.dueError,
    };
  }
  ```
- mock `~/components/tasks/detail/task-due-sheet` to capture its props into
  `routeState.dueProps` and render `null`;
- reset the new state in `beforeEach`;
- add tests:
  ```ts
  it("opens the due sheet from the due row", () => {
    renderRoute();
    routeState.viewProps?.onDueClick?.();
    expect(routeState.dueReset).toHaveBeenCalled();
  });

  it("passes the task, timezone, pending and error to the due sheet", () => {
    routeState.dueError = true;
    renderRoute();
    expect(routeState.dueProps?.task.id).toBe(42);
    expect(routeState.dueProps?.timeZone).toBe("UTC");
    expect(routeState.dueProps?.error).toBe(
      "Не удалось изменить срок. Попробуйте ещё раз.",
    );
  });

  it("saves due changes through the mutation", () => {
    renderRoute();
    routeState.dueProps?.onSave({
      due_at: "2026-11-09T13:00:00.000Z",
      recurrence: "regular",
    });
    expect(routeState.dueMutate).toHaveBeenCalledWith({
      due_at: "2026-11-09T13:00:00.000Z",
      recurrence: "regular",
    });
  });
  ```
  Keep `onDueClick` in the mocked `TaskDetailViewState` interface.

- [ ] **Step 7: Run the route tests and full suite**

Run: `npx vitest run app/routes/task-detail.test.ts`
Expected: PASS.
Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 8: Update `AGENTS.md`**

In the structure block, add:
- `app/components/tasks/detail/task-due-sheet.tsx` — шторка «Дата и время задачи»;
- `app/hooks/use-update-task-due.ts` — PATCH срока, кэш, haptics;
- `app/lib/tasks/task-due.ts` — начальный черновик и payload срока.

In the data/state section add a bullet: `/tasks/:id` строка «Срок» открывает
`TaskDueSheet`; PATCH `/tasks/{id}` отправляет `due_at` только при смене
момента и `recurrence` только при смене переключателя; `periodic`
сохраняет интервал; выключение регулярности отправляет `one_off`;
успех инвалидирует `["tasks"]`, `["task-series"]`, `["projects"]` и
детальный ключ; ошибка показывается в шторке.

In the UI section, replace the sentence about non-interactive detail rows with:
«Строки карточки свойств неинтерактивны, кроме «Срок»: он открывает
шторку «Дата и время задачи» (BottomSheet, `showCloseButton`, свайп,
только `app-*`, 320/412/448 px, safe-area).»

In the manual verification section add:
- тап по «Срок» открывает шторку, крестик/оверлей/Escape/свайп закрывают;
- смена даты/времени у разовой задачи отправляет только `due_at`;
- включение «Регулярной задачи» у разовой отправляет `regular`;
- выключение у ежедневной отправляет `one_off`;
- у периодической смена только времени не меняет интервал;
- ошибка PATCH показывается над «Готово», pending блокирует кнопку;
- light/dark, 320/412/448 px, safe-area, клавиатура в поле времени.

- [ ] **Step 9: Run full verification**

Run: `npm test`
Expected: PASS.
Run: `npm run typecheck`
Expected: PASS.
Run: `npm run build`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add app/components/tasks/detail/task-detail-card.tsx app/components/tasks/detail/task-detail-card.test.ts app/components/tasks/detail/task-detail-view.tsx app/components/tasks/detail/task-detail-view.test.ts app/routes/task-detail.tsx app/routes/task-detail.test.ts AGENTS.md
git commit -m "feat(tasks): open due date sheet from task details"
```
