# Milly — bootstrap-бюджет и таймауты (SDD Specification)

**Статус:** draft for approval
**Дата:** 2026-11-03
**Область:** `frontend/`
**Связанная спецификация:** `docs/specs/2026-11-02-telegram-auth/spec.md`
**База реализации:** текущее рабочее дерево, в котором `requestJson` уже
переведён с `fetch` на `axios` (изменение ещё не закоммичено).

## 1. Контекст и цель

Сейчас bootstrap авторизации может находиться в состоянии `booting`
неограниченно долго:

- `AuthProvider` ждёт Telegram WebApp до 8 секунд, после чего запускает
  auth-запросы;
- у HTTP-запросов нет собственного таймаута, поэтому зависший backend
  или сеть оставляют приложение на экране «Проверяем вход…» навсегда;
- если JS-бандл или `telegram-web-app.js` не загрузился, SSR-экран
  загрузки остаётся на странице бесконечно.

Цель — сделать bootstrap конечным по времени и предсказуемым:

1. общий бюджет bootstrap — 5 секунд от запуска клиентского JS;
2. отдельный таймаут на каждый HTTP-запрос — 5 секунд по умолчанию;
3. ожидание Telegram WebApp укладывается в общий бюджет;
4. при исчерпании бюджета показывается существующий экран
   `connection-error` с кнопкой «Повторить»;
5. если JS-бандл не загрузился, статический SSR-watchdog показывает
   аналогичный экран с кнопкой «Повторить» через 5 секунд.

Существующий retry-бюджет авторизации (`original → refresh → retry →
fallback login → final retry`) не меняется. Новый бюджет — временной, а
не бюджет количества попыток; в коде и документации он называется
`AUTH_BOOTSTRAP_BUDGET_MS`, чтобы не путать с retry-бюджетом.

## 2. Пользовательские сценарии

1. Пользователь открывает Mini App, Telegram доступен, backend отвечает
   быстро. Bootstrap завершается успешно, экран загрузки сменяется
   приложением.
2. Telegram WebApp не инициализировался. Через 2 секунды приложение
   пробует восстановить сессию по refresh-cookie. Если cookie действует,
   пользователь попадает в приложение; если refresh вернул `401`,
   показывается `no-init-data` по существующим правилам; если запрос
   завис — не позднее 5 секунд показывается `connection-error` с
   «Повторить».
3. Backend или сеть зависли. Auth-запрос прерывается по таймауту (не
   позднее остатка общего бюджета), пользователь видит
   `connection-error` с «Повторить». Сессия не очищается.
4. JS-бандл или `telegram-web-app.js` не загрузился. Через 5 секунд
   поверх SSR-экрана появляется статический fallback с «Повторить»;
   кнопка перезагружает страницу.
5. Пользователь нажимает «Повторить» после ошибки. Запускается новая
   попытка с новым 5-секундным бюджетом; старый результат не может
   перезаписать новый статус.
6. Telegram WebApp появился после старта bootstrap. Текущая попытка
   использует refresh; следующая ручная попытка использует актуальный
   `initData`, если `TelegramProvider` уже его отдал.

## 3. Функциональные требования

### FR-1. Временные константы

| Константа | Значение | Модуль | Смысл |
|---|---:|---|---|
| `BOOT_WATCHDOG_TIMEOUT_MS` | `5000` | `app/lib/boot/watchdog.ts` | от выполнения inline-скрипта в `<head>` до старта client entry |
| `AUTH_BOOTSTRAP_BUDGET_MS` | `5000` | `app/lib/auth/timeouts.ts` | от mount `AuthProvider` до финального auth-статуса |
| `AUTH_TELEGRAM_INIT_TIMEOUT_MS` | `2000` | `app/lib/auth/timeouts.ts` | максимальное ожидание `isAvailable` внутри общего бюджета |
| `HTTP_REQUEST_TIMEOUT_MS` | `5000` | `app/lib/api/config.ts` | таймаут одного HTTP-запроса по умолчанию |

- Константы экспортируются и используются в тестах; магические числа в
  компонентах не дублируются.
- Новых переменных окружения в этой итерации нет.

### FR-2. Общий bootstrap-бюджет

- Бюджет начинается в момент mount `AuthProvider` (клиентский JS уже
  выполняется). Он покрывает ожидание Telegram и все auth-запросы:
  `login`, `refresh`, `/auth/me`.
- `AuthProvider` фиксирует `deadline = Date.now() +
  AUTH_BOOTSTRAP_BUDGET_MS` и передаёт в `bootstrapAuth` остаток:
  `budgetMs = max(0, deadline - Date.now())`.
- Если `budgetMs <= 0`, bootstrap не запускает ни одного HTTP-запроса и
  сразу переходит в `connection-error` с `reason = "network"`.
- `bootstrapAuth` создаёт собственный `AbortController` и таймер на
  `budgetMs`. По истечении:
  - таймер выставляет флаг `timedOut`;
  - `controller.abort()` прерывает текущий HTTP-запрос;
  - функция возвращает `{ status: "connection-error", reason:
    "network" }`, даже если нижележащий callback игнорирует signal.
- `AuthProvider` при `connection-error`:
  - сохраняет текущего `user`, access-токен и кэш React Query;
  - выставляет статус `connection-error` и `reason = "network"`;
  - проигрывает error-haptic один раз.
- После исчерпания бюджета состояние `booting` невозможно: либо
  успешный/терминальный результат, либо `connection-error`.
- Поздний результат прерванной попытки не применяется. Для этого
  `AuthProvider` хранит номер попытки (generation) и применяет результат,
  только если номер совпадает с текущим.
- `retry()` создаёт новый `deadline = Date.now() +
  AUTH_BOOTSTRAP_BUDGET_MS`; бюджет не наследуется от предыдущей попытки.
- `retry()` игнорируется, пока статус `booting` (кнопка в этот момент не
  показывается).
- Общий бюджет не отменяет и не добавляет шаги retry-бюджета из
  `2026-11-02-telegram-auth`. Если время вышло посреди последовательности,
  попытка завершается `connection-error` без дальнейших шагов.

### FR-3. Ожидание Telegram внутри бюджета

- Если `isAvailable === true` на момент запуска, bootstrap стартует
  сразу с полным остатком бюджета.
- Если `isAvailable === false`, `AuthProvider` ждёт
  `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 2000` и затем запускает bootstrap с
  пустым `initData` (путь refresh-cookie) и остатком бюджета (около 3000
  мс).
- Если `isAvailable` становится `true` раньше 2 секунд, таймер ожидания
  очищается, bootstrap стартует сразу с остатком бюджета.
- Если Telegram появился после старта bootstrap, второй автоматический
  bootstrap не запускается. Следующая ручная попытка использует
  актуальный `initDataRef.current`.
- `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 2000` заменяет прежние 8000 мс.
  Снижение до 2, а не до 5 секунд выбрано потому, что 5 секунд ожидания
  Telegram исчерпали бы весь общий бюджет и не оставили времени на
  refresh/login. Обоснование зафиксировано в §11.
- `TelegramProvider` не меняется: он по-прежнему читает
  `window.Telegram.WebApp` один раз в mount-эффекте. Поллинг поздно
  загрузившегося скрипта в эту итерацию не входит.

### FR-4. Таймаут HTTP-запроса

- `HttpRequestOptions` получает необязательное поле
  `timeoutMs?: number`.
- `requestJson` передаёт в axios `timeout: timeoutMs ??
  HTTP_REQUEST_TIMEOUT_MS`.
- Таймаут действует на каждый HTTP-запрос, включая auth-запросы и
  обычные запросы приложения.
- Ошибка таймаута axios (`ETIMEDOUT`/`ECONNABORTED`) преобразуется в
  `ApiNetworkError("Request timed out", { cause })`. Это не `AbortError`:
  `classifyAuthFailure` уже относит `ApiNetworkError` к
  `connection-error/network`.
- Пользовательский `AbortSignal` сохраняет прежнюю семантику:
  отмена даёт `signal.reason` или `DOMException("Aborted", "AbortError")`
  и не меняет auth-статус.
- Проверка таймаута выполняется раньше проверки отмены, чтобы внутренняя
  отмена axios по таймауту не превратилась в `AbortError`.
- Во время bootstrap таймаут каждого запроса равен
  `min(HTTP_REQUEST_TIMEOUT_MS, remainingBudget)`. Если остаток бюджета
  `<= 0`, запрос не запускается, и bootstrap сразу возвращает
  `connection-error/network`.
- В runtime (после `authenticated`) обычные запросы используют полные
  5000 мс. Их ошибки, включая таймаут, остаются обычными ошибками
  вызывающего кода/React Query. Глобальный `connection-error` для
  произвольных query-запросов в эту итерацию не входит.
- Таймаут `refresh`/`login` в runtime идёт через существующую
  auth-классификацию и приводит к `connection-error/network`; fallback-
  логин при сетевой ошибке не запускается (поведение сохраняется).

### FR-5. Контракты

#### 5.1. Bootstrap

```ts
interface BootstrapRequestOptions {
  signal: AbortSignal;
  timeoutMs: number;
}

interface BootstrapAuthOptions {
  initData: string;
  budgetMs: number;
  requestTimeoutMs?: number; // default HTTP_REQUEST_TIMEOUT_MS
  login: (
    initData: string,
    options: BootstrapRequestOptions,
  ) => Promise<AuthResponse>;
  refresh: (options: BootstrapRequestOptions) => Promise<TokenResponse>;
  fetchMe: (options: BootstrapRequestOptions) => Promise<AuthUser>;
}

type BootstrapAuthResult =
  | { status: "authenticated"; user: AuthUser }
  | { status: "connection-error"; reason: "network" | "server" }
  | { status: "reauth-required"; reason: AuthFailureReason }
  | { status: "no-init-data"; reason: "init_data_missing" };
```

- `bootstrapAuth` по-прежнему не работает с React и не читает `window`.
- `budgetMs` обязателен; `requestTimeoutMs` нужен для тестов и по
  умолчанию равен `HTTP_REQUEST_TIMEOUT_MS`.
- Внутри бюджета используется один `AbortController` на попытку. Он
  передаётся во все три callback'а.
- Если callback завершился ошибкой `AbortError` из-за бюджета,
  возвращается `connection-error/network`; `AbortError` не пробрасывается
  наружу. Другие `AbortError` (не из этого контроллера) пробрасываются.

#### 5.2. Auth API

```ts
interface AuthRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function loginWithInitData(
  initData: string,
  options?: AuthRequestOptions,
): Promise<AuthResponse>;

function refreshAccessToken(
  options?: AuthRequestOptions,
): Promise<TokenResponse>;

function fetchCurrentUser(
  options?: AuthRequestOptions,
): Promise<AuthUser>;

function loginFromTelegram(
  options?: AuthRequestOptions,
): Promise<AuthResponse>;
```

- Опции передаются в `requestJson` как `signal` и `timeoutMs`.
- Single-flight сохраняется: первый вызов создаёт promise, последующие
  получают его. Опции первого вызова выигрывают.
- При abort созданного этим вызовом запроса соответствующий in-flight
  слот очищается, чтобы «Повторить» мог сразу начать новый запрос.
  Очистка выполняется только для собственного promise, не для чужого.
- Runtime-вызовы `apiRequest` не передают signal в общий refresh/login:
  отмена одного запроса не отменяет общую auth-операцию. Это правило
  сохраняется.

#### 5.3. HTTP

```ts
interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  timeoutMs?: number;
}
```

- `timeoutMs` должен быть положительным. Если передан `0` или
  отрицательное значение, используется значение по умолчанию.
- Контракт не зависит от транспорта: при откате с axios на `fetch`
  таймаут реализуется через `AbortSignal.timeout`/композицию сигналов,
  но `timeoutMs` и `ApiNetworkError` остаются.

### FR-6. AuthProvider

- `AuthProvider` хранит:
  - `bootstrapDeadlineRef` — абсолютный deadline текущей попытки;
  - `bootstrapAttemptRef` — generation текущей попытки;
  - `bootstrapInFlightRef` — защита от параллельных bootstrap;
  - `autoBootstrapStartedRef` — один автоматический запуск;
  - `mountedRef` — запрет setState после unmount.
- Автоматический запуск:
  - при `isAvailable === true` — сразу;
  - иначе — через `AUTH_TELEGRAM_INIT_TIMEOUT_MS`;
  - таймер очищается в cleanup эффекта.
- `runBootstrap(budgetMs)`:
  - игнорируется, если `bootstrapInFlightRef.current === true`;
  - увеличивает generation, сохраняет его локально;
  - выставляет `booting` и сбрасывает `reason`;
  - вызывает `bootstrapAuth` с обёртками `loginWithInitData`,
    `refreshAccessToken`, `fetchCurrentUser`, которые прокидывают
    `BootstrapRequestOptions`;
  - применяет результат только при совпадении generation и `mountedRef`;
  - при `authenticated` сохраняет user, сбрасывает auth-failure
    deduplication и играет success-haptic, если предыдущий статус был
    ошибочным;
  - при `connection-error` сохраняет user/token/cache и играет
    error-haptic;
  - при `reauth-required`/`no-init-data` очищает access-токен, кэш и
    user, играет error-haptic;
  - в `finally` снимает `bootstrapInFlightRef`.
- Неожиданное исключение `bootstrapAuth` переводит в
  `connection-error`: бюджетный/abort-таймаут — `reason = "network"`,
  прочие неизвестные ошибки — `reason = "server"`. Это не оставляет
  `booting` и не создаёт unhandled rejection. Бюджетный таймаут
  обрабатывается внутри `bootstrapAuth` и не доходит до этого catch.
- `retry()`:
  - игнорируется в `booting`;
  - сбрасывает auth-failure deduplication;
  - выставляет новый deadline;
  - запускает `runBootstrap(AUTH_BOOTSTRAP_BUDGET_MS)`.
- Haptic вызывается только если `isActive !== false`.

### FR-7. SSR boot watchdog

- В `app/root.tsx` в `<head>` добавляется inline-скрипт, построенный
  функцией `getBootWatchdogScript()`.
- Скрипт размещается до `telegram-web-app.js`, чтобы успеть запустить
  таймер, даже если Telegram-скрипт заблокирует парсинг.
- Скрипт:
  - запускает таймер на `BOOT_WATCHDOG_TIMEOUT_MS = 5000`;
  - публикует `window.__millyBootWatchdog = { clear }`;
  - по таймауту, если `clear()` не вызван, создаёт full-screen fallback
    через `document.createElement` и inline styles;
  - fallback не зависит от Tailwind, CSS-файлов, шрифтов и React;
  - кнопка «Повторить» вызывает `window.location.reload()`;
  - `clear()` очищает таймер, удаляет fallback (если он уже показан) и
    удаляет `window.__millyBootWatchdog`.
- `app/entry.client.tsx` — новый файл — вызывает `clearBootWatchdog()`
  до `hydrateRoot`, чтобы:
  - отменить watchdog при нормальной загрузке бандла;
  - убрать уже показанный fallback до гидратации и избежать mismatch.
- `clearBootWatchdog()` из `app/lib/boot/watchdog.ts`:
  - на сервере и при отсутствии `window` — no-op;
  - в браузере вызывает `window.__millyBootWatchdog?.clear()`.
- Watchdog покрывает случаи «JS-бандл не загрузился» и
  «`telegram-web-app.js` заблокировал загрузку». Он не покрывает
  runtime-ошибки после старта entry: для них остаётся существующий
  ErrorBoundary.
- Скрипт использует `document.documentElement.dataset.appTheme`, если он
  уже выставлен, иначе `matchMedia("(prefers-color-scheme: dark)")`.
- При добавлении CSP inline-скрипт должен получить nonce/hash. В этой
  итерации CSP не настраивается.

### FR-8. Ошибки и UI

- Бюджетный таймаут и HTTP-таймаут дают
  `connection-error` с `reason = "network"`.
- Новый `AuthFailureReason` не добавляется.
- React-экран `connection-error` не меняется: используется существующий
  `AuthScreen` с кнопкой «Повторить». Копирайт не является частью этой
  задачи.
- Fallback watchdog использует собственный статический копирайт:
  - заголовок: `Нет соединения`;
  - описание: `Не удалось загрузить приложение. Проверьте подключение и
    попробуйте снова.`;
  - кнопка: `Повторить`.
- Fallback watchdog не показывает токены, `initData`, `request_id` и
  внутренние ошибки.
- Fallback watchdog не вызывает haptics: Telegram WebApp может быть ещё
  недоступен.

### FR-9. Тесты

- Тестами покрываются:
  - `requestJson`: таймаут по умолчанию, переопределение, маппинг
    timeout-ошибки в `ApiNetworkError`, сохранение `AbortError`;
  - `bootstrapAuth`: исчерпание бюджета, остаток бюджета как таймаут
    запроса, отсутствие запросов при `budgetMs <= 0`, поздний результат,
    abort signal, существующие сценарии login/refresh/me;
  - `auth-api`: проброс `signal`/`timeoutMs`, очистка in-flight при
    abort, сохранение single-flight;
  - `apiRequest`: таймаут refresh → `connection-error/network` без
    fallback-логина; таймаут обычного запроса — обычная `ApiNetworkError`
    без auth-события;
  - watchdog: script builder содержит таймаут, копирайт, кнопку,
    `__millyBootWatchdog`, и не обращается к `window` на сервере.
- Тесты таймеров используют `vi.useFakeTimers()` и
  `advanceTimersByTimeAsync`; окружение остаётся `node`.
- Компонентные и E2E-тесты не добавляются: в проекте нет jsdom и
  testing-library. Поведение `AuthProvider` проверяется косвенно через
  чистые функции и вручную.
- Существующие 117 тестов должны продолжать проходить.

## 4. Данные и состояния

### 4.1. Тайминг

```text
t=0        AuthProvider mount; deadline = t+5000
t=0..2000  ждём Telegram, если isAvailable=false
t=2000     если Telegram нет — старт bootstrap с budgetMs≈3000
t=0..5000  login / refresh / fetchMe с per-request timeout = min(5000, remaining)
t=5000     жёсткий предел: connection-error/network
t=5000+    retry → новый deadline = now+5000
```

- Если Telegram появился в `t=1900`, bootstrap стартует сразу и получает
  около 3100 мс.
- Если Telegram появился после `t=2000`, bootstrap уже идёт по
  refresh-пути и не перезапускается; попытка завершится не позднее
  `t=5000`, а «Повторить» использует новый `initData` и новый бюджет.
- Bundle watchdog работает независимо: `t=0` — выполнение inline-
  скрипта; `t=5000` — fallback, если client entry не вызвал `clear()`.
  Если бандл загрузился в `t=4900`, watchdog отменяется, а auth-бюджет
  начинает свои 5 секунд с mount `AuthProvider`.

### 4.2. Состояния

```text
booting
  -> authenticated        (успех в пределах бюджета)
  -> connection-error     (бюджет, HTTP-таймаут, network/5xx)
  -> reauth-required      (401/403/422 по существующим правилам)
  -> no-init-data         (пустой initData + refresh 401)

connection-error
  -> booting              (retry, новый бюджет)
  -> authenticated        (retry success)

reauth-required / no-init-data
  -> booting              (retry, новый бюджет)
  -> authenticated        (retry success)
```

- `booting` не может длиться дольше 5 секунд после mount/retry.
- Поздний результат старой попытки игнорируется по generation.
- `connection-error` не очищает сессию.
- `reauth-required`/`no-init-data` очищают сессию по существующим
  правилам.

### 4.3. Маппинг ошибок

| Причина | Исключение | Результат |
|---|---|---|
| Истёк общий бюджет | внутренний `BootstrapBudgetError` / флаг `timedOut` | `connection-error/network` |
| Таймаут axios | `ApiNetworkError("Request timed out")` | `connection-error/network` |
| Сеть недоступна | `ApiNetworkError` | `connection-error/network` |
| Backend `5xx` | `ApiError(status >= 500)` | `connection-error/server` |
| Пользовательский abort | `AbortError` / `signal.reason` | пробрасывается, статус не меняется |
| `401/403/422` | `ApiError` | существующая терминальная классификация |
| Неизвестная ошибка bootstrap | любое исключение | `connection-error/server` |

## 5. Визуальная спецификация

### 5.1. React-экран `connection-error`

Не меняется. Используются существующие `AuthScreen`/`AuthGate`, токены
`app-*`, копирайт и кнопка «Повторить» из
`docs/specs/2026-11-02-telegram-auth/spec.md` §5.4 (с учётом текущего
рабочего дерева).

### 5.2. Статический fallback watchdog

Fallback рисуется без React и без Tailwind, поэтому все стили inline.

- Контейнер: `position: fixed; inset: 0; z-index: 2147483647; display:
  flex; align-items: center; justify-content: center; padding:
  calc(15px + env(safe-area-inset-top)) 15px calc(15px +
  env(safe-area-inset-bottom)); box-sizing: border-box;`
- Фон контейнера: light `#F2F2F7`, dark `#171717`.
- Карточка: `width: 100%; max-width: 28rem; border-radius: 25px;
  padding: 24px; display: flex; flex-direction: column; align-items:
  center; gap: 15px; text-align: center;`
- Фон карточки: light `#FFFFFF`, dark `#212121`.
- Заголовок: 24 px / 700, line-height 29 px, tracking `-0.8px`;
  light `#303033`, dark `#FFFFFF`.
- Описание: 15 px / 400, line-height 1.3; `#7A7D83` в обеих темах.
- Кнопка: width 100%, height 50 px, border-radius 25 px, border none,
  background `#007AFF`, color `#FFFFFF`, font 15 px / 600, cursor
  pointer.
- Шрифт: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- На ширине 320 px нет горизонтального скролла; текст переносится.
- Fallback не содержит логотипа и внешних изображений.

## 6. Темы и Telegram

- React-экран продолжает использовать `app-*` и `data-app-theme`.
- Watchdog не вызывает Telegram API и не зависит от `--tg-theme-*`.
- Watchdog определяет тему по `data-app-theme`, а при его отсутствии —
  по `prefers-color-scheme`.
- `telegram-web-app.js` остаётся в `<head>` до Meta, Links и app-
  скриптов; watchdog добавляется перед ним и не меняет это правило.
- `dark:`-классы не используются.

## 7. Доступность

- React-экран: существующие `role="alert"`, `aria-labelledby`,
  `aria-describedby`, фокус на заголовке.
- Watchdog:
  - контейнер: `role="alert"`, `aria-live="assertive"`,
    `aria-atomic="true"`;
  - заголовок — `h1` с `tabindex="-1"`; после показа фокус ставится на
    кнопку «Повторить»;
  - кнопка — нативный `<button type="button">` с видимым фокусом;
  - контраст текста соответствует палитре `app-*`;
  - ошибка передаётся текстом, а не только цветом.
- Таймаут не сопровождается звуком; haptics только в React-экране.

## 8. Нефункциональные требования

- Новых runtime-зависимостей нет. `axios` уже добавлен в рабочем дереве;
  спецификация предполагает его использование.
- `initData`, access/refresh и `request_id` не логируются и не попадают в
  URL, storage, ошибки или аналитику.
- Нет доступа к `window`/`document` на верхнем уровне модулей; watchdog
  — исключение в виде строки inline-скрипта, выполняемого в браузере.
- TypeScript strict, без `any`; типы — через `import type`.
- Все таймеры и abort listeners очищаются при завершении попытки и
  unmount.
- SSR сохраняется; SSR-ответ защищённых маршрутов по-прежнему содержит
  экран загрузки, а не защищённый контент.
- Watchdog не должен задерживать гидратацию: `clear()` вызывается до
  `hydrateRoot`.
- При добавлении CSP inline-скрипт watchdog требует nonce/hash.
- Проверки: `npm test`, `npm run typecheck`, `npm run build`.

## 9. Вне scope

- Общий временной бюджет для runtime retry-последовательности `401`
  (она остаётся ограниченной только таймаутами отдельных запросов).
- Глобальный `connection-error` для любых таймаутов обычных query-
  запросов вне auth.
- Новые причины ошибок, экраны и изменения копирайта `AuthScreen`.
- Поллинг поздно загрузившегося `telegram-web-app.js` в
  `TelegramProvider`.
- Изменение retry-бюджета `original → refresh → retry → fallback login →
  final retry`.
- Добавление jsdom/testing-library и компонентных тестов.
- Настройка CSP, service worker, offline-режим.
- Backend-изменения.
- Изменения главного экрана и голосового сценария.

## 10. Критерии приёмки

- [ ] `booting` не длится дольше 5 секунд после mount `AuthProvider` или
      нажатия «Повторить».
- [ ] При `isAvailable === false` bootstrap стартует через 2 секунды с
      refresh-путём и остатком бюджета.
- [ ] При `isAvailable === true` bootstrap стартует сразу.
- [ ] Каждый HTTP-запрос имеет таймаут 5000 мс по умолчанию; auth-запрос
      во время bootstrap не превышает остаток общего бюджета.
- [ ] Таймаут axios даёт `ApiNetworkError`, а не `AbortError`, и
      классифицируется как `connection-error/network`.
- [ ] Пользовательский `AbortSignal` по-прежнему даёт `AbortError` и не
      меняет auth-статус.
- [ ] По истечении бюджета показывается `connection-error` с кнопкой
      «Повторить»; сессия, user и кэш не очищаются.
- [ ] «Повторить» запускает новую попытку с новым 5-секундным бюджетом.
- [ ] Поздний результат старой попытки не перезаписывает новый статус.
- [ ] Нет unhandled rejection и setState после unmount.
- [ ] Существующий retry-бюджет `401` не изменился.
- [ ] Если JS-бандл или `telegram-web-app.js` не загрузился, через 5 секунд
      появляется статический fallback с «Повторить».
- [ ] Кнопка fallback перезагружает страницу.
- [ ] `entry.client.tsx` отменяет watchdog до гидратации; при нормальной
      загрузке fallback не показывается.
- [ ] Fallback работает без CSS, в light/dark, на 320 px и с safe-area.
- [ ] Fallback доступен: `role="alert"`, `aria-live`, фокус на кнопке.
- [ ] `npm test`, `npm run typecheck`, `npm run build` проходят.
- [ ] SSR-ответ содержит экран загрузки и inline watchdog, но не содержит
      защищённого контента.
- [ ] В браузере проверены: блокировка JS-бандла, блокировка
      `telegram-web-app.js`, offline/зависший backend, retry после
      восстановления сети.
- [ ] В Telegram проверены: обычный запуск, keyboard launch с пустым
      `initData`, таймаут сети, retry, light/dark, safe-area.

## 11. Принятые решения

- Общий бюджет 5 секунд считается от mount `AuthProvider`, а не от
  начала загрузки документа. Bundle watchdog покрывает фазу до старта
  клиентского JS отдельно. Это даёт две независимые гарантии: «бандл
  стартовал не позже 5 секунд» и «auth решился не позже 5 секунд после
  старта». Если нужен единый wall-clock бюджет от запроса документа,
  нужно вычитать `performance.now()` при mount; это не выбрано, чтобы
  медленная загрузка бандла не съедала время на auth.
- Ожидание Telegram снижено с 8 до 2 секунд, потому что 5 секунд
  ожидания исчерпали бы весь общий бюджет. Если Telegram не появился,
  приложение пытается восстановить сессию по refresh-cookie.
- Таймаут трактуется как `connection-error/network`, без новой причины и
  без нового экрана.
- HTTP-таймаут реализуется через axios `timeout`; таймаут-ошибка
  маппится в `ApiNetworkError`. Пользовательская отмена остаётся
  `AbortError`.
- Для bootstrap используется один `AbortController` на попытку; это
  позволяет немедленно освободить single-flight и дать «Повторить»
  начать новый запрос.
- Runtime-запросы не передают signal в общий refresh/login: правило
  «отмена одного запроса не отменяет общую auth-операцию» сохраняется.
- Для случая «JS-бандл не загрузился» добавляется inline SSR-watchdog,
  потому что React-таймер в этом случае физически не может запуститься.
  Watchdog отменяется в `entry.client.tsx` до гидратации.
- Копирайт React-экрана `connection-error` не меняется.
- Новых зависимостей нет; используется уже добавленный в рабочем дереве
  `axios`.
- Рабочее дерево содержит незакоммиченные изменения (axios, удалённые
  `plan.md`, копирайт `AuthScreen`); в рамках реализации их не нужно
  откатывать или переписывать, кроме файлов, явно указанных в плане.

## 12. Связь с существующей спецификацией

Эта спецификация уточняет `docs/specs/2026-11-02-telegram-auth/spec.md`:

- FR-1: `AUTH_TELEGRAM_INIT_TIMEOUT_MS` меняется с 8000 на 2000;
  добавляется общий бюджет 5000 мс.
- FR-6: добавляется переход в `connection-error` по истечении времени.
- FR-10: добавляются тесты таймаутов.
- Критерии приёмки дополняются пунктами о 5-секундном бюджете, HTTP-
  таймауте и watchdog.
- Остальные требования auth-спецификации (login/refresh/fallback,
  хранение токенов, экраны, доступность) остаются в силе.

В рамках реализации в старую спецификацию вносится пометка о
дополнении и обновляются только перечисленные пункты; история решений
не переписывается.
