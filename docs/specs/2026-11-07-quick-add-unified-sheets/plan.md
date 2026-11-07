# Quick-add Unified Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести шторки «Метки», «Проект», «Приоритет задачи» и «Автонапоминания» к тому же полноэкранному сценарию, что и «Дата и время задачи».

**Architecture:** `QuickAddDetailSheet` всегда включает у `BottomSheet` режимы `expanded`, `showCloseButton` и `swipeToClose` и не передаёт footer. Четыре шага получают `flex flex-1 flex-col` и обёртку `mt-auto pt-[15px]` вокруг основной кнопки, чтобы действие прижималось к низу панели при коротком контенте.

**Tech Stack:** React 19, TypeScript 5.9 (strict), Tailwind CSS 4, Motion, Vitest.

**Spec:** `docs/specs/2026-11-07-quick-add-unified-sheets/spec.md`

## Global Constraints

- Только токены `app-*`; не добавлять `dark:`-классы и хардкод цветов Telegram.
- Не менять `BottomSheet`, `Modal`, `SheetHeader`, голосовую шторку и её footer.
- Не менять данные, React Query, API, payload и содержимое шагов.
- TypeScript strict, без `any`; типы — через `import type`.
- Файлы — `kebab-case`, компоненты — `PascalCase`, алиас `~/`.
- Тесты — Vitest; линтера в проекте нет, `npm run lint` не добавлять.
- Не коммитить: пользователь не давал явного разрешения на коммит.
- Не запускать dev-сервер и не менять `.env`.

## Review Focus

- Все пять шагов (`labels`, `project`, `priority`, `due`, `reminders`) должны получать одинаковые флаги `BottomSheet`; забытый шаг — блокирующий дефект.
- Кнопка действия при коротком контенте должна быть у нижнего края панели (`mt-auto`), а не сразу под списком.
- Длинный контент не должен ломать прокрутку: свайп закрытия при scrollable body начинается только с шапки.
- Закрытие без применения не должно менять черновик; существующая семантика сохраняется.
- Голосовая шторка не должна потерять нижнюю кнопку «Закрыть» из-за удаления `footer` у detail sheet.

---

### Task 1: Unified quick-add detail sheets

**Files:**
- Modify: `app/components/tasks/quick-add/quick-add-detail-sheet.tsx`
- Modify: `app/components/tasks/quick-add/labels-step.tsx`
- Modify: `app/components/tasks/quick-add/project-step.tsx`
- Modify: `app/components/tasks/quick-add/priority-step.tsx`
- Modify: `app/components/tasks/quick-add/reminders-step.tsx`
- Test: `app/components/tasks/quick-add/quick-add-detail-sheet.test.ts`
- Test: `app/components/tasks/quick-add/labels-step.test.ts`
- Test: `app/components/tasks/quick-add/project-step.test.ts`
- Test: `app/components/tasks/quick-add/priority-step.test.ts`
- Test: `app/components/tasks/quick-add/reminders-step.test.ts`
- Modify: `AGENTS.md`
- Modify: `docs/specs/2026-11-06-inline-quick-add/spec.md`
- Modify: `docs/specs/2026-11-06-quick-add-project/spec.md`

**Interfaces:**
- Consumes: существующие `BottomSheet` props `expanded`, `showCloseButton`, `swipeToClose`, `footer`; существующие `BottomSheetPrimaryAction` и `SheetHeader`.
- Produces: без новых экспортов и сигнатур; меняется только разметка шагов и передаваемые props.

- [ ] **Step 1: Update the detail-sheet test to require the unified mode for every step**

Replace the last two tests in `quick-add-detail-sheet.test.ts` with a
parameterized test:

```ts
import { QUICK_ADD_DETAIL_STEPS } from "./quick-add-step";

it.each(QUICK_ADD_DETAIL_STEPS)(
  "opens the %s step as an expanded swipeable sheet with a close button and no footer",
  (step) => {
    render(step);

    expect(sheet.expanded).toBe(true);
    expect(sheet.swipeToClose).toBe(true);
    expect(sheet.showCloseButton).toBe(true);
    expect(sheet.footer).toBeNull();
  },
);
```

Keep the existing "does not render a back button" test. Keep the
hoisted `sheet` shape and `BottomSheet` mock; `BottomSheetAction` may stay
mocked (it is no longer expected to be rendered).

- [ ] **Step 2: Run the detail-sheet test to verify it fails**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-detail-sheet.test.ts`
Expected: FAIL for `labels`, `project`, `priority`, `reminders` because
`expanded`, `swipeToClose` and `showCloseButton` are `false` and `footer`
is not `null`.

- [ ] **Step 3: Unify `QuickAddDetailSheet`**

In `quick-add-detail-sheet.tsx`:

- Change the import to
  `import { BottomSheet } from "~/components/ui/bottom-sheet";`
  (drop `BottomSheetAction`).
- Remove `const isDueStep = step === "due";`.
- Pass `expanded`, `showCloseButton` and `swipeToClose` unconditionally
  (without `= {true}`; boolean shorthand).
- Remove the `footer` prop entirely.

The resulting `<BottomSheet>` opening tag must contain exactly these
props among the existing ones:

```tsx
<BottomSheet
  bodyClassName="p-[15px]"
  expanded
  onOpenChange={(open) => {
    if (!open) {
      onClose();
    }
  }}
  open={step !== null}
  panelAnimateLayout
  showCloseButton
  swipeToClose
  title={step ? getQuickAddHeader(step).title : ""}
>
```

- [ ] **Step 4: Run the detail-sheet test to verify it passes**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-detail-sheet.test.ts`
Expected: PASS.

- [ ] **Step 5: Add failing layout assertions to the four step tests**

In each of `labels-step.test.ts`, `project-step.test.ts`,
`priority-step.test.ts` and `reminders-step.test.ts`, add one test:

```ts
it("fills the expanded sheet and pins the apply action to the bottom", () => {
  const html = render();

  expect(html).toContain("flex flex-1 flex-col");
  expect(html).toContain("mt-auto pt-[15px]");
});
```

Use the existing local `render()` helper and its default props.
`priority-step.test.ts` has no helper, so create the same markup with
`renderToStaticMarkup(createElement(PriorityStep, { ... }))` as in its
other tests.

- [ ] **Step 6: Run the four step tests to verify they fail**

Run: `npx vitest run app/components/tasks/quick-add/labels-step.test.ts app/components/tasks/quick-add/project-step.test.ts app/components/tasks/quick-add/priority-step.test.ts app/components/tasks/quick-add/reminders-step.test.ts`
Expected: FAIL — the new classes are absent.

- [ ] **Step 7: Update the four step components**

In `labels-step.tsx`, `project-step.tsx`, `priority-step.tsx` and
`reminders-step.tsx`:

- Change the root `<div className="flex flex-col">` to
  `<div className="flex flex-1 flex-col">`.
- Replace each `<BottomSheetPrimaryAction className="mt-[15px]" ...>` with:

```tsx
<div className="mt-auto pt-[15px]">
  <BottomSheetPrimaryAction ...>
    Применить
  </BottomSheetPrimaryAction>
</div>
```

Keep all existing `onClick`, `disabled`, children, keys and surrounding
content unchanged.

- [ ] **Step 8: Run the four step tests to verify they pass**

Run: `npx vitest run app/components/tasks/quick-add/labels-step.test.ts app/components/tasks/quick-add/project-step.test.ts app/components/tasks/quick-add/priority-step.test.ts app/components/tasks/quick-add/reminders-step.test.ts`
Expected: PASS.

- [ ] **Step 9: Update the documentation**

In `AGENTS.md`, replace the paragraph about sheet headers with a rule
covering all quick-add detail sheets:

```text
- Шапка шторки — общий `SheetHeader` внутри `BottomSheet`: back, заголовок,
  разделитель и опциональный крестик закрытия (`showCloseButton`). Все шторки
  деталей быстрого создания («Метки», «Проект», «Приоритет», «Дата и время»,
  «Автонапоминания») разворачиваются через `BottomSheet expanded`, показывают
  крестик в шапке, закрываются оверлеем, Escape, крестиком и свайпом вниз;
  нижней кнопки «Закрыть» у них нет. При прокручиваемом контенте свайп
  начинается только с шапки, чтобы не ломать скролл; кнопка
  «Применить»/«Готово» прижата к низу панели через `mt-auto`, а при длинном
  контенте находится в конце прокрутки. Закрытие без «Применить»/«Готово»
  отбрасывает неприменённые изменения шага, ранее применённые значения формы
  сохраняются. Панель шторки деталей использует `panelAnimateLayout`;
  переходов между шагами больше нет.
```

In `docs/specs/2026-11-06-inline-quick-add/spec.md` FR-3, add one note
above the bullet list:

```text
> Примечание (2026-11-07): поведение шапки, крестика и нижней кнопки
> «Закрыть» заменено спецификацией
> `docs/specs/2026-11-07-quick-add-unified-sheets/spec.md`.
```

In `docs/specs/2026-11-06-quick-add-project/spec.md` FR-2, add one note
above the bullet list:

```text
> Примечание (2026-11-07): шапка и закрытие шторки заменены спецификацией
> `docs/specs/2026-11-07-quick-add-unified-sheets/spec.md`.
```

Do not rewrite the rest of those historical specs.

- [ ] **Step 10: Run the full verification**

Run, in order:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests pass, typecheck is clean, build succeeds.

- [ ] **Step 11: Do not commit; report working-tree changes**

Leave the changes uncommitted. In the report, list every changed file and
the exact verification commands with their outcomes.
