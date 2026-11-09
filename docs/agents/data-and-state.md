# Провайдеры, данные и состояние

- `root.tsx` оборачивает приложение в `AppProviders`; глобальные провайдеры добавлять туда, а не в отдельные route-модули.
- `QueryClient` создаётся через `useState` внутри провайдера — так он не шарится между SSR-запросами.
- Данные маршрута загружать через `loader` / `clientLoader`, мутации — через `action` / `clientAction`. Для клиентских запросов использовать React Query.
- Node-зависимый код держать в `*.server.ts` и вызывать из loader/action, не из браузерных компонентов.
- Zustand — только для клиентского UI-состояния, когда оно действительно
  появляется. `QuickAddComposer` владеет per-composer vanilla-стором
  (`quick-add-store.ts`) через context (`quick-add-store-provider.tsx`):
  `draft`, `activeStep`, `stepDraft`, `remindersAmountInput`, `now`, `error`
  живут там; RHF остаётся обработчиком и валидатором формы. Persistence нет,
  модульного стора нет.
- Формы — `react-hook-form` + схемы `zod`; не дублировать валидацию вручную.
- API-слой — `app/lib/api/`. Все запросы идут через `apiRequest` / `requestJson`;
  не разбрасывать `fetch` по компонентам. База API — `VITE_API_BASE_URL`
  (по умолчанию `/api/v1`), ошибки — `ApiError` / `ApiNetworkError`.
- Auth-слой — `app/lib/auth/` (`token-store`, `auth-api`, `bootstrap-auth`,
  `auth-events`, `failure`, `timeouts`) и `app/providers/auth-provider.tsx`. `AuthGate`
  в `app/routes/_app.tsx` оборачивает `Outlet`.
- Auth flow: при старте — `POST /auth/telegram` с сырым `initData`, если он
  есть (при `401` — `POST /auth/refresh`), иначе сразу `POST /auth/refresh`.
  При успешном login пользователь берётся из ответа login; `GET /auth/me`
  выполняется только после refresh. При `401` клиент один раз обновляет
  access через `/auth/refresh` и повторяет запрос; если refresh вернул `401`
  — один раз логинится через `initData` и повторяет; если refresh завершился
  сетевой ошибкой или `5xx` — `connection-error` без login-fallback; если
  refresh вернул `403`, `422` или другой не-`401` 4xx — `reauth-required`;
  если после повторов снова `401` — `reauth-required`. Refresh и login —
  single-flight.
- Bootstrap ограничен по времени: `AUTH_BOOTSTRAP_BUDGET_MS = 10000` от
  mount `AuthProvider`; ожидание Telegram — не более
  `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 4000`, затем bootstrap идёт по
  refresh-пути с остатком бюджета. Каждый HTTP-запрос ограничен
  `HTTP_REQUEST_TIMEOUT_MS = 10000` (во время bootstrap — не больше
  остатка бюджета).
- Таймаут-ошибка (`ApiNetworkError("Request timed out")`) не является
  `AbortError` и классифицируется как `connection-error/network`; при
  исчерпании бюджета — `connection-error` с «Повторить» без очистки
  сессии, пользователя и кэша React Query.
- Access token хранится только в памяти (`app/lib/auth/token-store.ts`);
  refresh token — HttpOnly cookie, выставляемая backend (`credentials:
  "include"`). Запрещено хранить access/refresh/`initData` в
  `localStorage`, `sessionStorage`, `indexedDB`, CloudStorage или
  SecureStorage и логировать их. `useAuth()` не отдаёт токены.
