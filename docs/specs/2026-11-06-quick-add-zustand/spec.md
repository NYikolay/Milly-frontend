# Milly — состояние быстрого создания задачи в Zustand (SDD Specification)

**Статус:** approved (2026-11-06)
**Дата:** 2026-11-06
**Область:** `frontend/`
**API:** без изменений, `docs/api.md`
**Связанные спецификации:**
`docs/specs/2026-11-06-inline-quick-add/spec.md` (поведение формы),
`docs/specs/2026-11-05-task-creation-modals/spec.md`,
`docs/specs/2026-11-05-task-creation-modals-fixes/spec.md`

## 1. Контекст и цель

Сейчас `QuickAddComposer` держит UI-состояние в трёх `useState`
(`activeDetail`, `now`, `error`), значения формы — внутри
`react-hook-form`, а детали шагов — в локальных `useState` компонентов
`LabelsStep`, `PriorityStep`, `DueStep` и `RemindersStep`.

Цель итерации — сделать Zustand единственным владельцем состояния формы
быстрого создания задачи. `react-hook-form` остаётся обработчиком формы:
он валидирует через `quickTaskResolver` (zod) и выполняет submit. API,
`QuickTaskDraft`, zod-схема, payload, React Query-ключи и визуальное
поведение не меняются.

## 2. Пользовательские сценарии

1. Пользователь вводит название. Значение сразу попадает в Zustand-стор;
   счётчик и кнопка «Добавить задачу» читают его оттуда. Валидация и
   submit по-прежнему идут через `react-hook-form`.
2. Пользователь открывает чип. Стор сохраняет копию текущего черновика
   как `stepDraft` и запоминает активный шаг. Правки внутри шага меняют
   только `stepDraft`, не `draft`.
3. Пользователь нажимает «Применить»/«Готово». `stepDraft` (с финальным
   патчем шага) становится новым `draft`, шаг закрывается, чип
   обновляется, haptic `selection`.
4. Пользователь закрывает шаг overlay-кликом, Escape, «назад» или
   «Закрыть». `stepDraft` отбрасывается, `draft` остаётся прежним,
   haptic `selection`, фокус возвращается на чип.
5. Пользователь отправляет задачу. Успех сбрасывает стор к значениям по
   умолчанию, обновляет `now`, закрывает шаг, очищает ошибку и
   перезапрашивает главный экран.
6. Ошибка отправки сохраняет `draft`, пишет текст в `error`. При `404`
   несуществующие метки вычищаются и из `draft`, и из открытого
   `stepDraft`.
7. Повторное открытие шага начинает с последних применённых значений
   `draft`, а не с отброшенных правок `stepDraft`.

## 3. Функциональные требования

### FR-1. Жизненный цикл и SSR

- Стор создаётся на монтирование `QuickAddComposer` через
  `useState(() => createQuickAddStore(...))` и раздаётся потомкам через
  React context.
- Модульного singleton-стора нет: SSR-запросы и разные экземпляры формы
  не делят состояние.
- Стор умирает вместе с `QuickAddComposer`; черновик не сохраняется
  между перезагрузками, переходами по приложению и не пишется в
  `localStorage`, `sessionStorage`, IndexedDB или Telegram Storage.
- Провайдер стора рендерится внутри `AuthGate`, поэтому `timeZone`
  берётся из `AuthUser.timezone` (fallback `UTC`) и не меняется, пока
  форма смонтирована.

### FR-2. Состояние стора

Стор хранит:

- `draft: QuickTaskDraft` — единственный канонический черновик формы;
- `activeStep: QuickAddStep | null` — открытая деталь;
- `stepDraft: QuickTaskDraft | null` — отменяемая копия черновика для
  открытого шага;
- `remindersAmountInput: string` — строковое значение поля «За сколько до
  срока» в шаге напоминаний (нужно, чтобы разрешать пустой ввод и
  disabled «Применить»);
- `now: Date` — текущее время для чипа даты и календаря;
- `error: string | null` — текст ошибки отправки.

Экшены:

- `patchDraft(patch)` — частично обновляет `draft`;
- `patchStepDraft(patch)` — частично обновляет `stepDraft`, если шаг
  открыт; иначе no-op;
- `pruneLabelIds(validIds)` — фильтрует и дедуплицирует `labelIds` в
  `draft` и, если шаг открыт, в `stepDraft`;
- `openStep(step)` — копирует `draft` в `stepDraft`, выставляет
  `activeStep`; для `"due"` обновляет `now` через `clock()` и подрезает
  `stepDraft.dueDate` до сегодняшней даты в `timeZone`; для
  `"reminders"` инициализирует `remindersAmountInput` из
  `draft.beforeDueAmount`;
- `closeStep()` — очищает `activeStep`, `stepDraft` и
  `remindersAmountInput`, не меняя `draft`;
- `applyStep(patch?)` — мержит финальный `patch` в `stepDraft`, копирует
  результат в `draft`, закрывает шаг и очищает `remindersAmountInput`;
- `resetDraft()` — ставит `createQuickTaskDefaults(clock(), timeZone)`,
  обновляет `now`, очищает шаг, `remindersAmountInput` и `error`;
- `setError(error)`;
- `setRemindersAmountInput(value)`.

`cloneDraft` для `stepDraft` копирует `labelIds`, чтобы правки шага не
мутировали массив `draft`.

### FR-3. React Hook Form и zod

- `useQuickTaskForm({ draft })` создаёт
  `useForm<QuickTaskDraft>({ defaultValues: draft, values: draft, resolver: quickTaskResolver, mode: "onChange" })`.
- `values: draft` синхронизирует RHF при любом изменении стора: применение
  шага, сброс после успеха, очистка меток при `404`.
- Поле `title` рендерится через `Controller`: `field.onChange` обновляет
  RHF, затем тот же обработчик вызывает `onTitleChange(value)`, который
  делает `patchDraft({ title: value })`.
- Submit остаётся `form.handleSubmit`; в `createMutation` передаются
  валидированные значения из `onValid`. `quickTaskResolver`,
  `quickTaskSchema`, `isQuickTaskSubmittable` и payload не меняются.
- `form.getValues`/`form.setValue` для полей черновика больше не
  используются: источник значений — стор.

### FR-4. Шаги деталей

- `QuickAddDetailSheet` остаётся презентационным: получает `values`
  (`stepDraft`), `amountInput`, `onPatch`, `onAmountInputChange`,
  `onApply` и `onClose`.
- `LabelsStep`, `PriorityStep`, `DueStep`, `RemindersStep` становятся
  controlled-компонентами без локального `useState`:
  - `LabelsStep`: `selectedIds` + `onChange(ids)`;
  - `PriorityStep`: `value` + `onChange(priority)`;
  - `DueStep`: `value: DueStepValue` + `onChange(patch)`;
  - `RemindersStep`: `value: ReminderDraft`, `amountInput` +
    `onAmountInputChange`, `onChange(patch)`.
- Каждый шаг сохраняет свою кнопку «Применить»/«Готово» и передаёт
  финальное значение в `onApply`; лист маппит его в
  `Partial<QuickTaskDraft>` и вызывает `onApply(patch)`.
- `normalizeReminderDraft` остаётся в `RemindersStep` и применяется перед
  `onApply`.
- Кламп даты в прошлом переносится в `openStep("due")`; `DueStep`
  отображает уже нормализованную дату. `Calendar` сохраняет локальный
  `view` как view-state календаря, не данные формы.
- Overlay/Escape/«назад»/«Закрыть» вызывают `onClose` → `closeStep()`;
  «Применить»/«Готово» вызывают `onApply` → `applyStep(patch)`.

### FR-5. Сброс, ошибки и метки

- После успеха: `resetDraft()`, haptic `success`,
  `useRevalidator().revalidate()`, инвалидация `["tasks"]` и
  `["task-series"]`. Отдельные `setError(null)`, `setNow(new Date())`,
  `setActiveDetail(null)` не нужны — их выполняет `resetDraft()`.
- При ошибке: `setError(describeQuickAddError(error))`, haptic `error`,
  черновик сохраняется.
- При `404`: инвалидировать `["labels"]`, дождаться `refetch` и вызвать
  `pruneLabelIds(validIds)`; экшен обновляет `draft.labelIds` и, если шаг
  открыт, `stepDraft.labelIds`.
- `now` обновляется при `openStep("due")` и `resetDraft()`; отдельного
  таймера на смену суток нет.

### FR-6. Фокус, haptics и отправка

- `pendingChipFocusRef`, `abortRef`, `submittingRef`, `chipRefs` остаются
  refs в `QuickAddComposerContent`; в стор не переезжают.
- Открытие/закрытие шага, применение, переключение Switch, успех/ошибка
  и микрофон сохраняют текущие haptics.
- Повторная отправка во время pending блокируется; размонтирование
  страницы абортит текущий запрос.
- Поведение фокуса: blur активного элемента при открытии, возврат на чип
  через `requestAnimationFrame` после закрытия.

## 4. Данные и состояние

### 4.1. Публичный API стора

```ts
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
```

`clock` по умолчанию — `() => new Date()`; тесты передают фиксированные
часы.

### 4.2. Provider и хуки

```ts
export function QuickAddStoreProvider(props: PropsWithChildren<{
  timeZone: string;
}>): ReactElement;

export function useQuickAddStore<T>(
  selector: (state: QuickAddStoreState) => T,
): T;
```

`useQuickAddStore` использует `useStore(store, selector)` из Zustand.
Селекторы возвращают примитивы/стабильные ссылки; объект из нескольких
полей не собирается, чтобы не плодить лишние рендеры.

### 4.3. React Query

- Ключи `["labels"]`, `["tasks"]`, `["task-series"]` не меняются.
- `labelsQuery` и `createMutation` остаются в `QuickAddComposerContent`.
- Серверные данные в Zustand не дублируются.

## 5. Нефункциональные требования

- Новые зависимости не добавляются: `zustand` уже установлен.
- SSR включён; модульного стора нет; доступ к `window`/`document` только
  в эффектах и обработчиках.
- TypeScript strict, без `any`; типы — через `import type`.
- Файлы — `kebab-case`, компоненты — `PascalCase`, алиас `~/`.
- Никаких записей черновика в браузерные/Telegram-хранилища и логов
  токенов/`initData`.
- Тесты — Vitest, `app/**/*.test.ts`; стор тестируется как vanilla-store,
  компоненты — статическим SSR (`renderToStaticMarkup`).
- Линтера в проекте нет; `npm run lint` не добавлять.
- Несохранённые изменения `app/assets/icons/calendar.svg`, `tag.svg`,
  `tag-plus.svg` не откатывать и не перезаписывать.

## 6. Вне scope

- Изменение API, `QuickTaskDraft`, zod-схемы, payload и бизнес-логики.
- Перенос `Calendar.view`, React Query, рефов и мутации в Zustand.
- Persistence черновика.
- Редизайн формы, шагов, шторок и чипов.
- Изменение логики голосовой записи.
- E2E/браузерные тесты.

## 7. Критерии приёмки

- [ ] `QuickAddComposer` не содержит `useState`; `activeStep`, `now`,
      `error` и `draft` живут в Zustand.
- [ ] `LabelsStep`, `PriorityStep`, `DueStep`, `RemindersStep` не
      содержат `useState` и управляются пропсами из `stepDraft`.
- [ ] Стор создаётся на mount, не является модульным singleton и
      умирает при размонтировании; SSR не делит состояние между
      запросами.
- [ ] RHF остаётся, использует `quickTaskResolver` и `handleSubmit`;
      заголовок синхронизирован со стором.
- [ ] «Применить» коммитит `stepDraft` в `draft`; закрытие без
      применения отбрасывает правки.
- [ ] Успешная отправка сбрасывает стор, `now`, шаг и ошибку.
- [ ] Ошибка сохраняет черновик; `404` чистит метки в `draft` и
      `stepDraft`.
- [ ] `npm test`, `npm run typecheck`, `npm run build` проходят.
- [ ] В SSR-ответе главной нет защищённого контента; `curl -i
      http://localhost:3000/does-not-exist` отдаёт `404`.
- [ ] Вручную проверены ввод, чипы, apply/close, фокус, haptics,
      клавиатура, light/dark и ширины `320 / 412 / 448px`.

## 8. Принятые решения

- Zustand — единственный владелец состояния формы; RHF — обработчик и
  валидатор, не источник истины.
- Стор — per-composer vanilla store + context, а не модульный singleton:
  SSR-safe и соответствует жизненному циклу «пока открыт экран».
- `stepDraft` — полная копия `QuickTaskDraft`, а не набор отдельных
  черновиков шагов: проще отмена и apply.
- Строковое поле суммы напоминания хранится отдельно от
  `QuickTaskDraft`, чтобы сохранить пустой ввод и disabled «Применить».
- `Calendar.view` остаётся локальным view-state.
- Новые зависимости и persistence не добавляются.

## 9. Связь с существующими спецификациями

- `2026-11-06-inline-quick-add`: FR-5 «единственный экземпляр
  react-hook-form» сохраняется, но источником значений становится
  Zustand; FR-3 cancel/apply и FR-6 фокус сохраняются.
- `2026-11-05-task-creation-modals`: модель формы, payload и API не
  меняются.
- `2026-11-05-task-creation-modals-fixes`: ограничение даты в прошлом
  переносится в `openStep("due")` без изменения UI-правила.
