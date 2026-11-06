# Task Creation Modals Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести модалки быстрого создания задачи к Figma, убрать крестик из шапки, исправить рамку фокуса, запретить даты в прошлом, анимировать вложенные настройки напоминаний и сделать нижнюю шторку устойчивой к клавиатуре.

**Architecture:** `SheetHeader` теряет кнопку закрытия, `BottomSheet` получает keyboard-safe геометрию через `visualViewport`. В `app/components/ui/` появляется общий `Collapsible` на Motion, который используют мастер и вложенные блоки напоминаний. `DueStep` передаёт в календарь сегодняшнюю дату как `minDate`. Вёрстка главного шага и pill-полей правится по измерениям Figma без изменения API и модели формы.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Tailwind CSS 4, Motion 14 (`motion/react`), react-hook-form 7, zod 4, React Query 5, Vitest.

**Spec:** `docs/specs/2026-11-05-task-creation-modals-fixes/spec.md`

## Global Constraints

- Новые зависимости не добавлять: `motion`, `react-hook-form`, `zod`, `@tanstack/react-query` уже установлены.
- Motion импортировать только из `motion/react`; `MotionConfig reducedMotion="user"` уже стоит в `AppProviders`.
- Только токены `app-*`; `dark:`-классы и хардкод цветов Telegram не добавлять.
- API, `QuickTaskDraft`, zod-схема, payload и React Query-ключи не меняются.
- Ограничение дат в прошлом — UI-уровня; выбор времени в прошлом для сегодняшнего дня вне scope.
- Все фокусируемые элементы внутри тела шторки используют внутреннее кольцо фокуса: `focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent`.
- `cn()` не выполняет tailwind-merge: не наслаивать конфликтующие классы, задавать варианты через пропсы.
- Не откатывать и не перезаписывать несохранённые изменения `app/assets/icons/calendar.svg`, `tag.svg`, `tag-plus.svg`; не коммитить их без явного решения.
- Не добавлять доступ к `window`/`document`/`visualViewport` на верхнем уровне модулей.
- Все listeners и `requestAnimationFrame` очищаются при закрытии/unmount.
- Тесты — Vitest, `app/**/*.test.ts`; компонентные тесты — `createElement` + `renderToStaticMarkup`.
- Файлы — kebab-case, компоненты — PascalCase, алиас `~/`, типы — `import type`.
- Проверки перед завершением: `npm test`, `npm run typecheck`, `npm run build`.
- Коммитить только файлы задачи; не коммитить чужие несохранённые иконки.

## Review Focus

- **iOS и клавиатура.** `visualViewport` уменьшается, layout viewport — нет. Шторка должна подняться на `keyboardInset`, футер «Закрыть» и поле ввода остаться видимыми. Проверка — Task 6 (чистая функция) и ручная проверка в Telegram.
- **Android и `interactive-widget`.** Если layout viewport уже уменьшился, `keyboardInset` должен быть `0`, иначе шторка поднимется дважды. Проверка — Task 6.
- **Полночь и часовой пояс.** `minDate` календаря должен быть сегодняшней датой в `user.timezone`, а не UTC. Проверка — Task 5.
- **Фокус внутри `overflow-hidden`.** Кольцо фокуса должно быть видно со всех сторон у текстового поля, кнопок, чипов, Switch и календаря. Проверка — Task 3 и ручная проверка.
- **Быстрые переключения напоминаний.** Многократное включение/выключение мастера и вложенных правил не должно оставлять «призрачную» высоту или скрытый контент. Проверка — Task 2/4 и ручная проверка.
- **Закрытие без X.** Escape и нижняя «Закрыть» должны работать, focus trap и возврат фокуса не ломаются. Проверка — Task 1.

---

## File Structure

**Create**

```text
app/components/ui/collapsible.tsx
app/components/ui/collapsible.test.ts
app/lib/ui/viewport-metrics.ts
app/lib/ui/viewport-metrics.test.ts
app/hooks/use-keyboard-viewport.ts
app/components/tasks/quick-add/quick-add-chips.test.ts
app/components/tasks/quick-add/quick-add-form.test.ts
app/components/ui/time-input.test.ts
```

**Modify**

```text
app/components/ui/sheet-header.tsx
app/components/ui/sheet-header.test.ts
app/components/ui/bottom-sheet.tsx
app/components/ui/option-chip.tsx
app/components/ui/option-chip.test.ts
app/components/ui/switch.tsx
app/components/ui/time-input.tsx
app/components/ui/select-field.tsx
app/components/tasks/quick-add/quick-add-form.tsx
app/components/tasks/quick-add/quick-add-chips.tsx
app/components/tasks/quick-add/reminders-step.tsx
app/components/tasks/quick-add/reminders-step.test.ts
app/components/tasks/quick-add/calendar.tsx
app/components/tasks/quick-add/calendar.test.ts
app/components/tasks/quick-add/due-step.tsx
app/components/tasks/quick-add/due-step.test.ts
app/components/tasks/quick-add/labels-step.tsx
app/components/tasks/quick-add/priority-step.tsx
app/lib/tasks/date-time.ts
app/lib/tasks/date-time.test.ts
app/root.tsx
AGENTS.md
```

---

### Task 1: Убрать крестик из шапки

**Files:**
- Modify: `app/components/ui/sheet-header.tsx`
- Modify: `app/components/ui/sheet-header.test.ts`
- Modify: `app/components/ui/bottom-sheet.tsx:14-30`, `:80-85`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SheetHeader({ titleId, title, onBack?, backLabel? })`
  - `BottomSheetProps` без `showCloseButton`; `BottomSheet` больше не передаёт `onClose` в шапку.
  - Кнопка X и `CloseIcon` удалены; нижняя `BottomSheetAction` остаётся.

- [ ] **Step 1: Обновить тест шапки под отсутствие X**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SheetHeader } from "./sheet-header";

const noop = () => {};

describe("SheetHeader", () => {
  it("renders a centered title, divider and no close button", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Добавление задачи",
      }),
    );

    expect(html).toContain("Добавление задачи");
    expect(html).toContain("border-b");
    expect(html).toContain("left-1/2");
    expect(html).not.toContain('aria-label="Закрыть"');
    expect(html).not.toContain('aria-label="Назад"');
  });

  it("renders the back button when onBack is provided", () => {
    const html = renderToStaticMarkup(
      createElement(SheetHeader, {
        titleId: "title",
        title: "Метки",
        onBack: noop,
      }),
    );

    expect(html).toContain('aria-label="Назад"');
    expect(html).not.toContain('aria-label="Закрыть"');
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- app/components/ui/sheet-header.test.ts`
Expected: FAIL — `SheetHeader` принимает `onClose`/`closeLabel` и тест на отсутствие X не проходит.

- [ ] **Step 3: Удалить X из `SheetHeader`**

Удалить `onClose`, `closeLabel`, `CloseIcon` и правый блок кнопки. Интерфейс:

```ts
export interface SheetHeaderProps {
  titleId: string;
  title: string;
  onBack?: () => void;
  backLabel?: string;
}
```

Структура остаётся:

```tsx
<div className="relative flex h-[54px] shrink-0 items-center justify-between border-b border-app-stroke px-[15px]">
  {onBack ? (
    <button aria-label={backLabel} className={ICON_BUTTON_CLASSES} ...>
      <AssetIcon className="size-6" src={chevronLeftIcon} />
    </button>
  ) : (
    <span aria-hidden="true" className="size-6" />
  )}
  <h2
    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[17px] font-semibold leading-[1.4] text-app-text"
    id={titleId}
  >
    {title}
  </h2>
</div>
```

В `ICON_BUTTON_CLASSES` заменить `focus-visible:outline-app-accent` на
`focus-visible:-outline-offset-2 focus-visible:outline-app-accent`.

- [ ] **Step 4: Убрать `showCloseButton` из `BottomSheet`**

Удалить пропс из интерфейса, деструктуризации и вызов `onClose` в
`SheetHeader`. Больше не передавать `onClose` в шапку.

- [ ] **Step 5: Запустить тесты, typecheck и commit**

Run: `npm test -- app/components/ui/sheet-header.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/components/ui/sheet-header.tsx app/components/ui/sheet-header.test.ts \
  app/components/ui/bottom-sheet.tsx
git commit -m "fix(ui): remove close button from sheet header"
```

---

### Task 2: Примитив `Collapsible` для плавного раскрытия

**Files:**
- Create: `app/components/ui/collapsible.tsx`
- Test: `app/components/ui/collapsible.test.ts`

**Interfaces:**
- Consumes: `motion/react`, `cn`.
- Produces:

```ts
export interface CollapsibleProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  duration?: number;
}

export function Collapsible(props: CollapsibleProps): ReactElement;
```

- [ ] **Step 1: Написать падающий тест**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Collapsible } from "./collapsible";

describe("Collapsible", () => {
  it("renders children when open", () => {
    const html = renderToStaticMarkup(
      createElement(
        Collapsible,
        { open: true },
        createElement("p", null, "Настройки"),
      ),
    );

    expect(html).toContain("Настройки");
    expect(html).toContain("overflow-hidden");
  });

  it("does not render children when closed", () => {
    const html = renderToStaticMarkup(
      createElement(
        Collapsible,
        { open: false },
        createElement("p", null, "Настройки"),
      ),
    );

    expect(html).not.toContain("Настройки");
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- app/components/ui/collapsible.test.ts`
Expected: FAIL — module `./collapsible` not found.

- [ ] **Step 3: Реализовать `Collapsible`**

```tsx
import type { ReactElement, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "~/lib/cn";

export interface CollapsibleProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  duration?: number;
}

export function Collapsible({
  open,
  children,
  className,
  contentClassName,
  duration = 0.22,
}: CollapsibleProps): ReactElement {
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration, ease: "easeOut" as const };

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className={cn("overflow-hidden", className)}
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          key="content"
          transition={transition}
        >
          <div className={contentClassName}>{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Запустить тест и typecheck**

Run: `npm test -- app/components/ui/collapsible.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/collapsible.tsx app/components/ui/collapsible.test.ts
git commit -m "feat(ui): add animated collapsible primitive"
```

---

### Task 3: Внутреннее кольцо фокуса, главный шаг и чипы

**Files:**
- Modify: `app/components/tasks/quick-add/quick-add-form.tsx:52-65`
- Modify: `app/components/tasks/quick-add/quick-add-chips.tsx:1-109`
- Modify: `app/components/ui/option-chip.tsx`
- Modify: `app/components/ui/option-chip.test.ts`
- Modify: `app/components/ui/bottom-sheet.tsx:100-135`
- Modify: `app/components/ui/switch.tsx:25-27`
- Modify: `app/components/ui/time-input.tsx:25-27`
- Modify: `app/components/ui/select-field.tsx:239-248`, `:282-286`
- Modify: `app/components/tasks/quick-add/calendar.tsx:59-60`, `:134-136`
- Modify: `app/components/tasks/quick-add/labels-step.tsx:13-14`, `:121-124`
- Modify: `app/components/tasks/quick-add/priority-step.tsx:32-34`
- Test: `app/components/tasks/quick-add/quick-add-chips.test.ts`
- Test: `app/components/tasks/quick-add/quick-add-form.test.ts`

**Interfaces:**
- Consumes: `OptionChip`, `QuickAddChips`, `QuickTaskDraft`.
- Produces:
  - `OptionChipProps` с `icon?: ReactNode`, `iconGap?: "tight" | "default"`.
  - `OptionChip` без иконки рендерит только label; `iconGap="tight"` → `gap-[2px]`, иначе `gap-[5px]`.
  - `QuickAddChips` больше не импортирует `flag.svg` и `clock.svg`.
  - Все контролы формы используют `focus-visible:-outline-offset-2`.

- [ ] **Step 1: Написать падающий тест чипов**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuickAddChips } from "./quick-add-chips";

function render() {
  return renderToStaticMarkup(
    createElement(QuickAddChips, {
      labels: [],
      now: new Date("2026-11-05T13:07:42Z"),
      timeZone: "Europe/Moscow",
      selectedLabelIds: [],
      priority: "important_not_urgent",
      dueDate: "2026-11-05",
      dueTime: "16:00",
      isRecurring: false,
      remindersEnabled: true,
      beforeDueEnabled: true,
      scheduledEnabled: false,
      onOpenStep: () => {},
    }),
  );
}

describe("QuickAddChips", () => {
  it("renders date, labels, priority and reminder chips without extra icons", () => {
    const html = render();

    expect(html).toContain("Сегодня, 16:00");
    expect(html).toContain("P2");
    expect(html).toContain("Напоминание");
    expect(html).toContain("calendar.svg");
    expect(html).not.toContain("flag.svg");
    expect(html).not.toContain("clock.svg");
  });
});
```

- [ ] **Step 2: Написать падающий тест главного шага**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { createQuickTaskDefaults } from "~/lib/tasks/quick-task-schema";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";

import { QuickAddForm } from "./quick-add-form";

function Harness() {
  const form = useForm<QuickTaskDraft>({
    defaultValues: createQuickTaskDefaults(
      new Date("2026-11-05T13:07:42Z"),
      "Europe/Moscow",
    ),
  });

  return createElement(QuickAddForm, {
    form,
    labels: [],
    now: new Date("2026-11-05T13:07:42Z"),
    timeZone: "Europe/Moscow",
    onOpenStep: () => {},
    onSubmit: () => {},
    isPending: false,
    error: null,
  });
}

describe("QuickAddForm", () => {
  it("uses Figma label insets, field gap and inset focus ring", () => {
    const html = renderToStaticMarkup(createElement(Harness));

    expect(html).toContain('class="flex flex-col gap-[5px]"');
    expect(html).toContain(
      'class="flex items-center justify-between gap-[10px] px-[15px] text-[15px]"',
    );
    expect(html).toMatch(/<textarea[^>]*class="[^"]*-outline-offset-2/);
    expect(html).toContain("Добавить задачу");
  });
});
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npm test -- app/components/tasks/quick-add/quick-add-chips.test.ts app/components/tasks/quick-add/quick-add-form.test.ts`
Expected: FAIL — в чипах есть `flag.svg`/`clock.svg`, в форме нет нужных классов.

- [ ] **Step 4: Обновить `OptionChip`**

- Сделать `icon` опциональным.
- Добавить `iconGap?: "tight" | "default"`.
- Внутренний gap: `iconGap === "tight" ? "gap-[2px]" : "gap-[5px]"`.
- Ограничить кнопку `max-w-[200px]`, текст — `min-w-0 truncate`.
- Заменить `focus-visible:outline-offset-2` на `focus-visible:-outline-offset-2`.
- Не менять active/inactive цвета и `aria-haspopup="dialog"`.

- [ ] **Step 5: Обновить `QuickAddChips`**

- Удалить импорты `flag.svg` и `clock.svg`.
- Дата: `icon={<AssetIcon className="size-6" src={calendarIcon} />}`, `iconGap="tight"`.
- Метки: `icon={labelsIcon}` без изменения, `iconGap` по умолчанию.
- Приоритет: без `icon`, `label={priorityShortLabel(priority)}`, `className="w-[45px] justify-center px-[10px] text-center"`.
- Напоминание: без `icon`, `label="Напоминание"`.
- Оставить active-условие напоминаний и refs.

- [ ] **Step 6: Поправить главный шаг**

В `quick-add-form.tsx`:

```tsx
<div className="flex flex-col gap-[5px]">
  <div className="flex items-center justify-between gap-[10px] px-[15px] text-[15px]">
    <span className="text-app-text">Название</span>
    <span className="text-app-text-secondary">
      {title.length}/{TITLE_MAX_LENGTH}
    </span>
  </div>
  <textarea
    {...form.register("title")}
    aria-label="Название задачи"
    className="h-[104px] w-full resize-none rounded-[25px] border border-app-stroke bg-app-card px-[15px] py-[12px] text-[15px] text-app-text placeholder:text-app-text-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
    maxLength={TITLE_MAX_LENGTH}
    placeholder="Запись к стоматологу завтра в 10 утра"
  />
</div>
```

Контейнер формы остаётся `gap-[20px]`; первый `flex flex-col gap-[10px]`
(подпись + поле) заменить на `gap-[5px]`. Блок ошибки/кнопки сохраняет
`gap-[10px]`.

- [ ] **Step 7: Заменить внешний outline на внутренний во всех контролах шторки**

В перечисленных файлах заменить
`focus-visible:outline-offset-2` на `focus-visible:-outline-offset-2`.
Если у класса нет offset (например, `sheet-header`), добавить
`focus-visible:-outline-offset-2`.

Файлы: `bottom-sheet.tsx` (две кнопки), `switch.tsx`, `time-input.tsx`,
`select-field.tsx` (триггер и опции), `calendar.tsx` (навигация и дни),
`labels-step.tsx` (retry и строка), `priority-step.tsx` (строка).

- [ ] **Step 8: Запустить тесты и typecheck**

Run: `npm test -- app/components/ui/option-chip.test.ts app/components/tasks/quick-add/quick-add-chips.test.ts app/components/tasks/quick-add/quick-add-form.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/components/tasks/quick-add/quick-add-form.tsx \
  app/components/tasks/quick-add/quick-add-chips.tsx \
  app/components/tasks/quick-add/quick-add-chips.test.ts \
  app/components/tasks/quick-add/quick-add-form.test.ts \
  app/components/ui/option-chip.tsx app/components/ui/option-chip.test.ts \
  app/components/ui/bottom-sheet.tsx app/components/ui/switch.tsx \
  app/components/ui/time-input.tsx app/components/ui/select-field.tsx \
  app/components/tasks/quick-add/calendar.tsx \
  app/components/tasks/quick-add/labels-step.tsx \
  app/components/tasks/quick-add/priority-step.tsx
git commit -m "fix(tasks): align quick add layout and focus rings"
```

---

### Task 4: Pill-поля и анимация настроек напоминаний

**Files:**
- Modify: `app/components/ui/time-input.tsx`
- Create: `app/components/ui/time-input.test.ts`
- Modify: `app/components/tasks/quick-add/reminders-step.tsx`
- Modify: `app/components/tasks/quick-add/reminders-step.test.ts`

**Interfaces:**
- Consumes: `Collapsible` из Task 2, `Switch`, `SelectField`, `TimeInput`.
- Produces:
  - `TimeInputProps` с `size?: "default" | "compact"`.
  - `TimeInput` default: `h-11 w-[114px] rounded-xl text-[17px]`; compact: `h-12 w-[114px] rounded-[28px] text-[15px]`.
  - `RemindersStep` использует `Collapsible` для мастера, «До срока» и «По расписанию».

- [ ] **Step 1: Написать падающий тест `TimeInput`**

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TimeInput } from "./time-input";

describe("TimeInput", () => {
  it("renders the default due-step pill", () => {
    const html = renderToStaticMarkup(
      createElement(TimeInput, {
        value: "16:00",
        onChange: () => {},
        ariaLabel: "Время",
      }),
    );

    expect(html).toContain("rounded-xl");
    expect(html).toContain("text-[17px]");
  });

  it("renders the compact reminders pill", () => {
    const html = renderToStaticMarkup(
      createElement(TimeInput, {
        value: "14:00",
        onChange: () => {},
        ariaLabel: "Время",
        size: "compact",
      }),
    );

    expect(html).toContain("rounded-[28px]");
    expect(html).toContain("text-[15px]");
    expect(html).not.toContain("rounded-xl");
  });
});
```

- [ ] **Step 2: Обновить тест напоминаний**

Добавить в `reminders-step.test.ts`:

```ts
it("uses the compact pill sizes and indented helpers", () => {
  const html = render();

  expect(html).toContain("rounded-[28px]");
  expect(html).toContain("text-[15px]");
  expect(html).toContain("px-[15px]");
  expect(html.match(/overflow-hidden/g)).toHaveLength(2);
});

it("animates the scheduled block with its own collapsible", () => {
  const html = render({
    value: { ...defaults, scheduledEnabled: true },
  });

  expect(html.match(/overflow-hidden/g)).toHaveLength(3);
});
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npm test -- app/components/ui/time-input.test.ts app/components/tasks/quick-add/reminders-step.test.ts`
Expected: FAIL — нет `size`/`rounded-[28px]`/вложенных `overflow-hidden`.

- [ ] **Step 4: Добавить `size` в `TimeInput`**

```tsx
const SIZE_CLASSES = {
  default: "h-11 rounded-xl text-[17px]",
  compact: "h-12 rounded-[28px] text-[15px]",
} as const;

export interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  size?: keyof typeof SIZE_CLASSES;
}
```

Класс:

```tsx
className={cn(
  "w-[114px] border-0 bg-app-track p-0 text-center font-semibold text-app-accent outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
  SIZE_CLASSES[size],
  className,
)}
```

- [ ] **Step 5: Перестроить `RemindersStep` на `Collapsible`**

Структура:

```tsx
<div className="flex flex-col">
  <div className="flex h-[59px] items-center justify-between gap-[15px]">
    <span className="text-[16px] text-app-text">Автонапоминания</span>
    <Switch ... />
  </div>

  <Collapsible open={remindersEnabled}>
    <div className="flex flex-col gap-[5px] pt-[15px]">
      <p className="text-[13px] uppercase text-app-text-secondary">
        НАСТРОЙКИ
      </p>
      <div className="flex flex-col gap-[15px]">
        <div className="flex flex-col">
          <div className="flex h-7 items-center justify-between gap-[15px]">
            <span className="text-[16px] text-app-text">
              До срока задачи
            </span>
            <Switch className="-my-2" ... />
          </div>
          <Collapsible open={beforeDueEnabled}>
            <div className="flex flex-col gap-[5px] pt-[10px]">
              <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                За сколько до завершения задачи напомнить
              </p>
              <div className="flex flex-wrap items-start gap-[15px]">
                <input
                  aria-label="За сколько до завершения задачи напомнить"
                  className="h-12 w-[114px] shrink-0 rounded-[28px] bg-app-track p-0 text-center text-[15px] font-semibold text-app-accent outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
                  inputMode="numeric"
                  onChange={handleAmountChange}
                  type="text"
                  value={beforeDueAmountInput}
                />
                <div className="w-[215px] max-w-full shrink-0">
                  <SelectField ... />
                </div>
              </div>
              <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                Напоминание будет выслано в чат с Milly один раз до её
                завершения.
              </p>
            </div>
          </Collapsible>
        </div>

        <div className="flex flex-col">
          <div className="flex h-7 items-center justify-between gap-[15px]">
            <span className="text-[16px] text-app-text">
              По расписанию
            </span>
            <Switch className="-my-2" ... />
          </div>
          <Collapsible open={scheduledEnabled}>
            <div className="flex flex-col gap-[5px] pt-[10px]">
              <div className="flex flex-wrap items-end gap-[15px]">
                <div className="flex w-[215px] max-w-full shrink-0 flex-col gap-[5px]">
                  <span className="px-[15px] text-[13px] text-app-text-secondary">
                    Повторять
                  </span>
                  <SelectField ... />
                </div>
                <div className="flex w-[114px] shrink-0 flex-col gap-[5px]">
                  <span className="px-[15px] text-[13px] text-app-text-secondary">
                    Время
                  </span>
                  <TimeInput ... size="compact" />
                </div>
              </div>
              {isScheduledTimeValid ? null : (
                <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                  Укажите время
                </p>
              )}
              <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
                Напоминание по расписанию будет высылаться в чат с Milly
                каждый заданный промежуток времени.
              </p>
            </div>
          </Collapsible>
        </div>
      </div>
    </div>
  </Collapsible>

  <BottomSheetPrimaryAction ... />
</div>
```

Сохранить `normalizeReminderDraft`, `parseAmount`, `isApplyDisabled`,
`handleApply` и haptics без изменений. Примечание: `Switch` принимает
`className`, поэтому `-my-2` допустим.

- [ ] **Step 6: Запустить тесты, typecheck и commit**

Run: `npm test -- app/components/ui/time-input.test.ts app/components/tasks/quick-add/reminders-step.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/components/ui/time-input.tsx app/components/ui/time-input.test.ts \
  app/components/tasks/quick-add/reminders-step.tsx \
  app/components/tasks/quick-add/reminders-step.test.ts
git commit -m "fix(tasks): animate reminder settings and align pills"
```

---

### Task 5: Календарь не выбирает прошлое

**Files:**
- Modify: `app/lib/tasks/date-time.ts:233-239`
- Modify: `app/lib/tasks/date-time.test.ts`
- Modify: `app/components/tasks/quick-add/calendar.tsx:11-14`, `:59-60`, `:74-77`, `:89-111`, `:112-154`
- Modify: `app/components/tasks/quick-add/calendar.test.ts`
- Modify: `app/components/tasks/quick-add/due-step.tsx:11-13`, `:50-78`
- Modify: `app/components/tasks/quick-add/due-step.test.ts`

**Interfaces:**
- Consumes: `getZonedNow`, `formatMonthTitle`, `getMonthGrid`.
- Produces:
  - `isDateInRange(date: string, minDate?: string, maxDate?: string): boolean`.
  - `DueStep` передаёт `minDate={today}` и клампит стартовую дату.
  - `Calendar` использует `isDateInRange` и не вызывает `onSelect` для disabled.

- [ ] **Step 1: Расширить тест `date-time`**

Добавить:

```ts
describe("isDateInRange with custom bounds", () => {
  it("rejects dates before the selected minimum", () => {
    expect(isDateInRange("2026-11-04", "2026-11-05", "2100-12-31")).toBe(false);
    expect(isDateInRange("2026-11-05", "2026-11-05", "2100-12-31")).toBe(true);
    expect(isDateInRange("2101-01-01", "2026-11-05", "2100-12-31")).toBe(false);
  });
});
```

- [ ] **Step 2: Написать падающие тесты календаря и `DueStep`**

В `calendar.test.ts`:

```ts
it("disables past days and previous-month navigation", () => {
  const html = renderToStaticMarkup(
    createElement(Calendar, {
      value: "2026-11-11",
      today: "2026-11-05",
      minDate: "2026-11-05",
      onSelect: () => {},
    }),
  );

  const cells = html.match(/<button[^>]*role="gridcell"[^>]*>/g) ?? [];
  const disabledCells = cells.filter((cell) => cell.includes("disabled=\"\""));

  expect(disabledCells).toHaveLength(10);
  expect(html).toMatch(
    /<button[^>]*aria-label="Предыдущий месяц"[^>]*disabled=""/,
  );
});
```

В `due-step.test.ts`:

```ts
it("uses today as the minimum date", () => {
  const html = render();

  expect(html).toMatch(
    /<button[^>]*aria-label="Предыдущий месяц"[^>]*disabled=""/,
  );
});
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npm test -- app/lib/tasks/date-time.test.ts app/components/tasks/quick-add/calendar.test.ts app/components/tasks/quick-add/due-step.test.ts`
Expected: FAIL — `isDateInRange` не принимает bounds; календарь не disabled прошлое; `DueStep` передаёт `2025-01-01`.

- [ ] **Step 4: Расширить `isDateInRange`**

```ts
export function isDateInRange(
  date: string,
  minDate: string = MIN_API_DATE,
  maxDate: string = MAX_API_DATE,
): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= minDate &&
    date <= maxDate
  );
}
```

- [ ] **Step 5: Поправить `Calendar`**

- `isDisabled = !isDateInRange(cell.date, minDate, maxDate)`.
- В `handleSelect` добавить ранний выход `if (isDisabled) return;` — или
  не вызывать `onSelect` для disabled.
- Навигация: `NAVIGATION_BUTTON_CLASSES` → `size-11 -m-[10px]`, чтобы
  визуальная высота строки была 24px, а зона нажатия осталась 44×44.
- Строка дней недели: `h-[18px]` вместо `h-8`.
- Сетка: `mt-4` вместо `mt-[10px]`.
- В ячейках дня оставить `h-9 w-12` и внутреннее кольцо фокуса.

- [ ] **Step 6: Поправить `DueStep`**

- Удалить `MIN_DATE`.
- Вычислять `today` до `useState`.
- Инициализировать дату с клампом:

```tsx
const today = formatZonedToday(now, timeZone);
const [selectedDate, setSelectedDate] = useState(() =>
  date < today ? today : date,
);
```

- Передать `minDate={today}`.
- Оставить `maxDate={MAX_DATE}`.

- [ ] **Step 7: Запустить тесты, typecheck и commit**

Run: `npm test -- app/lib/tasks/date-time.test.ts app/components/tasks/quick-add/calendar.test.ts app/components/tasks/quick-add/due-step.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/lib/tasks/date-time.ts app/lib/tasks/date-time.test.ts \
  app/components/tasks/quick-add/calendar.tsx \
  app/components/tasks/quick-add/calendar.test.ts \
  app/components/tasks/quick-add/due-step.tsx \
  app/components/tasks/quick-add/due-step.test.ts
git commit -m "fix(tasks): disable past dates in task calendar"
```

---

### Task 6: Keyboard-safe `BottomSheet`

**Files:**
- Create: `app/lib/ui/viewport-metrics.ts`
- Test: `app/lib/ui/viewport-metrics.test.ts`
- Create: `app/hooks/use-keyboard-viewport.ts`
- Modify: `app/components/ui/bottom-sheet.tsx`
- Modify: `app/root.tsx:33-36`
- Modify: `AGENTS.md` (раздел 4 «Telegram Mini App»)

**Interfaces:**
- Consumes: `visualViewport`, `window.innerHeight`.
- Produces:

```ts
export interface ViewportMetrics {
  keyboardInset: number;
  viewportHeight: number;
}

export function computeViewportMetrics(input: {
  layoutHeight: number;
  viewportHeight: number;
  offsetTop: number;
}): ViewportMetrics;

export interface KeyboardViewport {
  keyboardInset: number;
  viewportHeight: number | null;
}

export function useKeyboardViewport(enabled: boolean): KeyboardViewport;
```

- [ ] **Step 1: Написать падающий тест метрик**

```ts
import { describe, expect, it } from "vitest";

import { computeViewportMetrics } from "./viewport-metrics";

describe("computeViewportMetrics", () => {
  it("returns zero inset when the keyboard is closed", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 800,
        viewportHeight: 800,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 0, viewportHeight: 800 });
  });

  it("computes the iOS keyboard inset", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 800,
        viewportHeight: 500,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 300, viewportHeight: 500 });
  });

  it("accounts for a panned visual viewport", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 800,
        viewportHeight: 500,
        offsetTop: 100,
      }),
    ).toEqual({ keyboardInset: 200, viewportHeight: 500 });
  });

  it("clamps a negative inset", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 500,
        viewportHeight: 800,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 0, viewportHeight: 800 });
  });

  it("keeps zero inset when Android resizes the layout viewport", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 500,
        viewportHeight: 500,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 0, viewportHeight: 500 });
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- app/lib/ui/viewport-metrics.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать `viewport-metrics.ts`**

```ts
export interface ViewportMetrics {
  keyboardInset: number;
  viewportHeight: number;
}

export function computeViewportMetrics(input: {
  layoutHeight: number;
  viewportHeight: number;
  offsetTop: number;
}): ViewportMetrics {
  const keyboardInset = Math.max(
    0,
    Math.round(input.layoutHeight - input.viewportHeight - input.offsetTop),
  );

  return {
    keyboardInset,
    viewportHeight: input.viewportHeight,
  };
}
```

- [ ] **Step 4: Реализовать хук `useKeyboardViewport`**

```ts
import { useEffect, useState } from "react";

import { computeViewportMetrics } from "~/lib/ui/viewport-metrics";

const CLOSED: KeyboardViewport = {
  keyboardInset: 0,
  viewportHeight: null,
};

export interface KeyboardViewport {
  keyboardInset: number;
  viewportHeight: number | null;
}

export function useKeyboardViewport(enabled: boolean): KeyboardViewport {
  const [metrics, setMetrics] = useState<KeyboardViewport>(CLOSED);

  useEffect(() => {
    if (!enabled) {
      setMetrics(CLOSED);
      return;
    }

    const visualViewport = window.visualViewport;
    let frame = 0;

    const update = () => {
      frame = 0;

      const layoutHeight = window.innerHeight;
      const viewportHeight = visualViewport?.height ?? layoutHeight;
      const offsetTop = visualViewport?.offsetTop ?? 0;
      const next = computeViewportMetrics({
        layoutHeight,
        viewportHeight,
        offsetTop,
      });

      setMetrics((current) =>
        current.keyboardInset === next.keyboardInset &&
        current.viewportHeight === next.viewportHeight
          ? current
          : next,
      );
    };

    const schedule = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    visualViewport?.addEventListener("resize", schedule);
    visualViewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    update();

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      visualViewport?.removeEventListener("resize", schedule);
      visualViewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [enabled]);

  return metrics;
}
```

- [ ] **Step 5: Встроить хук в `BottomSheet`**

В начале компонента:

```tsx
const keyboard = useKeyboardViewport(open);
const keyboardOpen = keyboard.keyboardInset > 0;
const bottomOffset = keyboardOpen ? keyboard.keyboardInset : 0;
const bottomPadding = keyboardOpen
  ? "15px"
  : "max(15px, var(--app-inset-bottom))";
const panelMaxHeight =
  keyboardOpen && keyboard.viewportHeight !== null
    ? `calc(${keyboard.viewportHeight}px - var(--app-inset-top) - 90px)`
    : "calc(var(--tg-viewport-stable-height, 100dvh) - var(--app-inset-top) - var(--app-inset-bottom) - 90px)";
```

В `Modal` убрать `max-w-md` и задать ширину через `maxWidth`, чтобы
панель была не больше 448px с учётом safe-area, а на 412px — 382px:

```tsx
className="fixed inset-x-0 z-50 mx-auto flex w-full flex-col gap-[10px]"
style={{
  bottom: bottomOffset,
  maxWidth:
    "calc(448px + max(15px, var(--app-inset-left)) + max(15px, var(--app-inset-right)))",
  paddingLeft: "max(15px, var(--app-inset-left))",
  paddingRight: "max(15px, var(--app-inset-right))",
  paddingBottom: bottomPadding,
}}
```

На панели:

```tsx
style={{
  height: panelHeight === "auto" ? undefined : panelHeight,
  maxHeight: panelMaxHeight,
}}
```

Добавить обработчик фокуса на тело и очистку rAF. Импортировать
`useEffect`, `useRef` из `react` и `type FocusEvent` из `react`:

```tsx
const focusFrameRef = useRef(0);

useEffect(() => {
  return () => window.cancelAnimationFrame(focusFrameRef.current);
}, []);

function handleBodyFocus(event: FocusEvent<HTMLDivElement>) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  window.cancelAnimationFrame(focusFrameRef.current);
  focusFrameRef.current = window.requestAnimationFrame(() => {
    if (document.activeElement === target) {
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });
}
```

`<div ... onFocus={handleBodyFocus}>`.

- [ ] **Step 6: Добавить `interactive-widget` в meta viewport**

В `app/root.tsx`:

```tsx
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
/>
```

- [ ] **Step 7: Обновить `AGENTS.md`**

В разделе про Telegram/UI добавить:

```markdown
- Клавиатура в нижних шторках: `BottomSheet` компенсирует
  `visualViewport` (`keyboardInset`), а не `viewportHeight`; в meta
  viewport включён `interactive-widget=resizes-content`. Не фиксировать
  нижнюю панель через `viewportHeight`.
```

- [ ] **Step 8: Запустить тесты, typecheck, build и commit**

Run: `npm test -- app/lib/ui/viewport-metrics.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

```bash
git add app/lib/ui/viewport-metrics.ts app/lib/ui/viewport-metrics.test.ts \
  app/hooks/use-keyboard-viewport.ts app/components/ui/bottom-sheet.tsx \
  app/root.tsx AGENTS.md
git commit -m "fix(ui): keep bottom sheet above mobile keyboard"
```

---

### Task 7: Интеграционная проверка

**Files:**
- No code changes expected.
- Проверить `git status`: несохранённые SVG-иконки не должны попасть в коммит.

**Interfaces:**
- Consumes: все изменения Tasks 1–6.
- Produces: подтверждение критериев приёмки spec.

- [ ] **Step 1: Полный прогон проверок**

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 2: Проверить SSR и 404**

```bash
npm run build
PORT=3000 npm start
curl -s http://localhost:3000/ | head -c 2000
curl -i http://localhost:3000/does-not-exist
```

Expected:
- SSR-ответ главной не содержит открытой формы;
- 404-ответ отдаёт HTTP `404` и тексты 404-экрана.

- [ ] **Step 3: Ручная проверка в браузере**

Проверить на ширинах `320 / 412 / 448px`:
- нет горизонтального скролла страницы;
- чипы прокручиваются внутри строки;
- светлая и тёмная темы;
- фокус на текстовом поле виден со всех сторон;
- даты в прошлом disabled;
- вложенные настройки напоминаний анимируются.

- [ ] **Step 4: Ручная проверка в Telegram**

Через HTTPS-туннель на `http://localhost:5173` проверить на iOS и
Android:
- при открытии клавиатуры шторка поднимается, поле и «Закрыть»
  доступны;
- после закрытия клавиатуры шторка возвращается вниз без скачка;
- safe-area и fullscreen не ломаются;
- haptics и нативный time-picker работают.

- [ ] **Step 5: Проверить, что несохранённые иконки не закоммичены**

Run: `git status --short`
Expected: изменения `app/assets/icons/calendar.svg`, `tag.svg`,
`tag-plus.svg` остаются несохранёнными и не входят в коммиты задачи.
