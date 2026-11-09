# Telegram Mini App

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
- Клавиатура в нижних шторках: `BottomSheet` не меняет высоту и позицию
  панели — клавиатура перекрывает её; `visualViewport` используется
  только для прокрутки тела к активному полю и нижнего спейсера. Высота
  панели и позиция контейнера считаются от доклавиатурной высоты
  viewport, зафиксированной `useKeyboardViewport` (не от
  `--tg-viewport-stable-height`: Telegram iOS 11.11+ уменьшает viewport
  при открытии клавиатуры, и stable height следует за ним). В meta
  viewport — `interactive-widget=resizes-visual`, чтобы не сжимался
  layout viewport в браузерах с его поддержкой. Не фиксировать нижнюю
  панель через `viewportHeight`.
- `BackButton` не навигирует автоматически; `requestFullscreen()` не возвращает promise — не вызывать `.catch()`. На `/tasks/:id` `useTelegramBackButton` показывает нативную `BackButton` при Bot API 6.1+ и наличии `webApp.BackButton`, скрывает её при размонтировании и вызывает `navigate(-1)` при `shouldGoBack`, иначе `/tasks`; в браузере работает история.
- Полные правила и версии API — в `.opencode/skills/telegram-mini-apps/`.
