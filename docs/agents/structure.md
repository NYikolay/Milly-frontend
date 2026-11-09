# Структура проекта

```text
app/
  components/
    auth/                     # AuthGate и AuthScreen (loading/error/no-init-data)
    errors/                   # ErrorScreen, AppErrorPage, AppErrorBoundary
    home/                     # секции главного экрана
    layout/app-shell.tsx      # каркас с safe-area и max-w-md
    tasks/detail/             # экран деталей, карточка, модалка удаления
      task-due-sheet.tsx      # шторка «Дата и время задачи»
    tasks/quick-add/          # быстрое создание: форма, шаги, календарь, отправка
      quick-add-store.ts      # per-composer vanilla Zustand store черновика
      quick-add-store-provider.tsx  # context, QuickAddStoreProvider, useQuickAddStore
      project-icon-badge.tsx  # круглый бейдж проекта 28×28 с белой иконкой
    tasks/reminders/          # экран «Автоматические напоминания»
    tasks/search/             # экран «Поиск задач»
      filters/                # шторка фильтров: «Все фильтры», шаги проекта,
                              #   меток, приоритета, статуса, регулярности, даты,
                              #   общая строка и шаги мультивыбора/одиночного выбора
    tasks/task-rows-skeleton.tsx  # скелетон строк списка задач
    tasks/today/              # экран «Задачи на сегодня»
    ui/                       # примитивы, включая bottom-sheet, sheet-header, switch,
                              #   select-field, time-input, option-chip, modal,
                              #   asset-icon, search-field
    voice/                    # UI записи голоса
  hooks/
    use-bottom-navigation.ts  # нижние вкладки «Главная» / «Задачи»
    use-search-tasks.ts       # данные и оптимистичное завершение задач поиска
    use-task-detail.ts        # данные, завершение и удаление задачи в деталях
    use-task-segment-navigation.ts  # навигация «Сегодня»/«Поиск задач»
    use-telegram-back-button.ts  # Telegram BackButton 6.1+ с колбэком возврата
    use-today-tasks.ts        # данные и завершение задач на сегодня
    use-update-task-due.ts    # PATCH срока, кэш, haptics
    use-update-task-reminders.ts  # автосохранение PATCH напоминаний
    use-voice-recorder.ts
  lib/
    api/                      # config, http, auth-aware client, errors, types
    auth/                     # token-store, auth-api, bootstrap, events, failure
    boot/                     # inline SSR boot-watchdog
    errors/                   # классификация, копирайт, навигация, throwAppError
      async.ts                # общий isAbortError
    labels/                   # read-only API меток (GET /labels) и типы
      labels-query.ts         # ключ и query options меток
    projects/                 # read-only API проектов (GET /projects?limit=100), иконки и типы
      projects-query.ts       # ключ и query options проектов
    telegram/                 # client, types, bot-link
    tasks/                    # модель формы, payload, API задач/серий, date-time,
                              #   priority и временный источник данных главного экрана
      today-tasks.ts          # состояние экрана «Задачи на сегодня»
      today-tasks-cache.ts    # кэш и оптимистичное завершение задач
      task-detail.ts          # форматирование деталей: срок, создание, напоминания, метки
      task-detail-cache.ts    # ключ ["tasks","detail",id] и оптимистичное завершение
      task-due.ts             # начальный черновик и payload срока
      reminders.ts            # модель, payload и опции правил напоминаний
      search-tasks-cache.ts   # кэш и оптимистичное завершение задач поиска
      search-filters.ts       # модель фильтров поиска, query и чистые помощники
      search-filters-reducer.ts  # черновик/применённые фильтры и шаг шторки
      completion-cache.ts     # общие поля завершения и замена задачи в списке
      task-completion.ts      # общая фабрика оптимистичной мутации
      completion-feedback.ts  # общий текст ошибки и pending id
    voice/                    # запись и загрузка голоса
    cn.ts                     # склейка классов
    layout.ts                 # нижние отступы контента
    text-search.ts            # общий matchesSearchQuery для клиентской фильтрации
  providers/
    app-providers.tsx         # QueryClient + TelegramProvider + AuthProvider
    auth-provider.tsx         # bootstrap, auth state, retry, auth-events
    telegram-provider.tsx     # init, тема, insets, события, haptics, useTelegram
  routes/
    _app.tsx                  # pathless layout: AppShell > AuthGate > Outlet
    home.tsx                  # главный экран на /
    tasks.tsx                 # экран «Задачи на сегодня» на /tasks
    task-detail.tsx           # экран деталей на /tasks/:id
    task-reminders.tsx        # экран «Автоматические напоминания» на /tasks/:id/reminders
    task-search.tsx           # экран «Поиск задач» на /tasks/search
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
