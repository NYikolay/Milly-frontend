# Quick Add Zustand State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести всё состояние формы быстрого создания задачи в Zustand, оставив `react-hook-form` обработчиком и валидатором через zod, без изменения API, payload и UI-поведения.

**Architecture:** `QuickAddComposer` создаёт per-composer vanilla-store через `createStore` и раздаёт его context-провайдером. Стор хранит `draft`, `activeStep`, `stepDraft`, `remindersAmountInput`, `now`, `error` и экшены. RHF получает `values: draft` и `resolver: quickTaskResolver`; заголовок через `Controller` пишет в стор. Шаги деталей становятся controlled и редактируют `stepDraft`; «Применить» коммитит его в `draft`, закрытие отбрасывает.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Zustand 5, react-hook-form 7, zod 4, React Query 5, Vitest.

**Spec:** `docs/specs/2026-11-06-quick-add-zustand/spec.md`

## Global Constraints

- Новые зависимости не добавлять: `zustand` уже установлен.
- API, `QuickTaskDraft`, `quickTaskSchema`, `quickTaskResolver`, payload, React Query-ключи и `describeQuickAddError` не меняются.
- Стор — per-composer vanilla-store + context; модульного singleton-стора нет.
- Черновик не сохраняется в localStorage/sessionStorage/IndexedDB/Telegram Storage.
- `Calendar.view` остаётся локальным view-state; React Query, рефы и мутация в стор не переезжают.
- TypeScript strict, без `any`; типы — через `import type`.
- Файлы — kebab-case, компоненты — PascalCase, алиас `~/`.
- Нет доступа к `window`/`document` на верхнем уровне модулей.
- Несохранённые изменения `app/assets/icons/calendar.svg`, `tag.svg`, `tag-plus.svg` не откатывать и не перезаписывать.
- Тесты — Vitest, `app/**/*.test.ts`; компонентные тесты — `createElement` + `renderToStaticMarkup`.
- Линтера в проекте нет; `npm run lint` не добавлять.
- Проверки перед завершением: `npm test`, `npm run typecheck`, `npm run build`.
- Коммиты выполнять только по явному разрешению пользователя; шаги Commit ниже условные.

## Review Focus

- **Синхронизация RHF после внешнего изменения стора.** Apply шага, reset после успеха и prune меток при `404` должны попадать в RHF через `values: draft`. Проверка — тесты стора (Task 1), рендер `QuickAddForm` из `draft` (Task 2), ручной сценарий (Task 4).
- **Отмена шага.** Закрытие шага не должно менять `draft`; повторное открытие начинает с `draft`, а не с отброшенного `stepDraft`. Проверка — store-тест `open/close/apply` (Task 1).
- **Пустой ввод суммы напоминания.** Очистка поля «За сколько до срока» должна оставлять его пустым и блокировать «Применить», а не превращать в `0`. Проверка — `RemindersStep` с `amountInput: ""` (Task 3).
- **Дата в прошлом при открытии due.** `openStep("due")` должен обновить `now` и заменить устаревшую дату на сегодняшнюю в `timeZone`. Проверка — store-тест с фиксированными часами (Task 1).
- **SSR и независимость экземпляров.** Два store не должны делить состояние; на сервере нет модульного стора. Проверка — store-тест двух инстансов (Task 1) и `npm run build` (Task 4).

---

## File Structure

**Create**

```text
app/components/tasks/quick-add/quick-add-store.ts
app/components/tasks/quick-add/quick-add-store-provider.tsx
app/components/tasks/quick-add/quick-add-store.test.ts
```

**Modify**

```text
app/lib/tasks/date-time.ts
app/lib/tasks/date-time.test.ts
app/components/tasks/quick-add/use-quick-task-form.ts
app/components/tasks/quick-add/quick-add-form.tsx
app/components/tasks/quick-add/quick-add-form.test.ts
app/components/tasks/quick-add/quick-add-composer.tsx
app/components/tasks/quick-add/quick-add-detail-sheet.tsx
app/components/tasks/quick-add/quick-add-detail-sheet.test.ts
app/components/tasks/quick-add/labels-step.tsx
app/components/tasks/quick-add/labels-step.test.ts
app/components/tasks/quick-add/priority-step.tsx
app/components/tasks/quick-add/priority-step.test.ts
app/components/tasks/quick-add/due-step.tsx
app/components/tasks/quick-add/due-step.test.ts
app/components/tasks/quick-add/reminders-step.tsx
app/components/tasks/quick-add/reminders-step.test.ts
AGENTS.md
```

---

### Task 1: Store foundation and zoned-today helper

**Files:**
- Create: `app/components/tasks/quick-add/quick-add-store.ts`
- Create: `app/components/tasks/quick-add/quick-add-store-provider.tsx`
- Create: `app/components/tasks/quick-add/quick-add-store.test.ts`
- Modify: `app/lib/tasks/date-time.ts`
- Test: `app/lib/tasks/date-time.test.ts`

**Interfaces:**
- Consumes: `createQuickTaskDefaults`, `QuickTaskDraft` from `~/lib/tasks/quick-task-schema`; `QuickAddStep` from `./quick-add-step`; `createStore`, `StoreApi` from `zustand`; `useStore` from `zustand`.
- Produces:
  ```ts
  export function formatZonedToday(now: Date, timeZone: string): string;

  export interface QuickAddStoreOptions {
    now: Date;
    timeZone: string;
    clock?: () => Date;
  }

  export interface QuickAddStoreState {
    draft: QuickTaskDraft;
    activeStep: QuickAddStep | null;
    stepDraft: QuickTaskDraft | null;
    remindersAmountInput: string;
    now: Date;
    error: string | null;
    patchDraft: (patch: Partial<QuickTaskDraft>) => void;
    patchStepDraft: (patch: Partial<QuickTaskDraft>) => void;
    pruneLabelIds: (validIds: number[]) => void;
    openStep: (step: QuickAddStep) => void;
    closeStep: () => void;
    applyStep: (patch?: Partial<QuickTaskDraft>) => void;
    resetDraft: () => void;
    setError: (error: string | null) => void;
    setRemindersAmountInput: (value: string) => void;
  }

  export function createQuickAddStore(
    options: QuickAddStoreOptions,
  ): StoreApi<QuickAddStoreState>;

  export function QuickAddStoreProvider(
    props: PropsWithChildren<{ timeZone: string }>,
  ): ReactElement;

  export function useQuickAddStore<T>(
    selector: (state: QuickAddStoreState) => T,
  ): T;
  ```

- [ ] **Step 1: Write the failing `formatZonedToday` test**

In `app/lib/tasks/date-time.test.ts`, add `formatZonedToday` to the import and add:

```ts
describe("formatZonedToday", () => {
  it("formats the local date in the user timezone", () => {
    expect(formatZonedToday(now, "Europe/Moscow")).toBe("2026-11-05");
    expect(
      formatZonedToday(new Date("2026-11-05T22:30:00Z"), "Europe/Moscow"),
    ).toBe("2026-11-06");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- app/lib/tasks/date-time.test.ts`
Expected: FAIL — `formatZonedToday` is not exported.

- [ ] **Step 3: Implement `formatZonedToday`**

In `app/lib/tasks/date-time.ts`, export:

```ts
export function formatZonedToday(now: Date, timeZone: string): string {
  const { year, month, day } = getZonedNow(now, timeZone);

  return formatDate(year, month, day);
}
```

Keep `formatDate` private and reuse it; do not duplicate date padding.

- [ ] **Step 4: Write the failing store tests**

Create `app/components/tasks/quick-add/quick-add-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createQuickTaskDefaults } from "~/lib/tasks/quick-task-schema";

import { createQuickAddStore } from "./quick-add-store";

const now = new Date("2026-11-05T13:07:42Z");
const clock = () => new Date("2026-11-05T13:07:42Z");

function createStore() {
  return createQuickAddStore({ now, timeZone: "Europe/Moscow", clock });
}

describe("quick add store", () => {
  it("initializes defaults and keeps instances isolated", () => {
    const first = createStore();
    const second = createStore();

    first.getState().patchDraft({ title: "Draft" });

    expect(first.getState().draft.title).toBe("Draft");
    expect(second.getState().draft).toEqual(
      createQuickTaskDefaults(now, "Europe/Moscow"),
    );
    expect(first.getState().activeStep).toBeNull();
    expect(first.getState().stepDraft).toBeNull();
    expect(first.getState().remindersAmountInput).toBe("");
    expect(first.getState().error).toBeNull();
  });

  it("drops step edits on close and commits them on apply", () => {
    const store = createStore();

    store.getState().patchDraft({ title: "Draft", labelIds: [1] });
    store.getState().openStep("labels");
    store.getState().patchStepDraft({ title: "Changed", labelIds: [2] });

    expect(store.getState().draft.title).toBe("Draft");
    expect(store.getState().draft.labelIds).toEqual([1]);
    expect(store.getState().stepDraft?.title).toBe("Changed");

    store.getState().closeStep();
    expect(store.getState().draft.title).toBe("Draft");
    expect(store.getState().activeStep).toBeNull();
    expect(store.getState().stepDraft).toBeNull();

    store.getState().openStep("labels");
    store.getState().patchStepDraft({ labelIds: [3] });
    store.getState().applyStep({ labelIds: [4] });

    expect(store.getState().draft.labelIds).toEqual([4]);
    expect(store.getState().activeStep).toBeNull();
    expect(store.getState().stepDraft).toBeNull();
  });

  it("clamps the due date and refreshes now when the due step opens", () => {
    const store = createStore();

    store.getState().patchDraft({ dueDate: "2026-11-04" });
    store.getState().openStep("due");

    expect(store.getState().now).toEqual(clock());
    expect(store.getState().stepDraft?.dueDate).toBe("2026-11-05");
  });

  it("initializes and clears the reminders amount input", () => {
    const store = createStore();

    store.getState().patchDraft({ beforeDueAmount: 5 });
    store.getState().openStep("reminders");
    expect(store.getState().remindersAmountInput).toBe("5");

    store.getState().setRemindersAmountInput("");
    expect(store.getState().remindersAmountInput).toBe("");

    store.getState().closeStep();
    expect(store.getState().remindersAmountInput).toBe("");
  });

  it("resets the draft, now, step and error", () => {
    const store = createStore();

    store.getState().patchDraft({ title: "Draft" });
    store.getState().setError("boom");
    store.getState().openStep("priority");
    store.getState().resetDraft();

    expect(store.getState().draft).toEqual(
      createQuickTaskDefaults(clock(), "Europe/Moscow"),
    );
    expect(store.getState().now).toEqual(clock());
    expect(store.getState().activeStep).toBeNull();
    expect(store.getState().stepDraft).toBeNull();
    expect(store.getState().remindersAmountInput).toBe("");
    expect(store.getState().error).toBeNull();
  });

  it("prunes label ids in both drafts", () => {
    const store = createStore();

    store.getState().patchDraft({ labelIds: [1, 2, 3] });
    store.getState().openStep("labels");
    store.getState().patchStepDraft({ labelIds: [2, 3, 4] });
    store.getState().pruneLabelIds([2, 3]);

    expect(store.getState().draft.labelIds).toEqual([2, 3]);
    expect(store.getState().stepDraft?.labelIds).toEqual([2, 3]);
  });
});
```

- [ ] **Step 5: Run the store tests to verify they fail**

Run: `npm test -- app/components/tasks/quick-add/quick-add-store.test.ts`
Expected: FAIL — `./quick-add-store` does not exist.

- [ ] **Step 6: Implement the vanilla store**

Create `app/components/tasks/quick-add/quick-add-store.ts` with the interface from this task's **Interfaces** block. Implementation requirements:

- Keep `timeZone` and `clock` in the factory closure; do not put `clock` in `QuickAddStoreState`.
- Initialize `draft` with `createQuickTaskDefaults(options.now, options.timeZone)`.
- `patchDraft` and `patchStepDraft` use functional `set((state) => ...)`; `patchStepDraft` returns the current state when `stepDraft === null`.
- `pruneLabelIds(validIds)` filters and dedupes `draft.labelIds` and, when present, `stepDraft.labelIds` against `validIds`.
- `openStep("due")` uses `clock()`, sets `now`, and clamps `stepDraft.dueDate` with `formatZonedToday(now, timeZone)`.
- `openStep("reminders")` sets `remindersAmountInput` to `String(draft.beforeDueAmount)`; every other step sets it to `""`.
- `closeStep` clears `activeStep`, `stepDraft`, `remindersAmountInput`; it never changes `draft`.
- `applyStep(patch)` returns early when `stepDraft === null`; otherwise merges `patch` into `stepDraft`, copies the result into `draft`, clears the step and the amount input.
- `resetDraft` recomputes defaults with `clock()`, updates `now`, and clears step, amount input and error.
- Clone `labelIds` when opening a step so step edits cannot mutate `draft.labelIds`.

- [ ] **Step 7: Implement the provider and hooks**

Create `app/components/tasks/quick-add/quick-add-store-provider.tsx`:

- `QuickAddStoreContext` with `createContext<ReturnType<typeof createQuickAddStore> | null>(null)`.
- `QuickAddStoreProvider` creates the store once with `useState(() => createQuickAddStore({ now: new Date(), timeZone }))`.
- `useQuickAddStore(selector)` reads the context, throws `new Error("useQuickAddStore must be used within QuickAddStoreProvider")` when missing, and returns `useStore(store, selector)`.

- [ ] **Step 8: Run the store and date tests**

Run: `npm test -- app/components/tasks/quick-add/quick-add-store.test.ts app/lib/tasks/date-time.test.ts`
Expected: PASS.

- [ ] **Step 9: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 10: Commit (only if the user allowed commits)**

```bash
git add app/components/tasks/quick-add/quick-add-store.ts \
  app/components/tasks/quick-add/quick-add-store-provider.tsx \
  app/components/tasks/quick-add/quick-add-store.test.ts \
  app/lib/tasks/date-time.ts app/lib/tasks/date-time.test.ts
git commit -m "feat(tasks): add quick add zustand store"
```

---

### Task 2: Draft and composer UI state in the store

**Files:**
- Modify: `app/components/tasks/quick-add/use-quick-task-form.ts`
- Modify: `app/components/tasks/quick-add/quick-add-form.tsx`
- Modify: `app/components/tasks/quick-add/quick-add-form.test.ts`
- Modify: `app/components/tasks/quick-add/quick-add-composer.tsx`

**Interfaces:**
- Consumes: `createQuickAddStore`, `QuickAddStoreProvider`, `useQuickAddStore` from Task 1.
- Produces:
  ```ts
  export interface UseQuickTaskFormOptions {
    draft: QuickTaskDraft;
  }

  export type QuickTaskFormApi = UseFormReturn<QuickTaskDraft>;

  export function useQuickTaskForm(
    options: UseQuickTaskFormOptions,
  ): QuickTaskFormApi;

  export interface QuickAddFormProps {
    form: UseFormReturn<QuickTaskDraft>;
    draft: QuickTaskDraft;
    labels: LabelResponse[];
    now: Date;
    timeZone: string;
    onOpenStep: (step: QuickAddChipStep) => void;
    onSubmit: FormEventHandler<HTMLFormElement>;
    onTitleChange: (title: string) => void;
    onVoice: () => void;
    isPending: boolean;
    error: string | null;
    chipRefs?: QuickAddChipRefs;
  }
  ```

- [ ] **Step 1: Update the failing `QuickAddForm` test**

Rewrite `app/components/tasks/quick-add/quick-add-form.test.ts` so `Harness` accepts a `title` and passes the new props:

```tsx
function Harness({ title = "" }: { title?: string }) {
  const draft = {
    ...createQuickTaskDefaults(
      new Date("2026-11-05T13:07:42Z"),
      "Europe/Moscow",
    ),
    title,
  };
  const form = useForm<QuickTaskDraft>({
    defaultValues: draft,
    values: draft,
  });

  return createElement(QuickAddForm, {
    draft,
    error: null,
    form,
    isPending: false,
    labels: [],
    now: new Date("2026-11-05T13:07:42Z"),
    onOpenStep: () => {},
    onSubmit: () => {},
    onTitleChange: () => {},
    onVoice: () => {},
    timeZone: "Europe/Moscow",
  });
}
```

Keep the existing inline-layout assertions and add:

```tsx
it("renders the title and counter from the draft", () => {
  const html = renderToStaticMarkup(createElement(Harness, { title: "Тест" }));

  expect(html).toContain("Тест");
  expect(html).toContain("4/120");
});
```

- [ ] **Step 2: Run the form test to verify it fails**

Run: `npm test -- app/components/tasks/quick-add/quick-add-form.test.ts`
Expected: FAIL — `QuickAddForm` does not accept `draft`/`onTitleChange`, and the counter is not driven by the prop.

- [ ] **Step 3: Rewrite `useQuickTaskForm`**

In `app/components/tasks/quick-add/use-quick-task-form.ts`:

- Remove `useCallback`, `timeZone`, `now` and `resetToDefaults`.
- Use:
  ```ts
  export function useQuickTaskForm({
    draft,
  }: UseQuickTaskFormOptions): QuickTaskFormApi {
    return useForm<QuickTaskDraft>({
      defaultValues: draft,
      values: draft,
      resolver: quickTaskResolver,
      mode: "onChange",
    });
  }
  ```
- Keep `quickTaskResolver` and the `QuickTaskDraft` type import.

- [ ] **Step 4: Make `QuickAddForm` read the draft and write the title**

In `app/components/tasks/quick-add/quick-add-form.tsx`:

- Import `Controller` from `react-hook-form`.
- Remove `const values = form.watch();`.
- Read `draft.title` for `canSubmit` and the counter.
- Pass `draft.*` to `QuickAddChips` instead of `values.*`.
- Replace the textarea `{...form.register("title")}` with a `Controller`:

```tsx
<Controller
  control={form.control}
  name="title"
  render={({ field }) => (
    <textarea
      aria-label="Название задачи"
      className="h-full w-full resize-none rounded-[25px] bg-transparent pl-[15px] pt-[12px] pr-[60px] pb-[30px] text-[15px] leading-[1.3] text-app-text placeholder:--app-text-secondary focus-visible:outline-none"
      maxLength={TITLE_MAX_LENGTH}
      onBlur={field.onBlur}
      onChange={(event) => {
        field.onChange(event);
        onTitleChange(event.target.value);
      }}
      placeholder="Запись к стоматологу завтра в 10 утра"
      ref={field.ref}
      value={draft.title}
    />
  )}
/>
```

Keep the wrapper, counter, chips, error, buttons and microphone markup unchanged.

- [ ] **Step 5: Wire the composer to the store**

In `app/components/tasks/quick-add/quick-add-composer.tsx`:

- Rename the existing component body to `QuickAddComposerContent` with props `{ onVoice: () => void; timeZone: string }`.
- New exported `QuickAddComposer` reads `useAuth()` once, computes `timeZone`, and renders:
  ```tsx
  <QuickAddStoreProvider timeZone={timeZone}>
    <QuickAddComposerContent onVoice={onVoice} timeZone={timeZone} />
  </QuickAddStoreProvider>
  ```
- In the content component, replace `useState` with store selectors:
  ```ts
  const draft = useQuickAddStore((state) => state.draft);
  const activeStep = useQuickAddStore((state) => state.activeStep);
  const now = useQuickAddStore((state) => state.now);
  const error = useQuickAddStore((state) => state.error);
  const patchDraft = useQuickAddStore((state) => state.patchDraft);
  const pruneLabelIds = useQuickAddStore((state) => state.pruneLabelIds);
  const resetDraft = useQuickAddStore((state) => state.resetDraft);
  const setError = useQuickAddStore((state) => state.setError);
  const openStep = useQuickAddStore((state) => state.openStep);
  const closeStep = useQuickAddStore((state) => state.closeStep);
  ```
- Use `const form = useQuickTaskForm({ draft });` and remove `const values = form.watch();`.
- On success call `resetDraft()`; remove `resetToDefaults`, `setError(null)`, `setNow`, `setActiveDetail`.
- On `404`, replace `form.setValue("labelIds", ...)` with:
  ```ts
  pruneLabelIds((result.data ?? []).map((label) => label.id));
  ```
- `handleOpenDetail(step)` calls `openStep(step)`; remove the manual `setNow` and `setActiveDetail`.
- `closeDetail()` calls `closeStep()`.
- Apply handlers call `patchDraft(...)`, then `haptics.selection()` and `closeStep()`; do not use `form.setValue`.
- Submit:
  ```ts
  const handleSubmit = form.handleSubmit((validDraft) => {
    if (createMutation.isPending || submittingRef.current) {
      return;
    }

    setError(null);
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    submittingRef.current = true;

    createMutation.mutate({
      draft: validDraft,
      timeZone,
      signal: controller.signal,
    });
  });
  ```
- Pass `draft={draft}` and `onTitleChange={(title) => patchDraft({ title })}` to `QuickAddForm`.
- Use `activeStep` in the focus effect and detail sheet; pass `values={draft}` until Task 3 changes the sheet.
- Keep `abortRef`, `submittingRef`, `pendingChipFocusRef`, all chip refs and the focus effect unchanged.

- [ ] **Step 6: Run targeted tests and typecheck**

Run:
`npm test -- app/components/tasks/quick-add/quick-add-form.test.ts app/components/tasks/quick-add/quick-add-chips.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit (only if the user allowed commits)**

```bash
git add app/components/tasks/quick-add/use-quick-task-form.ts \
  app/components/tasks/quick-add/quick-add-form.tsx \
  app/components/tasks/quick-add/quick-add-form.test.ts \
  app/components/tasks/quick-add/quick-add-composer.tsx
git commit -m "refactor(tasks): store quick add draft in zustand"
```

---

### Task 3: Controlled detail steps fed by `stepDraft`

**Files:**
- Modify: `app/components/tasks/quick-add/labels-step.tsx`
- Modify: `app/components/tasks/quick-add/labels-step.test.ts`
- Modify: `app/components/tasks/quick-add/priority-step.tsx`
- Modify: `app/components/tasks/quick-add/priority-step.test.ts`
- Modify: `app/components/tasks/quick-add/due-step.tsx`
- Modify: `app/components/tasks/quick-add/due-step.test.ts`
- Modify: `app/components/tasks/quick-add/reminders-step.tsx`
- Modify: `app/components/tasks/quick-add/reminders-step.test.ts`
- Modify: `app/components/tasks/quick-add/quick-add-detail-sheet.tsx`
- Modify: `app/components/tasks/quick-add/quick-add-detail-sheet.test.ts`
- Modify: `app/components/tasks/quick-add/quick-add-composer.tsx`

**Interfaces:**
- Consumes: `stepDraft`, `patchStepDraft`, `applyStep`, `remindersAmountInput`, `setRemindersAmountInput` from Task 1.
- Produces:
  ```ts
  export interface LabelsStepProps {
    labels: LabelResponse[];
    isLoading: boolean;
    isError: boolean;
    selectedIds: number[];
    onRetry: () => void;
    onChange: (ids: number[]) => void;
    onApply: (ids: number[]) => void;
  }

  export interface PriorityStepProps {
    value: Priority;
    onChange: (priority: Priority) => void;
    onApply: (priority: Priority) => void;
  }

  export interface DueStepProps {
    value: DueStepValue;
    timeZone: string;
    now: Date;
    onChange: (patch: Partial<DueStepValue>) => void;
    onApply: (value: DueStepValue) => void;
    onToggleHaptic?: () => void;
  }

  export interface RemindersStepProps {
    value: ReminderDraft;
    amountInput: string;
    onChange: (patch: Partial<ReminderDraft>) => void;
    onAmountInputChange: (value: string) => void;
    onApply: (value: ReminderDraft) => void;
    onToggleHaptic?: () => void;
  }

  export interface QuickAddDetailSheetProps {
    step: QuickAddStep | null;
    values: QuickTaskDraft;
    amountInput: string;
    labels: LabelResponse[];
    isLabelsLoading: boolean;
    isLabelsError: boolean;
    onRetryLabels: () => void;
    now: Date;
    timeZone: string;
    onClose: () => void;
    onPatch: (patch: Partial<QuickTaskDraft>) => void;
    onAmountInputChange: (value: string) => void;
    onApply: (patch: Partial<QuickTaskDraft>) => void;
  }
  ```

- [ ] **Step 1: Update the labels test**

In `app/components/tasks/quick-add/labels-step.test.ts`, add `onChange: () => {}` to the render props. Add:

```ts
it("renders the selection from the controlled selectedIds", () => {
  const html = render({ labels: [label], selectedIds: [3] });
  expect(html).toContain('aria-checked="true"');

  const empty = render({ labels: [label], selectedIds: [] });
  expect(empty).toContain('aria-checked="false"');
});
```

- [ ] **Step 2: Update the priority test**

In `app/components/tasks/quick-add/priority-step.test.ts`, add `onChange: () => {}` to both render calls. Add:

```ts
it("marks the controlled value as selected", () => {
  const html = renderToStaticMarkup(
    createElement(PriorityStep, {
      value: "urgent_important",
      onChange: () => {},
      onApply: () => {},
    }),
  );

  expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  expect(html).toContain("Срочные и важные");
});
```

- [ ] **Step 3: Update the due test**

In `app/components/tasks/quick-add/due-step.test.ts`, change the helper to:

```ts
function render(overrides: Partial<DueStepValue> = {}) {
  return renderToStaticMarkup(
    createElement(DueStep, {
      value: {
        date: "2026-11-05",
        time: "16:00",
        isRecurring: false,
        ...overrides,
      },
      timeZone: "Europe/Moscow",
      now,
      onChange: () => {},
      onApply: () => {},
    }),
  );
}
```

Update calls from `render({ date: "2026-11-11", isRecurring: true })` and `render({ time: "" })` to the same object shape. Keep all existing assertions.

- [ ] **Step 4: Update the reminders test**

In `app/components/tasks/quick-add/reminders-step.test.ts`, update `render`:

```ts
function render(
  overrides: {
    value?: Partial<ReminderDraft>;
    amountInput?: string;
  } = {},
) {
  return renderToStaticMarkup(
    createElement(RemindersStep, {
      value: { ...defaults, ...overrides.value },
      amountInput: overrides.amountInput ?? "1",
      onChange: () => {},
      onAmountInputChange: () => {},
      onApply: () => {},
    }),
  );
}
```

Replace `render({ value: { ...defaults, ... } })` calls with `render({ value: ... })` where the `value` override is partial. Add:

```ts
it("keeps an empty amount input empty and disables apply", () => {
  const html = render({ amountInput: "" });

  expect(html).toContain('value=""');
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Применить<\/button>/);
});
```

- [ ] **Step 5: Update the detail sheet test**

In `app/components/tasks/quick-add/quick-add-detail-sheet.test.ts`, add the new props to the `QuickAddDetailSheet` call:

```ts
amountInput: "1",
onAmountInputChange: () => {},
onPatch: () => {},
onApply: () => {},
```

Keep the back-button assertion.

- [ ] **Step 6: Run the targeted tests to verify they fail**

Run:
`npm test -- app/components/tasks/quick-add/labels-step.test.ts app/components/tasks/quick-add/priority-step.test.ts app/components/tasks/quick-add/due-step.test.ts app/components/tasks/quick-add/reminders-step.test.ts app/components/tasks/quick-add/quick-add-detail-sheet.test.ts`
Expected: FAIL — components still use local state and the old prop shapes.

- [ ] **Step 7: Convert `LabelsStep` to controlled state**

In `app/components/tasks/quick-add/labels-step.tsx`:

- Remove `useState`.
- Use `selectedIds` directly; `visibleSelected` filters by `visibleIds` when `isReady`.
- `toggleLabel` computes `next` from `visibleSelected` and calls `onChange(next)`.
- Keep `uniqueLabelIds`, `uniqueLabels`, statuses, classes and the apply button.
- Apply calls `onApply(uniqueLabelIds(visibleSelected))`.

- [ ] **Step 8: Convert `PriorityStep` to controlled state**

In `app/components/tasks/quick-add/priority-step.tsx`:

- Remove `useState`.
- Use `value` for `isSelected`.
- On click call `onChange(option.value)`.
- Apply calls `onApply(value)`.

- [ ] **Step 9: Convert `DueStep` to controlled state**

In `app/components/tasks/quick-add/due-step.tsx`:

- Remove `useState`.
- Replace `date`, `time`, `isRecurring` props with `value: DueStepValue`.
- Compute `today = formatZonedToday(now, timeZone)` using the helper from Task 1; delete the local `formatZonedToday`.
- Use `const selectedDate = value.date < today ? today : value.date;`.
- `Calendar` `onSelect` calls `onChange({ date })`.
- `TimeInput` `onChange` calls `onChange({ time })`.
- `Switch` `onCheckedChange` calls `onChange({ isRecurring: checked })` and `onToggleHaptic?.()`.
- Apply calls `onApply({ date: selectedDate, time: value.time, isRecurring: value.isRecurring })`.
- Keep the hint, `isTimeValid`, disabled logic and markup.

- [ ] **Step 10: Convert `RemindersStep` to controlled state**

In `app/components/tasks/quick-add/reminders-step.tsx`:

- Remove all `useState` and the `ChangeEvent` import.
- `parsedAmount = parseAmount(amountInput)`.
- `isScheduledTimeValid = isValidTime(value.scheduledTime)`.
- Switches call `onChange({ remindersEnabled: checked })`, `onChange({ beforeDueEnabled: checked })`, `onChange({ scheduledEnabled: checked })`, each followed by `onToggleHaptic?.()`.
- Amount input uses `value={amountInput}` and `onChange={(event) => onAmountInputChange(event.target.value.replace(/\D/g, ""))}`.
- Selects and time inputs call `onChange({ beforeDueUnit: unit })`, `onChange({ scheduledIntervalDays: value })`, `onChange({ scheduledTime: value })`.
- `handleApply` calls:
  ```ts
  onApply(
    normalizeReminderDraft({
      ...value,
      beforeDueAmount: parsedAmount ?? 1,
    }),
  );
  ```
- Keep `normalizeReminderDraft`, `parseAmount`, options, helpers and disabled logic.

- [ ] **Step 11: Update `QuickAddDetailSheet`**

In `app/components/tasks/quick-add/quick-add-detail-sheet.tsx`:

- Replace `onApplyLabels`, `onApplyPriority`, `onApplyDue`, `onApplyReminders` with `onPatch`, `onApply`, `onAmountInputChange`.
- `LabelsStep`:
  ```tsx
  selectedIds={values.labelIds}
  onChange={(ids) => onPatch({ labelIds: ids })}
  onApply={(ids) => onApply({ labelIds: ids })}
  ```
- `PriorityStep`:
  ```tsx
  value={values.priority}
  onChange={(priority) => onPatch({ priority })}
  onApply={(priority) => onApply({ priority })}
  ```
- `DueStep`:
  ```tsx
  value={{
    date: values.dueDate,
    time: values.dueTime,
    isRecurring: values.isRecurring,
  }}
  onChange={(patch) =>
    onPatch({
      ...(patch.date !== undefined ? { dueDate: patch.date } : {}),
      ...(patch.time !== undefined ? { dueTime: patch.time } : {}),
      ...(patch.isRecurring !== undefined
        ? { isRecurring: patch.isRecurring }
        : {}),
    })
  }
  onApply={(next) =>
    onApply({
      dueDate: next.date,
      dueTime: next.time,
      isRecurring: next.isRecurring,
    })
  }
  ```
- `RemindersStep`:
  ```tsx
  value={{
    remindersEnabled: values.remindersEnabled,
    beforeDueEnabled: values.beforeDueEnabled,
    beforeDueAmount: values.beforeDueAmount,
    beforeDueUnit: values.beforeDueUnit,
    scheduledEnabled: values.scheduledEnabled,
    scheduledIntervalDays: values.scheduledIntervalDays,
    scheduledTime: values.scheduledTime,
  }}
  amountInput={amountInput}
  onChange={(patch) => onPatch(patch)}
  onAmountInputChange={onAmountInputChange}
  onApply={(next) => onApply(next)}
  ```
- Keep `BottomSheet`, `onOpenChange`, footer and headers unchanged.

- [ ] **Step 12: Wire `stepDraft` into the composer**

In `app/components/tasks/quick-add/quick-add-composer.tsx`:

- Add selectors:
  ```ts
  const stepDraft = useQuickAddStore((state) => state.stepDraft);
  const patchStepDraft = useQuickAddStore((state) => state.patchStepDraft);
  const applyStep = useQuickAddStore((state) => state.applyStep);
  const remindersAmountInput = useQuickAddStore(
    (state) => state.remindersAmountInput,
  );
  const setRemindersAmountInput = useQuickAddStore(
    (state) => state.setRemindersAmountInput,
  );
  ```
- Remove `handleLabelsApply`, `handlePriorityApply`, `handleDueApply`,
  `handleRemindersApply`.
- Add:
  ```ts
  function handleApplyStep(patch: Partial<QuickTaskDraft>) {
    applyStep(patch);
    haptics.selection();
  }
  ```
- Render:
  ```tsx
  <QuickAddDetailSheet
    amountInput={remindersAmountInput}
    isLabelsError={labelsQuery.isError}
    isLabelsLoading={labelsQuery.isLoading}
    labels={labels}
    now={now}
    onAmountInputChange={setRemindersAmountInput}
    onApply={handleApplyStep}
    onClose={closeDetail}
    onPatch={patchStepDraft}
    onRetryLabels={() => {
      void labelsQuery.refetch();
    }}
    step={activeStep}
    timeZone={timeZone}
    values={stepDraft ?? draft}
  />
  ```
- Ensure `handleOpenDetail` still only calls `openStep(step)` plus haptics/blur/focus; `openStep` owns `now` and the due-date clamp.
- Keep `resetDraft()` and the `404` `pruneLabelIds` behavior from Task 2.

- [ ] **Step 13: Run targeted tests and typecheck**

Run:
`npm test -- app/components/tasks/quick-add/labels-step.test.ts app/components/tasks/quick-add/priority-step.test.ts app/components/tasks/quick-add/due-step.test.ts app/components/tasks/quick-add/reminders-step.test.ts app/components/tasks/quick-add/quick-add-detail-sheet.test.ts app/components/tasks/quick-add/quick-add-store.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 14: Commit (only if the user allowed commits)**

```bash
git add app/components/tasks/quick-add/labels-step.tsx \
  app/components/tasks/quick-add/labels-step.test.ts \
  app/components/tasks/quick-add/priority-step.tsx \
  app/components/tasks/quick-add/priority-step.test.ts \
  app/components/tasks/quick-add/due-step.tsx \
  app/components/tasks/quick-add/due-step.test.ts \
  app/components/tasks/quick-add/reminders-step.tsx \
  app/components/tasks/quick-add/reminders-step.test.ts \
  app/components/tasks/quick-add/quick-add-detail-sheet.tsx \
  app/components/tasks/quick-add/quick-add-detail-sheet.test.ts \
  app/components/tasks/quick-add/quick-add-composer.tsx
git commit -m "refactor(tasks): control quick add steps with zustand"
```

---

### Task 4: Documentation and verification

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update AGENTS.md**

- Section 2: add `quick-add-store.ts` and `quick-add-store-provider.tsx` to the quick-add structure.
- Section 3: replace the sentence «Сейчас стора нет; не создавать «заготовку ради заготовки»» with the new rule: `QuickAddComposer` owns a per-composer vanilla Zustand store via context; `draft`, `activeStep`, `stepDraft`, `remindersAmountInput`, `now`, `error` live there; RHF remains the form handler/validator; no persistence and no module-level store.
- Section 7: add manual checks for draft persistence across detail open/close, step cancel, apply, reset after success, 404 label pruning, RHF submit after step apply.

Do not change auth, Telegram or error-page rules.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Typecheck and build**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Verify SSR and 404**

Run:

```bash
npm run build && PORT=3000 npm start
curl -s http://localhost:3000/
curl -i http://localhost:3000/does-not-exist
```

Expected: SSR response contains only the auth/loading screen and no quick-add form; the unknown URL returns HTTP `404` with the 404 screen and bottom navigation.

- [ ] **Step 5: Manual browser/TMA checks**

Verify:

1. typing updates the counter and enables submit; store state survives opening/closing a detail;
2. each chip opens the correct detail; changing a step does not update the chip until apply;
3. overlay/Escape/«назад»/«Закрыть» discard the step edits; apply commits and returns focus to the chip;
4. due date in the past clamps to today when the due step opens;
5. reminders amount can be cleared, stays empty, and disables apply;
6. successful submit clears the form, closes the step and revalidates the home screen;
7. submit after step apply sends the applied values;
8. `404` label refetch removes missing labels from the form and from an open labels step;
9. light/dark, 320/412/448px, keyboard and safe-area are intact.

- [ ] **Step 6: Commit (only if the user allowed commits)**

```bash
git add AGENTS.md docs/specs/2026-11-06-quick-add-zustand
git commit -m "docs: document quick add zustand state"
```

---

## Self-Review

- **Spec coverage:** FR-1/FR-2 — Task 1; FR-3 — Task 2; FR-4 — Task 3; FR-5 — Task 2 (reset/error) + Task 3 (apply/404 step cleanup); FR-6 — preserved in Task 2/3; verification — Task 4.
- **Step scan:** every step names files, exact signatures, test assertions or commands; no TBD or «handle edge cases».
- **Type consistency:** `QuickAddStoreState` names match across tasks; `DueStepValue` is reused; `QuickAddDetailSheetProps` matches the composer call; `ReminderDraft` fields are all keys of `QuickTaskDraft`.
- **Review Focus coverage:** RHF sync — Task 2 test renders from `draft` + Task 4 manual check; step cancel — Task 1 store test; empty amount — Task 3 test; due clamp — Task 1 store test; SSR/instance isolation — Task 1 two-instance test + Task 4 build.
- **Proportion:** tasks describe decisions and tests, not full component bodies; only the non-obvious `Controller`, step mappings and store semantics are spelled out.
