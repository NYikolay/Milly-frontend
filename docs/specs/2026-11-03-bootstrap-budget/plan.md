# Milly Bootstrap Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ограничить bootstrap авторизации пятью секундами, добавить таймаут на каждый HTTP-запрос, уменьшить ожидание Telegram до двух секунд внутри общего бюджета и показать `connection-error` с «Повторить» при исчерпании времени. Дополнительно закрыть случай незагруженного JS-бандла статическим SSR-watchdog с тем же действием.

**Architecture:** `AuthProvider` владеет абсолютным deadline'ом попытки и generation-номером. `bootstrapAuth` получает остаток бюджета, создаёт `AbortController`, гоняет workflow против таймера и передаёт `signal` + `timeoutMs` в login/refresh/fetchMe. `requestJson` получает общий таймаут 5 секунд через axios `timeout`; таймаут маппится в `ApiNetworkError`. Для случая, когда клиентский JS не стартовал, в SSR `<head>` добавляется inline-watchdog, который отменяется из нового `entry.client.tsx` до гидратации.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Tailwind CSS 4, axios (уже добавлен в рабочем дереве), Vitest (node, fake timers).

**Spec:** `docs/specs/2026-11-03-bootstrap-budget/spec.md`

## Global Constraints

- Общий бюджет `AUTH_BOOTSTRAP_BUDGET_MS = 5000` считается от mount `AuthProvider` и включает ожидание Telegram. Не сбрасывать deadline при изменении `isAvailable`.
- `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 2000`; после него bootstrap идёт по refresh-пути с остатком бюджета. Не возвращать 8000.
- `HTTP_REQUEST_TIMEOUT_MS = 5000`; таймаут действует на каждый HTTP-запрос. Во время bootstrap per-request timeout = `min(5000, remainingBudget)`.
- `BOOT_WATCHDOG_TIMEOUT_MS = 5000`; inline-скрипт ставится в `<head>` до `telegram-web-app.js` и отменяется из `entry.client.tsx` до `hydrateRoot`.
- Бюджетный таймаут и HTTP-таймаут дают `connection-error/network`. Новый `AuthFailureReason` не добавлять.
- `connection-error` сохраняет user, access-токен и кэш React Query. Терминальные состояния очищают их по существующим правилам.
- Retry-бюджет `original → refresh → retry → fallback login → final retry` не менять. Временной бюджет — отдельная сущность.
- `retry()` всегда начинает новый 5-секундный бюджет; старый результат не должен перезаписывать новый статус.
- Поздние результаты игнорировать через generation. Не допускать setState после unmount и unhandled rejection.
- Все таймеры, `AbortController` и abort listeners очищать в `finally`/cleanup.
- Пользовательский `AbortSignal` по-прежнему даёт `AbortError` и не меняет auth-статус. Runtime `apiRequest` не передаёт signal в общий refresh/login.
- Bootstrap передаёт signal только в свои login/refresh/fetchMe; single-flight слот очищается при abort, чтобы «Повторить» не ждал старый запрос.
- Watchdog не использует React, Tailwind и внешние ассеты: только `document.createElement` и inline styles. Тема — `data-app-theme`, fallback — `prefers-color-scheme`.
- `telegram-web-app.js` остаётся в `<head>` до Meta, Links и app-скриптов; не переносить в `<body>` и не делать ленивым.
- Только `app-*` палитра для React-экранов; `dark:` не использовать. Watchdog использует те же hex-значения из `app.css`.
- Новых runtime-зависимостей нет. `axios` уже есть в рабочем дереве; не добавлять другие HTTP-библиотеки.
- Не трогать незакоммиченные изменения, не относящиеся к задаче: миграцию axios, удалённые `docs/specs/*/plan.md`, текущий копирайт `AuthScreen`, `public/logo.svg`.
- Не редактировать `.react-router/types/`.
- Тесты — Vitest, окружение `node`, файлы `app/**/*.test.ts`. Для таймеров использовать `vi.useFakeTimers()` / `advanceTimersByTimeAsync`; не добавлять jsdom/testing-library.
- Проверки: `npm test`, `npm run typecheck`, `npm run build`. Базовый прогон до изменений: 8 файлов, 117 тестов — PASS.
- Не коммитить без явного запроса.

## Review Focus

- Telegram недоступен: через 2 секунды начинается refresh с остатком ~3 секунды; на 5-й секунде — `connection-error`, не `booting`.
- Telegram появился на 1.9 секунды: таймер ожидания очищен, bootstrap получил ~3.1 секунды, а не новые 5.
- Backend завис на login/refresh/me: запрос прерывается не позже deadline, `bootstrapAuth` возвращает `connection-error/network`, late success не меняет статус.
- «Повторить» сразу после таймаута: старый single-flight слот очищен, новый запрос уходит, а не ждёт старый; новый бюджет — 5 секунд.
- HTTP-таймаут axios (`ECONNABORTED`/`ETIMEDOUT`) даёт `ApiNetworkError`, а не `AbortError`; пользовательский abort остаётся `AbortError`.
- Runtime refresh timeout → `connection-error/network` без fallback-логина; обычный query timeout не превращается в глобальный auth-экран.
- `bootstrapInFlightRef` снимается при любом исходе, включая бюджет; повторный bootstrap не блокируется навсегда.
- Нет двойного error-haptic, нет setState после unmount, нет unhandled rejection от проигравшего `Promise.race`.
- Watchdog: при блокировке JS-бандла и при блокировке `telegram-web-app.js` появляется через 5 секунд; «Повторить» перезагружает страницу; при нормальной загрузке fallback не мелькает.
- `entry.client.tsx` вызывает `clearBootWatchdog()` до `hydrateRoot`; если fallback уже показан, он удаляется до гидратации.
- Watchdog работает без CSS и Tailwind, в light/dark, на 320 px, с safe-area; кнопка доступна с клавиатуры.
- Существующий auth retry-бюджет и все 117 тестов не сломаны.

## File Structure

- `app/lib/api/config.ts` — `HTTP_REQUEST_TIMEOUT_MS`, общий для всех
  HTTP-запросов.
- `app/lib/api/http.ts` — транспорт, axios `timeout`, маппинг
  timeout-ошибок в `ApiNetworkError`.
- `app/lib/auth/timeouts.ts` — константы auth-бюджета и чистый helper
  `remainingBudgetMs`.
- `app/lib/auth/bootstrap-auth.ts` — единственный владелец временного
  бюджета попытки: deadline, `AbortController`, `Promise.race`,
  per-request timeout и результат, который не меняется после deadline.
- `app/lib/auth/auth-api.ts` — проброс `signal`/`timeoutMs` в
  `requestJson` и очистка single-flight слота при abort.
- `app/providers/auth-provider.tsx` — deadline от mount, ожидание
  Telegram 2 секунды, retry с новым бюджетом, generation и mounted-
  защита.
- `app/lib/boot/watchdog.ts` — inline-скрипт SSR-watchdog и
  `clearBootWatchdog`.
- `app/entry.client.tsx` — отмена watchdog до `hydrateRoot`.
- `app/root.tsx` — встраивание watchdog в `<head>` до
  `telegram-web-app.js`.
- Тесты — рядом с модулями: `http.test.ts`, `bootstrap-auth.test.ts`,
  `auth-api.test.ts`, `timeouts.test.ts`, `watchdog.test.ts`,
  `client.test.ts`.

---

### Task 1: HTTP-таймаут в `requestJson`

**Files:**
- Modify: `app/lib/api/config.ts`
- Modify: `app/lib/api/http.ts`
- Modify: `app/lib/api/http.test.ts`

**Interfaces:**
- Produces:
```ts
export const HTTP_REQUEST_TIMEOUT_MS = 5000;

export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  timeoutMs?: number;
}
```
- Consumes: существующий axios-транспорт из рабочего дерева.

- [ ] **Step 1: Добавить падающие тесты таймаута**

В `app/lib/api/http.test.ts` покрыть:
- по умолчанию axios получает `timeout: HTTP_REQUEST_TIMEOUT_MS`;
- `timeoutMs: 1500` переопределяет значение;
- `timeoutMs: 0` и отрицательное значение используют значение по
  умолчанию;
- `AxiosError` с `code: "ECONNABORTED"` → `ApiNetworkError` с сообщением
  `Request timed out`;
- `AxiosError` с `code: "ETIMEDOUT"` → `ApiNetworkError`;
- `CanceledError`/abort по-прежнему даёт `signal.reason` или
  `AbortError`, а не `ApiNetworkError`;
- обычная сетевая ошибка по-прежнему даёт
  `ApiNetworkError("Network request failed")`.

Пример проверки конфига:
```ts
expect(requestConfig().timeout).toBe(HTTP_REQUEST_TIMEOUT_MS);
```

Пример проверки ошибки:
```ts
requestSpy.mockRejectedValue(
  new axios.AxiosError("timeout of 5000ms exceeded", "ECONNABORTED"),
);

await expect(requestJson("/auth/me")).rejects.toMatchObject({
  name: "ApiNetworkError",
  message: "Request timed out",
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run:
```bash
npm test -- app/lib/api/http.test.ts
```
Expected: FAIL из-за отсутствующего `timeout` и неверного маппинга.

- [ ] **Step 3: Реализовать таймаут**

В `app/lib/api/config.ts` добавить `HTTP_REQUEST_TIMEOUT_MS = 5000`.

В `app/lib/api/http.ts`:
- добавить `timeoutMs?: number` в `HttpRequestOptions`;
- вычислять:
```ts
const requestTimeout =
  timeoutMs !== undefined && timeoutMs > 0
    ? timeoutMs
    : HTTP_REQUEST_TIMEOUT_MS;
```
- передавать `timeout: requestTimeout` в `axios.request`;
- добавить проверку таймаута:
```ts
function isTimeoutError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED")
  );
}
```
- в `catch` проверять `isTimeoutError` **до** `isCancelError`:
```ts
if (isTimeoutError(error)) {
  throw new ApiNetworkError("Request timed out", { cause: error });
}
```
- остальную обработку cancel/abort/network не менять.

- [ ] **Step 4: Прогнать тесты и типы**

Run:
```bash
npm test -- app/lib/api/http.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 2: Временной бюджет в `bootstrapAuth`

**Files:**
- Create: `app/lib/auth/timeouts.ts`
- Modify: `app/lib/auth/bootstrap-auth.ts`
- Modify: `app/lib/auth/bootstrap-auth.test.ts`

**Interfaces:**
- Produces:
```ts
export const AUTH_BOOTSTRAP_BUDGET_MS = 5000;
export const AUTH_TELEGRAM_INIT_TIMEOUT_MS = 2000;

export interface BootstrapRequestOptions {
  signal: AbortSignal;
  timeoutMs: number;
}

export interface BootstrapAuthOptions {
  initData: string;
  budgetMs: number;
  requestTimeoutMs?: number;
  login: (
    initData: string,
    options: BootstrapRequestOptions,
  ) => Promise<AuthResponse>;
  refresh: (options: BootstrapRequestOptions) => Promise<TokenResponse>;
  fetchMe: (options: BootstrapRequestOptions) => Promise<AuthUser>;
}
```
- `BootstrapAuthResult` не меняется.
- `bootstrapAuth` при исчерпании бюджета возвращает
  `{ status: "connection-error", reason: "network" }`.

- [ ] **Step 1: Добавить падающие тесты бюджета**

В `app/lib/auth/bootstrap-auth.test.ts` добавить:
- login никогда не завершается; после `advanceTimersByTimeAsync(5000)`
  результат — `connection-error/network`;
- переданный в login `signal` к моменту таймаута `aborted === true`;
- `timeoutMs` в login равен `min(requestTimeoutMs, remainingBudget)`;
- `budgetMs: 3000` завершает попытку через 3 секунды;
- `budgetMs <= 0` возвращает `connection-error/network` и не вызывает
  login/refresh/fetchMe;
- поздний успех login после таймаута не меняет уже полученный результат;
- refresh и fetchMe тоже получают `signal` и `timeoutMs`;
- ошибка `ApiNetworkError("Request timed out")` из login даёт
  `connection-error/network`;
- существующие сценарии login/refresh/me продолжают проходить.

Для fake timers:
```ts
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run:
```bash
npm test -- app/lib/auth/bootstrap-auth.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Реализовать бюджет**

В `app/lib/auth/bootstrap-auth.ts`:
- импортировать `HTTP_REQUEST_TIMEOUT_MS` из `~/lib/api/config`;
- импортировать `isAbortError` из `./failure`;
- добавить внутренний класс:
```ts
class BootstrapBudgetError extends Error {
  constructor() {
    super("Bootstrap budget exceeded");
    this.name = "BootstrapBudgetError";
  }
}
```
- в начале `bootstrapAuth`:
```ts
if (options.budgetMs <= 0) {
  return { status: "connection-error", reason: "network" };
}
```
- создать `deadline`, `AbortController`, флаг `timedOut` и таймер;
- вынести текущий workflow в локальную async-функцию;
- перед каждым `login`/`refresh`/`fetchMe` вычислять:
```ts
const remaining = deadline - Date.now();

if (remaining <= 0) {
  throw new BootstrapBudgetError();
}

const requestOptions: BootstrapRequestOptions = {
  signal: controller.signal,
  timeoutMs: Math.min(
    options.requestTimeoutMs ?? HTTP_REQUEST_TIMEOUT_MS,
    Math.max(1, remaining),
  ),
};
```
- вызывать callbacks с этими options;
- в каждом catch сначала проверять `BootstrapBudgetError` и возвращать
  `connection-error/network`, затем использовать существующую
  классификацию:
```ts
function toResult(
  error: unknown,
  unauthorizedReason: AuthFailureReason,
): BootstrapAuthResult {
  if (error instanceof BootstrapBudgetError) {
    return { status: "connection-error", reason: "network" };
  }

  return toBootstrapAuthResult(
    classifyAuthFailure(error, unauthorizedReason),
  );
}
```
- гонку с таймером оформить так:
```ts
const budget = new Promise<never>((_, reject) => {
  timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    reject(new BootstrapBudgetError());
  }, options.budgetMs);
});

try {
  return await Promise.race([workflow(), budget]);
} catch (error) {
  if (timedOut || error instanceof BootstrapBudgetError) {
    return { status: "connection-error", reason: "network" };
  }

  if (isAbortError(error)) {
    throw error;
  }

  return toResult(error, "session_expired");
} finally {
  if (timer !== undefined) {
    clearTimeout(timer);
  }
}
```
- не добавлять `catch` вокруг `Promise.race`, который глотает чужие
  `AbortError`; бюджетный abort определяется флагом `timedOut`.

- [ ] **Step 4: Прогнать тесты и типы**

Run:
```bash
npm test -- app/lib/auth/bootstrap-auth.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 3: Проброс signal/timeout в auth-api

**Files:**
- Modify: `app/lib/auth/auth-api.ts`
- Modify: `app/lib/auth/auth-api.test.ts`

**Interfaces:**
- Produces:
```ts
export interface AuthRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function loginWithInitData(
  initData: string,
  options?: AuthRequestOptions,
): Promise<AuthResponse>;

export function refreshAccessToken(
  options?: AuthRequestOptions,
): Promise<TokenResponse>;

export function fetchCurrentUser(
  options?: AuthRequestOptions,
): Promise<AuthUser>;

export function loginFromTelegram(
  options?: AuthRequestOptions,
): Promise<AuthResponse>;
```
- Consumes: обновлённый `HttpRequestOptions.timeoutMs`.

- [ ] **Step 1: Добавить падающие тесты**

В `app/lib/auth/auth-api.test.ts` покрыть:
- `loginWithInitData("x", { signal, timeoutMs: 1500 })` передаёт оба
  поля в `requestJson("/auth/telegram", ...)`;
- `refreshAccessToken` передаёт оба поля в `/auth/refresh`;
- `fetchCurrentUser` передаёт оба поля в `/auth/me`;
- `loginFromTelegram` передаёт options в `loginWithInitData`;
- abort созданного запроса очищает in-flight слот: следующий вызов
  запускает новый `requestJson`, не возвращая старый promise;
- если `requestJson` всё же разрешился после abort, access-токен не
  записывается, а promise отклоняется `AbortError`;
- два одновременных вызова без abort по-прежнему дают один запрос;
- пустой `initData` по-прежнему не вызывает HTTP.

Для abort-теста использовать deferred promise и `AbortController`;
mock `requestJson` должен reject'ить при abort переданного signal:
```ts
const controller = new AbortController();
const first = loginWithInitData("raw", {
  signal: controller.signal,
  timeoutMs: 5000,
});
controller.abort();
await expect(first).rejects.toMatchObject({ name: "AbortError" });
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run:
```bash
npm test -- app/lib/auth/auth-api.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Реализовать проброс и очистку in-flight**

В `app/lib/auth/auth-api.ts`:
- добавить `AuthRequestOptions`;
- передавать `options.signal` и `options.timeoutMs` в `requestJson`;
- после `requestJson`, если `options.signal?.aborted`, не вызывать
  `setAccessToken`, а бросить `options.signal.reason ??
  new DOMException("Aborted", "AbortError")`;
- для `loginWithInitData` и `refreshAccessToken` очищать in-flight
  только если слот всё ещё указывает на этот promise:
```ts
let request!: Promise<AuthResponse>;

const handleAbort = () => {
  if (loginInFlight === request) {
    loginInFlight = null;
  }
};

request = (async () => {
  try {
    // requestJson + setAccessToken
  } finally {
    options.signal?.removeEventListener("abort", handleAbort);

    if (loginInFlight === request) {
      loginInFlight = null;
    }
  }
})();

loginInFlight = request;
options.signal?.addEventListener("abort", handleAbort, { once: true });

return request;
```
- аналогично для `refreshAccessToken`;
- `fetchCurrentUser` принимает options и передаёт в `requestJson`;
- `loginFromTelegram` принимает options и передаёт в
  `loginWithInitData`;
- существующую проверку токена в `refreshAccessToken` не менять.

- [ ] **Step 4: Прогнать тесты и типы**

Run:
```bash
npm test -- app/lib/auth/auth-api.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 4: Deadline, Telegram-ожидание и generation в `AuthProvider`

**Files:**
- Modify: `app/lib/auth/timeouts.ts` (добавить `remainingBudgetMs`)
- Create: `app/lib/auth/timeouts.test.ts`
- Modify: `app/providers/auth-provider.tsx`

**Interfaces:**
- Produces:
```ts
export function remainingBudgetMs(
  deadline: number,
  now?: number,
): number; // max(0, deadline - now)
```
- Consumes: `AUTH_BOOTSTRAP_BUDGET_MS`,
  `AUTH_TELEGRAM_INIT_TIMEOUT_MS`, `isAbortError`, обновлённые
  `bootstrapAuth` и auth-api.

- [ ] **Step 1: Добавить тест `remainingBudgetMs`**

Покрыть:
- `deadline = 5000`, `now = 2000` → `3000`;
- `deadline = 5000`, `now = 5000` → `0`;
- `deadline = 5000`, `now = 6000` → `0`.

Run:
```bash
npm test -- app/lib/auth/timeouts.test.ts
```
Expected: FAIL.

- [ ] **Step 2: Реализовать helper**

```ts
export function remainingBudgetMs(
  deadline: number,
  now: number = Date.now(),
): number {
  return Math.max(0, deadline - now);
}
```

- [ ] **Step 3: Переписать `AuthProvider`**

Удалить локальную константу `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 8000`.

Добавить refs:
```ts
const bootstrapDeadlineRef = useRef<number | null>(null);
const bootstrapAttemptRef = useRef(0);
const bootstrapInFlightRef = useRef(false);
const autoBootstrapStartedRef = useRef(false);
const mountedRef = useRef(true);
```

Добавить mounted-эффект:
```ts
useEffect(() => {
  mountedRef.current = true;

  return () => {
    mountedRef.current = false;
  };
}, []);
```

`runBootstrap` должен принимать `budgetMs: number`:
```ts
const runBootstrap = useCallback(async (budgetMs: number) => {
  if (bootstrapInFlightRef.current) {
    return;
  }

  bootstrapInFlightRef.current = true;
  const attempt = ++bootstrapAttemptRef.current;
  const previousStatus = stateRef.current.status;
  const shouldPlaySuccessHaptic = isFailureStatus(previousStatus);

  setState((current) => ({
    ...current,
    status: "booting",
    reason: null,
  }));

  try {
    const result = await bootstrapAuth({
      initData: initDataRef.current,
      budgetMs,
      login: (initData, options) =>
        loginWithInitData(initData, options),
      refresh: (options) => refreshAccessToken(options),
      fetchMe: (options) => fetchCurrentUser(options),
    });

    if (!mountedRef.current || attempt !== bootstrapAttemptRef.current) {
      return;
    }

    // существующая обработка authenticated / connection-error / terminal
  } catch (error) {
    if (!mountedRef.current || attempt !== bootstrapAttemptRef.current) {
      return;
    }

    setState((current) => ({
      status: "connection-error",
      user: current.user,
      reason: isAbortError(error) ? "network" : "server",
    }));
    playHaptic("error");
  } finally {
    if (attempt === bootstrapAttemptRef.current) {
      bootstrapInFlightRef.current = false;
    }
  }
}, [playHaptic, queryClient]);
```

Добавить `startBootstrap`:
```ts
const startBootstrap = useCallback(() => {
  const deadline = bootstrapDeadlineRef.current;

  if (deadline === null) {
    return;
  }

  const budgetMs = remainingBudgetMs(deadline);

  if (budgetMs <= 0) {
    setState((current) => ({
      status: "connection-error",
      user: current.user,
      reason: "network",
    }));
    playHaptic("error");
    return;
  }

  void runBootstrap(budgetMs);
}, [playHaptic, runBootstrap]);
```

Переписать auto-bootstrap effect:
```ts
useEffect(() => {
  if (autoBootstrapStartedRef.current) {
    return;
  }

  if (bootstrapDeadlineRef.current === null) {
    bootstrapDeadlineRef.current =
      Date.now() + AUTH_BOOTSTRAP_BUDGET_MS;
  }

  if (isAvailable) {
    autoBootstrapStartedRef.current = true;
    startBootstrap();
    return;
  }

  const timer = window.setTimeout(() => {
    if (autoBootstrapStartedRef.current) {
      return;
    }

    autoBootstrapStartedRef.current = true;
    startBootstrap();
  }, AUTH_TELEGRAM_INIT_TIMEOUT_MS);

  return () => window.clearTimeout(timer);
}, [isAvailable, startBootstrap]);
```

Переписать `retry`:
```ts
const retry = useCallback(() => {
  if (stateRef.current.status === "booting") {
    return;
  }

  resetAuthFailureNotification();
  bootstrapDeadlineRef.current =
    Date.now() + AUTH_BOOTSTRAP_BUDGET_MS;
  void runBootstrap(AUTH_BOOTSTRAP_BUDGET_MS);
}, [runBootstrap]);
```

Требования к обработке результата:
- `authenticated` — как раньше, включая success-haptic только после
  ошибочного статуса;
- `connection-error` — сохранить `current.user`, не очищать токен/кэш,
  error-haptic;
- `reauth-required`/`no-init-data` — `clearAccessToken()`,
  `queryClient.clear()`, `user = null`, error-haptic;
- не применять результат, если generation изменился или компонент
  размонтирован;
- не допускать двойного haptic на один переход.

- [ ] **Step 4: Прогнать тесты, типы и сборку**

Run:
```bash
npm test -- app/lib/auth/timeouts.test.ts
npm test
npm run typecheck
npm run build
```
Expected: PASS.

---

### Task 5: SSR boot watchdog и `entry.client.tsx`

**Files:**
- Create: `app/lib/boot/watchdog.ts`
- Create: `app/lib/boot/watchdog.test.ts`
- Create: `app/entry.client.tsx`
- Modify: `app/root.tsx`

**Interfaces:**
- Produces:
```ts
export const BOOT_WATCHDOG_TIMEOUT_MS = 5000;

export function getBootWatchdogScript(): string;
export function clearBootWatchdog(): void;

declare global {
  interface Window {
    __millyBootWatchdog?: {
      clear: () => void;
    };
  }
}
```
- Script builder детерминирован, не содержит `</script>` и не обращается
  к `window` на этапе построения.

- [ ] **Step 1: Добавить падающие тесты watchdog**

В `app/lib/boot/watchdog.test.ts` проверить:
- `getBootWatchdogScript()` содержит `5000`,
  `__millyBootWatchdog`, `Нет соединения`, `Повторить`,
  `location.reload`, `role`, `assertive`, `appTheme` и
  `prefers-color-scheme`;
- строка не содержит `</script>`;
- `clearBootWatchdog()` не бросает в node-окружении (без `window`).

Run:
```bash
npm test -- app/lib/boot/watchdog.test.ts
```
Expected: FAIL.

- [ ] **Step 2: Реализовать `watchdog.ts`**

Скрипт должен:
- собираться через template literal; экранировать `\${}` и обратные
  кавычки, не вставлять `</script>`;
- запускать `setTimeout(show, 5000)`;
- публиковать `window.__millyBootWatchdog = { clear }`;
- `clear` очищать таймер, удалять `#milly-boot-fallback` и удалять
  глобальный объект;
- `show` создавать full-screen overlay через `document.createElement`
  и inline styles;
- использовать `data-app-theme`, иначе `prefers-color-scheme`;
- содержать `role="alert"`, `aria-live="assertive"`,
  `aria-atomic="true"`;
- создавать заголовок `Нет соединения`, описание
  `Не удалось загрузить приложение. Проверьте подключение и попробуйте
  снова.` и кнопку `Повторить`;
- вешать на кнопку `window.location.reload()`;
- фокусировать кнопку после добавления в DOM;
- добавлять overlay в `document.body ?? document.documentElement`.

`clearBootWatchdog`:
```ts
export function clearBootWatchdog(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.__millyBootWatchdog?.clear();
}
```

- [ ] **Step 3: Создать `entry.client.tsx`**

```tsx
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { clearBootWatchdog } from "~/lib/boot/watchdog";

clearBootWatchdog();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
```

`clearBootWatchdog()` обязан вызываться до `hydrateRoot`, чтобы убрать
fallback и избежать hydration mismatch.

- [ ] **Step 4: Встроить скрипт в `root.tsx`**

Добавить импорт `getBootWatchdogScript` и в `<head>` перед
`telegram-web-app.js`:
```tsx
<script
  dangerouslySetInnerHTML={{
    __html: getBootWatchdogScript(),
  }}
/>
<script src="https://telegram.org/js/telegram-web-app.js" />
```

Порядок остальных элементов не менять: `telegram-web-app.js` остаётся
до `Meta`, `Links` и app-скриптов.

- [ ] **Step 5: Прогнать тесты, типы и сборку**

Run:
```bash
npm test -- app/lib/boot/watchdog.test.ts
npm test
npm run typecheck
npm run build
```
Expected: PASS.

- [ ] **Step 6: Проверить SSR-наличие watchdog**

После сборки запустить `PORT=3000 npm start` в отдельном терминале:
```bash
curl -s http://localhost:3000/ | grep -E "__millyBootWatchdog|Проверяем вход|Задачи на сегодня"
```
Expected: есть `__millyBootWatchdog` и `Проверяем вход`; нет
`Задачи на сегодня`. Остановить сервер.

---

### Task 6: Регрессионные тесты runtime-таймаутов

**Files:**
- Modify: `app/lib/api/client.test.ts`
- Modify: `app/lib/auth/failure.test.ts` (при необходимости явно
  зафиксировать сообщение таймаута)

**Interfaces:**
- Production-код в норме не меняется; если тест выявляет расхождение
  классификации со spec, правится только `classifyAuthFailure`,
  retry-последовательность не меняется.

- [ ] **Step 1: Добавить тесты**

В `app/lib/api/client.test.ts`:
- refresh отклоняется с `new ApiNetworkError("Request timed out")` →
  `notifyAuthFailure` получает
  `{ status: "connection-error", reason: "network" }`,
  выбрасывается `AuthSessionError`, `loginFromTelegram` не вызывается;
- первый запрос отклоняется с `new ApiNetworkError("Request timed out")`
  → ошибка пробрасывается как есть, auth-событие не отправляется,
  refresh/login не вызываются;
- после успешного refresh повторный запрос с таймаутом
  `ApiNetworkError` пробрасывается без второго refresh.

В `app/lib/auth/failure.test.ts` при необходимости добавить:
```ts
expect(
  classifyAuthFailure(new ApiNetworkError("Request timed out"), "session_expired"),
).toEqual({ status: "connection-error", reason: "network" });
```

- [ ] **Step 2: Прогнать тесты**

Run:
```bash
npm test -- app/lib/api/client.test.ts app/lib/auth/failure.test.ts
```
Expected: PASS. Если тест падает, исправить только классификацию в
соответствии со spec, не меняя retry-последовательность.

---

### Task 7: Синхронизация документации

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/specs/2026-11-02-telegram-auth/spec.md`

**Interfaces:**
- Consumes: реализованные константы и поведение.
- Produces: актуальное описание bootstrap-бюджета, HTTP-таймаута и
  watchdog.

- [ ] **Step 1: Обновить README**

В разделе про API и авторизацию добавить:
- общий bootstrap-бюджет 5 секунд и 2 секунды ожидания Telegram;
- таймаут HTTP-запроса 5 секунд;
- при исчерпании — `connection-error` с «Повторить»;
- SSR-watchdog на 5 секунд для незагруженного JS-бандла.

- [ ] **Step 2: Обновить AGENTS.md**

В разделах про auth/Telegram/проверки отразить:
- `AUTH_BOOTSTRAP_BUDGET_MS = 5000`,
  `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 2000`,
  `HTTP_REQUEST_TIMEOUT_MS = 5000`,
  `BOOT_WATCHDOG_TIMEOUT_MS = 5000`;
- `entry.client.tsx` и inline watchdog;
- таймаут-ошибки → `connection-error/network`;
- проверку блокировки JS/Telegram-скрипта вручную.

- [ ] **Step 3: Дополнить старую auth-спецификацию**

В `docs/specs/2026-11-02-telegram-auth/spec.md`:
- добавить в начало пометку:
```md
> **Дополнено:** `docs/specs/2026-11-03-bootstrap-budget/spec.md`.
> FR-1 (таймаут Telegram), FR-6 (переход по бюджету) и FR-10 (тесты
> таймаутов) уточнены новой спецификацией.
```
- заменить `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 8000` на `2000` и добавить
  ссылку на общий бюджет 5000;
- в FR-6 добавить переход `booting → connection-error` по истечении
  времени;
- в FR-10 и критерии приёмки добавить пункты про таймауты и watchdog.

Не восстанавливать удалённые в рабочем дереве `plan.md`; не переписывать
историю остальных решений.

- [ ] **Step 4: Проверить отсутствие устаревших значений**

Run:
```bash
rg -n "AUTH_TELEGRAM_INIT_TIMEOUT_MS\\s*=\\s*8000|8000\\s*мс" README.md AGENTS.md docs/specs app
rg -n "AUTH_TELEGRAM_INIT_TIMEOUT_MS|HTTP_REQUEST_TIMEOUT_MS|BOOT_WATCHDOG_TIMEOUT_MS" README.md AGENTS.md docs/specs app
```
Expected: активных `8000` не остаётся; исторические упоминания в
пояснительном тексте новой спецификации допустимы. Константы описаны
согласованно.

---

### Task 8: Полная проверка

**Files:**
- Verify only; изменений кода нет.

- [ ] **Step 1: Прогнать автоматические проверки**

Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: все команды PASS; количество тестов больше базовых 117.

- [ ] **Step 2: Проверить SSR**

Run:
```bash
npm run build
```

Запустить `PORT=3000 npm start` в отдельном терминале и выполнить:
```bash
curl -s http://localhost:3000/ | grep -E "__millyBootWatchdog|Проверяем вход|Задачи на сегодня"
```
Expected:
- `__millyBootWatchdog` присутствует;
- `Проверяем вход` присутствует;
- `Задачи на сегодня` отсутствует.
Остановить сервер.

- [ ] **Step 3: Проверить watchdog в браузере**

Запустить `npm run dev`, открыть DevTools → Network:
- заблокировать запрос JS-бандла и перезагрузить страницу: через 5
  секунд появляется fallback с «Повторить»; кнопка перезагружает
  страницу; после разблокировки приложение загружается;
- заблокировать `telegram-web-app.js` и перезагрузить: через 5 секунд
  появляется fallback; после разблокировки и «Повторить» приложение
  загружается;
- при нормальной загрузке fallback не появляется;
- fallback проверен в light/dark, на 320 px, с safe-area; фокус на
  кнопке, Tab/Enter работают.

- [ ] **Step 4: Проверить bootstrap-таймаут в браузере**

- В DevTools включить offline или сильную задержку сети и открыть
  приложение: не позднее 5 секунд появляется `connection-error` с
  «Повторить»;
- восстановить сеть и нажать «Повторить»: приложение открывается;
- проверить, что во время `booting` кнопка не показывается, а после
  ошибки доступна;
- проверить keyboard launch без `initData`: через 2 секунды начинается
  refresh-путь, экран не висит в `booting`;
- проверить, что при ошибке токен/сессия не очищаются (повторный retry
  после восстановления сети не требует повторного входа).

- [ ] **Step 5: Проверить dev proxy**

```bash
curl -i http://localhost:5173/api/v1/auth/refresh -X POST
```
Expected: `401`, не `404`.

- [ ] **Step 6: Проверить Telegram вручную**

Через HTTPS-туннель на `http://localhost:5173`:
- обычный запуск из меню бота;
- keyboard launch с пустым `initData`;
- имитация зависшего backend/сети: `connection-error` не позднее 5
  секунд;
- «Повторить» после восстановления сети;
- light/dark, safe-area, отсутствие горизонтального скролла;
- watchdog не появляется при нормальной загрузке.

- [ ] **Step 7: Проверить отсутствие запрещённых хранилищ и логов**

Run:
```bash
rg -n "localStorage|sessionStorage|indexedDB|CloudStorage|SecureStorage" app
rg -n "console\\.(log|info|debug|error).*?(token|initData|access|refresh)" app
```
Expected: в auth/bootstrap-коде совпадений нет.

- [ ] **Step 8: Финальный прогон**

Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: PASS. Реализация завершена только при отсутствии ошибок и
успешных ручных проверках.
