# Milly — авторизация Telegram Mini App (SDD Specification)

**Статус:** draft for approval
**Дата:** 2026-11-02
**Область:** `frontend/`
**Backend-контракт:** `backend/docs/superpowers/specs/2026-11-02-telegram-auth-design.md`

## 1. Контекст и цель

Backend уже реализовал аутентификацию Telegram Mini App: принимает сырой
`Telegram.WebApp.initData`, проверяет подпись и `auth_date`, выдаёт
короткоживущий access JWT и создаёт refresh-сессию в HttpOnly cookie.
Фронтенд пока не имеет ни auth-слоя, ни API-клиента, ни защищённых экранов.

Нужно реализовать клиентскую авторизацию:

1. при каждом новом открытии Mini App получать access и refresh;
2. хранить access только в памяти приложения;
3. добавлять `Authorization: Bearer <access>` к защищённым запросам;
4. при `401` один раз обновлять access через refresh и повторять запрос;
5. при неудачном refresh пробовать повторный login по `initData`;
6. при терминальной ошибке показывать полноэкранный экран перезахода.

Ключевой нюанс: backend отклоняет `initData` старше 1 часа. Поэтому
«логин при каждом открытии» не может быть единственным путём: если
`initData` устарел, клиент обязан попробовать действующую refresh-cookie,
прежде чем просить пользователя перезайти.

## 2. Пользовательские сценарии

1. Пользователь открывает Mini App из меню бота. Пока идёт проверка входа,
   видит экран загрузки. После успешного login видит главный экран.
2. Пользователь долго пользуется приложением. Access истекает; очередной
   защищённый запрос получает `401`, клиент незаметно обновляет access и
   повторяет запрос. Пользователь не видит ошибки.
3. Несколько запросов одновременно получают `401`. Клиент выполняет один
   refresh, остальные ждут его результат.
4. Refresh тоже вернул `401`. Клиент один раз пробует login по текущему
   `initData`; если он ещё в пределах часового окна — сессия
   восстанавливается без участия пользователя.
5. `initData` устарел, refresh отозван: показывается экран «Нужно войти
   заново» с кнопкой открытия Mini App через бота.
6. Пользователь открыл приложение с keyboard-кнопки: `initData` пуст.
   Клиент пробует refresh-cookie. Если cookie действует, приложение
   открывается; иначе показывается экран «Откройте Milly из Telegram».
7. Нет сети или backend отвечает `5xx`: показывается экран «Нет
   соединения» с кнопкой «Повторить». Сессия не сбрасывается.
8. Пользователь переключает тему Telegram — экраны авторизации
   перекрашиваются без перезагрузки.

## 3. Функциональные требования

### FR-1. Bootstrap при запуске

- Bootstrap выполняется один раз на новое открытие приложения, в
  клиентском эффекте `AuthProvider`. Новое открытие = новый JS-контекст и
  пустая память; `accessToken` в памяти отсутствует.
- `sessionStorage`, `localStorage`, IndexedDB, `CloudStorage` и
  `SecureStorage` не используются.
- Bootstrap ждёт инициализации `TelegramProvider` (`isAvailable`), чтобы
  не отправить пустой `initData` раньше, чем загрузился
  `telegram-web-app.js`.
- Если в течение `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 8000` Telegram WebApp не
  стал доступен, bootstrap всё равно запускается: это позволяет
  восстановить сессию по refresh-cookie в браузере или показать
  терминальный экран.
- Алгоритм bootstrap:
  1. Если `initData.trim() !== ""` — выполнить login.
  2. Если login успешен — статус `authenticated`.
  3. Если login вернул `401` (например, `auth_date` старше 1 часа) —
     выполнить refresh.
  4. Если `initData` пуст — сразу выполнить refresh.
  5. Если refresh успешен — получить пользователя через `/auth/me` и
     перейти в `authenticated`.
  6. Если refresh вернул `401`:
     - `initData` был и login уже пробовали — статус `reauth-required`;
     - `initData` пуст — статус `no-init-data`.
  7. Если `/auth/me` после успешного refresh вернул `401` — статус
     `reauth-required`; fallback-логин на bootstrap не запускается.
  8. Сетевая ошибка или `5xx` на login/refresh/me — статус
     `connection-error`.
  9. `403`, `422` и прочие не-`401`/не-`5xx` ответы login/refresh/me —
     статус `reauth-required`; `503` попадает в `5xx` и даёт
     `connection-error`.
- Повторный login после неудачного refresh на bootstrap не выполняется:
  он уже был первой попыткой при непустом `initData`.

### FR-2. Login по `initData`

- `POST {API_BASE}/auth/telegram` с телом `{ "init_data": "<raw>" }`.
- Запрос идёт с `credentials: "include"`, без заголовка `Authorization`.
- Успех `200`: сохранить `access_token` в памяти, сохранить `user`,
  перевести статус в `authenticated`.
- `initData` передаётся только в теле запроса. Запрещено: query string,
  заголовки, логи, сообщения об ошибках, аналитика.
- Пустой `initData` никогда не отправляется на backend.
- Login не выполняется, если `initData` состоит только из пробелов.

### FR-3. Access-токен и API-клиент

- Access-токен хранится только в памяти модуля и не доступен React-
  компонентам напрямую.
- Refresh-токен недоступен JS: он живёт только в HttpOnly cookie,
  которую выставляет backend.
- Все защищённые запросы идут через единый клиент в `app/lib/api/`.
  Разрозненные `fetch` по компонентам запрещены.
- Клиент:
  - добавляет `Authorization: Bearer <access>`, если токен есть;
  - всегда отправляет `credentials: "include"`;
  - сериализует JSON-тело и выставляет `Content-Type: application/json`;
  - разбирает конверт ошибки backend
    `{ error, code, message, description, details, request_id }`;
  - выбрасывает типизированную `ApiError` со `status`, `code`,
    `requestId`;
  - возвращает `undefined` для `204`.
- Access не попадает в query string, cookie, `sessionStorage`,
  `localStorage` и логи.
- React Query использует только этот клиент. При терминальной auth-ошибке
  кэш React Query очищается.
- React Query не повторяет `AuthSessionError` автоматически: повтор
  auth-операции выполняется только кнопкой `Повторить` в AuthGate.

### FR-4. `401` и single-flight refresh

- При `401` от защищённого endpoint клиент выполняет refresh:
  `POST {API_BASE}/auth/refresh`, без тела, с `credentials: "include"`.
- Refresh ответ `200` содержит новый `access_token`; он сохраняется в
  память, исходный запрос повторяется ровно один раз.
- Все одновременные `401` используют один in-flight refresh. Повторный
  refresh не стартует, пока текущий не завершён.
- Auth-endpoint'ы (`/auth/telegram`, `/auth/refresh`, `/auth/logout`,
  `/auth/me`) не проходят через interceptor и не рекурсивно вызывают
  refresh.
- Если повтор исходного запроса с новым access снова вернул `401`, клиент
  не запускает второй refresh; он переходит к fallback-логину (FR-5).
- Бюджет одного исходного запроса:
  1. запрос с текущим access;
  2. после `401` — один refresh;
  3. после успешного refresh — один повтор запроса;
  4. если повтор снова `401` — один fallback-логин по `initData`;
  5. после успешного fallback-логина — последний повтор запроса;
  6. если последний повтор снова `401` — терминальное состояние, без
     новых refresh/login.
- `AbortError` пробрасывается вызывающему коду без смены auth-статуса.
- Общий refresh/fallback-логин не принимает `AbortSignal` отдельного
  вызывающего запроса: отмена одного запроса не отменяет общую
  auth-операцию для остальных ожидающих.

### FR-5. Fallback-логин после неудачного refresh

- Если refresh вернул `401`, клиент один раз пробует login по текущему
  `Telegram.WebApp.initData` (single-flight).
- Login при fallback выполняется, только если `initData` непустой.
- Если login успешен — исходный запрос повторяется последний раз с новым
  access.
- Если повтор после fallback-логина снова вернул `401` — терминальное
  состояние `reauth-required`, токен очищается, кэш React Query
  очищается.
- Если login вернул `401`, `initData` пуст или login недоступен —
  терминальное состояние `reauth-required` / `no-init-data`, токен
  очищается, кэш React Query очищается.
- Если refresh или fallback-login упал по сети/`5xx` — состояние
  `connection-error`; токен и пользователь не очищаются, приложение
  блокируется до повтора.
- Если refresh или fallback-login вернул `403`, `422` или другой
  не-`401`/не-`5xx` клиентский ответ — состояние `reauth-required`,
  сессия очищается; повторять такой ответ бессмысленно.
- `initDataUnsafe` и любые поля из него для авторизации не используются.

### FR-6. Состояния и переходы

```text
booting
  -> authenticated        (login success / refresh+me success)
  -> connection-error     (network / 5xx)
  -> reauth-required      (401 после login+refresh, 403, 422, 503, иное)
  -> no-init-data         (initData пуст и refresh 401)

authenticated
  -> connection-error     (refresh/fallback login: network / 5xx)
  -> reauth-required      (refresh 401 + fallback login 401/empty)
  -> no-init-data         (refresh 401 + fallback login невозможен)

connection-error
  -> booting              (retry)
  -> authenticated        (retry success)

reauth-required
  -> booting              (retry)
  -> authenticated        (retry success)

no-init-data
  -> booting              (retry)
  -> authenticated        (cookie появилась и refresh success)
```

- Переход в `booting` при повторе сбрасывает только `reason`; токен
  очищается заранее только для терминальных состояний.
- Терминальное состояние означает: защищённый `Outlet` не рендерится,
  вместо него — полноэкранный экран AuthGate.

### FR-7. AuthProvider и AuthGate

- `AuthProvider` добавляется в `AppProviders` внутри `TelegramProvider`,
  чтобы иметь доступ к `initData`, `isAvailable`, `webApp` и haptics.
- `AuthProvider` публикует через `useAuth()`:
  - `status: AuthStatus`;
  - `user: AuthUser | null`;
  - `reason: AuthFailureReason | null`;
  - `retry(): void`;
  - `isAuthenticated: boolean`.
- Access-токен через контекст не публикуется.
- API-клиент не импортирует React и не знает про провайдер. Связь
  «терминальная ошибка → AuthProvider» идёт через модуль
  `app/lib/auth/auth-events.ts`:
  - `setAuthFailureListener(listener | null): void`;
  - `notifyAuthFailure(failure: AuthFailure): void`;
  - уведомление дедуплицируется: несколько одновременных терминальных
    ошибок дают одно событие до следующего успешного bootstrap;
  - API-клиент после уведомления выбрасывает типизированную
    `AuthSessionError` с причиной.
- `AuthProvider` подписывается на listener в эффекте и отписывается при
  unmount.
- `AuthGate` вставляется в `app/routes/_app.tsx` вокруг `Outlet`:
  `AppShell > AuthGate > Outlet`.
- При `status !== "authenticated"` дочерние маршруты не рендерятся.
- При переходе в `reauth-required` или `no-init-data` токен удаляется и
  `queryClient.clear()` вызывается один раз благодаря дедупликации
  события.
- При повторе (`retry`) выполняется полный bootstrap заново и сбрасывается
  флаг дедупликации.
- `AuthProvider` не обращается к `window`/`document` на верхнем уровне
  модулей.

### FR-8. Экраны авторизации

Экраны являются full-screen состоянием AuthGate, а не отдельным route.
URL не меняется; защищённый контент не монтируется.

#### Loading (`booting`)

- Логотип Milly (`app/assets/icons/Logo.svg`) через `<img>`: логотип
  цветной, CSS-mask и `AssetIcon` его обезличат.
- Заголовок `Milly`.
- Текст `Проверяем вход…`.
- `role="status"`, `aria-live="polite"`, `aria-busy="true"`.
- Кнопок нет.

#### Connection error (`connection-error`)

- Заголовок при `reason = "network"`: `Нет соединения`.
- Заголовок при `reason = "server"`: `Сервис временно недоступен`.
- Описание: `Проверьте подключение и попробуйте снова.`
- Основная кнопка: `Повторить`.
- Кнопка запускает `retry()`.

#### Reauth required (`reauth-required`)

- Заголовок: `Нужно войти заново`.
- Описание: `Сессия истекла. Откройте Milly заново через меню бота.`
- Если `VITE_TG_BOT_USERNAME` задан:
  - основная кнопка `Открыть Milly` ведёт на
    `https://t.me/<username>?startapp=auth`;
  - вторичная кнопка `Повторить`.
- Если username не задан:
  - единственная кнопка `Повторить`;
  - дополнительная подсказка `Закройте приложение и откройте его через
    меню бота.`

#### No init data (`no-init-data`)

- Заголовок: `Откройте Milly из Telegram`.
- Описание: `Для входа нужны данные Telegram. Запустите приложение через
  меню бота.`
- Если `VITE_TG_BOT_USERNAME` задан — основная кнопка `Открыть Milly` и
  вторичная `Повторить`.
- Если username не задан — единственная кнопка `Повторить` и подсказка
  `Закройте приложение и откройте его через меню бота.`

#### Общие правила экранов

- Экраны не показывают токены, `initData`, `request_id` и внутренние
  ошибки backend.
- При наличии бота кнопка открытия вызывает
  `Telegram.WebApp.openTelegramLink(url)` при
  `supportsVersion("6.1", webApp)`. Вне Telegram или без метода —
  fallback `window.open(url, "_blank", "noopener,noreferrer")` в
  обработчике, не на верхнем уровне модуля.
- Haptics: `notification("error")` при переходе в `connection-error` и
  `reauth-required`, `notification("success")` при успешном retry из
  экрана ошибки. Вызовы только через `useTelegram()` и только если
  приложение активно.

### FR-9. Конфигурация

- `VITE_API_BASE_URL` — база API. Значение по умолчанию `/api/v1`.
  Должна быть same-origin или same-site; cross-site cookie-режим не
  поддерживается.
- `VITE_TG_BOT_USERNAME` — username бота без `@`. Значение для текущего
  проекта — `millyco_bot`.
- Обе переменные добавляются в `.env.example`; `.env` не коммитится.
- `vite.config.ts`: proxy `/api` должен сохранять путь `/api/v1/...`.
  Текущий `rewrite`, срезающий `/api`, удаляется.
- В dev-proxy заголовок `Origin` переписывается на origin backend
  (`http://127.0.0.1:8000`), потому что backend разрешает только свой
  origin или `CORS_ORIGINS`. Это dev-only поведение; production работает
  через same-origin reverse proxy. Правка backend `.env` не требуется.
- В production `/api` должен проксироваться на backend с того же origin.
  Реализация reverse proxy — вне scope фронтенда, но требование
  фиксируется в README/spec.

### FR-10. Тесты auth state machine

- Добавляется Vitest (`npm test`, `npm run test:watch`), окружение
  `node`, без jsdom.
- Тестами покрываются чистые модули: token store, API-клиент,
  refresh/login single-flight, retry, bootstrap-auth.
- Обязательные сценарии:
  1. login success сохраняет access только в памяти и возвращает user;
  2. login `401` → refresh success → authenticated;
  3. login `401` → refresh `401` → reauth;
  4. пустой `initData` + refresh success → `/auth/me` → authenticated;
  5. пустой `initData` + refresh `401` → no-init-data;
  6. network/`5xx` → connection-error, токен не очищается;
  7. защищённый `401` → один refresh → повтор с новым Bearer;
  8. N одновременных `401` → ровно один refresh;
  9. refresh `401` → login success → повтор исходного запроса;
  10. refresh `401` → login `401`/пустой initData → reauth + очистка;
  11. refresh success → повтор запроса `401` → fallback login success →
      последний повтор успешен;
  12. refresh success → повтор `401` → login success → последний повтор
      `401` → reauth без новых refresh/login;
  13. повторный `401` после retry не запускает второй refresh;
  14. `/auth/me` после refresh вернул `401` → reauth без fallback-login;
  15. runtime refresh/login `403`/`422` → reauth; `503` → connection-error;
  16. auth-endpoint'ы не рекурсируют;
  17. `AbortError` не меняет auth-статус и не отменяет общий refresh;
  18. токены и `initData` не попадают в URL/хранилища (статическая
      проверка по коду в рамках review).
- Компонентные и E2E-тесты в этой итерации не добавляются.

## 4. Данные и состояния

### 4.1. API-контракт

| Метод | Путь | Тело | Ответ | Auth |
|---|---|---|---|---|
| `POST` | `/auth/telegram` | `{ init_data: string }` | `AuthResponse` + `Set-Cookie` | нет |
| `POST` | `/auth/refresh` | нет | `TokenResponse` + `Set-Cookie` | cookie |
| `POST` | `/auth/logout` | нет | `204` + очистка cookie | cookie |
| `GET` | `/auth/me` | нет | `UserResponse` | Bearer |

`/auth/logout` не используется в этой итерации: выхода из аккаунта в
Mini App нет. Endpoint остаётся доступен для будущих настроек.

### 4.2. Типы

```ts
interface TelegramProfile {
  telegram_id: number;
  is_bot: boolean | null;
  first_name: string;
  last_name: string | null;
  username: string | null;
  language_code: string | null;
  is_premium: boolean;
  added_to_attachment_menu: boolean | null;
  allows_write_to_pm: boolean | null;
  photo_url: string | null;
}

interface AuthUser {
  id: number;
  created_at: string;
  telegram_profile: TelegramProfile;
}

interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

interface AuthResponse extends TokenResponse {
  user: AuthUser;
}

interface ApiErrorEnvelope {
  error: true;
  code: string;
  message: string;
  description: string;
  details: unknown | null;
  request_id: string;
}

type AuthStatus =
  | "booting"
  | "authenticated"
  | "connection-error"
  | "reauth-required"
  | "no-init-data";

type AuthFailureReason =
  | "network"
  | "server"
  | "init_data_missing"
  | "init_data_invalid"
  | "session_expired"
  | "forbidden"
  | "not_configured"
  | "request_failed";

interface AuthFailure {
  status: "connection-error" | "reauth-required" | "no-init-data";
  reason: AuthFailureReason;
}

class ApiError extends Error {
  status: number;
  code: string;
  requestId: string;
}

class ApiNetworkError extends Error {}

class EmptyInitDataError extends Error {}

class AuthSessionError extends Error {
  failure: AuthFailure;
}
```

### 4.3. Bootstrap-контракт

```ts
interface BootstrapAuthOptions {
  initData: string;
  login: (initData: string) => Promise<AuthResponse>;
  refresh: () => Promise<TokenResponse>;
  fetchMe: () => Promise<AuthUser>;
}

type BootstrapAuthResult =
  | { status: "authenticated"; user: AuthUser }
  | { status: "connection-error"; reason: "network" | "server" }
  | { status: "reauth-required"; reason: AuthFailureReason }
  | { status: "no-init-data"; reason: "init_data_missing" };

function bootstrapAuth(
  options: BootstrapAuthOptions,
): Promise<BootstrapAuthResult>;
```

`bootstrapAuth` не работает с React и не читает `window`; все побочные
эффекты (запись токена) выполняют переданные `login`/`refresh`.

### 4.4. API-клиент

```ts
interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

function apiRequest<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T>;
```

- `auth` по умолчанию `true`, `retryOnUnauthorized` по умолчанию `true`.
- `/auth/telegram`, `/auth/refresh`, `/auth/logout` вызываются с
  `auth: false` + `retryOnUnauthorized: false`.
- `/auth/me` вызывается с `auth: true` (Bearer обязателен) и
  `retryOnUnauthorized: false`: access только что выдан, повторный
  refresh не нужен.
- `signal` применяется только к текущему HTTP-запросу и не передаётся в
  общий refresh/fallback-логин.

### 4.5. Хранение

```ts
let accessToken: string | null = null;

function getAccessToken(): string | null;
function setAccessToken(token: string): void;
function clearAccessToken(): void;
```

- Модуль не использует `window`, storage и cookies.
- `AuthUser` живёт только в React-состоянии `AuthProvider`.
- Refresh-cookie не читается и не изменяется JS.
- После `clearAccessToken()` любые последующие защищённые запросы
  получают `auth: false`-поведение и не должны выполняться, пока
  AuthGate показывает экран.

### 4.6. Очистка при терминальной ошибке

При переходе в `reauth-required` или `no-init-data`:

1. `clearAccessToken()`;
2. `queryClient.clear()`;
3. `AuthProvider` выставляет `user = null`;
4. активные запросы не отменяются принудительно, но их ошибки после
   смены статуса игнорируются.

## 5. Визуальная спецификация

Новых Figma-макетов нет. Экраны используют визуальный язык главного
экрана и существуют только как состояния AuthGate.

### 5.1. Токены

| Элемент | Light | Dark |
|---|---|---|
| Фон страницы | `app-bg` `#F2F2F7` | `app-bg` `#171717` |
| Карточка | `app-card` `#FFFFFF` | `app-card` `#212121` |
| Заголовок | `app-text` `#303033` | `app-text` `#FFFFFF` |
| Описание | `app-text-secondary` `#7A7D83` | `app-text-secondary` `#7A7D83` |
| Подсказка | `app-hint` `#A2ACB0` | `app-hint` `#A2ACB0` |
| Primary-кнопка | `app-accent` `#007AFF` + белый текст | то же |
| Secondary-кнопка | `app-bg` + `app-text` | то же |
| Логотип | оригинальные цвета `Logo.svg` | то же |

Новые цвета не добавляются, `dark:`-классы не используются.

### 5.2. Геометрия

- Контейнер: `flex min-h-full w-full flex-1 flex-col items-center
  justify-center px-[15px] py-[24px]`, внутри `AppShell` (`max-w-md` уже
  применён).
- Карточка: `w-full rounded-[25px] bg-app-card p-[24px]`, контент по
  центру, `gap-[15px]`.
- Логотип: `48 × 48px`, `<img>` с `alt=""`, оригинальные цвета.
- Кнопки: ширина 100%, высота `50px`, радиус `25px`, gap между кнопками
  `10px`.
- На ширине `320px` нет горизонтального скролла и обрезанного текста.
- Экран не растягивается шире `max-w-md`.

### 5.3. Типографика

| Элемент | Размер / вес | Line-height |
|---|---|---|
| Заголовок | 24 px / 700 | 29 px, tracking `-0.8px` |
| Описание | 15 px / 400 | 1.3 |
| Подсказка | 13 px / 400 | 1.4 |
| Кнопка | 15 px / 600 | auto |

Шрифт — Inter.

### 5.4. Состояния

| Состояние | Заголовок | Описание | Действия |
|---|---|---|---|
| `booting` | `Milly` | `Проверяем вход…` | нет |
| `connection-error` (`network`) | `Нет соединения` | `Проверьте подключение и попробуйте снова.` | `Повторить` |
| `connection-error` (`server`) | `Сервис временно недоступен` | `Проверьте подключение и попробуйте снова.` | `Повторить` |
| `reauth-required` | `Нужно войти заново` | `Сессия истекла. Откройте Milly заново через меню бота.` | `Открыть Milly`, `Повторить` |
| `no-init-data` | `Откройте Milly из Telegram` | `Для входа нужны данные Telegram. Запустите приложение через меню бота.` | `Открыть Milly`, `Повторить` |

Если `VITE_TG_BOT_USERNAME` не задан, кнопка `Открыть Milly` не
рендерится, остаётся `Повторить` и подсказка
`Закройте приложение и откройте его через меню бота.`

### 5.5. Поведение

- Переходы между состояниями происходят без анимаций; это снижает риск
  мигания и не требует Motion.
- Кнопка `Повторить` блокируется на время `booting`
  (`disabled`, `opacity-40`).
- Экран загрузки показывается и в SSR-ответе: сервер не знает
  пользователя, поэтому защищённый контент не рендерится до клиентской
  авторизации.

## 6. Темы и Telegram

- Используются `app-*` токены и `data-app-theme`, которые уже
  выставляет `TelegramProvider`; `dark:` не используется.
- Safe-area применяет `AppShell`; экраны не добавляют собственные
  `--app-inset-*`.
- `telegram-web-app.js` остаётся в `<head>` до app-скриптов.
- `Telegram.WebApp.ready()` и `expand()` уже вызывает
  `TelegramProvider`; auth-слой не дублирует их.
- `openTelegramLink` гейтится `supportsVersion("6.1", webApp)` и
  вызывается только из обработчика кнопки. Тип метода добавляется в
  `app/lib/telegram/types.ts` как опциональный.
- Haptics — только через `useTelegram().haptics`.
- `initData` берётся из `useTelegram()` в React-слое и из
  `getTelegramWebApp()?.initData` в fallback-логине API-клиента.
  `window.Telegram` напрямую не используется.

## 7. Доступность

- Loading: `role="status"`, `aria-live="polite"`, `aria-busy="true"`.
- Error-экраны: `role="alert"`, заголовок `h1`, описание связано через
  `aria-describedby`.
- Кнопки имеют `type="button"`, видимый `focus-visible` outline и
  доступные имена.
- Фокус при переходе в терминальное состояние ставится на заголовок
  экрана (через `tabIndex={-1}` и `ref`).
- При `booting` после нажатия «Повторить» фокус остаётся на кнопке, пока
  она не размонтируется; после успеха фокус переходит в обычный поток
  приложения без принудительного перемещения.
- Контраст текста соответствует существующим `app-*` токенам.
- Ошибки не передаются только цветом: есть текстовый заголовок и
  описание.

## 8. Нефункциональные требования

- SSR сохраняется. SSR-ответ для защищённых маршрутов содержит экран
  загрузки AuthGate, а не содержимое главного экрана.
- Нет доступа к `window`/`document` на верхнем уровне модулей; только в
  эффектах и обработчиках.
- TypeScript strict, без `any`; типы — через `import type`.
- Файлы — kebab-case, компоненты — PascalCase, алиас `~/`.
- `VITE_*` не содержит секретов. `initData`, access и refresh не
  логируются.
- Единственная новая зависимость — `vitest` (dev). Runtime-зависимости
  не добавляются.
- Все сетевые запросы идут через `app/lib/api/`; компоненты не вызывают
  `fetch` напрямую.
- Защищённые route-loaders на сервере не используются: access живёт
  только в памяти клиента. Защищённые данные загружаются клиентски через
  React Query/`clientLoader` после `authenticated`.
- Кэш React Query очищается при `reauth-required`/`no-init-data`.
- Запросы не содержат токены в URL.
- Пути API не дублируются по коду: база берётся из одного модуля
  конфигурации.

## 9. Вне scope

- Изменение backend-контракта, TTL, формата JWT или cookie.
- UI выхода из аккаунта и вызов `/auth/logout`.
- Проактивный refresh по `expires_in` до получения `401`.
- Серверные защищённые loader'ы, SSR-сессия, передача access на сервер.
- Cross-site режим (refresh в body + SecureStorage) и `SameSite=None`.
- Роли, permissions, RBAC и профиль пользователя.
- Публичные экраны без авторизации.
- Offline-очередь запросов и автоматический backoff сверх ручного
  «Повторить».
- Синхронизация сессии между вкладками/устройствами.
- Компонентные/E2E-тесты и настройка CI.
- Реализация production reverse proxy для `/api`.

## 10. Критерии приёмки

- [ ] При каждом новом открытии с непустым `initData` выполняется login;
      access хранится только в памяти, refresh — только в HttpOnly
      cookie.
- [ ] `sessionStorage`/`localStorage` не используются для токенов.
- [ ] Защищённые запросы уходят с `Authorization: Bearer`.
- [ ] `401` запускает ровно один refresh на все одновременные запросы;
      исходный запрос повторяется один раз.
- [ ] Refresh `401` → fallback login по `initData`; при успехе запрос
      повторяется.
- [ ] Refresh success → повтор запроса `401` → fallback login → последний
      повтор; при повторном `401` — экран перезахода без циклов.
- [ ] Refresh `401` + login `401`/пустой `initData` → экран
      «Нужно войти заново» / «Откройте Milly из Telegram».
- [ ] Устаревший `initData` (старше 1 часа) + действующий refresh →
      приложение открывается без экрана перезахода.
- [ ] Пустой `initData` + действующий refresh → приложение открывается,
      пользователь получен через `/auth/me`.
- [ ] Network/`5xx` → экран ошибки с «Повторить»; токен не очищается;
      после восстановления сети retry приводит в приложение.
- [ ] Auth-endpoint'ы не вызывают рекурсивный refresh и не зацикливаются.
- [ ] `AbortError` не меняет auth-состояние.
- [ ] Экраны AuthGate совпадают по копирайту, геометрии и токенам с §5.
- [ ] `VITE_TG_BOT_USERNAME` формирует deep link
      `https://t.me/millyco_bot?startapp=auth`; без переменной кнопка
      скрыта.
- [ ] `openTelegramLink` гейтится версией 6.1; вне Telegram используется
      безопасный fallback.
- [ ] В SSR-ответе защищённых маршрутов нет главного экрана, есть
      «Проверяем вход…».
- [ ] `npm test`, `npm run typecheck`, `npm run build` проходят.
- [ ] В браузере проверены light/dark, 320 px и отсутствие
      горизонтального скролла.
- [ ] В Telegram проверены запуск из меню бота, keyboard-launch с пустым
      `initData`, safe-area, light/dark и deep link.

## 11. Принятые решения

- SDD-документы лежат в
  `docs/specs/2026-11-02-telegram-auth/`.
- Bootstrap: login по `initData` первым; refresh — при пустом `initData`
  или после `401` от login. Это учитывает часовое окно `auth_date`.
- `sessionStorage` не нужен: access не переживает новое открытие, а
  refresh-cookie уже обеспечивает восстановление.
- Access хранится только в памяти и не отдаётся React-компонентам;
  наружу торчит `useAuth()` без токена.
- Refresh — HttpOnly cookie backend; фронтенд её не читает.
- Fallback-логин выполняется после неудачного refresh, но не более
  одного раза на исходный запрос; после fallback допускается последний
  повтор исходного запроса.
- Сетевые/`5xx` ошибки не сбрасывают сессию; терминальные `401/403/422`
  сбрасывают.
- API-клиент не импортирует React: терминальные ошибки доставляются в
  `AuthProvider` через модуль `auth-events.ts` с дедупликацией.
- `/auth/me` использует Bearer, но не запускает повторный refresh.
- Общий refresh не отменяется `AbortSignal` отдельных запросов.
- Терминальное состояние — full-screen AuthGate, а не route.
- Используется `app-*` палитра, как на главном экране и voice-шторке.
- `VITE_API_BASE_URL` по умолчанию `/api/v1`;
  `VITE_TG_BOT_USERNAME=millyco_bot`.
- Vite proxy сохраняет `/api/v1` и переписывает `Origin` на backend в
  dev; production — same-origin reverse proxy.
- Для auth state machine добавляется Vitest; runtime-зависимостей нет.
- `/auth/logout` и UI выхода не реализуются в этой итерации.
