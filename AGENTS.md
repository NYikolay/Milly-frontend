# AGENTS.md

Инженерные правила и актуальное состояние `frontend/` для coding-агентов.
Продуктовые детали не выдумывать: backend уже реализует auth API
(`/api/v1/auth`), frontend использует его; остальные сценарии — только по
спекам в `docs/specs/`.

## 1. Как пользоваться

Этот файл — роутер и набор инвариантов. Детали лежат в `docs/agents/`;
читай только файл по теме задачи.

| Тема | Файл |
| --- | --- |
| Маршруты, структура, error boundaries | `docs/agents/structure.md` |
| Провайдеры, React Query, Zustand, формы, API, auth | `docs/agents/data-and-state.md` |
| Быстрое создание задачи | `docs/agents/features/quick-add.md` |
| Экран «Задачи на сегодня» (`/tasks`) | `docs/agents/features/today-tasks.md` |
| Экран «Поиск задач» и фильтры (`/tasks/search`) | `docs/agents/features/search.md` |
| Детали задачи и шторка срока (`/tasks/:id`) | `docs/agents/features/task-detail.md` |
| Автоматические напоминания (`/tasks/:id/reminders`) | `docs/agents/features/reminders.md` |
| Telegram Mini App | `docs/agents/telegram.md` |
| UI, токены, общие примитивы | `docs/agents/ui.md` |
| Ручные проверки перед завершением | `docs/agents/qa.md` |

Перед изменением экрана прочитай его файл; перед завершением — относящийся
к изменению раздел `docs/agents/qa.md`. При изменении поведения обновляй
соответствующий файл в `docs/agents/`.

### Быстрая карта

- `app/routes.ts` — маршруты; `app/routes/_app.tsx` — `AppShell > AuthGate > Outlet`.
- `app/providers/` — QueryClient, Telegram, Auth.
- `app/lib/` — api, auth, tasks, errors, projects, labels, telegram, voice.
- `app/components/` — auth, errors, home, layout, tasks, ui, voice.
- `app/hooks/` — данные экранов, завершение задач, навигация, BackButton.

## 2. Стек и запуск

- React Router 8 в Framework Mode, SSR включён (`react-router.config.ts`, `ssr: true`).
- React 19, TypeScript 5.9 (`strict: true`), Vite 8, Tailwind CSS 4.
- Данные: `@tanstack/react-query` 5, `zustand` 5, `react-hook-form` 7, `zod` 4.
- Менеджер пакетов — npm; lock-файл `package-lock.json` не удалять и не пересоздавать без причины.
- Шаблоны и текущая архитектура описаны в `docs/agents/`; не мигрировать на SPA, Next.js или другую библиотеку без явного решения.

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

## 3. Ключевые инварианты

- Маршруты добавлять в `app/routes.ts`. Новые экраны по умолчанию вкладывать в `layout("routes/_app.tsx", [...])`.
- Route-модули используют типы из `./+types/<route>`; файлы в `.react-router/types/` не редактировать.
- Файлы — `kebab-case`, экспортируемые компоненты — `PascalCase`; алиас `~/*` указывает на `app/*`.
- `default export` обязателен только для route-модулей; остальное экспортировать именованно.
- `root.tsx` и `routes/_app.tsx` рендерят общий `AppErrorBoundary`. Unmatched URL — корневой boundary с HTTP `404`, без catch-all route. 404/429/5xx — только через route error boundaries; `ApiError` в loader/action бросать через `throwAppError`.
- `root.tsx` оборачивает приложение в `AppProviders`; `QueryClient` создаётся через `useState`. Данные маршрута — loader/action, клиентские запросы — React Query; Node-код — в `*.server.ts`.
- Zustand — только для клиентского UI-состояния; формы — `react-hook-form` + `zod`, без ручного дублирования валидации.
- Все запросы — через `apiRequest` / `requestJson` из `app/lib/api/`, не разбрасывать `fetch`. База — `VITE_API_BASE_URL` (по умолчанию `/api/v1`), ошибки — `ApiError` / `ApiNetworkError`.
- `AuthGate` в `app/routes/_app.tsx` оборачивает `Outlet`. Access token — только в памяти; refresh token — HttpOnly cookie. Не хранить access/refresh/`initData` в браузерных или Telegram-хранилищах и не логировать их; `useAuth()` не отдаёт токены.
- SSR не отключать. `telegram-web-app.js` — в `<head>` в `root.tsx` до `Meta`, `Links` и app-скриптов, не переносить в `<body>` и не подключать лениво.
- С Telegram работать только через `useTelegram()` и helpers из `app/lib/telegram/`, не через `window.Telegram`. Новые API гейтить через `supportsVersion`; `initDataUnsafe` — только для отображения, для авторизации отправлять сырой `initData`. Пустой `initData` допустим (refresh-cookie).
- Безопасные зоны — через `AppShell` и `--app-inset-*`; нижние панели — от `viewportStableHeight`, не от `viewportHeight`. Клавиатура в нижних шторках не меняет высоту и позицию панели.
- UI — только Tailwind CSS 4. Палитра `app-*` — для главного экрана, быстрого создания, деталей и поиска; `tg-*` — для Telegram chrome. Не хардкодить цвета и не использовать `dark:` для темы. Примитивы — в `app/components/ui/`, классы — через `cn()`. Каркас — `max-w-md`.
- TypeScript strict: избегать `any`, типы импортировать через `import type` (`verbatimModuleSyntax`). Не обращаться к `window`/`document` на верхнем уровне модулей.
- Не добавлять зависимости без необходимости. Секреты и `BOT_TOKEN` не должны попадать в клиентский бандл, `VITE_*` и репозиторий.
- Продуктовые сценарии не выдумывать: внешний вид главного экрана зафиксирован в `docs/specs/2026-11-02-home-dashboard/spec.md`, остальные экраны — только по существующим спекам.
- Текущие пробелы: линтер не настроен, e2e/браузерных тестов нет, ручные проверки в Telegram обязательны. Не описывать их как автоматизированные.
- Новые тесты — Vitest, `*.test.ts` рядом с модулем; следовать TDD.

## 4. Проверка перед завершением

```bash
npm test
npm run typecheck
npm run build
```

- `npm test` обязателен перед завершением.
- Для UI-изменений дополнительно проверить SSR-ответ; для error-экранов — `curl -i http://localhost:3000/does-not-exist`.
- Полный чеклист ручных проверок по экранам — `docs/agents/qa.md`.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find/rtk grep or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
