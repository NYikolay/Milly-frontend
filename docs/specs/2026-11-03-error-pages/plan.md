# Milly Error Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить полноэкранные состояния 404/429/5xx по шести фреймам Figma, классифицировать route/API-ошибки, сохранить HTTP-статусы через SSR и встроить экраны в корневой и `_app` error boundaries без глобального перехвата API.

**Architecture:** Чистые модули `app/lib/errors/` классифицируют ошибку в `AppErrorDescriptor` и отдают копирайт. Презентационные `ErrorScreen`/`AppErrorPage` рендерят карточку, подсказку и существующую нижнюю навигацию. `AppErrorBoundary` связывает descriptor с действиями React Router (`navigate`, `useRevalidator`) и используется в `root.tsx` и `routes/_app.tsx`. `throwAppError` превращает `ApiError` в `throw data(...)`, чтобы статус и `request_id` пережили SSR.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Tailwind CSS 4, Vitest (`node`), `renderToStaticMarkup` для презентационных компонентов.

**Spec:** `docs/specs/2026-11-03-error-pages/spec.md`

## Global Constraints

- Работа идёт в текущем рабочем дереве; в нём уже есть незакоммиченные изменения bootstrap-бюджета, axios-миграция, изменённый `AuthScreen` и удалённые старые `plan.md`. Их нельзя откатывать или переписывать.
- Не коммитить, не менять git-историю и не создавать ветки без отдельного запроса пользователя. Review diffs — через `.superpowers/sdd/plan/snapshot-tree.sh`.
- Новых runtime-зависимостей нет. Не добавлять jsdom/testing-library.
- Только `app-*` токены; `dark:`-классы не использовать.
- 404/429/5xx показываются только через route error boundaries. Глобальный перехват React Query/`apiRequest` не добавлять.
- Корневой `ErrorBoundary` находится вне `AppProviders`: в нём нельзя использовать `useTelegram`, `useAuth`, React Query и haptics.
- `_app` boundary рендерит тот же экран, но сохраняет корневые `AppProviders`.
- Нижняя навигация отображается на всех error-экранах, активна `home`, вкладки не навигируют.
- 404 доступна без авторизации; unmatched URL сохраняет HTTP `404`.
- `throwAppError` — единственный способ пробросить `ApiError` 429/5xx из loader/action без потери статуса в production SSR.
- `window`/`document` — только в обработчиках и эффектах, не на верхнем уровне модулей.
- Не редактировать `.react-router/types/`.
- DEV preview `?state=429` и `?state=5xx` не активен в production.
- Все проверки: `npm test`, `npm run typecheck`, `npm run build`.
- Не логировать `requestId`, `initData`, access/refresh токены.

## Review Focus

- Unmatched URL должен отдавать HTTP `404`, а не `200`, и рендерить публичный 404-экран без `AuthGate`.
- 429/5xx, брошенные из loader/action на SSR, должны сохранять статус и `requestId`; обычный `Error` санитизируется и не подходит.
- 5xx без `requestId` не должен показывать пустую строку `Код ошибки:`.
- Retry для route error/ApiError/ApiNetworkError должен идти через revalidation, а для render-ошибки — через reload; повторный клик во время revalidation не должен запускать вторую попытку.
- «Назад» без in-app истории должен вести на `/`, а не закрывать Mini App.
- Root boundary не должен падать из-за хуков провайдеров; 404/5xx на корневом уровне обязаны рендериться без `TelegramProvider`.
- На 320 px и при safe-area нижняя навигация не должна перекрывать карточку; подсказка должна быть доступна (обычный preview-код — без прокрутки, длинный `requestId` — прокруткой документа).

---

## Setup (executor, before Task 1)

- [ ] **Step 1: Зафиксировать baseline и SDD ledger**

Run:
```bash
bash .superpowers/sdd/plan/snapshot-tree.sh
printf '%s\n' 'docs/specs/2026-11-03-error-pages/plan.md' > .superpowers/sdd/plan/plan-path
```

Expected: команда печатает tree hash; `plan-path` указывает на новый plan. Создать/обновить `progress.md` с baseline tree, ruling «no commits» и списком предсуществующих изменений. Старый ledger можно архивировать, но не удалять пользовательские изменения.

- [ ] **Step 2: Pre-flight scan**

Проверить, что задачи не конфликтуют по файлам:

| Tasks | Shared surface | Finding |
|---|---|---|
| 1,2 | `AppErrorDescriptor` | T1 produces, T2 consumes |
| 1,3 | `shouldReloadOnRetry` | T1 produces, T3/T5 consumes |
| 2,3,4 | `AppErrorCopy`, `ErrorScreen` | T2 produces copy, T3 produces screen, T4 wraps |
| 3,4 | `ErrorScreen` props | T3 defines props, T4 forwards them |
| 4,5 | `AppErrorPage` | T4 produces, T5 consumes |
| 5,6 | `AppErrorBoundary` | T5 produces, T6 integrates |
| 6,7 | DEV preview | T6 leaves boundary ready, T7 adds preview |
| 7,8 | verification/docs | T7 verifies behavior, T8 documents |

Expected: no file/interface conflicts; if a conflict appears, fix the plan before Task 1.

---

### Task 1: Классификация ошибок и `throwAppError`

**Files:**
- Create: `app/lib/errors/app-error.ts`
- Create: `app/lib/errors/route-error.ts`
- Test: `app/lib/errors/app-error.test.ts`
- Test: `app/lib/errors/route-error.test.ts`

**Interfaces:**
- Produces:
```ts
export type AppErrorKind = "not-found" | "rate-limited" | "server";

export interface AppErrorDescriptor {
  kind: AppErrorKind;
  status: number | null;
  requestId: string | null;
}

export interface AppErrorPayload {
  appError: AppErrorDescriptor;
}

export function classifyAppError(error: unknown): AppErrorDescriptor;
export function isAppErrorPayload(value: unknown): value is AppErrorPayload;
export function shouldReloadOnRetry(error: unknown): boolean;
```
- Produces in `route-error.ts`:
```ts
export function throwAppError(error: unknown): never;
```
- Consumes: `ApiError`, `ApiNetworkError` из `app/lib/api/errors.ts`; `data`, `isRouteErrorResponse` из `react-router`.

- [ ] **Step 1: Написать падающие тесты классификации**

В `app/lib/errors/app-error.test.ts` покрыть:

```ts
function routeError(status: number, data: unknown = null): unknown {
  return { status, statusText: "", internal: false, data };
}
```

- `routeError(404)` → `{ kind: "not-found", status: 404, requestId: null }`;
- `routeError(429)` → `rate-limited`;
- `routeError(500)` → `server`;
- `routeError(429, { appError: { kind: "rate-limited", status: 429, requestId: "req-1" } })` → `requestId: "req-1"`;
- `routeError(500, { request_id: "req-2" })` → `requestId: "req-2"`;
- `new ApiError("...", { status: 404, code: "not_found", requestId: "req-3" })` → `not-found`/`req-3`;
- `ApiError` 429 → `rate-limited`;
- `ApiError` 500 и 503 → `server`;
- `ApiError` 422 → `server` со статусом 422;
- `new ApiNetworkError("...")` → `server`, `status: null`;
- `new Error("...")` и `"boom"` → `server`, `status: null`;
- `ApiError` с `requestId: ""` → `requestId: null`;
- `shouldReloadOnRetry(routeError(500))` → `false`;
- `shouldReloadOnRetry(ApiError)` → `false`;
- `shouldReloadOnRetry(ApiNetworkError)` → `false`;
- `shouldReloadOnRetry(new Error("render"))` → `true`;
- `shouldReloadOnRetry("boom")` → `true`;
- `isAppErrorPayload({ appError: { kind: "server", status: 500, requestId: null } })` → `true`;
- `isAppErrorPayload({ appError: { kind: "unknown" } })` → `false`.

- [ ] **Step 2: Написать падающие тесты `throwAppError`**

В `app/lib/errors/route-error.test.ts`:

```ts
let thrown: unknown;

try {
  throwAppError(
    new ApiError("Internal server error", {
      status: 500,
      code: "internal_error",
      requestId: "req-1",
    }),
  );
} catch (error) {
  thrown = error;
}

expect(thrown).toMatchObject({
  type: "DataWithResponseInit",
  data: {
    appError: { kind: "server", status: 500, requestId: "req-1" },
  },
  init: { status: 500 },
});
```

Дополнительно:
- `throwAppError(new Error("boom"))` → status 500, payload `server/null`;
- `throwAppError(routeError(404))` пробрасывает тот же объект (сравнить по `toBe`);
- `throwAppError(new ApiError(... status 429 ...))` → status 429;
- `throwAppError(new ApiNetworkError("..."))` → status 500.

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run:
```bash
npm test -- app/lib/errors/app-error.test.ts app/lib/errors/route-error.test.ts
```
Expected: FAIL — модули/функции не существуют.

- [ ] **Step 4: Реализовать `app-error.ts`**

Порядок классификации:

1. `isRouteErrorResponse(error)` — статус из `error.status`, `requestId` из `error.data`;
2. `error instanceof ApiError` — статус и `requestId` из ошибки;
3. `error instanceof ApiNetworkError` — `server/null`;
4. иначе — `server/null`.

`requestId` читается в таком порядке: `data.appError.requestId` (через
`isAppErrorPayload`), `data.requestId`, `data.request_id`; пустая строка
нормализуется в `null`. Для `ApiError` пустой `requestId` тоже
нормализуется в `null`.

`shouldReloadOnRetry` возвращает `false` для route response, `ApiError` и
`ApiNetworkError`, иначе `true`.

- [ ] **Step 5: Реализовать `route-error.ts`**

- Если `isRouteErrorResponse(error)` — `throw error`.
- Иначе вызвать `classifyAppError`, затем:
```ts
throw data(
  { appError: descriptor } satisfies AppErrorPayload,
  { status: descriptor.status ?? 500 },
);
```

- [ ] **Step 6: Прогнать тесты и типы**

Run:
```bash
npm test -- app/lib/errors/app-error.test.ts app/lib/errors/route-error.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 2: Копирайт error-экранов

**Files:**
- Create: `app/lib/errors/copy.ts`
- Test: `app/lib/errors/copy.test.ts`

**Interfaces:**
- Consumes: `AppErrorDescriptor` из Task 1.
- Produces:
```ts
export interface AppErrorCopy {
  title: string;
  description: string[];
  primaryAction: "home" | "retry";
  primaryLabel: string;
  secondaryLabel: string;
  hint: string[];
}

export function getAppErrorCopy(
  descriptor: AppErrorDescriptor,
): AppErrorCopy;
```

- [ ] **Step 1: Написать падающие тесты копирайта**

Проверить точные значения:

- 404:
  - title `Страница не найдена`;
  - description `["Возможно, ссылка устарела или страница была перемещена."]`;
  - `primaryAction: "home"`, `primaryLabel: "На главную"`;
  - `secondaryLabel: "Назад"`, `hint: []`.
- 429:
  - title `Слишком много запросов`;
  - description `["Вы отправили слишком много запросов подряд. Подождите немного и повторите попытку."]`;
  - `primaryAction: "retry"`, `primaryLabel: "Повторить запрос"`;
  - `hint: ["Сделайте небольшую паузу"]`;
  - `requestId` игнорируется.
- 5xx со статусом 500 и `requestId: "req-1"`:
  - title `Что-то пошло не так`;
  - description — два абзаца:
    `["Не удалось выполнить запрос. Попробуйте ещё раз чуть позже.", "В случае повторения ошибки пожалуйста, обратитесь в службу поддержки."]`;
  - `primaryAction: "retry"`, `primaryLabel: "Попробовать снова"`;
  - `hint: ["Ошибка на стороне сервера.", "Код ошибки: req-1"]`.
- 5xx без `requestId` → hint только `["Ошибка на стороне сервера."]`.
- `server` со статусом 422 → hint `[]`, description остаётся 5xx-текстом.
- `server` со статусом `null` → hint с серверной строкой.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run:
```bash
npm test -- app/lib/errors/copy.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Реализовать `copy.ts`**

Switch по `descriptor.kind`; для `server` добавлять серверную строку
только если `status === null || status >= 500`. Код ошибки добавлять
только при непустом `requestId`. Тексты копировать из spec §FR-7
дословно.

- [ ] **Step 4: Прогнать тесты и типы**

Run:
```bash
npm test -- app/lib/errors/copy.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 3: Презентационный `ErrorScreen`

**Files:**
- Create: `app/components/errors/error-screen.tsx`
- Test: `app/components/errors/error-screen.test.ts`

**Interfaces:**
- Consumes: `AppErrorDescriptor` (Task 1), `getAppErrorCopy` (Task 2).
- Produces:
```ts
export interface ErrorScreenProps {
  descriptor: AppErrorDescriptor;
  onHome: () => void;
  onBack: () => void;
  onRetry: () => void;
  retryPending?: boolean;
}

import type { ReactElement } from "react";

export function ErrorScreen(props: ErrorScreenProps): ReactElement;
```

- [ ] **Step 1: Написать падающие тесты разметки**

В `app/components/errors/error-screen.test.ts` использовать
`renderToStaticMarkup` (без jsdom):

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorScreen } from "./error-screen";

const noop = () => {};
const html = renderToStaticMarkup(
  createElement(ErrorScreen, {
    descriptor: { kind: "server", status: 500, requestId: "req-1" },
    onHome: noop,
    onBack: noop,
    onRetry: noop,
  }),
);
```

Проверить:

- `role="alert"`, `aria-labelledby`, `aria-describedby`;
- `h1` с `tabindex="-1"`;
- логотип `alt=""`;
- 404: `Страница не найдена`, `На главную`, `Назад`, отсутствие
  `Сделайте небольшую паузу` и `Код ошибки:`;
- 429: `Слишком много запросов`, `Повторить запрос`,
  `Сделайте небольшую паузу`, отсутствие `Код ошибки:`;
- 5xx: `Что-то пошло не так`, оба абзаца, `Попробовать снова`,
  `Ошибка на стороне сервера.`, `Код ошибки: req-1`;
- 5xx без `requestId` не содержит `Код ошибки:`;
- для 5xx/429 основная кнопка — `<button>`; для 404 — кнопка
  «На главную»;
- при `retryPending: true` основная кнопка содержит `disabled` и
  `aria-busy="true"`;
- вторая кнопка содержит `Назад`.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run:
```bash
npm test -- app/components/errors/error-screen.test.ts
```
Expected: FAIL — компонент не существует.

- [ ] **Step 3: Реализовать `ErrorScreen`**

Структура (финальная коррекция layout по итогам review — подсказка
в обычном потоке, карточка центрируется grid-строками):

```tsx
<main
  className="relative flex flex-1 flex-col overflow-y-auto px-[25px] pt-[24px]"
  style={{
    paddingBottom:
      "calc(89px + max(0px, 30px - var(--app-inset-bottom)))",
  }}
>
  <div
    className={`grid min-h-0 w-full max-w-[362px] flex-1 justify-items-center mx-auto ${
      hasHint
        ? "grid-rows-[minmax(0,1fr)_auto_minmax(57px,1fr)] [@media(max-height:620px)]:grid-rows-[minmax(0,1fr)_auto_minmax(57px,auto)]"
        : "grid-rows-[minmax(0,1fr)_auto_minmax(0px,1fr)]"
    }`}
  >
    <div
      className={`col-start-1 row-start-2 ${CARD_CLASSES}`}
      role="alert"
      ...
    >
      <img src={logoIcon} alt="" className="h-[50px] w-[50px]" />
      <div className={TEXT_BLOCK_CLASSES}>
        <h1 ...>{copy.title}</h1>
        <div id={descriptionId} className={DESCRIPTION_GROUP_CLASSES}>
          {copy.description.map((paragraph) => (
            <p key={paragraph} className={DESCRIPTION_CLASSES}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
      <div className={ACTIONS_CLASSES}>{actions}</div>
    </div>
    {hasHint ? (
      <div
        id={hintId}
        className="col-start-1 row-start-3 mt-[15px] flex w-full min-w-0 flex-col items-center gap-[5px] self-start"
      >
        {copy.hint.map((line) => (
          <p key={line} className={HINT_CLASSES}>
            {line}
          </p>
        ))}
      </div>
    ) : null}
  </div>
</main>
```

У `main` нет ограничения `max-height`: на коротких экранах документ
растёт по контенту, подсказка остаётся в обычном потоке и
прокручивается выше фиксированной навигации. `min-h-0` у
grid-контейнера позволяет flex/grid распределять свободное место, не
блокируя рост документа. На коротких экранах третья строка становится
`minmax(57px,auto)`, чтобы верхняя `1fr`-строка схлопнулась и обычный
preview-код помещался без прокрутки. Длинные `requestId` переносятся
благодаря `max-w-full break-words`; `min-w-0` у контейнера подсказки не
даёт grid-колонке расшириться, поэтому горизонтального скролла нет.

Классы (точные значения):

```ts
const CARD_CLASSES =
  "flex w-full max-w-[362px] flex-col items-center gap-[20px] rounded-[25px] bg-app-card px-[15px] py-[30px] text-center [@media(max-height:620px)]:py-[20px]";
const TEXT_BLOCK_CLASSES = "flex w-full flex-col items-center gap-[15px]";
const DESCRIPTION_GROUP_CLASSES =
  "flex w-full flex-col items-center gap-[15px]";
const DESCRIPTION_CLASSES =
  "text-[15px] leading-[1.3] text-app-text-secondary";
const TITLE_CLASSES =
  "text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text";
const ACTIONS_CLASSES = "flex w-full flex-col gap-[15px]";
const PRIMARY_BUTTON_CLASSES =
  "flex h-[50px] w-full items-center justify-center rounded-[25px] bg-app-accent text-[15px] font-semibold text-white active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:opacity-60";
const SECONDARY_BUTTON_CLASSES =
  "-my-[13px] flex min-h-[44px] items-center justify-center text-[15px] font-semibold text-app-accent active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent";
const HINT_CLASSES =
  "max-w-full break-words text-[13px] leading-[1.4] text-app-text-secondary";
```

- `useId()` для `titleId`, `descriptionId`, `hintId`;
  `aria-describedby` собирается из description + hint (если есть).
- `useRef<HTMLHeadingElement>` + эффект фокуса на заголовок при mount.
- Второй эффект: при переходе `retryPending` в `true` фокусировать
  заголовок, чтобы disabled-кнопка не потеряла фокус в `body`.
- Для `primaryAction === "home"` рендерить `<button type="button"
  className={PRIMARY_BUTTON_CLASSES} onClick={onHome}>`.
- Для `primaryAction === "retry"` рендерить `<button type="button"
  disabled={retryPending} aria-busy={retryPending}
  className={PRIMARY_BUTTON_CLASSES} onClick={onRetry}>`.
- Вторичная кнопка — `<button type="button"
  className={SECONDARY_BUTTON_CLASSES} onClick={onBack}>
  {copy.secondaryLabel}</button>`.
- Не использовать `Link`/`useNavigate` внутри компонента: он должен
  рендериться без router-контекста и без провайдеров.

- [ ] **Step 4: Прогнать тесты и типы**

Run:
```bash
npm test -- app/components/errors/error-screen.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 4: `AppErrorPage` с shell и навигацией

**Files:**
- Create: `app/components/errors/app-error-page.tsx`
- Test: `app/components/errors/app-error-page.test.ts`

**Interfaces:**
- Consumes: `ErrorScreen` и его props из Task 3; `AppShell`;
  `BottomNavigation`.
- Produces:
```ts
export interface AppErrorPageProps extends ErrorScreenProps {}

import type { ReactElement } from "react";

export function AppErrorPage(props: AppErrorPageProps): ReactElement;
```

- [ ] **Step 1: Написать падающий тест страницы**

`renderToStaticMarkup` для `AppErrorPage` с `kind: "not-found"`.
Проверить:

- есть `aria-label="Основная навигация"`;
- есть тексты `Главная`, `Задачи`, `Финансы`, `Воркспейсы`;
- активная вкладка имеет `aria-current="page"`;
- есть `Страница не найдена`;
- разметка содержит fixed-контейнер навигации (например, класс
  `fixed` и `bottom-0`).

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run:
```bash
npm test -- app/components/errors/app-error-page.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Реализовать `AppErrorPage`**

```tsx
<AppShell>
  <ErrorScreen {...props} />
  <div
    className="fixed inset-x-0 bottom-0 z-20"
    style={{
      paddingBottom: "max(30px, var(--app-inset-bottom))",
      paddingLeft: "var(--app-inset-left)",
      paddingRight: "var(--app-inset-right)",
    }}
  >
    <div className="mx-auto w-full max-w-md px-4">
      <BottomNavigation active="home" />
    </div>
  </div>
</AppShell>
```

- Не добавлять `onSelect` и haptics.
- Не менять `BottomNavigation`, `AppShell` и `home.tsx`.

- [ ] **Step 4: Прогнать тест и типы**

Run:
```bash
npm test -- app/components/errors/app-error-page.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 5: `AppErrorBoundary` и helper навигации

**Files:**
- Create: `app/lib/errors/navigation.ts`
- Create: `app/lib/errors/navigation.test.ts`
- Create: `app/components/errors/app-error-boundary.tsx`

**Interfaces:**
- Consumes: `classifyAppError`, `shouldReloadOnRetry` (Task 1),
  `AppErrorPage` (Task 4).
- Produces:
```ts
export function shouldGoBack(historyState: unknown): boolean;

export interface AppErrorBoundaryProps {
  error: unknown;
}

export function AppErrorBoundary(
  props: AppErrorBoundaryProps,
): ReactElement;
```

- [ ] **Step 1: Написать падающие тесты `shouldGoBack`**

В `app/lib/errors/navigation.test.ts`:

- `{ idx: 1 }` → `true`;
- `{ idx: 0 }` → `false`;
- `{ idx: -1 }` → `false`;
- `{ idx: "1" }` → `false`;
- `null`, `undefined`, `{}`, `"1"` → `false`.

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run:
```bash
npm test -- app/lib/errors/navigation.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Реализовать `navigation.ts`**

```ts
export function shouldGoBack(historyState: unknown): boolean {
  if (typeof historyState !== "object" || historyState === null) {
    return false;
  }

  const idx = (historyState as { idx?: unknown }).idx;

  return typeof idx === "number" && Number.isInteger(idx) && idx > 0;
}
```

- [ ] **Step 4: Реализовать `AppErrorBoundary`**

```tsx
import { useNavigate, useRevalidator } from "react-router";

import { classifyAppError, shouldReloadOnRetry } from "~/lib/errors/app-error";
import { shouldGoBack } from "~/lib/errors/navigation";

import { AppErrorPage } from "./app-error-page";

export interface AppErrorBoundaryProps {
  error: unknown;
}

export function AppErrorBoundary({ error }: AppErrorBoundaryProps) {
  const descriptor = classifyAppError(error);
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const retryPending = revalidator.state !== "idle";

  const handleHome = () => {
    navigate("/");
  };

  const handleBack = () => {
    if (shouldGoBack(window.history.state)) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const handleRetry = () => {
    if (shouldReloadOnRetry(error)) {
      window.location.reload();
      return;
    }

    void revalidator.revalidate();
  };

  return (
    <AppErrorPage
      descriptor={descriptor}
      retryPending={retryPending}
      onHome={handleHome}
      onBack={handleBack}
      onRetry={handleRetry}
    />
  );
}
```

- `window` используется только внутри обработчиков.
- `revalidator.revalidate()` вызывается с `void`.
- `retryPending` блокирует повторный клик через `ErrorScreen`.

- [ ] **Step 5: Прогнать тесты и типы**

Run:
```bash
npm test -- app/lib/errors/navigation.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 6: Интеграция boundary в root и `_app`

**Files:**
- Modify: `app/root.tsx`
- Modify: `app/routes/_app.tsx`

**Interfaces:**
- Consumes: `AppErrorBoundary` из Task 5.
- Produces: корневой `ErrorBoundary` и `_app` `ErrorBoundary`,
  рендерящие общий экран.

- [ ] **Step 1: Заменить корневой `ErrorBoundary`**

В `app/root.tsx`:

- удалить импорты `isRouteErrorResponse`, `Link` и старую разметку
  `ErrorBoundary`;
- добавить импорт `AppErrorBoundary`;
- оставить:

```tsx
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <AppErrorBoundary error={error} />;
}
```

- Не оборачивать boundary в `AppProviders`.
- Остальные импорты (`Links`, `Meta`, `Outlet`, `Scripts`,
  `ScrollRestoration`, `AppProviders`, `getBootWatchdogScript`) не
  менять.

- [ ] **Step 2: Добавить `_app` boundary**

В `app/routes/_app.tsx`:

```tsx
import type { Route } from "./+types/_app";
import { AppErrorBoundary } from "~/components/errors/app-error-boundary";

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <AppErrorBoundary error={error} />;
}
```

- `default export AppLayout` не менять.
- `AuthGate` и `AppShell` остаются в обычном дереве; при ошибке их
  заменяет boundary.

- [ ] **Step 3: Прогнать тесты, типы и сборку**

Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: PASS.

- [ ] **Step 4: Проверить 404 в production SSR**

Run:
```bash
PORT=3100 npm start > /tmp/milly-error-pages-server.log 2>&1 &
echo $! > /tmp/milly-error-pages-server.pid
sleep 2
curl -sS -o /tmp/error-404.html -w '%{http_code}\n' http://localhost:3100/does-not-exist
rg -n "Страница не найдена|На главную|Назад|Основная навигация" /tmp/error-404.html
curl -sS http://localhost:3100/ | rg -n "Проверяем вход|Страница не найдена"
kill "$(cat /tmp/milly-error-pages-server.pid)"
```

Expected:
- первый `curl` печатает `404`;
- HTML содержит тексты 404-экрана и навигацию;
- `/` содержит `Проверяем вход`, но не содержит `Страница не найдена`;
- сервер остановлен.

Если порт 3100 занят, использовать 3101 и указать его в командах.

---

### Task 7: DEV preview и проверка 429/5xx

**Files:**
- Modify: `app/routes/home.tsx`

**Interfaces:**
- Consumes: `throwAppError` (Task 1), `ApiError`.
- Produces: DEV-only preview `?state=429` и `?state=5xx`.

- [ ] **Step 1: Добавить DEV preview в loader**

В `app/routes/home.tsx`:

```ts
const state = new URL(request.url).searchParams.get("state");
const emptyPreview = state === "empty";

if (import.meta.env.DEV) {
  if (state === "429") {
    throwAppError(
      new ApiError("Too many requests", {
        status: 429,
        code: "rate_limited",
        requestId: "",
      }),
    );
  }

  if (state === "5xx") {
    throwAppError(
      new ApiError("Internal server error", {
        status: 500,
        code: "internal_error",
        requestId: "preview-5xx-0001",
      }),
    );
  }
}
```

- Проверку `emptyPreview` сохранить.
- Preview должен идти до `getDailyTasksSummary()`.
- В production `import.meta.env.DEV` false, preview не активен.

- [ ] **Step 2: Проверить 429/5xx/404 в dev SSR**

Run:
```bash
npm run dev > /tmp/milly-error-pages-dev.log 2>&1 &
echo $! > /tmp/milly-error-pages-dev.pid
sleep 3
curl -sS -o /tmp/error-429.html -w '%{http_code}\n' 'http://localhost:5173/?state=429'
curl -sS -o /tmp/error-5xx.html -w '%{http_code}\n' 'http://localhost:5173/?state=5xx'
curl -sS -o /tmp/error-404.html -w '%{http_code}\n' 'http://localhost:5173/does-not-exist'
rg -n "Слишком много запросов|Повторить запрос|Сделайте небольшую паузу" /tmp/error-429.html
rg -n "Что-то пошло не так|Попробовать снова|Ошибка на стороне сервера|Код ошибки: preview-5xx-0001" /tmp/error-5xx.html
rg -n "Страница не найдена|На главную" /tmp/error-404.html
kill "$(cat /tmp/milly-error-pages-dev.pid)"
```

Expected: статусы `429`, `500`, `404`; HTML содержит нужный копирайт;
сервер остановлен.

- [ ] **Step 3: Проверить обычный экран**

В dev или production:

```bash
curl -sS http://localhost:5173/ | rg -n "Проверяем вход|Слишком много запросов|Что-то пошло не так"
```

Expected: только `Проверяем вход`; error-копирайта нет.

- [ ] **Step 4: Ручная проверка в браузере**

Открыть в браузере:

- `http://localhost:5173/does-not-exist`;
- `http://localhost:5173/?state=429`;
- `http://localhost:5173/?state=5xx`.

Проверить:

- light/dark через DevTools `prefers-color-scheme` или Telegram;
- нижняя навигация видна, активна «Главная», не перекрывает карточку;
- на ширине 320 px нет горизонтального скролла, в том числе с длинным
  неразрывным `requestId` (текст переносится);
- на коротких экранах документ прокручивается, и длинная подсказка
  прокручивается выше фиксированной навигации;
- фокус при загрузке на заголовке; Tab доходит до кнопок;
- «Назад» возвращает на предыдущий экран, при прямом открытии ведёт
  на `/`;
- «Попробовать снова»/«Повторить запрос» на preview остаётся на том же
  экране (loader снова бросает ошибку), кнопка на время disabled;
- «На главную» на 404 ведёт на `/`;
- возврат на `/` после 429/5xx не ломает auth-состояние: `AppProviders`
  не размонтированы, `AuthGate` снова показывает обычное состояние.

- [ ] **Step 5: Проверить production 404 после preview**

Run:
```bash
npm run build
PORT=3100 npm start > /tmp/milly-error-pages-server.log 2>&1 &
echo $! > /tmp/milly-error-pages-server.pid
sleep 2
curl -sS -o /tmp/error-404-prod.html -w '%{http_code}\n' http://localhost:3100/does-not-exist
curl -sS -o /tmp/error-429-prod.html -w '%{http_code}\n' 'http://localhost:3100/?state=429'
rg -n "Страница не найдена" /tmp/error-404-prod.html
rg -n "Слишком много запросов" /tmp/error-429-prod.html || true
kill "$(cat /tmp/milly-error-pages-server.pid)"
```

Expected: 404 отдаёт 404-экран; `?state=429` в production не рендерит
429-экран (preview выключен).

---

### Task 8: Документация и финальная проверка

**Files:**
- Modify: `AGENTS.md`
- Verify only: остальные файлы

**Interfaces:**
- Consumes: реализованные `app/lib/errors/`, `app/components/errors/`,
  boundaries, DEV preview.
- Produces: актуальные правила для следующих агентов.

- [ ] **Step 1: Обновить `AGENTS.md`**

Добавить:

- в структуру:
  - `app/components/errors/` — `ErrorScreen`, `AppErrorPage`,
    `AppErrorBoundary`;
  - `app/lib/errors/` — классификация, копирайт, навигация,
    `throwAppError`;
- в раздел про роутинг/ошибки:
  - `root.tsx` и `routes/_app.tsx` экспортируют `ErrorBoundary`;
  - unmatched URL → root boundary, HTTP 404, экран публичный;
  - 404/429/5xx — через route boundaries, без глобального перехвата
    React Query;
  - loader/action с `ApiError` используют `throwAppError`;
  - error-экраны показывают нижнюю навигацию, активна «Главная»;
  - root boundary не использует провайдеры;
- в проверки:
  - `curl -i http://localhost:3000/does-not-exist` → 404 и тексты
    404-экрана;
  - `?state=429` и `?state=5xx` — только DEV preview;
  - проверить 320 px, light/dark, safe-area.

- [ ] **Step 2: Проверить отсутствие старого английского error UI**

Run:
```bash
rg -n "Oops|The requested page could not be found|Back to home" app
```
Expected: совпадений нет.

- [ ] **Step 3: Проверить отсутствие `dark:` и новых зависимостей**

Run:
```bash
rg -n "dark:" app/components/errors app/lib/errors || true
git diff -- package.json package-lock.json
```
Expected: `dark:` совпадений нет. В `package.json`/`package-lock.json`
остаются только предсуществующие изменения рабочего дерева (axios,
vitest); новых зависимостей этой задачи нет. Для точной проверки
сравнить diff с baseline tree из Setup.

- [ ] **Step 4: Финальный прогон**

Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: PASS.

- [ ] **Step 5: Финальная SSR-проверка**

Run:
```bash
PORT=3100 npm start > /tmp/milly-error-pages-server.log 2>&1 &
echo $! > /tmp/milly-error-pages-server.pid
sleep 2
curl -sS -o /tmp/error-final-404.html -w '%{http_code}\n' http://localhost:3100/does-not-exist
curl -sS -o /tmp/error-final-home.html -w '%{http_code}\n' http://localhost:3100/
rg -n "Страница не найдена|На главную|Назад|Основная навигация" /tmp/error-final-404.html
rg -n "Проверяем вход" /tmp/error-final-home.html
kill "$(cat /tmp/milly-error-pages-server.pid)"
```

Expected: `404` и `200`; 404-страница содержит нужный копирайт и
навигацию; главная в SSR содержит экран загрузки, а не защищённый
контент.

- [ ] **Step 6: Проверить рабочее дерево**

Run:
```bash
git status --short
```

Expected: только заранее известные незакоммиченные изменения +
новые файлы этой задачи; никаких случайных артефактов и коммитов.
