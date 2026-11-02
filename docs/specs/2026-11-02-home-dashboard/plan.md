# Milly Home Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести главный экран Milly к четырём макетам Figma, вынести переиспользуемые компоненты, заложить mock-loader для счётчика задач и заменить иконки нижнего меню на ассеты.

**Architecture:** Route `home` получает `DailyTasksSummary` через серверный `loader`; mock-источник позже заменяется на API без изменения UI. Экран собирается из небольших компонентов `HomeHeader`, `DailyProgressCard`, `QuickAccessSection`, `FaqSection`; тема и Telegram chrome остаются на существующем `TelegramProvider`. Монохромные SVG из `app/assets/icons/` рендерятся через общий `AssetIcon` на CSS mask, поэтому наследуют `currentColor`.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Tailwind CSS 4, Telegram Mini App API.

**Spec:** `docs/specs/2026-11-02-home-dashboard/spec.md`

## Global Constraints

- Боковой отступ контента — `15px`; gap между крупными блоками — `8px`; сетка быстрого доступа — `gap-x: 10px`, `gap-y: 8px`.
- Контент ограничен `max-w-md`; экран должен работать от `320px`.
- Палитра и токены — строго из `spec.md` §5.1; активная тема — из `Telegram.WebApp.colorScheme`.
- Самодельный header (аватар, grid, настройки) удаляется; верхнюю панель рисует Telegram.
- Нижнее меню не переверстывается; меняются только иконки на `home.svg`, `tasks.svg`, `card.svg`, `coop.svg`.
- Все продуктовые тексты — строго из `spec.md`; кнопки без навигации, только haptics.
- Данные: mock `{ total: 6, completed: 2 }`; `?state=empty` → `{ total: 0, completed: 0 }`.
- Не добавлять зависимости, тестовый фреймворк и линтер.
- Не редактировать `.react-router/types/`; route-типы импортировать из `./+types/home`.
- Файлы — kebab-case; экспортируемые компоненты — PascalCase; алиас `~/` вместо относительных путей.

## Review Focus

- `total === 0`: нет деления на ноль, нет `NaN` в ширине прогресса, показывается маркер `7px`, копирайт пустого состояния.
- `completed > total` или отрицательные значения: прогресс и подпись не выходят за границы.
- Неизвестный `?state=...`: не ломает экран; пустое состояние включается только при `state=empty`.
- Тёмная тема: все карточки, разделители, текст и иконки используют dark-токены; нет белых провалов.
- Узкий экран `320px`: карточки не обрезают текст, нижнее меню и его подписи не ломаются.

---

### Task 1: Палитра и примитив AssetIcon

**Files:**
- Modify: `app/app.css`
- Create: `app/components/ui/asset-icon.tsx`

**Interfaces:**
- Produces: `AssetIcon({ src, className }: { src: string; className?: string })` — рендерит монохромную SVG-иконку через CSS mask, цвет наследуется от `currentColor`.

- [ ] **Step 1: Добавить токены палитры в `app/app.css`**

В `@theme inline` добавить:
`--color-app-text-secondary`, `--color-app-stroke`, `--color-app-accent-soft`, `--color-app-success`, `--color-app-destructive`.

В `:root` выставить:
`--app-bg: #f2f2f7`, `--app-card: #ffffff`, `--app-text: #303033`, `--app-text-secondary: #7a7d83`, `--app-hint: #a2acb0`, `--app-stroke: #e9e9ee`, `--app-accent: #007aff`, `--app-accent-soft: #eaf3ff`, `--app-track: #f2f2f7`, `--app-destructive: #e53935`, `--app-success: #31d158`.

В `:root[data-app-theme="dark"]` выставить:
`--app-bg: #171717`, `--app-card: #212121`, `--app-text: #ffffff`, `--app-text-secondary: #7a7d83`, `--app-hint: #a2acb0`, `--app-stroke: #303033`, `--app-accent: #007aff`, `--app-accent-soft: #31373f`, `--app-track: #303033`, `--app-destructive: #e53935`, `--app-success: #32e55e`.

`--app-chip` привести к `--app-accent-soft`; `--app-tab-accent` — к `--app-accent`. Остальные nav/glass-токены не трогать.

- [ ] **Step 2: Создать `app/components/ui/asset-icon.tsx`**

Сигнатура:
```ts
interface AssetIconProps {
  src: string;
  className?: string;
}

export function AssetIcon({ src, className }: AssetIconProps)
```

Требования:
- `<span aria-hidden="true">`;
- классы: `inline-block shrink-0 bg-current` + `className`;
- inline style: `maskImage`, `WebkitMaskImage` = `url("${src}")`; `maskRepeat`/`WebkitMaskRepeat` = `no-repeat`; `maskPosition`/`WebkitMaskPosition` = `center`; `maskSize`/`WebkitMaskSize` = `contain`;
- импортировать `cn` из `~/lib/cn`.

- [ ] **Step 3: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS без ошибок.

---

### Task 2: Данные задач, дата и mock-источник

**Files:**
- Create: `app/lib/tasks/daily-tasks.ts`
- Create: `app/lib/format-date.ts`

**Interfaces:**
- Produces:
```ts
export interface DailyTasksSummary {
  total: number;
  completed: number;
}

export async function getDailyTasksSummary(): Promise<DailyTasksSummary>;

export function formatTodayLabel(date?: Date): string;
```
- `getDailyTasksSummary` возвращает `{ total: 6, completed: 2 }` и объявлена `async`, чтобы позже заменить тело на запрос к API.
- `formatTodayLabel` форматирует `ru-RU` как `weekday: "long", day: "numeric", month: "long"` и делает первую букву заглавной.

- [ ] **Step 1: Создать `app/lib/tasks/daily-tasks.ts`**

Экспортировать интерфейс и async-функцию с mock-значениями `6 / 2`. Никаких обращений к `window`, `fetch` или env.

- [ ] **Step 2: Создать `app/lib/format-date.ts`**

Сигнатура `formatTodayLabel(date = new Date()): string`. Внутри:
```ts
const formatted = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(date);

return formatted.charAt(0).toUpperCase() + formatted.slice(1);
```

- [ ] **Step 3: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 3: HomeHeader и DailyProgressCard

**Files:**
- Create: `app/components/home/home-header.tsx`
- Create: `app/components/home/daily-progress-card.tsx`

**Interfaces:**
- Consumes: `AssetIcon` from Task 1; `chevron_right.svg` из `app/assets/icons/`.
- Produces:
```ts
interface HomeHeaderProps {
  title: string;
  dateLabel: string;
}

interface DailyProgressCardProps {
  completed: number;
  total: number;
  onOpen?: () => void;
}
```

- [ ] **Step 1: Создать `HomeHeader`**

Разметка:
- `<header className="flex flex-col gap-[5px] px-[15px] pb-[15px] pt-[15px]">`;
- `<h1 className="text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">`;
- `<p className="text-[13px] leading-[1.4] text-app-text-secondary">`.

- [ ] **Step 2: Создать `DailyProgressCard`**

Логика:
```ts
const normalizedCompleted = total === 0 ? 0 : Math.min(Math.max(completed, 0), total);
const progressWidth = total === 0 ? "7px" : `${(normalizedCompleted / total) * 100}%`;
const title = total === 0 ? "Чем займёмся?" : "Всё идёт по плану";
const description =
  total === 0
    ? "Создайте первую задачу на сегодня"
    : `${normalizedCompleted} из ${total} задач выполнено`;
```

Разметка:
- обёртка `<div className="flex w-full flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]">`;
- верхняя строка — `<button type="button" onClick={onOpen} className="flex w-full items-center justify-between gap-2 text-left active:opacity-70">`;
- внутри кнопки текстовая колонка `min-w-0`, заголовок `text-[17px] font-semibold leading-[1.4] text-app-text`, подпись `mt-[3px] text-[13px] leading-[1.4] text-app-text-secondary`;
- `<AssetIcon src={chevronRightIcon} className="size-6 shrink-0 text-app-text-secondary" />`;
- шкала — соседний с кнопкой `<span className="block h-1 w-full overflow-hidden rounded-full bg-app-track">`, заполнение `<span className="block h-full rounded-full bg-app-accent" style={{ width: progressWidth }} />`;
- у шкалы `role="progressbar"`, `aria-valuemin={0}`, `aria-valuemax={Math.max(total, 1)}`, `aria-valuenow={normalizedCompleted}`, `aria-label="Прогресс дня"`;
- прогрессбар не вкладывать в `button`: ARIA `button` делает дочерние роли презентационными, а блочные элементы внутри `button` нарушают content model.

- [ ] **Step 3: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 4: QuickAccessSection

**Files:**
- Create: `app/components/home/section-heading.tsx`
- Create: `app/components/home/quick-access-section.tsx`

**Interfaces:**
- Consumes: `AssetIcon` из Task 1; `micro.svg` из `app/assets/icons/`.
- Produces:
```ts
export function SectionHeading({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
});

export type QuickActionId = "voice" | "interactive" | "search";

interface QuickAccessSectionProps {
  showSearch: boolean;
  onAction?: (id: QuickActionId) => void;
}
```

- [ ] **Step 1: Создать `app/components/home/section-heading.tsx`**

```tsx
export function SectionHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="px-[15px] text-[15px] font-semibold leading-[18px] text-app-text-secondary">
      {children}
    </h2>
  );
}
```

- [ ] **Step 2: Реализовать секцию**

Структура:
- `<section className="flex flex-col gap-2 pt-[15px]" aria-labelledby="quick-access-title">`;
- заголовок `Быстрый доступ` с `id="quick-access-title"`;
- `<div className="grid grid-cols-2 gap-x-[10px] gap-y-2">`;
- карточки: `Голосом`, `Интерактивно`, и `Поиск задач` при `showSearch === true`.

Карточка:
- `<button type="button" onClick={() => onAction?.(id)}>` с `flex h-full min-h-[165px] flex-col items-center rounded-[25px] bg-app-card p-[15px] text-center active:opacity-70`;
- иконка `50×50`;
- текстовая часть `mt-[10px] flex w-full flex-col items-center gap-[5px]`;
- заголовок `text-[15px] font-semibold leading-[18px] text-app-text`;
- описание `text-[12px] leading-[1.4] text-app-text-secondary`.

Иконки:
- «Голосом»: `<span aria-hidden="true" className="relative flex size-[50px] items-center justify-center rounded-full bg-app-accent-soft">` + `<img src={microIcon} alt="" className="absolute -left-[15px] -top-[7px] size-20 max-w-none" />`;
- «Интерактивно»: `<span aria-hidden="true" className="flex size-[50px] items-center justify-center text-[40px] leading-none">📝</span>`;
- «Поиск задач»: `<span aria-hidden="true" className="flex size-[50px] items-center justify-center text-[40px] leading-none">🔍</span>`.

Тексты — строго из `spec.md` §FR-3.

- [ ] **Step 3: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 5: FaqSection

**Files:**
- Create: `app/components/home/faq-section.tsx`

**Interfaces:**
- Consumes: `AssetIcon` из Task 1; `chevron_right.svg`, `Logo.svg`, `excel_logo.svg`.
- Produces:
```ts
export type FaqActionId = "about" | "export";

interface FaqSectionProps {
  onAction?: (id: FaqActionId) => void;
}
```

- [ ] **Step 1: Реализовать секцию**

Структура:
- `<section className="flex flex-col gap-2 pt-[15px]" aria-labelledby="faq-title">`;
- `<SectionHeading id="faq-title">FAQ</SectionHeading>`;
- карточка `rounded-[25px] bg-app-card p-[15px]`;
- две строки-кнопки.

Строка:
- `<button type="button" className="flex h-[67px] w-full items-center gap-3 text-left active:opacity-70">`;
- `<img src={...} alt="" className="size-[35px] shrink-0" />`;
- текстовая зона `flex h-full min-w-0 flex-1 items-center gap-3`; для всех строк кроме последней — `border-b border-app-stroke`;
- внутри текстовой зоны: `min-w-0 flex-1`, заголовок `text-[15px] leading-[1.3] text-app-text`, описание `mt-[6px] text-[13px] leading-[1.4] text-app-text-secondary`;
- `<AssetIcon src={chevronRightIcon} className="size-6 shrink-0 text-app-text-secondary" />`.

Данные:
```ts
const FAQ_ITEMS = [
  { id: "about", title: "Milly", description: "Изучите возможности приложения", icon: logoIcon },
  { id: "export", title: "Экспорт данных", description: "Выгрузка данных в удобный формат", icon: excelLogo },
] as const;
```

- [ ] **Step 2: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 6: Сборка home-route, loader и нижнее меню

**Files:**
- Modify: `app/routes/home.tsx`
- Modify: `app/components/home/bottom-navigation.tsx`
- Delete: `app/components/home/icons.tsx`

**Interfaces:**
- Consumes: `HomeHeader`, `DailyProgressCard`, `QuickAccessSection`, `FaqSection`, `getDailyTasksSummary`, `formatTodayLabel`, `useTelegram`, `BottomNavigation`.
- Produces: route `/`, default 2/6; `/?state=empty` — пустое состояние.

- [ ] **Step 1: Обновить `app/routes/home.tsx`**

Loader:
```ts
export async function loader({ request }: Route.LoaderArgs) {
  const emptyPreview = new URL(request.url).searchParams.get("state") === "empty";
  const summary = emptyPreview
    ? { total: 0, completed: 0 }
    : await getDailyTasksSummary();

  return {
    summary,
    dateLabel: formatTodayLabel(),
  };
}
```

Компонент:
```tsx
export default function Home({ loaderData }: Route.ComponentProps) {
  const { haptics } = useTelegram();
  const { summary, dateLabel } = loaderData;
  const isEmpty = summary.total === 0;
  const title = isEmpty ? "Задач на сегодня нет 😴" : "Задачи на сегодня";

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-2 px-[15px]">
        <HomeHeader title={title} dateLabel={dateLabel} />
        <DailyProgressCard
          completed={summary.completed}
          total={summary.total}
          onOpen={() => haptics.selection()}
        />
        <QuickAccessSection
          showSearch={!isEmpty}
          onAction={() => haptics.impact("light")}
        />
        <FaqSection onAction={() => haptics.selection()} />
      </div>

      <div
        className="sticky bottom-0 z-20 mt-6 px-4"
        style={{ paddingBottom: "max(0px, calc(30px - var(--app-inset-bottom)))" }}
      >
        <BottomNavigation
          active="home"
          onSelect={() => haptics.selection()}
        />
      </div>
    </main>
  );
}
```

Оставить `meta` с title `Milly` и description `Milly Telegram Mini App`. Удалить старые константы, `IconButton`, `QuickAccessCard` и импорты `ChevronRightIcon`, `GearIcon`, `GridIcon`, `MicIcon`.

- [ ] **Step 2: Обновить `app/components/home/bottom-navigation.tsx`**

- Импортировать `homeIcon`, `tasksIcon`, `financeIcon`, `workspacesIcon` из `~/assets/icons/*.svg`.
- Заменить `Icon` на `iconSrc`, использовать `<AssetIcon src={iconSrc} className={iconClassName ?? "size-6"} />`.
- Для `coop.svg` задать `iconClassName="h-7 w-6"`, для остальных — без дополнительного класса.
- Удалить `iconScale`, импорт старых иконок и `scale-[...]`.
- Сохранить `glass-nav`, `h-[65px]`, `rounded-full`, `p-[5px]`, labels и `glass-tab-active`.

- [ ] **Step 3: Удалить `app/components/home/icons.tsx`**

Убедиться, что файл больше нигде не импортируется.

- [ ] **Step 4: Проверить типы и сборку**

Run: `npm run typecheck`  
Expected: PASS.

Run: `npm run build`  
Expected: PASS, build завершается без ошибок.

---

### Task 7: Проверка SSR, состояний и адаптивности

**Files:**
- Verify only; изменений кода нет.

- [ ] **Step 1: Проверить SSR обычного состояния**

Run:
```bash
npm run build
PORT=3000 npm start
curl -s http://localhost:3000/ | grep -E "Задачи на сегодня|Всё идёт по плану|Быстрый доступ|FAQ"
```
Expected: в ответе есть все четыре строки.

- [ ] **Step 2: Проверить SSR пустого состояния**

Run:
```bash
curl -s "http://localhost:3000/?state=empty" | grep -E "Задач на сегодня нет|Чем займёмся|Создайте первую задачу"
```
Expected: в ответе есть пустые тексты; «Поиск задач» отсутствует.

- [ ] **Step 3: Проверить адаптивность и темы в браузере**

Проверить в `npm run dev`:
- ширины `320px`, `412px`, `448px`;
- light/dark через `prefers-color-scheme` вне Telegram;
- отсутствие горизонтального скролла и обрезанного текста;
- активная иконка нижнего меню синяя, неактивные — по токенам;
- нижнее меню визуально не изменилось, кроме иконок.

- [ ] **Step 4: Проверить Telegram**

Открыть через HTTPS-туннель в Telegram:
- тема переключается вместе с клиентом;
- safe-area снизу не перекрывает нижнее меню;
- нативный header Telegram отображается, кастомного header нет;
- haptics срабатывают на карточках и вкладках.

- [ ] **Step 5: Финальная проверка**

Run:
```bash
npm run typecheck
npm run build
```
Expected: обе команды завершаются успешно.
