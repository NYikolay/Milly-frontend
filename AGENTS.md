# AGENTS.md

Инженерные правила и актуальное состояние `frontend/` для coding-агентов.
Продуктовые детали не выдумывать: backend уже реализует auth API
(`/api/v1/auth`), frontend использует его; остальные сценарии — только по
спекам в `docs/specs/`.

## 1. Стек и запуск

- React Router 8 в Framework Mode, SSR включён (`react-router.config.ts`, `ssr: true`).
- React 19, TypeScript 5.9 (`strict: true`), Vite 8, Tailwind CSS 4.
- Данные: `@tanstack/react-query` 5, `zustand` 5, `react-hook-form` 7, `zod` 4.
- Менеджер пакетов — npm; lock-файл `package-lock.json` не удалять и не пересоздавать без причины.
- Шаблоны и текущая архитектура описаны ниже; не мигрировать на SPA, Next.js или другую библиотеку без явного решения.

```bash
npm run dev         # dev-сервер, http://localhost:5173
npm run build       # production-сборка в build/
npm start           # запуск собранного SSR-сервера, по умолчанию :3000
npm run typecheck   # react-router typegen && tsc
npm test            # Vitest, однократный прогон
npm run test:watch  # Vitest в watch-режиме
```

- Для локальной авторизации backend должен работать на `http://127.0.0.1:8000`:
  Vite проксирует `/api`, сохраняет путь `/api/v1/...` и переписывает `Origin`
  на `http://127.0.0.1:8000` (backend проверяет Origin на auth-маршрутах).
- Docker: multi-stage `Dockerfile`, production-образ запускает `npm run start`.
- Тесты — Vitest (`npm test`, `npm run test:watch`), файлы `app/**/*.test.ts`.
  Линтер пока не настроен: не выдумывать `npm run lint`.

## 2. Структура

```text
app/
  components/
    auth/                     # AuthGate и AuthScreen (loading/error/no-init-data)
    errors/                   # ErrorScreen, AppErrorPage, AppErrorBoundary
    home/                     # секции главного экрана
    layout/app-shell.tsx      # каркас с safe-area и max-w-md
    tasks/quick-add/          # быстрое создание: форма, шаги, календарь, отправка
      quick-add-store.ts      # per-composer vanilla Zustand store черновика
      quick-add-store-provider.tsx  # context, QuickAddStoreProvider, useQuickAddStore
    tasks/today/              # экран «Задачи на сегодня»
    ui/                       # примитивы, включая bottom-sheet, sheet-header, switch,
                              #   select-field, time-input, option-chip, button,
                              #   card, modal, asset-icon
    voice/                    # UI записи голоса
  hooks/
    use-bottom-navigation.ts  # нижние вкладки «Главная» / «Задачи»
    use-today-tasks.ts        # данные и завершение задач на сегодня
    use-voice-recorder.ts
  lib/
    api/                      # config, http, auth-aware client, errors, types
    auth/                     # token-store, auth-api, bootstrap, events, failure
    boot/                     # inline SSR boot-watchdog
    errors/                   # классификация, копирайт, навигация, throwAppError
    labels/                   # read-only API меток (GET /labels) и типы
    projects/                 # read-only API проектов (GET /projects?limit=100), иконки и типы
    telegram/                 # client, types, bot-link
    tasks/                    # модель формы, payload, API задач/серий, date-time,
                              #   priority и временный источник данных главного экрана
      today-tasks.ts          # состояние экрана «Задачи на сегодня»
      today-tasks-cache.ts    # кэш и оптимистичное завершение задач
    voice/                    # запись и загрузка голоса
    cn.ts                     # склейка классов
    format-date.ts
  providers/
    app-providers.tsx         # QueryClient + TelegramProvider + AuthProvider
    auth-provider.tsx         # bootstrap, auth state, retry, auth-events
    telegram-provider.tsx     # init, тема, insets, события, haptics, useTelegram
  routes/
    _app.tsx                  # pathless layout: AppShell > AuthGate > Outlet
    home.tsx                  # главный экран на /
    tasks.tsx                 # экран «Задачи на сегодня» на /tasks
  app.css                     # Tailwind theme tokens и базовые стили
  entry.client.tsx            # снятие boot-watchdog перед hydrateRoot
  root.tsx                    # документ, watchdog, telegram-web-app.js, провайдеры, ErrorBoundary
  routes.ts                   # ручная конфигурация маршрутов
```

- Маршруты добавлять в `app/routes.ts`. Новые экраны по умолчанию вкладывать в `layout("routes/_app.tsx", [...])`, чтобы сохранить общий каркас.
- Route-модули используют типы из `./+types/<route>`; файлы в `.react-router/types/` не редактировать.
- Файлы — `kebab-case`, экспортируемые компоненты — `PascalCase`.
- Алиас `~/*` указывает на `app/*`; использовать его вместо относительных `../../`.
- `default export` обязателен только для route-модулей; остальные компоненты и функции экспортировать именованно.
- `root.tsx` и `routes/_app.tsx` экспортируют `ErrorBoundary`; оба рендерят общий `AppErrorBoundary`.
- Unmatched URL обрабатывает корневой boundary: HTTP-статус `404`, экран публичный (вне `AuthGate`). Отдельный catch-all route не добавлять.
- 404/429/5xx показываются только через route error boundaries; глобального перехвата ошибок React Query нет.
- Loader/action с `ApiError` бросают `throwAppError` из `app/lib/errors/route-error.ts`, чтобы сохранить статус при SSR-сериализации.
- Error-экраны рендерят нижнюю навигацию; активна вкладка «Главная». Корневой boundary не использует провайдеры (`useTelegram`, `useAuth`, React Query, haptics).

## 3. Провайдеры, данные и состояние

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
- Быстрое создание задачи начинается с inline-композера на главном экране
  (`QuickAddComposer`): поле, чипы и кнопки живут в постоянной секции, а шаги
  деталей (метки, проект, приоритет, дата и время, напоминания) открываются
  модальной `QuickAddDetailSheet`. Метки и проекты читаются через `GET /labels`
  и `GET /projects?limit=100` (read-only); чип проекта идёт после «Метки» и
  показывает «Без проекта» или выбранный проект. Создание — `POST /tasks` для
  разовой задачи и `POST /task-series` для ежедневной серии; `project_id`
  уходит в оба payload (`null` для «Без проекта»), а `["projects"]`
  инвалидируется после создания и перезапрашивается при `404` или архивном
  `400` с выбранным проектом. Обязательный `AuthUser.timezone`
  используется для расчёта `due_at` и поля `timezone` серии.
- `/tasks` использует `GET /tasks?date=<today>&status=all&limit=100`,
  `GET /tasks/today/progress`, `POST /tasks/{id}/complete`,
  `POST /tasks/{id}/uncomplete`; данные загружаются React Query после
  `AuthGate`, не в loader. Нижние вкладки «Главная»/«Задачи» навигируют
  на `/` и `/tasks`.
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

## 4. Telegram Mini App

- `telegram-web-app.js` подключён в `<head>` в `root.tsx` до `Meta`, `Links` и app-скриптов. Не переносить в `<body>` и не подключать лениво.
- Перед `telegram-web-app.js` в `<head>` встроен inline SSR boot-watchdog (`app/lib/boot/watchdog.ts`, `BOOT_WATCHDOG_TIMEOUT_MS = 5000`): если JS-бандл или Telegram-скрипт не загрузился, через 5 секунд появляется статический fallback с «Повторить» и перезагрузкой страницы. `app/entry.client.tsx` вызывает `clearBootWatchdog()` до `hydrateRoot`, чтобы снять watchdog и убрать fallback до гидратации.
- `TelegramProvider` вызывает `ready()`, `expand()`, синхронизирует `--tg-theme-*`, `--app-inset-*`, слушает `themeChanged`, `viewportChanged`, `safeAreaChanged`, `contentSafeAreaChanged`, `fullscreenChanged`, `activated`/`deactivated`.
- В компонентах работать с Telegram только через `useTelegram()` и helpers из `app/lib/telegram/`, не через `window.Telegram` напрямую.
- Новые API гейтить через `supportsVersion("<bot api version>", webApp)`. Ориентиры: haptics — 6.1, fullscreen — 8.0, `setBottomBarColor` — 7.10.
- `initDataUnsafe` использовать только для отображения. Для авторизации отправлять сырой `initData` в `POST /auth/telegram`: backend проверяет HMAC/signature и `auth_date`.
- Не требовать непустой `initData`: при запуске с keyboard-кнопки и inline-mode он пустой по дизайну; тогда используется refresh-cookie.
- Deep link `Открыть в боте` строится из `VITE_TG_BOT_USERNAME` в `app/lib/telegram/bot-link.ts` (`https://t.me/<username>?startapp=auth`); при пустом username кнопка не показывается.
- Тема: только Tailwind-токены `tg-*` (`bg-tg-bg`, `text-tg-hint`, `bg-tg-button` и т.д.). Не хардкодить цвета Telegram и не полагаться на `dark:` для цветов темы. Новые токены добавлять в `@theme inline` в `app/app.css`.
- Безопасные зоны применяет `AppShell` через `--app-inset-*`; не добавлять фиксированные отступы под чёлку/навигацию.
- Для нижних панелей использовать `viewportStableHeight` / `--tg-viewport-stable-height`, не `viewportHeight`.
- Клавиатура в нижних шторках: `BottomSheet` компенсирует
  `visualViewport` (`keyboardInset`), а не `viewportHeight`; в meta
  viewport включён `interactive-widget=resizes-content`. Не фиксировать
  нижнюю панель через `viewportHeight`.
- `BackButton` не навигирует автоматически; `requestFullscreen()` не возвращает promise — не вызывать `.catch()`.
- Полные правила и версии API — в `.opencode/skills/telegram-mini-apps/`.

## 5. UI и стили

- Только Tailwind CSS 4 через `@tailwindcss/vite`; без CSS-модулей и styled-components.
- Семантические токены: `tg-bg`, `tg-secondary-bg`, `tg-text`, `tg-hint`, `tg-link`, `tg-button`, `tg-button-text`, `tg-accent`, `tg-section-bg`, `tg-destructive`, `tg-separator`, `tg-bottom-bar`.
- Палитра `app-*` — основа UI главного экрана (`docs/specs/2026-11-02-home-dashboard/spec.md`) и быстрого создания задачи (форма, шаги, общие шторки и примитивы), light/dark через `data-app-theme`. `tg-*` остаются для Telegram chrome и будущих Telegram-native поверхностей; не переводить главный экран и шторки быстрого создания обратно на `tg-*` без пересмотра спек.
- Переиспользуемые примитивы — в `app/components/ui/`; композицию классов делать через `cn()`.
- Шапка шторки — общий `SheetHeader` внутри `BottomSheet`: back, заголовок и
  разделитель; отдельной кнопки закрытия нет. Шторки деталей быстрого создания
  закрываются оверлеем, «назад», нижней «Закрыть» и Escape; закрытие без
  «Применить»/«Готово» отбрасывает неприменённые изменения шага, ранее
  применённые значения формы сохраняются. Панель шторки деталей использует
  `panelAnimateLayout`; переходов между шагами больше нет.
  `MotionConfig reducedMotion="user"` в `AppProviders` отключает
  transform-анимации при reduced motion.
- Каркас мобильный: контент ограничен `max-w-md`, отступы безопасных зон уже учтены в `AppShell`.
- Внешний вид главного экрана зафиксирован в `docs/specs/2026-11-02-home-dashboard/spec.md`; остальные экраны и продуктовые тексты — нет. Не выдумывать продуктовые сценарии.

## 6. Код и ограничения

- TypeScript strict: избегать `any`; для типов использовать `import type` (`verbatimModuleSyntax`).
- Не обращаться к `window`/`document` на верхнем уровне модулей — только в `useEffect`, обработчиках и клиентских функциях.
- Не добавлять зависимости без необходимости; сначала проверить, что в проекте уже есть подходящая библиотека.
- Секреты и `BOT_TOKEN` не должны попадать в клиентский бандл, `VITE_*` и репозиторий.
- Не менять SSR на SPA и не отключать `telegram-web-app.js` без явного решения.
- Не хранить токены и `initData` в браузерных/Telegram-хранилищах и не логировать их.
- Текущие пробелы: линтер не настроен, e2e/браузерных тестов нет, ручные проверки в Telegram обязательны. Не описывать их как автоматизированные.

## 7. Проверка перед завершением

```bash
npm test
npm run typecheck
npm run build
```

- Для UI-изменений дополнительно проверить SSR-ответ: `npm run build && PORT=3000 npm start`, затем `curl -s http://localhost:3000/`. В SSR не должно быть защищённого контента — только экран загрузки.
- Для error-экранов проверить `curl -i http://localhost:3000/does-not-exist`: должен вернуться HTTP `404` и тексты 404-экрана с нижней навигацией.
- DEV preview `?state=429` и `?state=5xx` работает только в dev-режиме (`import.meta.env.DEV`); в production он не активен.
- Error-экраны вручную проверить на ширине 320 px, в light/dark теме и с учётом safe-area.
- `/tasks` вручную проверить в light/dark теме, на ширинах 320/412/448 px и
  с учётом safe-area; активна вкладка «Задачи», переходы «Главная»/«Задачи»
  работают и сопровождаются haptics.
- Завершение/возврат задачи, обновление прогресса и откат при ошибке,
  раскрытие групп «В планах»/«Выполнено» проверить вручную.
- «Голосом» открывает голосовую шторку, «Интерактивно» ведёт на `/`
  (проверить вручную).
- SSR `/tasks` проверить: `curl -s http://localhost:3000/tasks` не должен
  содержать задачи и защищённый контент.
- Быстрое создание задачи вручную проверить на ширине 320 px: inline-форма
  между прогрессом и FAQ, счётчик внутри поля, активация кнопки отправки;
  каждый чип открывает свою шторку. Закрытие оверлеем отбрасывает
  неприменённые изменения шага, фокус возвращается на чип; микрофон
  открывает голосовую шторку, голосовая и detail-шторки не открываются
  одновременно.
- Состояние быстрого создания (Zustand) вручную проверить: черновик
  переживает открытие/закрытие детали; изменение шага не обновляет чип до
  «Применить»; закрытие без «Применить» отбрасывает правки шага,
  «Применить» коммитит их и возвращает фокус на чип; просроченная дата
  подрезается до сегодня при открытии шага даты; сумма напоминания
  очищается, остаётся пустой и блокирует «Применить»; успешная отправка
  сбрасывает форму, закрывает шаг и ревалидирует главный экран; submit
  после apply отправляет применённые значения; при `404` метки и удалённый
  проект вычищаются из формы и из открытого шага, `["labels"]` и
  `["projects"]` обновляются; при `400` с архивным выбранным проектом
  обновляется `["projects"]`, а выбор сбрасывается, если проекта нет в
  свежем списке; счётчик и активация кнопки обновляются из стора.
- Выбор проекта вручную проверить: чип «Без проекта» сразу после «Метки»
  открывает шторку «Проект»; «Без проекта» есть всегда и выбрано по
  умолчанию; выбор и «Применить» обновляют чип и `project_id`, закрытие без
  «Применить» отбрасывает выбор; ошибка загрузки показывает «Повторить»;
  задача и серия создаются с `project_id` или `null`, после успеха и `404`
  список проектов обновляется.
- Быстрое создание задачи проверить в light/dark теме, на ширинах
  320/412/448 px, с клавиатурой и safe-area.
- Для изменений auth поднять backend на `http://127.0.0.1:8000` и проверить dev proxy: `curl -i http://localhost:5173/api/v1/auth/refresh -X POST` должен вернуть `401`, а не `404`.
- Для изменений bootstrap/watchdog вручную проверить блокировку JS-бандла и `telegram-web-app.js` (DevTools → Network → Block request URL): через 5 секунд должен появиться статический fallback с «Повторить», а при нормальной загрузке — не появляться.
- Если менялись Telegram-интеграция или тема, проверить экран в браузере и в Telegram: светлая/тёмная тема, safe-area, клавиатура, fullscreen.
- Локальный запуск в Telegram: HTTPS-туннель на `http://localhost:5173` (`cloudflared tunnel --url ...` или `ngrok http 5173`) и URL в BotFather через `/setmenubutton` или `/newapp`. Quick-туннель меняет URL после перезапуска.
- Новые тесты — Vitest, `*.test.ts` рядом с модулем; следовать TDD. `npm test` обязателен перед завершением.
