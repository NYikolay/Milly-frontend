# AGENTS.md

Инженерные правила и актуальное состояние `frontend/` для coding-агентов.
Продуктовые детали не выдумывать: `backend/` пока пуст, `frontend/` — самостоятельная часть Milly.

## 1. Стек и запуск

- React Router 8 в Framework Mode, SSR включён (`react-router.config.ts`, `ssr: true`).
- React 19, TypeScript 5.9 (`strict: true`), Vite 8, Tailwind CSS 4.
- Данные: `@tanstack/react-query` 5, `zustand` 5, `react-hook-form` 7, `zod` 4.
- Менеджер пакетов — npm; lock-файл `package-lock.json` не удалять и не пересоздавать без причины.
- Шаблоны и текущая архитектура описаны ниже; не мигрировать на SPA, Next.js или другую библиотеку без явного решения.

```bash
npm run dev        # dev-сервер, http://localhost:5173
npm run build      # production-сборка в build/
npm start          # запуск собранного SSR-сервера, по умолчанию :3000
npm run typecheck  # react-router typegen && tsc
```

- Docker: multi-stage `Dockerfile`, production-образ запускает `npm run start`.
- Тестового фреймворка и линтера пока нет. Не выдумывать команды `npm test` / `npm run lint`; при необходимости сначала предложить и настроить инструменты.

## 2. Структура

```text
app/
  components/
    layout/app-shell.tsx      # каркас с safe-area и max-w-md
    ui/button.tsx             # базовые UI-примитивы
    ui/card.tsx
  lib/
    cn.ts                     # склейка классов
    telegram/
      client.ts               # getTelegramWebApp, isTelegramEnvironment, supportsVersion
      types.ts                # типы Telegram WebApp API и global window.Telegram
  providers/
    app-providers.tsx         # QueryClientProvider + TelegramProvider
    telegram-provider.tsx     # init, тема, insets, события, haptics, useTelegram
  routes/
    _app.tsx                  # pathless layout с AppShell
    home.tsx                  # тестовый экран на /
  app.css                     # Tailwind theme tokens и базовые стили
  root.tsx                    # документ, telegram-web-app.js, провайдеры, ErrorBoundary
  routes.ts                   # ручная конфигурация маршрутов
```

- Маршруты добавлять в `app/routes.ts`. Новые экраны по умолчанию вкладывать в `layout("routes/_app.tsx", [...])`, чтобы сохранить общий каркас.
- Route-модули используют типы из `./+types/<route>`; файлы в `.react-router/types/` не редактировать.
- Файлы — `kebab-case`, экспортируемые компоненты — `PascalCase`.
- Алиас `~/*` указывает на `app/*`; использовать его вместо относительных `../../`.
- `default export` обязателен только для route-модулей; остальные компоненты и функции экспортировать именованно.

## 3. Провайдеры, данные и состояние

- `root.tsx` оборачивает приложение в `AppProviders`; глобальные провайдеры добавлять туда, а не в отдельные route-модули.
- `QueryClient` создаётся через `useState` внутри провайдера — так он не шарится между SSR-запросами.
- Данные маршрута загружать через `loader` / `clientLoader`, мутации — через `action` / `clientAction`. Для клиентских запросов использовать React Query.
- Node-зависимый код держать в `*.server.ts` и вызывать из loader/action, не из браузерных компонентов.
- Zustand — только для клиентского UI-состояния, когда оно действительно появляется. Сейчас стора нет; не создавать «заготовку ради заготовки».
- Формы — `react-hook-form` + схемы `zod`; не дублировать валидацию вручную.
- API-слой пока не создан. Когда появится backend, добавить единый клиент в `app/lib/api/` и не разбрасывать `fetch` по компонентам.

## 4. Telegram Mini App

- `telegram-web-app.js` подключён в `<head>` в `root.tsx` до `Meta`, `Links` и app-скриптов. Не переносить в `<body>` и не подключать лениво.
- `TelegramProvider` вызывает `ready()`, `expand()`, синхронизирует `--tg-theme-*`, `--app-inset-*`, слушает `themeChanged`, `viewportChanged`, `safeAreaChanged`, `contentSafeAreaChanged`, `fullscreenChanged`, `activated`/`deactivated`.
- В компонентах работать с Telegram только через `useTelegram()` и helpers из `app/lib/telegram/`, не через `window.Telegram` напрямую.
- Новые API гейтить через `supportsVersion("<bot api version>", webApp)`. Ориентиры: haptics — 6.1, fullscreen — 8.0, `setBottomBarColor` — 7.10.
- `initDataUnsafe` использовать только для отображения. Для авторизации отправлять сырой `initData` на сервер и валидировать HMAC/signature + `auth_date`; сейчас серверной валидации нет.
- Не требовать непустой `initData`: при запуске с keyboard-кнопки и inline-mode он пустой по дизайну.
- Тема: только Tailwind-токены `tg-*` (`bg-tg-bg`, `text-tg-hint`, `bg-tg-button` и т.д.). Не хардкодить цвета Telegram и не полагаться на `dark:` для цветов темы. Новые токены добавлять в `@theme inline` в `app/app.css`.
- Безопасные зоны применяет `AppShell` через `--app-inset-*`; не добавлять фиксированные отступы под чёлку/навигацию.
- Для нижних панелей использовать `viewportStableHeight` / `--tg-viewport-stable-height`, не `viewportHeight`.
- `BackButton` не навигирует автоматически; `requestFullscreen()` не возвращает promise — не вызывать `.catch()`.
- Полные правила и версии API — в `.opencode/skills/telegram-mini-apps/`.

## 5. UI и стили

- Только Tailwind CSS 4 через `@tailwindcss/vite`; без CSS-модулей и styled-components.
- Семантические токены: `tg-bg`, `tg-secondary-bg`, `tg-text`, `tg-hint`, `tg-link`, `tg-button`, `tg-button-text`, `tg-accent`, `tg-section-bg`, `tg-destructive`, `tg-separator`, `tg-bottom-bar`.
- Исключение для главного экрана: палитра `app-*` из `docs/specs/2026-11-02-home-dashboard/spec.md`, light/dark через `data-app-theme`. `tg-*` остаются для Telegram chrome и будущих экранов; не переводить главный экран обратно на `tg-*` без пересмотра спеки.
- Переиспользуемые примитивы — в `app/components/ui/`; композицию классов делать через `cn()`.
- Каркас мобильный: контент ограничен `max-w-md`, отступы безопасных зон уже учтены в `AppShell`.
- Внешний вид главного экрана зафиксирован в `docs/specs/2026-11-02-home-dashboard/spec.md`; остальные экраны и продуктовые тексты — нет. Не выдумывать продуктовые сценарии.

## 6. Код и ограничения

- TypeScript strict: избегать `any`; для типов использовать `import type` (`verbatimModuleSyntax`).
- Не обращаться к `window`/`document` на верхнем уровне модулей — только в `useEffect`, обработчиках и клиентских функциях.
- Не добавлять зависимости без необходимости; сначала проверить, что в проекте уже есть подходящая библиотека.
- Секреты и `BOT_TOKEN` не должны попадать в клиентский бандл, `VITE_*` и репозиторий.
- Не менять SSR на SPA и не отключать `telegram-web-app.js` без явного решения.
- Текущие пробелы: нет backend/API, нет серверной валидации `initData`, нет тестов и линтера. Не описывать их как готовые.

## 7. Проверка перед завершением

```bash
npm run typecheck
npm run build
```

- Для UI-изменений дополнительно проверить SSR-ответ: `npm run build && PORT=3000 npm start`, затем `curl -s http://localhost:3000/`.
- Если менялись Telegram-интеграция или тема, проверить экран в браузере и в Telegram: светлая/тёмная тема, safe-area, клавиатура, fullscreen.
- Локальный запуск в Telegram: HTTPS-туннель на `http://localhost:5173` (`cloudflared tunnel --url ...` или `ngrok http 5173`) и URL в BotFather через `/setmenubutton` или `/newapp`. Quick-туннель меняет URL после перезапуска.
- Перед добавлением тестов согласовать стек (например, Vitest); после настройки добавить `npm test` в скрипты и следовать TDD.
