# Milly Telegram Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать клиентскую авторизацию Telegram Mini App: login по `initData`, access только в памяти, single-flight refresh на `401`, fallback-логин, полноэкранные состояния AuthGate и unit-тесты auth state machine.

**Architecture:** `AuthProvider` внутри `TelegramProvider` запускает bootstrap один раз за открытие приложения. `bootstrapAuth` — чистый оркестратор login → refresh → `/auth/me`. Низкоуровневый `requestJson` отвечает только за HTTP и разбор ошибок; `auth-api` добавляет single-flight login/refresh; `apiRequest` добавляет Bearer, refresh на `401`, повтор и fallback-логин. Терминальные ошибки доставляются в провайдер через `auth-events`, чтобы API-клиент не импортировал React. `AuthGate` блокирует `Outlet` до `authenticated`.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Tailwind CSS 4, TanStack Query 5, Telegram Mini App API, Vitest (node environment).

**Spec:** `docs/specs/2026-11-02-telegram-auth/spec.md`

## Global Constraints

- Access-токен — только в памяти модуля; `localStorage`, `sessionStorage`, IndexedDB, Telegram storage и JS-cookie запрещены.
- Refresh-токен — только HttpOnly cookie backend; фронтенд её не читает. Все запросы — `credentials: "include"`.
- Bootstrap: login по непустому `initData` первым; refresh — при пустом `initData` или после `401` от login. `sessionStorage` для «нового открытия» не используется.
- Fallback-логин после неудачного refresh — не более одного раза на исходный запрос.
- Бюджет запроса: original → refresh → retry → fallback login → final retry. После final `401` — терминальное состояние без новых refresh/login.
- Single-flight: все одновременные `401` делят один refresh; одновременные fallback-логины делят один login.
- Сетевые ошибки и `5xx` → `connection-error` без очистки сессии; `401/403/422` → `reauth-required` с очисткой; пустой `initData` + неудачный refresh → `no-init-data`.
- Auth-запросы `login`/`refresh`/`logout` идут с `auth: false`, `retryOnUnauthorized: false`. `/auth/me` идёт с Bearer и `retryOnUnauthorized: false`.
- `initData`, access и refresh не логируются, не попадают в URL, ошибки и аналитику.
- Терминальное состояние — full-screen `AuthGate`, не отдельный route. Защищённый `Outlet` при этом не монтируется.
- Только `app-*` токены; `dark:` не использовать. Копирайт — строго из `spec.md` §3 FR-8 и §5.4.
- Файлы — kebab-case; компоненты — PascalCase; алиас `~/`; TypeScript strict без `any`; типы — `import type`.
- Новых runtime-зависимостей нет. Добавляется только dev-зависимость `vitest`.
- Не редактировать `.react-router/types/`.
- Проверки: `npm test`, `npm run typecheck`, `npm run build`.
- Не коммитить: текущая рабочая директория не является git-репозиторием.
- `VITE_API_BASE_URL` по умолчанию `/api/v1`; `VITE_TG_BOT_USERNAME` по умолчанию отсутствует, для проекта — `millyco_bot`.
- Dev proxy сохраняет `/api/v1` и переписывает `Origin` на `http://127.0.0.1:8000`; production требует same-origin reverse proxy.

## Review Focus

- `initData` старше 1 часа, refresh-cookie действует: приложение открывается, а не показывает экран перезахода.
- Пустой `initData` (keyboard launch), refresh-cookie действует: приложение открывается; без cookie — `no-init-data`, а не `reauth-required`.
- Несколько одновременных `401`: ровно один refresh, ни один запрос не зацикливается и не запускает второй refresh.
- Refresh success → retry `401`: выполняется один fallback-логин и один final retry; при повторном `401` — терминальное состояние.
- Network/`5xx` при refresh/fallback login: токен и пользователь сохраняются, показывается `connection-error`, retry возвращает в приложение.
- `AbortError` одного запроса не меняет auth-статус и не отменяет общий refresh для остальных.
- `/auth/me` отправляет Bearer, не запускает повторный refresh и при `401` ведёт в `reauth-required`.
- Терминальная ошибка очищает access и кэш React Query ровно один раз; защищённый контент размонтируется.
- SSR-ответ защищённых маршрутов содержит экран загрузки, а не главный экран.
- Экраны AuthGate не ломаются на 320 px, в light/dark, с safe-area и без горизонтального скролла.

---

### Task 1: Vitest, env-файлы и dev proxy

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (через `npm install -D vitest`)
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `app/vite-env.d.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: npm scripts `test` и `test:watch`; алиас `~` для Vitest; типы `ImportMetaEnv.VITE_API_BASE_URL` и `ImportMetaEnv.VITE_TG_BOT_USERNAME`; dev proxy, сохраняющий `/api/v1`.

- [ ] **Step 1: Установить Vitest**

Run:
```bash
npm install -D vitest
```
Expected: `package.json` и `package-lock.json` обновлены, установлена последняя совместимая с Vite 8 версия.

- [ ] **Step 2: Добавить scripts**

В `package.json` добавить:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Создать `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
    restoreMocks: true,
  },
});
```

- [ ] **Step 4: Создать `.env.example`**

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_TG_BOT_USERNAME=millyco_bot
```

- [ ] **Step 5: Создать `app/vite-env.d.ts`**

Объявить `VITE_API_BASE_URL?: string` и `VITE_TG_BOT_USERNAME?: string`
в `ImportMetaEnv`, не дублируя остальные поля `vite/client`.

- [ ] **Step 6: Исправить proxy в `vite.config.ts`**

Удалить `rewrite: (path) => path.replace(/^\/api/, "")`. Добавить в proxy
`configure`, который на `proxyReq` выставляет
`Origin: http://127.0.0.1:8000`. Путь `/api/v1/...` должен доходить до
backend без изменений.

- [ ] **Step 7: Проверить инструменты**

Run:
```bash
npx vitest run --passWithNoTests
npm run typecheck
```
Expected: Vitest завершается успешно (тестов пока нет), typecheck PASS.

---

### Task 2: Контракт API, ошибки, token store, классификация

**Files:**
- Create: `app/lib/api/types.ts`
- Create: `app/lib/api/config.ts`
- Create: `app/lib/api/errors.ts`
- Create: `app/lib/auth/types.ts`
- Create: `app/lib/auth/errors.ts`
- Create: `app/lib/auth/token-store.ts`
- Create: `app/lib/auth/token-store.test.ts`
- Create: `app/lib/auth/failure.ts`
- Create: `app/lib/auth/failure.test.ts`

**Interfaces:**
- Produces:
```ts
export interface TelegramProfile { /* поля из spec §4.2 */ }
export interface AuthUser { /* id, created_at, telegram_profile */ }
export interface TokenResponse { access_token: string; token_type: "bearer"; expires_in: number; }
export interface AuthResponse extends TokenResponse { user: AuthUser; }
export interface ApiErrorEnvelope { /* поля из spec §4.2 */ }

export const API_BASE_URL: string;
export function apiUrl(path: string): string;

export class ApiError extends Error {
  constructor(
    message: string,
    options: { status: number; code: string; requestId: string },
  );
  status: number;
  code: string;
  requestId: string;
}
export class ApiNetworkError extends Error {
  constructor(message: string, options?: ErrorOptions);
}

export type AuthStatus = "booting" | "authenticated" | "connection-error" | "reauth-required" | "no-init-data";
export type AuthFailureReason = "network" | "server" | "init_data_missing" | "init_data_invalid" | "session_expired" | "forbidden" | "not_configured" | "request_failed";
export interface AuthFailure { status: Exclude<AuthStatus, "booting" | "authenticated">; reason: AuthFailureReason; }

export class EmptyInitDataError extends Error {}
export class AuthSessionError extends Error { failure: AuthFailure; }

export function getAccessToken(): string | null;
export function setAccessToken(token: string): void;
export function clearAccessToken(): void;

export function isAbortError(error: unknown): boolean;
export function classifyAuthFailure(error: unknown, unauthorizedReason: AuthFailureReason): AuthFailure;
```

- [ ] **Step 1: Написать падающие тесты token store**

`app/lib/auth/token-store.test.ts`:
- до `setAccessToken` — `getAccessToken() === null`;
- после `setAccessToken("a")` — `"a"`;
- после `clearAccessToken()` — `null`;
- в `beforeEach` вызывать `clearAccessToken()`.

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- app/lib/auth/token-store.test.ts`  
Expected: FAIL, модуль не найден.

- [ ] **Step 3: Реализовать типы, ошибки, конфиг и token store**

`API_BASE_URL` вычислять из `import.meta.env.VITE_API_BASE_URL ?? "/api/v1"`
и убирать завершающие `/`. `apiUrl` добавляет `/`, если путь без него.
`token-store` хранит единственную переменную модуля, без storage и
`window`.

- [ ] **Step 4: Написать падающие тесты `classifyAuthFailure`**

`app/lib/auth/failure.test.ts`:
- `ApiNetworkError` → `{ status: "connection-error", reason: "network" }`;
- `ApiError(401)` с `"session_expired"` → `reauth-required/session_expired`;
- `ApiError(403)` → `reauth-required/forbidden`;
- `ApiError(422)` → `reauth-required/init_data_invalid`;
- `ApiError(500)` и `ApiError(503)` → `connection-error/server`;
- `ApiError(418)` → `reauth-required/request_failed`;
- `EmptyInitDataError` → `no-init-data/init_data_missing`;
- `AbortError` определяется `isAbortError`, не классифицируется;
- неизвестная ошибка → `connection-error/server`.

- [ ] **Step 5: Запустить тесты и убедиться, что они падают**

Run: `npm test -- app/lib/auth/failure.test.ts`  
Expected: FAIL.

- [ ] **Step 6: Реализовать `failure.ts`**

Классификация строго по `instanceof` и `ApiError.status`; `AbortError` не
поглощать. `401` использует переданный `unauthorizedReason`.

- [ ] **Step 7: Прогнать тесты**

Run:
```bash
npm test -- app/lib/auth/token-store.test.ts app/lib/auth/failure.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 3: Низкоуровневый HTTP-клиент

**Files:**
- Create: `app/lib/api/http.ts`
- Create: `app/lib/api/http.test.ts`

**Interfaces:**
- Consumes: `API_BASE_URL`, `apiUrl`, `ApiError`, `ApiNetworkError`, `ApiErrorEnvelope`.
- Produces:
```ts
export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

export function requestJson<T>(
  path: string,
  options?: HttpRequestOptions,
): Promise<T>;
```

- [ ] **Step 1: Написать падающие тесты `requestJson`**

Покрыть:
- URL `${API_BASE_URL}${path}`, `credentials: "include"`, метод и JSON
  body с `Content-Type: application/json`;
- `Authorization: Bearer <token>` только при непустом `token`;
- отсутствие `Authorization` при `token = null`;
- успешный JSON и `204` → `undefined`;
- non-2xx с конвертом → `ApiError` с `status`, `code`, `requestId`;
- non-2xx без JSON → `ApiError.code === "http_error"`;
- `fetch` rejects → `ApiNetworkError`;
- `AbortError` пробрасывается как есть.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- app/lib/api/http.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Реализовать `requestJson`**

Не добавлять auth/refresh-логику. Только HTTP, JSON, конверт ошибок и
`AbortError`. `body` сериализовать, если он не `undefined`. Для `204` и
пустого тела вернуть `undefined`.

- [ ] **Step 4: Прогнать тесты**

Run:
```bash
npm test -- app/lib/api/http.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 4: Single-flight login, refresh и `/auth/me`

**Files:**
- Create: `app/lib/auth/auth-api.ts`
- Create: `app/lib/auth/auth-api.test.ts`

**Interfaces:**
- Consumes: `requestJson`, token store, `EmptyInitDataError`, `getTelegramWebApp`.
- Produces:
```ts
export function loginWithInitData(initData: string): Promise<AuthResponse>;
export function refreshAccessToken(): Promise<TokenResponse>;
export function fetchCurrentUser(): Promise<AuthUser>;
export function loginFromTelegram(): Promise<AuthResponse>;
```

- [ ] **Step 1: Написать падающие тесты auth-api**

Покрыть:
- `loginWithInitData` вызывает `POST /auth/telegram` с
  `{ init_data }`, `credentials: "include"`, без Bearer, сохраняет
  `access_token`;
- повторный одновременный вызов с тем же `initData` даёт один HTTP-запрос;
- пустой/пробельный `initData` → `EmptyInitDataError`, HTTP не вызывается;
- `refreshAccessToken` вызывает `POST /auth/refresh`, сохраняет новый
  access;
- два одновременных refresh дают один HTTP-запрос;
- refresh `ApiError(401)` очищает access и пробрасывает ошибку;
- refresh `ApiError(500)` не очищает access;
- `fetchCurrentUser` вызывает `GET /auth/me` с Bearer и без рекурсивного
  refresh; без токена → `ApiError(401)`;
- `loginFromTelegram` читает `getTelegramWebApp()?.initData`; пустой —
  `EmptyInitDataError`.

Для single-flight использовать deferred promise и проверять количество
вызовов `requestJson`.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- app/lib/auth/auth-api.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Реализовать `auth-api.ts`**

`loginWithInitData` и `refreshAccessToken` хранят in-flight promise в
переменных модуля и очищают его в `finally`. `loginWithInitData` не
передаёт `AbortSignal`. `fetchCurrentUser` берёт токен из store и при
отсутствии бросает `ApiError` со статусом `401`. `loginFromTelegram`
вызывает `loginWithInitData` с текущим `initData`.

- [ ] **Step 4: Прогнать тесты**

Run:
```bash
npm test -- app/lib/auth/auth-api.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 5: Чистый bootstrap-оркестратор

**Files:**
- Create: `app/lib/auth/bootstrap-auth.ts`
- Create: `app/lib/auth/bootstrap-auth.test.ts`

**Interfaces:**
- Consumes: `AuthResponse`, `TokenResponse`, `AuthUser`, `AuthFailure`, `AuthFailureReason`, `ApiError`, `isAbortError`, `classifyAuthFailure`.
- Produces:
```ts
export interface BootstrapAuthOptions {
  initData: string;
  login: (initData: string) => Promise<AuthResponse>;
  refresh: () => Promise<TokenResponse>;
  fetchMe: () => Promise<AuthUser>;
}

export type BootstrapAuthResult =
  | { status: "authenticated"; user: AuthUser }
  | { status: "connection-error"; reason: "network" | "server" }
  | { status: "reauth-required"; reason: AuthFailureReason }
  | { status: "no-init-data"; reason: "init_data_missing" };

export function bootstrapAuth(
  options: BootstrapAuthOptions,
): Promise<BootstrapAuthResult>;
```

- [ ] **Step 1: Написать падающие тесты bootstrap**

Покрыть:
- непустой `initData` + login success → `authenticated`, refresh и me не
  вызываются;
- login `ApiError(401)` → refresh success → me success → `authenticated`;
- login `401` → refresh `401` → `reauth-required/session_expired`, me не
  вызывается;
- пустой `initData` → refresh + me → `authenticated`;
- пустой `initData` + refresh `401` → `no-init-data`;
- login `ApiNetworkError` → `connection-error/network`;
- login `ApiError(500)`/`503` → `connection-error/server`;
- login `ApiError(403)` → `reauth-required/forbidden`;
- login `ApiError(422)` → `reauth-required/init_data_invalid`;
- refresh `ApiError(403)`/`422` → `reauth-required` с причиной;
- me `ApiError(401)` после refresh → `reauth-required/session_expired`,
  повторного login нет;
- `AbortError` пробрасывается;
- неизвестная ошибка → `connection-error/server`.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- app/lib/auth/bootstrap-auth.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Реализовать `bootstrapAuth`**

Строго по алгоритму `spec.md` §3 FR-1. Продолжать к refresh только при
`ApiError.status === 401` от login; остальные ошибки login сразу
классифицировать. Не делать fallback-login на bootstrap. Не читать
`window` и не писать токен внутри функции.

- [ ] **Step 4: Прогнать тесты**

Run:
```bash
npm test -- app/lib/auth/bootstrap-auth.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 6: События auth-ошибок и API-клиент с retry

**Files:**
- Create: `app/lib/auth/auth-events.ts`
- Create: `app/lib/auth/auth-events.test.ts`
- Create: `app/lib/api/client.ts`
- Create: `app/lib/api/client.test.ts`

**Interfaces:**
- Consumes: `requestJson`, `refreshAccessToken`, `loginFromTelegram`, token store, `ApiError`, `AuthSessionError`, `EmptyInitDataError`, `classifyAuthFailure`, `isAbortError`, `notifyAuthFailure`.
- Produces:
```ts
export function setAuthFailureListener(
  listener: ((failure: AuthFailure) => void) | null,
): void;
export function resetAuthFailureNotification(): void;
export function notifyAuthFailure(failure: AuthFailure): void;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

export function apiRequest<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T>;
```

- [ ] **Step 1: Написать падающие тесты `auth-events`**

- listener получает первый `notifyAuthFailure`;
- повторные уведомления до `resetAuthFailureNotification()` игнорируются;
- после reset listener снова получает событие;
- `setAuthFailureListener(null)` отключает доставку.

- [ ] **Step 2: Реализовать `auth-events.ts` и прогнать тест**

Run: `npm test -- app/lib/auth/auth-events.test.ts`  
Expected: PASS.

- [ ] **Step 3: Написать падающие тесты `apiRequest`**

Замокать `~/lib/api/http` и `~/lib/auth/auth-api`. Покрыть:
- `auth` по умолчанию `true`: `requestJson` получает token из store;
- `auth: false` не добавляет token и не запускает refresh;
- `retryOnUnauthorized: false` не запускает refresh;
- первый `ApiError(401)` → refresh → повтор с новым token;
- N одновременных `401` → `refreshAccessToken` вызван один раз, каждый
  запрос повторён;
- refresh `401` → `loginFromTelegram` success → повтор;
- refresh success → retry `401` → `loginFromTelegram` success → final
  retry;
- refresh success → retry `401` → login success → final retry `401` →
  `reauth-required`, `AuthSessionError`, новых refresh/login нет;
- refresh `ApiError(500)` → `connection-error/server`,
  `AuthSessionError`, login не вызывается;
- `loginFromTelegram` бросает `EmptyInitDataError` →
  `no-init-data/init_data_missing`;
- `loginFromTelegram` бросает `ApiNetworkError` →
  `connection-error/network`;
- `AbortError` на первом запросе → пробрасывается, refresh не вызван;
- `AbortError` на retry → пробрасывается, auth-событие не отправлено;
- обычная ошибка (например, `404`) пробрасывается без auth-события;
- после terminal failure `notifyAuthFailure` вызван ровно один раз.

- [ ] **Step 4: Запустить тесты и убедиться, что они падают**

Run: `npm test -- app/lib/api/client.test.ts`  
Expected: FAIL.

- [ ] **Step 5: Реализовать `apiRequest`**

Точный порядок:
1. `auth: false` → один `requestJson` без токена.
2. `retryOnUnauthorized: false` → один `requestJson` с текущим токеном.
3. Иначе original request; non-`401` и `AbortError` пробрасывать.
4. На `401` — `refreshAccessToken()`.
5. Refresh `401` → fallback-логин; refresh network/`5xx`/другая ошибка →
   `notifyAuthFailure(classifyAuthFailure(error, "session_expired"))` и
   `AuthSessionError`.
6. Retry после refresh; non-`401` пробрасывать, `401` → fallback-логин.
7. Fallback login success → final retry.
8. Fallback login error → классифицировать с
   `"init_data_invalid"`, уведомить и бросить `AuthSessionError`.
9. Final retry `401` → `reauth-required/session_expired`, уведомить и
   бросить `AuthSessionError`; non-`401` пробросить.
10. `AbortError` никогда не превращать в auth-событие.

`signal` передавать только в `requestJson`; в `refreshAccessToken` и
`loginFromTelegram` его не передавать.

- [ ] **Step 6: Прогнать тесты**

Run:
```bash
npm test -- app/lib/api/client.test.ts
npm run typecheck
```
Expected: PASS.

---

### Task 7: Экраны AuthGate, bot link, AuthProvider и wiring

**Files:**
- Create: `app/lib/telegram/bot-link.ts`
- Create: `app/lib/telegram/bot-link.test.ts`
- Modify: `app/lib/telegram/types.ts`
- Create: `app/components/auth/auth-screen.tsx`
- Create: `app/components/auth/auth-gate.tsx`
- Create: `app/providers/auth-provider.tsx`
- Modify: `app/providers/app-providers.tsx`
- Modify: `app/routes/_app.tsx`
**Interfaces:**
- Consumes: `bootstrapAuth`, `loginWithInitData`, `refreshAccessToken`, `fetchCurrentUser`, `setAuthFailureListener`, token store, `useTelegram`, `useQueryClient`.
- Produces:
```ts
export function getBotUsername(): string | null;
export function getBotStartUrl(): string | null;
export function openBotStartLink(webApp: TelegramWebApp | null): boolean;

export function AuthProvider({ children }: PropsWithChildren): ReactElement;
export function useAuth(): AuthContextValue;
export function AuthGate({ children }: PropsWithChildren): ReactElement;

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  reason: AuthFailureReason | null;
  retry: () => void;
  isAuthenticated: boolean;
}

export interface AuthScreenProps {
  status: Exclude<AuthStatus, "authenticated">;
  reason: AuthFailureReason | null;
  onRetry: () => void;
}
```

- [ ] **Step 1: Написать падающие тесты bot-link**

- `VITE_TG_BOT_USERNAME="millyco_bot"` →
  `https://t.me/millyco_bot?startapp=auth`;
- username с `@` очищается;
- пустая/отсутствующая переменная → `null`;
- `openBotStartLink(null)` возвращает `false`, если username не задан.
  (Fallback `window.open` не тестировать в node.)

Использовать `vi.stubEnv` и `vi.unstubAllEnvs()` в `afterEach`, чтобы
переменные не протекали между тестами.

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- app/lib/telegram/bot-link.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Реализовать bot-link и тип Telegram**

В `TelegramWebApp` добавить `openTelegramLink?(url: string): void;`.
`openBotStartLink` вызывает метод только при
`supportsVersion("6.1", webApp)`, иначе — `window.open` из функции
(проверять `typeof window !== "undefined"`).

- [ ] **Step 4: Создать `AuthProvider`**

Требования:
- состояние `{ status, user, reason }`, начальное `booting`;
- `initDataRef` обновляется на каждом рендере;
- авто-bootstrap один раз: при `isAvailable === true` или через
  `window.setTimeout` 8000 мс; повторный авто-запуск запрещён ref-флагом;
- `runBootstrap` вызывает `bootstrapAuth` с `loginWithInitData`,
  `refreshAccessToken`, `fetchCurrentUser`;
- при `authenticated` — сохранить user, сбросить reason, вызвать
  `resetAuthFailureNotification()`, success-haptic только если предыдущий
  статус был ошибочным;
- при `connection-error` — сохранить user, haptics error;
- при `reauth-required`/`no-init-data` — `clearAccessToken()`,
  `queryClient.clear()`, `user = null`, haptics error;
- listener `setAuthFailureListener` обрабатывает runtime-ошибки так же и
  отписывается при unmount;
- `retry()` игнорируется в `booting`, иначе запускает bootstrap заново;
- `useAuth()` бросает вне провайдера;
- haptics вызывать только при `isActive !== false`.

- [ ] **Step 5: Создать `AuthScreen` и `AuthGate`**

`AuthScreen` — презентационный компонент для `booting`,
`connection-error`, `reauth-required`, `no-init-data`.

Структура:
- `main`: `flex min-h-full w-full flex-1 flex-col items-center justify-center px-[15px] py-[24px]`;
- карточка: `flex w-full flex-col items-center gap-[15px] rounded-[25px] bg-app-card p-[24px] text-center`;
- логотип: `<img src={logoIcon} alt="" className="h-12 w-12" />`; логотип
  цветной, `AssetIcon` не использовать;
- заголовок `h1`: `text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text`;
- описание: `text-[15px] leading-[1.3] text-app-text-secondary`;
- подсказка: `text-[13px] leading-[1.4] text-app-hint`;
- кнопки — нативные `<button type="button">`, ширина 100%, высота
  `50px`, радиус `25px`, gap `10px`, текст `15px/600`;
- primary: `bg-app-accent text-white`; secondary: `bg-app-bg text-app-text`;
- loading: `role="status"`, `aria-live="polite"`, `aria-busy="true"`,
  текст `Проверяем вход…`;
- error: `role="alert"`, `aria-labelledby`, `aria-describedby`, фокус на
  заголовок при появлении (`tabIndex={-1}` + ref).

Копирайт строго из `spec.md` §5.4. Кнопка `Открыть Milly` рендерится
только при `getBotUsername() !== null` и вызывает
`openBotStartLink(webApp)`.

`AuthGate`:
```tsx
const { status, reason, retry } = useAuth();
if (status === "authenticated") return <>{children}</>;
return <AuthScreen status={status} reason={reason} onRetry={retry} />;
```

- [ ] **Step 6: Подключить провайдер и gate**

- В `app/providers/app-providers.tsx` обернуть children в `AuthProvider`
  внутри `TelegramProvider`.
- Там же заменить `retry: 1` на предикат, который не повторяет
  `AuthSessionError`:
```ts
retry: (failureCount, error) =>
  !(error instanceof AuthSessionError) && failureCount < 1,
```
- В `app/routes/_app.tsx` заменить `AppShell > Outlet` на
  `AppShell > AuthGate > Outlet`.

- [ ] **Step 7: Проверить типы, тесты и сборку**

Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: PASS.

---

### Task 8: Документация и полная проверка

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: реализованная авторизация.
- Produces: документация по env, dev proxy, auth flow и актуальное
  состояние проекта.

- [ ] **Step 1: Обновить README**

Добавить раздел про auth:
- `VITE_API_BASE_URL=/api/v1`, `VITE_TG_BOT_USERNAME=millyco_bot`;
- dev proxy на `http://127.0.0.1:8000` и переписывание `Origin`;
- production требует same-origin reverse proxy для `/api`;
- access — память, refresh — HttpOnly cookie;
- `npm test`.

- [ ] **Step 2: Обновить AGENTS.md**

В разделах про структуру, данные и проверки отразить:
- `app/lib/api/`, `app/lib/auth/`, `app/providers/auth-provider.tsx`,
  `app/components/auth/`;
- Vitest и `npm test`;
- auth flow и запрет storage для токенов;
- что backend auth уже существует, а `AGENTS.md` больше не должен
  утверждать обратное.

- [ ] **Step 3: Полный прогон проверок**

Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: все команды завершаются успешно.

- [ ] **Step 4: Проверить SSR**

Run:
```bash
npm run build
PORT=3000 npm start
curl -s http://localhost:3000/ | grep -E "Проверяем вход|Milly"
```
Expected: в SSR-ответе есть экран загрузки; заголовка
`Задачи на сегодня` в SSR нет. Остановить сервер после проверки.

- [ ] **Step 5: Проверить отсутствие запрещённых хранилищ и логов**

Run:
```bash
rg -n "localStorage|sessionStorage|indexedDB|CloudStorage|SecureStorage" app
rg -n "console\\.(log|info|debug|error).*?(token|initData|access|refresh)" app
```
Expected: оба поиска не находят совпадений в auth-коде. Если `rg`
недоступен, использовать `grep -R`.

- [ ] **Step 6: Проверить браузер**

В `npm run dev`:
- открыть `http://localhost:5173/` без Telegram: должен появиться экран
  `Откройте Milly из Telegram` (при отсутствии cookie);
- проверить 320 px, 412 px, light/dark через
  `prefers-color-scheme`;
- убедиться, что нет горизонтального скролла и что кнопки доступны с
  клавиатуры;
- проверить, что dev proxy не отдаёт `404` на `/api/v1/...`
  (использовать `curl -i http://localhost:5173/api/v1/auth/refresh -X POST`;
  ожидается `401`, а не `404`).

- [ ] **Step 7: Проверить Telegram вручную**

Через HTTPS-туннель на `http://localhost:5173`:
- запуск из меню бота: приложение открывается после короткого loading;
- keyboard launch с пустым `initData`: показывается
  `Откройте Milly из Telegram`, если cookie отсутствует;
- кнопка `Открыть Milly` открывает `https://t.me/millyco_bot?startapp=auth`;
- light/dark, safe-area, отсутствие горизонтального скролла;
- после истечения access (или принудительного `401`) приложение
  продолжает работать без экрана ошибки;
- при отзыве refresh показывается `Нужно войти заново`.

- [ ] **Step 8: Финальная проверка**

Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: PASS. Реализация завершена только при отсутствии ошибок.
