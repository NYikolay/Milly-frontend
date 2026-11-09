# Milly — рефакторинг frontend по SOLID и KISS (SDD Specification)

**Статус:** draft for approval
**Дата:** 2026-11-08
**Область:** `frontend/`
**Figma:** не применимо — вёрстка и визуальные состояния не меняются
**API:** не меняется; используются существующие `GET /tasks`,
`GET /tasks/{id}`, `POST /tasks/{id}/complete`,
`POST /tasks/{id}/uncomplete`, `GET /projects?limit=100`, `GET /labels`
(`docs/api.md`, §7.2, §8.2, §9.4, §9.6, §9.7)
**Связанные спецификации:**
`docs/specs/2026-11-06-today-tasks/spec.md`,
`docs/specs/2026-11-07-task-search/spec.md`,
`docs/specs/2026-11-08-task-detail/spec.md`,
`docs/specs/2026-11-07-quick-add-label-project-figma/spec.md`,
`docs/specs/2026-11-03-error-pages/spec.md`,
`docs/specs/2026-11-02-home-dashboard/spec.md`

> Примечание (2026-11-08): это спецификация рефакторинга, а не новой
> продуктовой функциональности. Пользовательские сценарии, тексты,
> запросы к backend и вёрстка сохраняются. Единственное изменение
> сетевого поведения — переключение клиентского фильтра меток больше не
> вызывает повторный `GET /tasks` с теми же серверными параметрами
> (FR-5). UI при этом обновляется так же, как раньше.

## 1. Контекст и цель

В `frontend/` накопилось несколько реальных нарушений SOLID/KISS,
выявленных при чтении кода: три почти одинаковые фабрики
оптимистичного завершения задачи, три копии обновления
`completed_at`/`updated_at`, четыре файла с семью запросами проектов и
меток, пять мест инвалидации тех же ключей, дублирование текста ошибки
завершения, дублирование `isAbortError`, мёртвые файлы и re-export shim.
Отдельно найден реальный дефект: `labelIds` входят в серверный ключ
поиска, хотя в API не отправляются и применяются только на клиенте,
поэтому переключение метки делает лишний запрос.

Цель итерации — убрать эти дублирования и мёртвый код, не меняя
пользовательскую логику, тексты, порядок запросов и вёрстку. Рефакторинг
выполняется небольшими задачами с тестами; каждое изменение должно
сохранять существующие контракты модулей и поведение экранов.

### 1.1. Результаты ревью

| ID | Находка | Решение |
| --- | --- | --- |
| F1 | Три почти одинаковые фабрики optimistic completion в `use-today-tasks.ts`, `use-search-tasks.ts`, `use-task-detail.ts` | Исправляем: FR-3 |
| F2 | Четыре файла с запросами проектов/меток и пять мест инвалидации с сырыми ключами | Исправляем: FR-2 |
| F3 | `lastResultsRef` в `task-search.tsx` дублирует `keepPreviousData` | Принято: поведение при ошибке отличается, см. §8 |
| F4 | Три копии изменения `completed_at`/`updated_at` в cache-модулях | Исправляем: FR-1 |
| F5 | Текст ошибки завершения и вывод pending task id дублируются в трёх route-модулях | Исправляем: FR-4 |
| F6 | Шаги quick-add размазаны по union/switch в шести файлах | Принято: registry был бы оверинжинирингом, см. §8 |
| F7 | Шаги фильтров поиска размазаны по пяти файлам | Принято: см. §8 |
| F8 | Строки выбора, status- и error-блоки копируются между шагами | Принято: риск визуальных регрессий, см. §8 |
| F9 | Скелетон строк и нижний отступ контента дублируются | Исправляем: FR-9 |
| F10 | Компоненты search/today импортируют куски quick-add и home | Принято: перенос файлов даст churn без пользы, см. §8 |
| F11 | `search-filters.ts` смешивает модель, query, фильтрацию и copy | Принято: модуль целостный, дробление не оправдано, см. §8 |
| F12 | `labelIds` входят в серверный ключ поиска, хотя не уходят в API | Исправляем: FR-5 |
| F13 | Прогресс за сегодня живёт под двумя разными ключами | Принято: объединение изменит loading/error-семантику, см. §8 |
| F14 | Single-flight реализован и в `api/client.ts`, и в `auth/auth-api.ts` | Принято: auth-чувствительно, внешний слой безвреден, см. §8 |
| F15 | `isAbortError` продублирован в `http.ts`, `auth/failure.ts`, `use-voice-recorder.ts` | Исправляем: FR-6 |
| F16 | `AppErrorPage` повторяет fixed-обёртку `BottomNavigationDock` | Исправляем: FR-8 |
| F17 | Широкие prop-интерфейсы у шторок и панелей | Принято: явные пропсы проще контекста, см. §8 |
| F18 | Нормализация прогресса продублирована в четырёх местах | Исправляем: FR-1 |
| F19 | Крупные оркестраторы `QuickAddComposer` и `useVoiceRecorder` | Принято: высокий риск без выигрыша в этой итерации, см. §8 |
| F20 | Провайдеры смешивают чистую платформенную логику и React-оркестрацию | Принято: см. §8 |
| F21 | Мёртвые `button.tsx`, `card.tsx`, `format-date.ts` и test-only экспорты | Частично исправляем: FR-7 |
| F22 | Приведение типов в `task-segments.tsx` и `quick-task-schema.ts` | Частично исправляем: FR-10 (Zod path); cast `SegmentedControl` принят |
| F23 | Дублирование типов завершения, прогресса и payload | Частично исправляем: FR-3; остальное принято, см. §8 |
| F24 | Re-export shim `search-filter.ts` и обёртка `QuickAddHeader` | Shim удаляем: FR-7; обёртку принимаем |
| F25 | Два hook-файла лежат в `components/tasks/quick-add/` | Принято: co-location осознанная, см. §8 |
| F26 | Две реализации русской плюрализации | Принято: две малые функции, см. §8 |
| F27 | Неиспользуемые опции API и инвалидация `["task-series"]` | Принято: безвредный задел, см. §8 |
| F28 | Дублирующиеся `chevron_right.svg` и `chevron-right.svg` | Принято: разная семантика цвета, см. §8 |

## 2. Пользовательские сценарии

Пользовательские сценарии не меняются. Рефакторинг обязан сохранить:

1. Завершение и возврат задачи на `/tasks`, `/tasks/search` и
   `/tasks/:id`: оптимистичное обновление, haptics, откат при ошибке,
   инвалидация `["tasks"]`/`["projects"]`.
2. Поиск задач: серверный запрос по `date`, `project_ids`,
   `priorities`, `status`, `recurrence`, `q`; метки применяются на
   клиенте по AND; предыдущие результаты не исчезают во время нового
   запроса; при ошибке без кэша показывается экран ошибки.
3. Быстрое создание: метки и проекты читаются из тех же кэшей
   `["labels"]`/`["projects"]`; после создания и при `404` списки
   обновляются как раньше.
4. Ошибки 404/429/5xx: экраны и нижняя навигация не меняются;
   `AppErrorPage` выглядит и ведёт себя так же.
5. Главный экран, `/tasks`, `/tasks/search`, `/tasks/:id` и скелетоны
   выглядят идентично на ширинах 320/412/448 px, в light/dark и с
   safe-area.

Сценарии разработчика:

1. Инженер меняет поведение завершения задачи один раз в общем модуле,
   а не в трёх фабриках.
2. Инженер меняет ключ или fetcher проектов/меток один раз, а не в
   четырёх местах.
3. Инженер добавляет новый экран и переиспользует общие константы
   нижнего отступа и скелетон строк.
4. Переключение метки в фильтрах не создаёт новый серверный запрос.

## 3. Функциональные требования

### FR-1. Общий помощник завершения и нормализация прогресса

- Создать `app/lib/tasks/completion-cache.ts`:
  - `hasCompletionChanged(
    task: Pick<TaskResponse, "completed_at">,
    completedAt: string | null,
  ): boolean` — `true` только при переходе между выполненной и активной
    задачей;
  - `applyCompletionFields(
    task: TaskResponse,
    completedAt: string | null,
  ): TaskResponse` — выставляет `completed_at`, а `updated_at` меняет
    только при завершении (`completedAt ?? task.updated_at`);
  - `replaceTaskInList(
    tasks: TaskResponse[],
    updatedTask: TaskResponse,
  ): TaskResponse[]` — заменяет задачу с тем же `id`, сохраняя порядок.
- Добавить в `app/lib/tasks/today-tasks.ts`
  `normalizeCompleted(total: number, completed: number): number`:
  - `total === 0` → `0`;
  - иначе `Math.min(Math.max(completed, 0), total)`.
- `today-tasks-cache.ts`, `search-tasks-cache.ts` и
  `task-detail-cache.ts` используют общие помощники; публичные функции
  `applyTaskCompletion`, `applySearchTaskCompletion`,
  `applyTaskDetailCompletion` и их сигнатуры не меняются.
- `daily-progress-card.tsx`, `today-progress-card.tsx` и
  `getTodayProgressCopy` используют `normalizeCompleted`.
- Инварианты:
  - no-op переход возвращает тот же объект/массив (reference equality);
  - неизвестная задача возвращает исходные данные;
  - при снятии завершения `updated_at` сохраняется;
  - для `total >= 0` прогресс на `/tasks` остаётся в диапазоне
    `0…total`;
  - `remaining` считается как `total - completed`, как раньше.

### FR-2. Общие query options проектов и меток

- Создать `app/lib/projects/projects-query.ts`:
  - `PROJECTS_QUERY_KEY = ["projects"] as const`;
  - `projectsQueryOptions` через `queryOptions` из
    `@tanstack/react-query` с `queryFn: ({ signal }) =>
    fetchProjects(signal)`.
- Создать `app/lib/labels/labels-query.ts`:
  - `LABELS_QUERY_KEY = ["labels"] as const`;
  - `labelsQueryOptions` с `queryFn: ({ signal }) => fetchLabels(signal)`.
- Заменить ручные `useQuery({ queryKey: ["projects"], queryFn: ... })` и
  `useQuery({ queryKey: ["labels"], queryFn: ... })`:
  - `app/routes/tasks.tsx` — проекты;
  - `app/routes/task-search.tsx` — проекты и метки;
  - `app/routes/task-detail.tsx` — проекты и метки с прежними
    `enabled`-условиями;
  - `app/components/tasks/quick-add/quick-add-composer.tsx` — проекты и
    метки.
- Заменить инвалидацию `{ queryKey: ["projects"] }` на
  `{ queryKey: PROJECTS_QUERY_KEY }`:
  - `app/hooks/use-today-tasks.ts`;
  - `app/hooks/use-search-tasks.ts`;
  - `app/hooks/use-task-detail.ts` (два места);
  - `app/components/tasks/quick-add/use-create-quick-task.ts`.
- Инварианты:
  - ключи остаются ровно `["projects"]` и `["labels"]`, поэтому
    существующий кэш и инвалидации `["tasks"]` работают без изменений;
  - `enabled`-условия детального экрана сохраняются: проекты
    запрашиваются только при `project_id !== null`, метки — только при
    непустом `task.labels`;
  - quick-add по-прежнему запрашивает оба списка сразу.

### FR-3. Общая фабрика оптимистичной мутации завершения

- Создать `app/lib/tasks/task-completion.ts`:
  - `TaskCompletionVariables { taskId: number; nextCompleted: boolean }`;
  - `TaskCompletionHaptics { selection(): void;
    notification(type: "success" | "error"): void }`;
  - `TaskCompletionMutationContext<TData> { previous: TData | undefined }`;
  - `TaskCompletionMutationOptions<TData>` с полями `mutationFn`,
    `onMutate`, `onError`, `onSuccess`, `onSettled`;
  - `CreateTaskCompletionMutationOptionsParams<TData>` с
    `queryClient`, `haptics`, `queryKey`, `applyOptimistic`,
    `applySuccess`;
  - `createTaskCompletionMutationOptions<TData>(params)`.
- Фабрика обязана воспроизводить текущий жизненный цикл:
  - `mutationFn` вызывает `completeTask(taskId)` при
    `nextCompleted === true` и `uncompleteTask(taskId)` иначе;
  - `onMutate`: `haptics.selection()`, `cancelQueries`, снимок
    `previous`, оптимистичное обновление с
    `new Date().toISOString()` или `null`;
  - `onError`: восстановление снимка при наличии, haptic error;
  - `onSuccess`: haptic success, замена задачи ответом backend через
    `applySuccess`;
  - `onSettled`: инвалидация `["tasks"]` и `PROJECTS_QUERY_KEY`.
- `use-today-tasks.ts`, `use-search-tasks.ts` и `use-task-detail.ts`
  становятся тонкими обёртками:
  - публичные имена `createToggleTaskMutationOptions`,
    `createToggleSearchTaskMutationOptions`,
    `createToggleTaskDetailMutationOptions`,
    `useToggleTaskCompletion`, `useToggleSearchTaskCompletion`,
    `useToggleTaskDetailCompletion` сохраняются;
  - типы `ToggleTaskMutationOptions`,
    `ToggleSearchTaskMutationOptions`,
    `ToggleTaskDetailMutationOptions` остаются экспортируемыми и
    становятся алиасами `TaskCompletionMutationOptions<TData>`;
  - today/search используют `applyTaskCompletion` /
    `applySearchTaskCompletion` как `applyOptimistic` и
    `replaceTaskInList` как `applySuccess`;
  - detail использует `applyTaskDetailCompletion` как
    `applyOptimistic` и `(_data, updatedTask) => updatedTask` как
    `applySuccess`.

### FR-4. Единый текст и состояние ошибки завершения

- Создать `app/lib/tasks/completion-feedback.ts`:
  - `TASK_COMPLETION_ERROR =
    "Не удалось обновить задачу. Попробуйте ещё раз."`;
  - `CompletionMutationView { isPending: boolean; isError: boolean;
    variables?: { taskId: number } }`;
  - `getPendingTaskId(mutation): number | null` — id только при
    `isPending`, иначе `null`;
  - `getCompletionError(mutation): string | null` — общий текст только
    при `isError`, иначе `null`.
- `app/routes/tasks.tsx`, `app/routes/task-search.tsx` и
  `app/routes/task-detail.tsx` используют эти помощники вместо локальных
  тернарников.
- Текст ошибки остаётся дословно прежним; `task-detail` продолжает
  показывать только `completionError`, а pending-состояние кнопки берёт
  из `toggleMutation.isPending`.

### FR-5. Серверный ключ поиска без меток

- `searchFiltersFingerprint` в `app/lib/tasks/search-filters.ts`
  перестаёт включать `labelIds`: строка принимает вид
  `p:<ids>|pr:<priorities>|s:<status>|r:<recurrence>`.
- `canonicalizeSearchFilters` продолжает сортировать и дедуплицировать
  `labelIds` — функция остаётся общей нормализацией фильтров.
- `buildSearchTaskListQuery` не меняется: `labelIds` в API не уходят.
- `filterTasksForDisplay` остаётся единственным местом применения меток
  (AND по выбранным id).
- Инварианты:
  - изменение только `labelIds` не меняет `searchTasksQueryKey`;
  - изменение проекта, приоритета, статуса, регулярности, даты или
    поискового запроса по-прежнему меняет ключ;
  - при переключении метки список перефильтровывается на клиенте без
    нового `GET /tasks`;
  - `["tasks"]`-инвалидация продолжает обновлять все варианты кэша.

### FR-6. Единый `isAbortError`

- Создать `app/lib/errors/async.ts` с
  `isAbortError(error: unknown): boolean` — проверка
  `typeof error === "object" && error !== null && "name" in error &&
  error.name === "AbortError"`.
- `app/lib/api/http.ts` и `app/hooks/use-voice-recorder.ts` используют
  общий помощник вместо локальных копий.
- `app/lib/auth/failure.ts` использует общий помощник и реэкспортирует
  его, чтобы существующие импорты из `~/lib/auth/failure`
  (`auth-provider.tsx`, `bootstrap-auth.ts`, `api/client.ts`, тесты)
  продолжили работать.
- Поведение классификации ошибок и отмены запросов не меняется.

### FR-7. Удаление мёртвого кода и re-export shim

- Удалить неиспользуемые файлы:
  - `app/components/ui/button.tsx`;
  - `app/components/ui/card.tsx`;
  - `app/lib/format-date.ts`;
  - `app/components/tasks/quick-add/search-filter.ts`;
  - `app/components/tasks/quick-add/search-filter.test.ts`.
- В `labels-step.tsx` и `project-step.tsx` импортировать
  `matchesSearchQuery` напрямую из `~/lib/text-search`.
- Обновить `AGENTS.md`: убрать `search-filter.ts`, `button`, `card`,
  `format-date.ts`; добавить новые модули из FR-1…FR-6 и FR-9.
- Не удалять `toggleOptionalValue`, `QUICK_ADD_DETAIL_STEPS` и
  `KeyboardSpacer`: они используются тестами или являются внутренним
  контрактом примитива.

### FR-8. `AppErrorPage` на общем доке навигации

- `app/components/errors/app-error-page.tsx` использует
  `BottomNavigationDock active="home"` вместо локальной fixed-обёртки.
- `BottomNavigation` и `AppShell` не меняются.
- Инварианты:
  - нижняя навигация остаётся fixed, `inset-x-0 bottom-0 z-20`,
    `max-w-md px-4`, с теми же safe-area отступами;
  - на error-экране активна вкладка «Главная»;
  - `AppErrorPage` по-прежнему не зависит от провайдеров и работает в
    корневом error boundary;
  - статическая вёрстка не меняется; допускается добавление
    transition-классов общего дока, которые не видны без `hidden`.

### FR-9. Общие константы нижнего отступа и скелетон строк

- Создать `app/lib/layout.ts`:
  - `CONTENT_BOTTOM_PADDING =
    "calc(89px + max(0px, 30px - var(--app-inset-bottom)))"`;
  - `CONTENT_BOTTOM_PADDING_WITH_FAB =
    "calc(145px + max(0px, 30px - var(--app-inset-bottom)))"`.
- Использовать константы:
  - `89px`: `routes/home.tsx`, `routes/task-detail.tsx`,
    `components/home/home-skeleton.tsx`,
    `components/errors/error-screen.tsx`,
    `components/layout/route-skeleton.tsx`;
  - `145px`: `routes/tasks.tsx`, `routes/task-search.tsx`.
- Создать `app/components/tasks/task-rows-skeleton.tsx` с
  `TaskRowsSkeleton({ rows })`, повторяющий только карточку строк
  скелетона: `rounded-[25px] bg-app-card px-[15px] py-[15px]`,
  `min-h-[67px]`, аватар `35px`, две линии, бейдж, шеврон и
  разделитель под всеми строками, кроме последней.
- `TodayTasksSkeleton` и `SearchTasksSkeleton` используют общий
  компонент для карточки строк; заголовки, `section`-обёртки и
  `pt-4` остаются на местах. Классы и геометрия сохраняются дословно.

### FR-10. Безопасный маппинг ошибок Zod

- В `app/lib/tasks/quick-task-schema.ts` заменить
  `issue.path.join(".") as keyof QuickTaskDraft` на маппинг по первому
  сегменту пути:
  - берётся `issue.path[0]`;
  - если это не строка или не ключ `QuickTaskDraft`, issue пропускается;
  - вложенные пути (`labelIds.0`) попадают в поле `labelIds`.
- Валидные данные и текущие сообщения об ошибках не меняются.
- Cast `id as TaskSegmentId` в `task-segments.tsx` остаётся: options
  сегментов статически совпадают с union, риск отсутствует.

### FR-11. Тесты и документация

- Новые тесты Vitest:
  - `app/lib/tasks/completion-cache.test.ts`;
  - `app/lib/tasks/task-completion.test.ts`;
  - `app/lib/tasks/completion-feedback.test.ts`;
  - `app/lib/projects/projects-query.test.ts`;
  - `app/lib/labels/labels-query.test.ts`;
  - `app/lib/errors/async.test.ts`;
  - `app/lib/layout.test.ts`;
  - `app/components/tasks/task-rows-skeleton.test.ts`.
- Обновляемые тесты:
  - `app/lib/tasks/today-tasks.test.ts` — `normalizeCompleted`;
  - `app/lib/tasks/search-filters.test.ts` — fingerprint без меток;
  - `app/lib/tasks/search-tasks-cache.test.ts` — новые строки ключа и
    независимость от `labelIds`;
  - `app/lib/tasks/quick-task-schema.test.ts` — путь ошибки `labelIds`.
- Существующие тесты хуков, cache-модулей, route-модулей, шагов
  quick-add и error-экранов должны проходить без изменения ожидаемого
  поведения.
- `AGENTS.md` обновляется по FR-7 и перечисляет новые модули.

## 4. Визуальная спецификация

### 4.1. Инварианты вёрстки

- Вёрстка, классы Tailwind, размеры, отступы, токены `app-*` и
  DOM-структура экранов не меняются.
- Извлечение `TaskRowsSkeleton` и констант нижнего отступа обязано
  давать те же строки классов и те же inline-стили.
- `AppErrorPage` после перехода на `BottomNavigationDock` сохраняет
  fixed-позиционирование, safe-area, `max-w-md`, `px-4` и активную
  вкладку «Главная»; дополнительные transition-классы не влияют на
  статический вид.
- Light/dark через `data-app-theme`, ширины 320/412/448 px и safe-area
  остаются без изменений.

### 4.2. Что не проверяется визуально

- Новые экраны, состояния и тексты не добавляются.
- Figma-фреймы не пересматриваются: это внутренний рефакторинг.

## 5. Нефункциональные требования

- TypeScript strict, без `any`; типы импортируются через `import type`.
- Новые зависимости не добавляются; используются существующие
  `@tanstack/react-query`, `vitest`.
- Backend, `docs/api.md`, `root.tsx`, глобальные провайдеры, SSR и
  маршруты не меняются.
- Все запросы остаются в `app/lib/api/` и `app/lib/tasks/tasks-api.ts`;
  новых `fetch` нет.
- Файлы — `kebab-case`, экспортируемые компоненты — `PascalCase`,
  импорты через `~/*`.
- Тесты — Vitest, `app/**/*.test.ts`, без jsdom и Testing Library.
- Линтер не настроен; `npm run lint` не добавляется.
- Токены, `initData` и секреты не логируются и не попадают в новые
  модули.
- Производительность: переключение только меток не создаёт новый
  серверный запрос; остальные запросы и инвалидации не меняются.
- Совместимость: публичные имена функций, ключи кэша и типы, которые
  используют тесты и соседние модули, сохраняются.
- Не коммитить изменения без явного разрешения пользователя.
- Не начинать реализацию до утверждения этой спецификации и плана.

## 6. Вне scope

- Новые продуктовые сценарии, экраны, кнопки, тексты и Figma-состояния.
- Изменение backend/OpenAPI и `docs/api.md`.
- Переписывание `task-search.tsx` на `keepPreviousData` без
  `lastResultsRef`: текущий ref сохраняет последние успешные результаты
  при ошибке, а placeholder этого не делает; поведение сохраняется.
- Введение descriptor registry для шагов quick-add и фильтров поиска:
  это добавит косвенность и риск без текущей необходимости.
- Извлечение общих `SelectableRow`/`InlineErrorCard` из шагов:
  визуальные классы и тесты чувствительны к разметке; дублирование
  локальное и стабильное.
- Дробление `search-filters.ts` на model/query/display: модуль
  целостный, дробление увеличит импортную поверхность.
- Объединение ключей прогресса `/` и `/tasks`: изменит loading/error-
  семантику экранов.
- Удаление внешнего single-flight в `api/client.ts`: auth-чувствительно,
  выигрыша для пользователя нет.
- Разбор `useVoiceRecorder`, `BottomSheet`, провайдеров и других
  крупных модулей: высокий риск, не относится к устранению найденных
  дублирований.
- Перенос `use-create-quick-task.ts` и `use-quick-task-form.ts` в
  `app/hooks`: co-location с фичей осознанная, перенос даст churn.
- Извлечение общей русской плюрализации: две малые функции, отдельный
  модуль не оправдан.
- Удаление неиспользуемых опций `auth: false`/`retryOnUnauthorized` и
  инвалидации `["task-series"]`: безвредный задел, тесты используют
  опции.
- Объединение `chevron_right.svg` и `chevron-right.svg`: разный цвет
  (`#7A7D83` против `currentColor`), объединение изменит вид.
- E2E и браузерные тесты; ручные проверки в Telegram остаются
  обязательными.

## 7. Критерии приёмки

- [ ] `completion-cache.ts`, `task-completion.ts`,
      `completion-feedback.ts` созданы; три cache-модуля и три фабрики
      используют общие помощники; поведение завершения, отката,
      haptics и инвалидаций не изменилось.
- [ ] `normalizeCompleted` используется в cache и обеих progress-
      карточках; для `total >= 0` прогресс остаётся в диапазоне
      `0…total`.
- [ ] `projectsQueryOptions`/`labelsQueryOptions` используются во всех
      четырёх местах запроса; инвалидации используют
      `PROJECTS_QUERY_KEY`; ключи остаются `["projects"]`/`["labels"]`.
- [ ] `TASK_COMPLETION_ERROR` и `getPendingTaskId`/`getCompletionError`
      используются на `/tasks`, `/tasks/search`, `/tasks/:id`; тексты
      не изменились.
- [ ] `searchFiltersFingerprint` не содержит `labelIds`; переключение
      только метки не меняет ключ и не создаёт новый `GET /tasks`;
      клиентская фильтрация по AND сохраняется.
- [ ] `isAbortError` существует в одном месте; `http.ts`,
      `auth/failure.ts` и `use-voice-recorder.ts` используют его;
      старые импорты из `~/lib/auth/failure` работают.
- [ ] Мёртвые `button.tsx`, `card.tsx`, `format-date.ts` и shim
      `search-filter.ts` удалены; прямые импорты `matchesSearchQuery`
      работают; `AGENTS.md` обновлён.
- [ ] `AppErrorPage` использует `BottomNavigationDock`; error-экран
      визуально не изменился, тест `app-error-page.test.ts` проходит.
- [ ] Константы нижнего отступа используются во всех семи местах;
      `TaskRowsSkeleton` используется обоими скелетонами; обёртки,
      заголовки и разметка строк не изменились.
- [ ] `quickTaskResolver` кладёт ошибку дублирующихся `labelIds` в
      `labelIds`, а не в `labelIds.0`; валидные данные не затронуты.
- [ ] `npm test`, `npm run typecheck`, `npm run build` проходят.
- [ ] Ручная проверка: `/`, `/tasks`, `/tasks/search`, `/tasks/:id`,
      error-экраны на 320/412/448 px, light/dark, safe-area; завершение
      и возврат задачи; фильтры и метки; быстрое создание.
- [ ] SSR-ответы не содержат защищённых данных; публичные `meta` не
      изменились.

## 8. Принятые решения

1. **F3 оставляем как есть.** `keepPreviousData` — это placeholder на
   время нового запроса. `lastResultsRef` дополнительно сохраняет
   последний успешный ответ, когда новый запрос завершился ошибкой.
   Удаление ref изменило бы экран ошибки на экран с устаревшими
   результатами; это запрещено условием «поведение не меняется».
2. **F6/F7 без registry.** Явные union/switch читаются линейно и
   проверяются существующими тестами. Registry шагов добавил бы
   косвенность, порядок регистрации и риск рассинхронизации refs/фокуса
   ради редкого добавления шага.
3. **F8 без общего `SelectableRow`.** Строки quick-add и фильтров
   различаются ведущими иконками, role, разделителями и поведением
   фокуса. Общий компонент с вариантами стал бы сложнее текущих
   локальных копий; визуальные тесты чувствительны к классам.
4. **F11 без дробления.** `search-filters.ts` — связная модель
   фильтров: типы, query, предикаты и fingerprint меняются вместе.
   Дробление на три файла увеличит импорты без устранения реального
   дефекта.
5. **F13 без объединения ключей.** `/` использует отдельный
   `["tasks","today","progress",...]`, `/tasks` — комбинированный
   `["tasks","today",...]`. Объединение изменит моменты появления
   скелетона/ошибки на одном из экранов.
6. **F14 без удаления внешнего single-flight.** Внутренний
   single-flight в `auth-api.ts` уже есть, но внешний слой в
   `api/client.ts` безвреден и изолирует вызывающих от изменений
   auth-слоя. Трогать auth ради косметики не будем.
7. **F19/F20 без декомпозиции.** `useVoiceRecorder`, `BottomSheet`,
   провайдеры и `QuickAddComposer` большие, но целостные; их разбор
   требует отдельных спек и ручных проверок, а не входит в задачу
   устранения дублирований.
8. **F22: Zod path исправляем, cast `SegmentedControl` принимаем.**
   Вложенный путь `labelIds.0` — реальный дефект отображения ошибки.
   Cast сегментов безопасен: `TASK_SEGMENTS` статически совпадает с
   `TaskSegmentId`.
9. **F23: общие типы завершения выносим, остальное принимаем.**
   `TaskCompletionVariables` устраняет три копии. `ProjectProgress` и
   `TodayProgressResponse` относятся к разным API-контрактам; их
   объединение свяжет независимые модули.
10. **F24: shim удаляем, обёртку `QuickAddHeader` оставляем.** Shim —
    лишний слой импорта. `getQuickAddHeader(step).title` — маленькая
    стабильная точка расширения, менять её ради одной строки не нужно.
11. **F25/F26/F27/F28 принимаем.** Co-location хуков quick-add,
    две плюрализации, неиспользуемые опции и разные chevron-ассеты не
    создают текущих дефектов; их исправление — churn без выигрыша.
12. **FR-5 — единственное сетевое изменение.** Меньше запросов при
    переключении меток; пользовательский результат и кэш остаются
    прежними. Это осознанное исправление, а не смена логики.

## 9. Связь с существующими спецификациями

- `docs/specs/2026-11-07-task-search/spec.md`:
  - метки уже применяются на клиенте по AND и не уходят в API;
    FR-5 приводит ключ кэша в соответствие с этим контрактом;
  - серверные параметры, `limit=100`, `keepPreviousData` и
    `filterTasksForDisplay` не меняются.
- `docs/specs/2026-11-06-today-tasks/spec.md`:
  - оптимистичное завершение, прогресс и инвалидации сохраняются;
    FR-1/FR-3/FR-4 только устраняют дублирование.
- `docs/specs/2026-11-08-task-detail/spec.md`:
  - детальный кэш `["tasks","detail",id]`, завершение, удаление и
    инвалидации не меняются; фабрика завершения становится общей.
- `docs/specs/2026-11-07-quick-add-label-project-figma/spec.md`:
  - read-only запросы меток/проектов сохраняют ключи и `enabled`;
    удаляется только неиспользуемый shim.
- `docs/specs/2026-11-03-error-pages/spec.md`:
  - `AppErrorPage` визуально и функционально не меняется; нижняя
    навигация переиспользует существующий док.
- `docs/specs/2026-11-02-home-dashboard/spec.md`:
  - палитра, типографика и нижние отступы не меняются; константы
    выносятся без изменения значений.
