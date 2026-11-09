# UI и стили

- Только Tailwind CSS 4 через `@tailwindcss/vite`; без CSS-модулей и styled-components.
- Семантические токены: `tg-bg`, `tg-secondary-bg`, `tg-text`, `tg-hint`, `tg-link`, `tg-button`, `tg-button-text`, `tg-accent`, `tg-section-bg`, `tg-destructive`, `tg-separator`, `tg-bottom-bar`.
- Палитра `app-*` — основа UI главного экрана (`docs/specs/2026-11-02-home-dashboard/spec.md`) и быстрого создания задачи (форма, шаги, общие шторки и примитивы), light/dark через `data-app-theme`. `tg-*` остаются для Telegram chrome и будущих Telegram-native поверхностей; не переводить главный экран и шторки быстрого создания обратно на `tg-*` без пересмотра спек.
- Переиспользуемые примитивы — в `app/components/ui/`; композицию классов делать через `cn()`.
- `ProjectIconBadge` — единственное место круглого бейджа проекта (шторка
  «Проект», чип под инпутом и `/tasks/:id/project`); фон — `project.color.hex`
  из backend, иконка белая; `NO_PROJECT_ICON` (`no-project.svg`)
  используется только для «Без проекта» на `bg-app-track` с `app-text`,
  неизвестная иконка реального проекта остаётся `file.svg`. Чип меток
  остаётся на `tag.svg`/`tag-plus.svg`; списки меток и проектов идут без
  зазоров между строками, строки `50px`, разделитель — под каждой строкой,
  кроме последней, и отступ `mt-[15px]` от поиска; список меток имеет
  `px-[15px]`, список проектов — полную ширину от поиска. Исключение —
  `/tasks/:id/project`: бейдж тот же, но строки `47px`.
- `/tasks/:id/labels`: строки меток — `tag-raw.svg` `18×18` цвета
  `label.color.hex` из backend; кнопка «Создать метку» — `tag-plus.svg`
  `18×18`, фон `app-card`, радиус `25px`, высота `50px`, текст
  `app-accent`. Кнопка — визуальная заглушка без обработчика.
- Каркас мобильный: контент ограничен `max-w-md`, отступы безопасных зон уже учтены в `AppShell`.
- Внешний вид главного экрана зафиксирован в `docs/specs/2026-11-02-home-dashboard/spec.md`; остальные экраны и продуктовые тексты — нет. Не выдумывать продуктовые сценарии.

## Связанные общие правила

- Шапка шторки и поведение detail-шторок быстрого создания — в `docs/agents/features/quick-add.md`.
- UI экрана поиска и шторок фильтров — в `docs/agents/features/search.md`.
- UI деталей задачи — в `docs/agents/features/task-detail.md`.
