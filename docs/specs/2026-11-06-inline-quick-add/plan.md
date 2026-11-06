# Inline Quick Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести форму быстрого создания задачи из модалки на главный экран, оставить модальными только настройки деталей, добавить закрытие модалок по overlay и убрать нижние границы у строк времени и регулярности.

**Architecture:** `QuickAddComposer` — постоянный владелец `react-hook-form`, меток, мутации и состояния `activeDetail`. Он рендерит inline-секцию с `QuickAddForm` и отдельный `QuickAddDetailSheet` на существующем `BottomSheet`. Главный экран теряет `QuickAccessSection` и модалку формы; микрофон становится кнопкой в строке действий.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Tailwind CSS 4, Motion 14 (`motion/react`), react-hook-form 7, zod 4, React Query 5, Vitest.

**Spec:** `docs/specs/2026-11-06-inline-quick-add/spec.md`

## Global Constraints

- Новые зависимости не добавлять: `motion`, `react-hook-form`, `zod`, `@tanstack/react-query` уже установлены.
- Только токены `app-*`; `dark:`-классы и хардкод цветов Telegram не добавлять.
- API, `QuickTaskDraft`, zod-схема, payload и `describeQuickAddError` не меняются.
- Метки только читаются (`GET /labels`); создания/редактирования меток нет.
- Overlay-клик закрывает модалку детали и трактуется как отмена неприменённых изменений шага.
- Крестик X в шапке не возвращается; нижняя кнопка «Закрыть» и кнопка «назад» сохраняются.
- Форма быстрого создания всегда находится на главной и не открывается модалкой.
- Одновременно открыта только одна модалка: голос или деталь.
- `QuickAccessSection` больше не рендерится; «Голосом» доступен через кнопку микрофона.
- Файлы — kebab-case, компоненты — PascalCase, алиас `~/`, типы — `import type`.
- Нет доступа к `window`/`document` на верхнем уровне модулей.
- Несохранённые изменения `app/assets/icons/calendar.svg`, `tag.svg`, `tag-plus.svg` не откатывать и не перезаписывать.
- Тесты — Vitest, файлы `app/**/*.test.ts`; компонентные тесты — `createElement` + `renderToStaticMarkup`.
- Линтера в проекте нет; `npm run lint` не добавлять.
- Проверки перед завершением: `npm test`, `npm run typecheck`, `npm run build`.
- Коммиты выполнять только по явному разрешению пользователя; шаги Commit ниже условные.

## Review Focus

- **Сохранение черновика.** Открытие/закрытие модалки детали не должно сбрасывать `useForm`; сброс — только после успешной отправки. Проверка — Task 2 (код) и Task 3 (ручной сценарий).
- **Отмена шага.** Overlay, Escape, «назад» и «Закрыть» не применяют локальные правки шага и не теряют ранее применённые значения. Автотеста нет из-за SSR-only `Modal`; ручная проверка — Task 3.
- **Фокус после закрытия.** После закрытия модалки фокус возвращается на чип, который её открыл, а не на body. Автотеста нет; ручная проверка — Task 3.
- **Границы даты и времени.** У строк «Время» и «Регулярная задача» нет `border-b`, разделитель над временем остался; проверка — Task 1.
- **Малый viewport и клавиатура.** На 320px и при открытой клавиатуре inline-форма, чипы и кнопки не дают горизонтального скролла страницы и не перекрываются нижней навигацией. Проверка — Task 3.
- **Совместимость модалок.** Голос и деталь не открываются одновременно; метки не запрашиваются повторно при каждом открытии детали. Проверка — Task 2 (код) и Task 3 (ручной сценарий).

---

## File Structure

**Create**

```text
app/components/tasks/quick-add/
  quick-add-composer.tsx
  quick-add-detail-sheet.tsx
```

**Modify**

```text
app/routes/home.tsx
app/components/tasks/quick-add/quick-add-form.tsx
app/components/tasks/quick-add/quick-add-chips.tsx
app/components/tasks/quick-add/quick-add-step.ts
app/components/tasks/quick-add/due-step.tsx
AGENTS.md
```

**Delete**

```text
app/components/tasks/quick-add/quick-add-sheet.tsx
app/components/home/quick-access-section.tsx
```

**Tests**

```text
app/components/tasks/quick-add/due-step.test.ts
app/components/tasks/quick-add/quick-add-form.test.ts
app/components/tasks/quick-add/quick-add-chips.test.ts
app/components/tasks/quick-add/quick-add-step.test.ts
```

---

### Task 1: Due date/time row borders

**Files:**
- Modify: `app/components/tasks/quick-add/due-step.tsx:80-96`
- Test: `app/components/tasks/quick-add/due-step.test.ts`

**Interfaces:**
- Consumes: `Calendar`, `TimeInput`, `Switch`, `BottomSheetPrimaryAction`, `formatDueHint`, `getZonedNow`, `isValidTime`.
- Produces: unchanged `DueStep` props and `DueStepValue`; only row wrappers change.

- [ ] **Step 1: Write the failing border test**

```ts
it("keeps the divider above time and removes bottom borders", () => {
  const html = render();

  expect(html).toContain("border-t border-app-stroke");
  expect(html).not.toContain("border-b");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- app/components/tasks/quick-add/due-step.test.ts`
Expected: FAIL — `border-t border-app-stroke` not found.

- [ ] **Step 3: Update the DueStep rows**

Wrap the time row in a block with `mt-[15px] border-t border-app-stroke pt-[17px]`. Keep the inner row `flex min-h-11 items-center justify-between gap-[15px]` without `border-b`. Put the «Укажите время» helper inside the same wrapper.

Give the recurring row `mt-[15px] flex min-h-[50px] items-center justify-between gap-[15px]` without `border-b`.

Do not change the calendar, hint, `Готово`, `onApply` or `onToggleHaptic`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- app/components/tasks/quick-add/due-step.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit (only if the user allowed commits)**

```bash
git add app/components/tasks/quick-add/due-step.tsx \
  app/components/tasks/quick-add/due-step.test.ts
git commit -m "fix(tasks): remove due row bottom borders"
```

---

### Task 2: Inline quick-add composer and detail modal

**Files:**
- Create: `app/components/tasks/quick-add/quick-add-composer.tsx`
- Create: `app/components/tasks/quick-add/quick-add-detail-sheet.tsx`
- Modify: `app/components/tasks/quick-add/quick-add-form.tsx`
- Modify: `app/components/tasks/quick-add/quick-add-chips.tsx`
- Modify: `app/components/tasks/quick-add/quick-add-step.ts`
- Modify: `app/routes/home.tsx`
- Delete: `app/components/tasks/quick-add/quick-add-sheet.tsx`
- Delete: `app/components/home/quick-access-section.tsx`
- Test: `app/components/tasks/quick-add/quick-add-form.test.ts`
- Test: `app/components/tasks/quick-add/quick-add-chips.test.ts`
- Test: `app/components/tasks/quick-add/quick-add-step.test.ts`

**Interfaces:**
- Consumes: `useQuickTaskForm`, `useCreateQuickTask`, `fetchLabels`, `pruneMissingLabelIds`, `describeQuickAddError`, `QuickAddForm`-поля, `LabelsStep`, `PriorityStep`, `DueStep`, `RemindersStep`, `BottomSheet`, `BottomSheetAction`, `SectionHeading`, `MicIcon`.
- Produces:
  - `type QuickAddStep = "labels" | "priority" | "due" | "reminders"`
  - `const QUICK_ADD_DETAIL_STEPS: readonly QuickAddStep[]`
  - `getQuickAddHeader(step: QuickAddStep): { title: string }`
  - `QuickAddFormProps` adds `onVoice: () => void`
  - `QuickAddComposer({ onVoice }: { onVoice: () => void }): ReactElement`
  - `QuickAddDetailSheetProps`:
    ```ts
    interface QuickAddDetailSheetProps {
      step: QuickAddStep | null;
      values: QuickTaskDraft;
      labels: LabelResponse[];
      isLabelsLoading: boolean;
      isLabelsError: boolean;
      onRetryLabels: () => void;
      now: Date;
      timeZone: string;
      onClose: () => void;
      onApplyLabels: (ids: number[]) => void;
      onApplyPriority: (priority: Priority) => void;
      onApplyDue: (value: DueStepValue) => void;
      onApplyReminders: (value: ReminderDraft) => void;
    }
    ```

- [ ] **Step 1: Write the failing form test**

Replace the existing `QuickAddForm` assertion with a test that uses `onVoice` and checks the inline layout:

```ts
it("renders the inline Figma form with counter, mic and no description", () => {
  const html = renderToStaticMarkup(createElement(Harness));

  expect(html).toContain('class="flex flex-col gap-[10px]"');
  expect(html).toContain("0/120");
  expect(html).toContain("Запись к стоматологу завтра в 10 утра");
  expect(html).toContain('aria-label="Название задачи"');
  expect(html).toContain('aria-label="Записать голосом"');
  expect(html).toContain("Добавить задачу");
  expect(html).not.toContain("Введите быструю задачу");
  expect(html).not.toContain(">Название<");
  expect(html).toContain("h-[104px]");
  expect(html).toContain("focus-within:outline-2");
});
```

The `Harness` passes `onVoice: () => {}` and the existing form props.

- [ ] **Step 2: Write the failing chips test**

Allow `render` to accept overrides and add:

```ts
it("uses the home menu spacing and compact icons", () => {
  const html = render();

  expect(html).toContain("gap-[5px]");
  expect(html).toContain("size-[18px]");
  expect(html).toContain("size-6");
});

it("uses the compact repeat icon when recurring", () => {
  const html = render({ isRecurring: true });

  expect(html).toContain("size-[15px]");
});
```

- [ ] **Step 3: Write the failing detail-step test**

Replace `quick-add-step.test.ts` with:

```ts
import { describe, expect, it } from "vitest";

import { QUICK_ADD_DETAIL_STEPS, getQuickAddHeader } from "./quick-add-step";

describe("quick add details", () => {
  it("contains only the four detail steps", () => {
    expect(QUICK_ADD_DETAIL_STEPS).toEqual([
      "labels",
      "priority",
      "due",
      "reminders",
    ]);
  });

  it("keeps the exact detail titles", () => {
    expect(getQuickAddHeader("labels").title).toBe("Метки");
    expect(getQuickAddHeader("priority").title).toBe("Приоритет задачи");
    expect(getQuickAddHeader("due").title).toBe("Дата и время задачи");
    expect(getQuickAddHeader("reminders").title).toBe("Автонапоминания");
  });
});
```

- [ ] **Step 4: Run the targeted tests to verify they fail**

Run: `npm test -- app/components/tasks/quick-add/quick-add-form.test.ts app/components/tasks/quick-add/quick-add-chips.test.ts app/components/tasks/quick-add/quick-add-step.test.ts`
Expected: FAIL — inline layout, new chips classes and `QUICK_ADD_DETAIL_STEPS` are missing.

- [ ] **Step 5: Reduce `QuickAddStep` to detail steps**

In `quick-add-step.ts` export:

```ts
export type QuickAddStep = "labels" | "priority" | "due" | "reminders";

export const QUICK_ADD_DETAIL_STEPS: readonly QuickAddStep[] = [
  "labels",
  "priority",
  "due",
  "reminders",
];

export interface QuickAddHeader {
  title: string;
}

export function getQuickAddHeader(step: QuickAddStep): QuickAddHeader;
```

Remove `"form"` and `showBack`. In `quick-add-chips.tsx` set `QuickAddChipStep = QuickAddStep`.

- [ ] **Step 6: Implement the inline `QuickAddForm`**

- Root form: `flex flex-col gap-[10px]`.
- Remove the explanation paragraph and the visible «Название» row.
- Field wrapper: `relative h-[104px] w-full rounded-[25px] border border-app-stroke bg-app-card focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-app-accent`.
- Textarea: `h-full w-full resize-none rounded-[25px] bg-transparent px-[15px] py-[12px] pb-[30px] pr-[60px] text-[15px] leading-[1.3] text-app-text placeholder:text-app-text focus-visible:outline-none`, `aria-label="Название задачи"`, `maxLength=120`, exact placeholder.
- Counter: `pointer-events-none absolute bottom-[12px] right-[15px] text-[13px] leading-[1.4] text-app-text-secondary`, text `{title.length}/120`.
- Keep `QuickAddChips` directly under the field.
- Error block stays above the action row.
- Action row: `flex items-center gap-[10px]`; wrap the existing `BottomSheetPrimaryAction` in `min-w-0 flex-1`; add a `type="button"` microphone button `size-[50px] shrink-0 rounded-full border border-app-stroke bg-app-card text-app-accent` with `aria-label="Записать голосом"`, `onClick={onVoice}`, and `<MicIcon className="size-[25px]" />`.
- Remove `descriptionId` from `QuickAddFormProps`.

- [ ] **Step 7: Align `QuickAddChips` with the home frame**

- Container: `flex gap-[5px] overflow-x-auto pb-1 ...`.
- Date icon `size-[18px]`; repeat end icon `size-[15px]`.
- Selected label tag icon `size-[18px]`; empty `tag-plus` stays `size-6`.
- Priority and reminder chips stay text-only.

- [ ] **Step 8: Create `QuickAddDetailSheet`**

Implement the props from the Interfaces block. Render one `BottomSheet`:

```ts
<BottomSheet
  bodyClassName="p-[15px]"
  footer={<BottomSheetAction onClick={onClose}>Закрыть</BottomSheetAction>}
  onBack={onClose}
  onOpenChange={(open) => {
    if (!open) {
      onClose();
    }
  }}
  open={step !== null}
  panelAnimateLayout
  title={step ? getQuickAddHeader(step).title : ""}
>
  {step === "labels" ? <LabelsStep ... /> : null}
  {step === "priority" ? <PriorityStep ... /> : null}
  {step === "due" ? <DueStep ... /> : null}
  {step === "reminders" ? <RemindersStep ... /> : null}
</BottomSheet>
```

Do not pass `closeOnOverlayClick={false}`; `Modal` defaults to `true`. Do not render a form step.

- [ ] **Step 9: Create `QuickAddComposer`**

State and ownership:

```ts
const [activeDetail, setActiveDetail] = useState<QuickAddStep | null>(null);
const [now, setNow] = useState(() => new Date());
const [error, setError] = useState<string | null>(null);
const form = useQuickTaskForm({ now, timeZone });
const values = form.watch();
const labelsQuery = useQuery({
  queryKey: ["labels"],
  queryFn: ({ signal }) => fetchLabels(signal),
  enabled: true,
});
```

Keep the existing create mutation behavior from `QuickAddSheet`: success haptic, `resetToDefaults()`, `setError(null)`, `setNow(new Date())`, `revalidate()`, `["tasks"]`/`["task-series"]` invalidation; error copy and 404 label pruning.

Interaction:

- `handleOpenDetail(step)`: `blurActiveElement()`, store `pendingChipFocusRef.current = step`, refresh `now` for `"due"`, set `activeDetail`.
- `closeDetail()`: `haptics.selection()`, `setActiveDetail(null)`.
- Apply handlers: `form.setValue(...)`, `haptics.selection()`, `setActiveDetail(null)`.
- Focus effect: when `activeDetail === null` and a pending chip exists, clear it and focus the chip in `requestAnimationFrame`.
- Render `<section aria-labelledby="quick-add-title" className="flex flex-col gap-[10px] pt-[15px]">`, `SectionHeading` with text `Быстрое создание задачи`, `QuickAddForm`, and `QuickAddDetailSheet`.
- Pass `onVoice` through to `QuickAddForm`.

- [ ] **Step 10: Update the home screen**

- Import `QuickAddComposer`.
- Remove `QuickAccessSection` and `QuickAddSheet` imports/render.
- Change `activeModal` to `"voice" | null`.
- Render `<QuickAddComposer onVoice={...} />` between `DailyProgressCard` and `FaqSection`.
- The voice handler calls `haptics.impact("light")` and sets `activeModal="voice"`.
- Keep `VoiceRecorderSheet` and the bottom navigation unchanged.

- [ ] **Step 11: Delete obsolete components**

Delete `quick-add-sheet.tsx` and `quick-access-section.tsx`. Confirm no imports remain with `rg "QuickAddSheet|QuickAccessSection|quick-add-sheet|quick-access-section" app`.

- [ ] **Step 12: Run targeted tests and typecheck**

Run: `npm test -- app/components/tasks/quick-add/quick-add-form.test.ts app/components/tasks/quick-add/quick-add-chips.test.ts app/components/tasks/quick-add/quick-add-step.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 13: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 14: Commit (only if the user allowed commits)**

```bash
git add app/components/tasks/quick-add app/routes/home.tsx \
  app/components/home/quick-access-section.tsx
git commit -m "feat(tasks): move quick add form to home"
```

---

### Task 3: Documentation and verification

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update AGENTS.md**

Reflect the new behavior:

- section 3: quick task creation starts from the inline composer on the home screen; detail steps are modal;
- section 5: detail sheets close via overlay, «назад», «Закрыть» and Escape; overlay-close discards unapplied step changes;
- section 7: add manual checks for inline form at 320px, overlay close, focus return to chip, voice/detail modal exclusivity.

Do not change the auth, Telegram or error-page rules.

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

Expected: SSR response contains only the auth/loading screen and no inline quick-add form; the unknown URL returns HTTP `404` with the 404 screen and bottom navigation.

- [ ] **Step 5: Manual Telegram/browser checks**

Verify:

1. inline form is between the progress card and FAQ; no «Быстрый доступ»;
2. typing shows the counter inside the field; the submit button enables;
3. each chip opens the correct detail sheet;
4. «Применить»/«Готово» updates the chip, closes the sheet and returns focus to the chip;
5. overlay, Escape, «назад» and «Закрыть» close the sheet without applying step edits; previously applied values remain;
6. «Дата и время задачи» has the divider above time and no bottom borders on time/recurring;
7. the microphone opens the voice sheet; voice and detail sheets are not open together;
8. successful submit clears the inline form and revalidates home;
9. light/dark, 320/412/448px, keyboard and safe-area are intact.

- [ ] **Step 6: Commit (only if the user allowed commits)**

```bash
git add AGENTS.md
git commit -m "docs: document inline quick add flow"
```

---

## Self-Review

- **Spec coverage:** FR-1/FR-3/FR-5/FR-6/FR-7 — Task 2; FR-2 — Task 2 steps 6–7; FR-4 — Task 1; visual/theme/accessibility — Task 1/2; manual verification — Task 3.
- **Placeholder scan:** no TBD or «handle edge cases» steps; every task names exact files, signatures and test assertions.
- **Type consistency:** `QuickAddStep` is detail-only; `QuickAddChipStep = QuickAddStep`; `QuickAddFormProps.onVoice` is required; `QuickAddDetailSheetProps` consumes the same `QuickAddStep` and `QuickTaskDraft`.
- **Review Focus coverage:** due borders — Task 1 test; form/layout — Task 2 tests; overlay/focus/draft persistence — manual checks in Task 3 because `Modal` renders `null` in the current SSR-only Vitest setup.
- **Proportion:** implementation details are signatures and values; no full component bodies beyond the small `BottomSheet` composition that pins the overlay/header contract.
