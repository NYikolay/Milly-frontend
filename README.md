# Milly Frontend

Frontend Telegram Mini App Milly: React Router 8 в Framework Mode с SSR,
React 19, TypeScript (strict) и Tailwind CSS 4.

## Стек

- React Router 8 (Framework Mode, SSR) + Vite 8
- React 19, TypeScript 5.9
- Tailwind CSS 4
- TanStack React Query 5, Zustand 5, React Hook Form 7, Zod 4
- Vitest

## Установка

```bash
npm install
cp .env.example .env
```

## Переменные окружения

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_TG_BOT_USERNAME=millyco_bot
```

- `VITE_API_BASE_URL` — база API. По умолчанию `/api/v1`.
- `VITE_TG_BOT_USERNAME` — username бота без `@`. Если значение пустое,
  кнопка `Открыть Milly` на экране авторизации не показывается.
- Все `VITE_*` попадают в клиентский бандл. Секретов и `BOT_TOKEN` там
  быть не должно.

## Разработка

```bash
npm run dev        # http://localhost:5173
```

Для локальной авторизации backend должен быть доступен на
`http://127.0.0.1:8000`. Vite проксирует `/api` на этот адрес:

- путь сохраняется без rewrite, поэтому `/api/v1/...` доходит до backend
  как есть;
- заголовок `Origin` переписывается на `http://127.0.0.1:8000`, потому что
  backend проверяет Origin на auth-маршрутах.

В production frontend и `/api` должны быть на одном origin: reverse proxy
обязан направлять `/api` в backend. Refresh-cookie — HttpOnly и host-only,
поэтому cross-origin развёртывание требует согласованной настройки cookie
и CORS на backend.

## API и авторизация

Единый API-слой — `app/lib/api/`: `requestJson` для низкоуровневых запросов
и `apiRequest` для запросов с авторизацией. Базовый URL берётся из
`VITE_API_BASE_URL`; компоненты не должны вызывать `fetch` напрямую.

Поток авторизации:

1. При старте приложение отправляет `initData` в `POST /auth/telegram`
   (`app/lib/auth/auth-api.ts`).
2. Если `initData` пуст или login вернул `401`, выполняется
   `POST /auth/refresh`.
3. После получения access token пользователь загружается через
   `GET /auth/me`.
4. При `401` на API-запросе клиент один раз обновляет access через
   `POST /auth/refresh` и повторяет запрос. Если refresh не удался —
   один раз логинится через `initData` и повторяет запрос. Если снова
   `401`, состояние становится `reauth-required`.
5. Параллельные запросы используют общий in-flight refresh/login, поэтому
   дублирующих запросов нет.

Хранение токенов:

- access token — только в памяти модуля
  (`app/lib/auth/token-store.ts`), теряется при перезагрузке;
- refresh token — HttpOnly cookie, которую выставляет backend; frontend
  отправляет её через `credentials: "include"` и не читает из JavaScript.

Не добавлять хранение access/refresh/`initData` в
`localStorage`/`sessionStorage`/`indexedDB`/Telegram CloudStorage и не
логировать токены или `initData`.

`AuthProvider` и `AuthGate` (`app/providers/auth-provider.tsx`,
`app/components/auth/`) показывают загрузку и состояния
`no-init-data`, `connection-error`, `reauth-required`; защищённый контент
рендерится только после успешной авторизации.

## Скрипты

```bash
npm run dev         # dev-сервер с HMR
npm run build       # production-сборка в build/
npm start           # запуск собранного SSR-сервера, по умолчанию :3000
npm run typecheck   # react-router typegen && tsc
npm test            # Vitest, однократный прогон
npm run test:watch  # Vitest в watch-режиме
```

## Тесты

Тесты — Vitest, файлы `app/**/*.test.ts` рядом с модулями. Запуск:

```bash
npm test
```

Линтер в проекте пока не настроен. Не выдумывать `npm run lint`.

## Сборка и Docker

```bash
npm run build
PORT=3000 npm start
```

Docker:

```bash
docker build -t milly-frontend .
docker run -p 3000:3000 milly-frontend
```

Production-образ запускает `npm run start`.

## Стили

Tailwind CSS 4. Семантические токены Telegram (`tg-*`) и палитра главного
экрана (`app-*`) описаны в `app/app.css`; правила использования — в
`AGENTS.md`.
