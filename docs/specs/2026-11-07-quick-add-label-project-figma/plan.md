# Quick-add Label/Project Figma Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести шторки «Метки» и «Проект» и чип проекта к фреймам Figma: поиск, круглые бейджи `28×28`, `no-project.svg`, `tag-raw.svg`, обновлённые строки и кнопка «Готово» в light/dark.

**Architecture:** Вводится общий `SearchField` и чистая функция `matchesSearchQuery`; шаги «Метки» и «Проект» получают локальный `useState` для строки поиска и фильтруют только отображаемые элементы, не меняя `stepDraft`/`draft`. Общий `ProjectIconBadge` инкапсулирует круглый бейдж с цветом backend и используется и в шторке, и в чипе проекта. `no-project.svg` становится отдельной константой `NO_PROJECT_ICON`, не затрагивая fallback `file.svg` для неизвестных иконок.

**Tech Stack:** React 19, TypeScript 5.9 (strict), Tailwind CSS 4, Vitest, React DOM Server.

**Spec:** `docs/specs/2026-11-07-quick-add-label-project-figma/spec.md`

## Global Constraints

- Только токены `app-*`; `dark:`-классы не добавляются. Единственный хардкод — `text-white` для глифа на цветном бейдже проекта, как в Figma.
- Не менять `BottomSheet`, `Modal`, `SheetHeader`, `OptionChip`, голосовую шторку, данные, React Query, API, payload и zustand-стор.
- Рабочее дерево уже грязное; не откатывать и не переформатировать несвязанные изменения. Трогать только файлы из задач.
- TypeScript strict, без `any`; типы — через `import type`.
- Файлы — `kebab-case`, компоненты — `PascalCase`, алиас `~/`.
- Тесты — Vitest, `app/**/*.test.ts`, среда `node`, статический рендер через `renderToStaticMarkup`; jsdom не добавлять.
- Линтера в проекте нет; `npm run lint` не добавлять.
- Не коммитить: пользователь не давал явного разрешения на коммит.
- Не запускать dev-сервер и не менять `.env`.
- Проверки: `npm test`, `npm run typecheck`, `npm run build`.

## Review Focus

- **Поиск не должен терять скрытые выбранные метки.** Фильтр влияет только на отображение; «Готово» отправляет `visibleSelected`, построенный по полному загруженному списку.
- **«Без проекта» не должно исчезать при поиске.** Фильтруются только реальные проекты; строка «Без проекта» всегда первая.
- **Неизвестная иконка реального проекта не должна становиться `no-project.svg`.** `NO_PROJECT_ICON` используется только для состояния «Без проекта»; `getProjectIcon` сохраняет fallback `file.svg`.
- **Тёмная тема не должна использовать светлые хардкоды.** Фон поиска, бейджа «Без проекта» и разделителей — только `app-*`; цветной бейдж проекта сохраняет backend hex.
- **Длинные названия не должны ломать строку.** Названия меток и проектов остаются `truncate`; бейдж не сжимается (`shrink-0`).
- **Разделители, высоты и отступы строк должны совпадать с Figma.** Метки — `50px`, отступ от поиска `15px`, `px-[15px]`, `gap-[10px]` и разделитель после каждой строки; проекты — `59px`, полная ширина без зазора от поиска и разделитель после каждой строки.

---

### Task 1: Project icon constant and badge

**Files:**
- Modify: `app/lib/projects/project-icons.ts`
- Create: `app/components/tasks/quick-add/project-icon-badge.tsx`
- Test: `app/lib/projects/project-icons.test.ts`
- Test: `app/components/tasks/quick-add/project-icon-badge.test.ts`

**Interfaces:**
- Consumes: существующий `AssetIcon` (`src: string`, `className?: string`) и `cn(...classes)`.
- Produces:
  - `export const NO_PROJECT_ICON: string` из `~/lib/projects/project-icons`;
  - `export function ProjectIconBadge({ icon, colorHex, className }: ProjectIconBadgeProps): ReactElement`;
  - `export interface ProjectIconBadgeProps { icon: string; colorHex: string | null; className?: string }`.

- [ ] **Step 1: Extend the project-icon test**

Replace the assertions in `app/lib/projects/project-icons.test.ts` with:

```ts
import { describe, expect, it } from "vitest";

import { getProjectIcon, NO_PROJECT_ICON } from "./project-icons";

describe("project icons", () => {
  it("maps a known icon name to the projects-icons asset", () => {
    expect(getProjectIcon("book")).toContain("book.svg");
    expect(getProjectIcon("file-music")).toContain("file-music.svg");
  });

  it("exposes the no-project asset separately from the fallback", () => {
    expect(NO_PROJECT_ICON).toContain("no-project.svg");
    expect(getProjectIcon(null)).toContain("file.svg");
    expect(getProjectIcon("")).toBe(getProjectIcon(null));
    expect(getProjectIcon("missing-icon")).toBe(getProjectIcon(null));
  });
});
```

- [ ] **Step 2: Run the project-icon test to verify it fails**

Run: `npx vitest run app/lib/projects/project-icons.test.ts`
Expected: FAIL — `NO_PROJECT_ICON` is not exported.

- [ ] **Step 3: Export `NO_PROJECT_ICON`**

In `app/lib/projects/project-icons.ts`:

- Add
  `import noProjectIcon from "~/assets/icons/projects-icons/no-project.svg?no-inline";`.
- Add
  `export const NO_PROJECT_ICON: string = noProjectIcon;` before `PROJECT_ICONS`.
- Do not add `"no-project"` to `PROJECT_ICONS` and do not change the
  `getProjectIcon` fallback (`PROJECT_ICONS.file`).

- [ ] **Step 4: Run the project-icon test to verify it passes**

Run: `npx vitest run app/lib/projects/project-icons.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing badge test**

Create `app/components/tasks/quick-add/project-icon-badge.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectIconBadge } from "./project-icon-badge";

function render(colorHex: string | null, icon = "/icons/book.svg") {
  return renderToStaticMarkup(
    createElement(ProjectIconBadge, { colorHex, icon }),
  );
}

describe("ProjectIconBadge", () => {
  it("renders a 28px colored circle with a white 18px glyph", () => {
    const html = render("#16A34A");

    expect(html).toContain("size-7");
    expect(html).toContain("rounded-full");
    expect(html).toContain("p-[5px]");
    expect(html).toContain("size-[18px]");
    expect(html).toContain("text-white");
    expect(html).toContain("background-color:#16A34A");
    expect(html).toContain("book.svg");
  });

  it("renders the no-project badge with app tokens", () => {
    const html = render(null, "/icons/no-project.svg");

    expect(html).toContain("bg-app-track");
    expect(html).toContain("text-app-text");
    expect(html).not.toContain("background-color");
    expect(html).toContain("no-project.svg");
  });
});
```

- [ ] **Step 6: Run the badge test to verify it fails**

Run: `npx vitest run app/components/tasks/quick-add/project-icon-badge.test.ts`
Expected: FAIL — module `./project-icon-badge` does not exist.

- [ ] **Step 7: Implement `ProjectIconBadge`**

Create `app/components/tasks/quick-add/project-icon-badge.tsx`:

```tsx
import type { ReactElement } from "react";

import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";

export interface ProjectIconBadgeProps {
  icon: string;
  colorHex: string | null;
  className?: string;
}

export function ProjectIconBadge({
  icon,
  colorHex,
  className,
}: ProjectIconBadgeProps): ReactElement {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full p-[5px]",
        colorHex === null ? "bg-app-track text-app-text" : "text-white",
        className,
      )}
      style={colorHex === null ? undefined : { backgroundColor: colorHex }}
    >
      <AssetIcon className="size-[18px]" src={icon} />
    </span>
  );
}
```

- [ ] **Step 8: Run the badge test to verify it passes**

Run: `npx vitest run app/components/tasks/quick-add/project-icon-badge.test.ts`
Expected: PASS.

---

### Task 2: Search helper and `SearchField`

**Files:**
- Create: `app/components/tasks/quick-add/search-filter.ts`
- Create: `app/components/ui/search-field.tsx`
- Test: `app/components/tasks/quick-add/search-filter.test.ts`
- Test: `app/components/ui/search-field.test.ts`

**Interfaces:**
- Consumes: `AssetIcon`, `cn`.
- Produces:
  - `export function matchesSearchQuery(value: string, query: string): boolean`;
  - `export interface SearchFieldProps { value: string; onChange: (value: string) => void; ariaLabel: string; placeholder?: string; className?: string }`;
  - `export function SearchField(props: SearchFieldProps): ReactElement`.

- [ ] **Step 1: Write the failing search-filter test**

Create `app/components/tasks/quick-add/search-filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { matchesSearchQuery } from "./search-filter";

describe("matchesSearchQuery", () => {
  it("matches everything for an empty or whitespace query", () => {
    expect(matchesSearchQuery("Работа", "")).toBe(true);
    expect(matchesSearchQuery("Работа", "   ")).toBe(true);
  });

  it("matches case-insensitive substrings", () => {
    expect(matchesSearchQuery("Работа", "раб")).toBe(true);
    expect(matchesSearchQuery("Работа", "РАБ")).toBe(true);
    expect(matchesSearchQuery("Работа", "бот")).toBe(true);
  });

  it("rejects non-matching strings", () => {
    expect(matchesSearchQuery("Работа", "дом")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the search-filter test to verify it fails**

Run: `npx vitest run app/components/tasks/quick-add/search-filter.test.ts`
Expected: FAIL — module `./search-filter` does not exist.

- [ ] **Step 3: Implement `matchesSearchQuery`**

Create `app/components/tasks/quick-add/search-filter.ts`:

```ts
export function matchesSearchQuery(value: string, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  return (
    normalizedQuery.length === 0 ||
    value.toLowerCase().includes(normalizedQuery)
  );
}
```

- [ ] **Step 4: Run the search-filter test to verify it passes**

Run: `npx vitest run app/components/tasks/quick-add/search-filter.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing `SearchField` test**

Create `app/components/ui/search-field.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchField } from "./search-field";

function render(value = "") {
  return renderToStaticMarkup(
    createElement(SearchField, {
      ariaLabel: "Поиск меток",
      onChange: () => {},
      value,
    }),
  );
}

describe("SearchField", () => {
  it("renders the search field geometry and icon", () => {
    const html = render();

    expect(html).toContain('type="search"');
    expect(html).toContain('placeholder="Поиск"');
    expect(html).toContain('aria-label="Поиск меток"');
    expect(html).toContain("search.svg");
    expect(html).toContain("h-[45px]");
    expect(html).toContain("rounded-[25px]");
    expect(html).toContain("bg-app-track");
    expect(html).toContain("px-[15px]");
    expect(html).toContain("gap-[10px]");
    expect(html).toContain("size-5");
    expect(html).toContain("text-app-text-secondary");
  });

  it("renders the controlled value", () => {
    expect(render("работа")).toContain('value="работа"');
  });
});
```

- [ ] **Step 6: Run the `SearchField` test to verify it fails**

Run: `npx vitest run app/components/ui/search-field.test.ts`
Expected: FAIL — module `./search-field` does not exist.

- [ ] **Step 7: Implement `SearchField`**

Create `app/components/ui/search-field.tsx`:

```tsx
import type { ChangeEvent, ReactElement } from "react";

import searchIcon from "~/assets/icons/search.svg";
import { cn } from "~/lib/cn";

import { AssetIcon } from "./asset-icon";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  ariaLabel,
  placeholder = "Поиск",
  className,
}: SearchFieldProps): ReactElement {
  return (
    <div
      className={cn(
        "flex h-[45px] w-full items-center gap-[10px] rounded-[25px] bg-app-track px-[15px] focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-app-accent",
        className,
      )}
    >
      <AssetIcon
        className="size-5 shrink-0 text-app-text-secondary"
        src={searchIcon}
      />
      <input
        aria-label={ariaLabel}
        className="min-w-0 flex-1 appearance-none bg-transparent text-[15px] leading-[1.3] text-app-text outline-none placeholder:text-app-text-secondary [&::-webkit-search-cancel-button]:appearance-none"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </div>
  );
}
```

- [ ] **Step 8: Run the `SearchField` test to verify it passes**

Run: `npx vitest run app/components/ui/search-field.test.ts`
Expected: PASS.

---

### Task 3: Redesign `ProjectStep`

**Files:**
- Modify: `app/components/tasks/quick-add/project-step.tsx`
- Test: `app/components/tasks/quick-add/project-step.test.ts`

**Interfaces:**
- Consumes:
  - `NO_PROJECT_ICON` from `~/lib/projects/project-icons`;
  - `ProjectIconBadge` from `./project-icon-badge`;
  - `SearchField` from `~/components/ui/search-field`;
  - `matchesSearchQuery` from `./search-filter`.
- Produces: `export function filterProjectList(projects: ProjectResponse[], query: string): ProjectResponse[]`; остальные пропсы и `getProjectStepMessage` не меняются.

- [ ] **Step 1: Update the failing `ProjectStep` tests**

In `app/components/tasks/quick-add/project-step.test.ts`:

- Import `filterProjectList` from `./project-step`.
- Replace the default-row expectations:

```ts
expect(html).toContain("Без проекта");
expect(html).toContain("no-project.svg");
expect(html).toContain("bg-app-track");
expect(html).toContain("text-app-text");
expect(html).toContain("Готово");
```

- Replace the project-row expectations with badge assertions:

```ts
expect(html).toContain("Личное");
expect(html).toContain("book.svg");
expect(html).toContain("size-7");
expect(html).toContain("p-[5px]");
expect(html).toContain("text-white");
expect(html).toContain("background-color:#16A34A");
expect(html).toContain("truncate text-[15px] leading-[1.3] text-app-text");
expect(html).toContain('aria-checked="true"');
```

- Add search assertions:

```ts
expect(html).toContain('placeholder="Поиск"');
expect(html).toContain('aria-label="Поиск проектов"');
expect(html).toContain("h-[45px]");
```

- Add row-height and divider assertions:

```ts
expect(html).toContain("h-[59px]");
```

Replace the old "draws dividers between rows but not after the last row"
test with:

```ts
it("draws a divider after every row", () => {
  expect(render().match(/border-b border-app-stroke/g)).toHaveLength(1);

  const html = render({ projects: [project] });

  expect(html.match(/border-b border-app-stroke/g)).toHaveLength(2);
});
```

- Add a filtering test:

```ts
it("filters real projects by name but never filters the no-project row", () => {
  expect(filterProjectList([project], "лич")).toHaveLength(1);
  expect(filterProjectList([project], "ЛИЧ")).toHaveLength(1);
  expect(filterProjectList([project], "дом")).toHaveLength(0);
  expect(filterProjectList([project], "  ")).toHaveLength(1);
  expect(render()).toContain("Без проекта");
});
```

- Keep the existing loading/error ordering, radiogroup, default
  selection, and exact-message tests.

- [ ] **Step 2: Run the `ProjectStep` test to verify it fails**

Run: `npx vitest run app/components/tasks/quick-add/project-step.test.ts`
Expected: FAIL — no search, `file.svg` still used, `h-[50px]`, no badge,
«Применить», divider skipped after the last row.

- [ ] **Step 3: Implement the new `ProjectStep`**

In `app/components/tasks/quick-add/project-step.tsx`:

- Add imports:

```ts
import { Fragment, useState } from "react";
import { SearchField } from "~/components/ui/search-field";
import { getProjectIcon, NO_PROJECT_ICON } from "~/lib/projects/project-icons";

import { ProjectIconBadge } from "./project-icon-badge";
import { matchesSearchQuery } from "./search-filter";
```

- Add the exported filter:

```ts
export function filterProjectList(
  projects: ProjectResponse[],
  query: string,
): ProjectResponse[] {
  return projects.filter((project) =>
    matchesSearchQuery(project.name, query),
  );
}
```

- Add local state and rows:

```ts
const [query, setQuery] = useState("");
const filteredProjects = filterProjectList(projects, query);
const hasNoMatches =
  !isLoading &&
  !isError &&
  query.trim().length > 0 &&
  filteredProjects.length === 0;
const rows: ProjectStepRow[] = [
  {
    id: null,
    name: "Без проекта",
    icon: NO_PROJECT_ICON,
    colorHex: null,
  },
  ...filteredProjects.map((project) => ({
    id: project.id,
    name: project.name,
    icon: getProjectIcon(project.icon),
    colorHex: project.color.hex,
  })),
];
```

- Render `<SearchField ariaLabel="Поиск проектов" onChange={setQuery} value={query} />`
  as the first child of the root `<div className="flex flex-1 flex-col">`,
  before the radiogroup.
- Change the row button to
  `className="flex h-[59px] w-full items-center gap-[15px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"`.
- Keep the check/spacer as-is (`size-6`).
- Change the content wrapper to
  `className="flex h-full min-w-0 flex-1 items-center gap-[5px] border-b border-app-stroke"`
  without `isLast`; remove the now-unused `isLast` variable.
- Replace the icon span with:

```tsx
<ProjectIconBadge colorHex={row.colorHex} icon={row.icon} />
```

- Add `leading-[1.3]` to the project-name class:
  `truncate text-[15px] leading-[1.3] text-app-text`.

- Keep the status blocks after the first row (`index === 0`) and the
  `role="radiogroup"` / `role="radio"` markup.
- Do not reset `selectedId` when filtering; «Готово» applies the selected
  project even if its row is hidden by the query.
- After the radiogroup add:

```tsx
{hasNoMatches ? (
  <p className={STATUS_CLASSES}>Ничего не найдено</p>
) : null}
```

- Change the button copy to `Готово`.

- [ ] **Step 4: Run the `ProjectStep` test to verify it passes**

Run: `npx vitest run app/components/tasks/quick-add/project-step.test.ts`
Expected: PASS.

---

### Task 4: Redesign `LabelsStep`

**Files:**
- Modify: `app/components/tasks/quick-add/labels-step.tsx`
- Test: `app/components/tasks/quick-add/labels-step.test.ts`

**Interfaces:**
- Consumes:
  - `SearchField` from `~/components/ui/search-field`;
  - `matchesSearchQuery` from `./search-filter`.
- Produces: `export function filterLabelList(labels: LabelResponse[], query: string): LabelResponse[]`; остальные пропсы и `getLabelsStepMessage` не меняются.

- [ ] **Step 1: Update the failing `LabelsStep` tests**

In `app/components/tasks/quick-add/labels-step.test.ts`:

- Import `filterLabelList` from `./labels-step`.
- Change the apply assertion to `Готово`.
- Add icon, row, radio and search assertions:

```ts
expect(html).toContain("tag-raw.svg");
expect(html).not.toContain("tag.svg");
expect(html).toContain("size-[18px]");
expect(html).toContain("h-[50px]");
expect(html).toContain("size-5");
expect(html).toContain("size-[15px]");
expect(html).toContain("border-app-text-secondary/55");
expect(html).toContain("min-w-0 flex-1 truncate text-[15px] leading-[1.3]");
expect(html).toContain('placeholder="Поиск"');
expect(html).toContain('aria-label="Поиск меток"');
expect(html).toContain("h-[45px]");
expect(html).toContain("mt-[15px]");
expect(html).toContain("flex flex-col gap-[10px] px-[15px]");
```

- Add a divider test:

```ts
it("draws a divider after every label row", () => {
  const html = render({ labels: [label] });

  expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
});
```

- Add a filtering test:

```ts
it("filters labels by name case-insensitively", () => {
  expect(filterLabelList([label], "лич")).toHaveLength(1);
  expect(filterLabelList([label], "ЛИЧ")).toHaveLength(1);
  expect(filterLabelList([label], "дом")).toHaveLength(0);
  expect(filterLabelList([label], "  ")).toHaveLength(1);
});
```

- Keep the empty-state, loading/error/retry, controlled selection and
  `flex flex-1 flex-col` / `mt-auto pt-[15px]` tests.

- [ ] **Step 2: Run the `LabelsStep` test to verify it fails**

Run: `npx vitest run app/components/tasks/quick-add/labels-step.test.ts`
Expected: FAIL — `tag.svg` still used, dot `10px`, row `47px`, no
search, «Применить», no `mt-[15px]`/`gap-[10px]`/`px-[15px]` list
geometry.

- [ ] **Step 3: Implement the new `LabelsStep`**

In `app/components/tasks/quick-add/labels-step.tsx`:

- Change the icon import to
  `import tagIcon from "~/assets/icons/tag-raw.svg";`.
- Add imports:

```ts
import { useState } from "react";
import { SearchField } from "~/components/ui/search-field";

import { matchesSearchQuery } from "./search-filter";
```

- Add the exported filter:

```ts
export function filterLabelList(
  labels: LabelResponse[],
  query: string,
): LabelResponse[] {
  return labels.filter((label) => matchesSearchQuery(label.name, query));
}
```

- Add `const [query, setQuery] = useState("");` immediately after
  `const items = uniqueLabels(labels);`.
- After `const isReady = !isLoading && !isError;` add:

```ts
const filteredItems = filterLabelList(items, query);
const hasSearchQuery = query.trim().length > 0;
const hasNoMatches =
  isReady && hasSearchQuery && items.length > 0 && filteredItems.length === 0;
```

- Keep `visibleSelected` based on the full `items` list and computed
  after `filteredItems`.
- Render `<SearchField ariaLabel="Поиск меток" onChange={setQuery} value={query} />`
  as the first child of the root `<div className="flex flex-1 flex-col">`.
- Wrap `content` in `<div className="mt-[15px]">{content}</div>` between
  the search field and the `mt-auto pt-[15px]` apply wrapper.
- In the content branches, keep `isLoading` → `isError` → `items.length === 0`,
  then add `else if (hasNoMatches)` rendering
  `<p className={STATUS_CLASSES}>Ничего не найдено</p>`; otherwise map
  `filteredItems` inside
  `<ul className="flex flex-col gap-[10px] px-[15px]">`.
- Remove `border-b border-app-stroke` from `<li>`.
- Change the row button to
  `className="flex h-[50px] w-full items-center gap-[15px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"`.
- Change the radio to:

```tsx
<span
  aria-hidden="true"
  className={cn(
    "flex size-5 shrink-0 items-center justify-center rounded-full border",
    isSelected
      ? "border-app-accent"
      : "border-app-text-secondary/55",
  )}
>
  {isSelected ? (
    <span className="size-[15px] rounded-full bg-app-accent" />
  ) : null}
</span>
```

- Wrap the tag and name in a content wrapper:

```tsx
<span className="flex h-full min-w-0 flex-1 items-center gap-[5px] border-b border-app-stroke">
  <span className="shrink-0" style={{ color: label.color.hex }}>
    <AssetIcon className="size-[18px]" src={tagIcon} />
  </span>
  <span
    className="min-w-0 flex-1 truncate text-[15px] leading-[1.3]"
    style={{ color: label.color.hex }}
  >
    {label.name}
  </span>
</span>
```

- Keep `visibleSelected` based on the full `items` list and
  `onApply(uniqueLabelIds(visibleSelected))`.
- Change the button copy to `Готово`.

- [ ] **Step 4: Run the `LabelsStep` test to verify it passes**

Run: `npx vitest run app/components/tasks/quick-add/labels-step.test.ts`
Expected: PASS.

---

### Task 5: Project badge in the composer chip

**Files:**
- Modify: `app/components/tasks/quick-add/quick-add-chips.tsx`
- Test: `app/components/tasks/quick-add/quick-add-chips.test.ts`

**Interfaces:**
- Consumes: `NO_PROJECT_ICON` from `~/lib/projects/project-icons`, `ProjectIconBadge` from `./project-icon-badge`.
- Produces: без новых экспортов и сигнатур; меняется только ReactNode иконки чипа проекта.

- [ ] **Step 1: Update the failing chip tests**

In `app/components/tasks/quick-add/quick-add-chips.test.ts`:

- Replace the default no-project assertions:

```ts
expect(html).toContain("Без проекта");
expect(html).toContain("no-project.svg");
expect(html).toContain("bg-app-track");
expect(html).toContain("text-app-text");
expect(html).toContain("size-7");
expect(html).not.toContain("file.svg");
```

- Replace the selected-project assertions:

```ts
expect(html).toContain("Личное");
expect(html).toContain('aria-label="Проект: Личное"');
expect(html).toContain("book.svg");
expect(html).toContain("size-7");
expect(html).toContain("text-white");
expect(html).toContain("background-color:#16A34A");
expect(html).not.toContain("Без проекта");
```

- Add a `LabelResponse` fixture and a dedicated labels-chip regression
  test (do not put this assertion in the no-labels test, where only
  `tag-plus.svg` is rendered):

```ts
import type { LabelResponse } from "~/lib/labels/types";

const labelFixture: LabelResponse = {
  id: 3,
  name: "Личное",
  color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
  created_at: "2026-11-05T09:00:00Z",
  updated_at: "2026-11-05T09:00:00Z",
};

it("keeps the existing tag icon in the selected labels chip", () => {
  const html = render({
    labels: [labelFixture],
    selectedLabelIds: [3],
  });

  expect(html).toContain("tag.svg");
  expect(html).not.toContain("tag-raw.svg");
});
```

- Keep the ordering, compact icons, and repeat-icon tests; `size-6` is
  still used by `tag-plus.svg`.

- [ ] **Step 2: Run the chip test to verify it fails**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-chips.test.ts`
Expected: FAIL — default chip uses `file.svg`, selected project icon is
not a `size-7` badge.

- [ ] **Step 3: Implement the chip badge**

In `app/components/tasks/quick-add/quick-add-chips.tsx`:

- Add imports:

```ts
import { getProjectIcon, NO_PROJECT_ICON } from "~/lib/projects/project-icons";

import { ProjectIconBadge } from "./project-icon-badge";
```

- Replace the project chip `icon` prop with:

```tsx
icon={
  <ProjectIconBadge
    colorHex={project ? project.color.hex : null}
    icon={project ? getProjectIcon(project.icon) : NO_PROJECT_ICON}
  />
}
```

- Do not change the labels chip icon logic (`tag.svg`, `tag-plus.svg`).

- [ ] **Step 4: Run the chip test to verify it passes**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-chips.test.ts`
Expected: PASS.

---

### Task 6: Documentation and full verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/specs/2026-11-06-quick-add-project/spec.md`
- Modify: `docs/specs/2026-11-06-inline-quick-add/spec.md`

**Interfaces:**
- Consumes: реализованные `SearchField`, `ProjectIconBadge`,
  `NO_PROJECT_ICON`, `filterProjectList`, `filterLabelList`.
- Produces: документация без изменения кода.

- [ ] **Step 1: Update `AGENTS.md`**

- В дереве `app/components/ui/` добавить `search-field`.
- В дереве `app/components/tasks/quick-add/` добавить
  `project-icon-badge.tsx`, `search-filter.ts`.
- В §3 (быстрое создание) добавить: шторки «Метки» и «Проект» имеют поле
  «Поиск»; проекты показываются круглым бейджем `28×28` с белой иконкой,
  «Без проекта» — `no-project.svg` на `bg-app-track`; в «Метках» —
  `tag-raw.svg`; основная кнопка — «Готово».
- В §5 добавить правило: `ProjectIconBadge` — единственное место круглого
  бейджа; `NO_PROJECT_ICON` только для «Без проекта»; чип меток остаётся
  на `tag.svg`/`tag-plus.svg`; список меток имеет `mt-[15px]`,
  `px-[15px]` и `gap-[10px]`, список проектов — полную ширину без зазора
  от поиска.
- В §7 добавить ручную проверку поиска, бейджей и тёмной темы для обеих
  шторок.

- [ ] **Step 2: Add supersede notes to prior specs**

В начале `docs/specs/2026-11-06-quick-add-project/spec.md` после
метаданных добавить:

```md
> Примечание (2026-11-07): визуальные требования к иконке проекта,
> строке «Без проекта», высоте строк и отсутствию поиска заменены
> спецификацией
> `docs/specs/2026-11-07-quick-add-label-project-figma/spec.md`;
> `project_id`, чип и порядок чипов сохраняются.
```

В начале `docs/specs/2026-11-06-inline-quick-add/spec.md` после
метаданных добавить:

```md
> Примечание (2026-11-07): визуальные требования к шторке «Метки»
> (иконка, кольцо выбора, высота строк) и отсутствие поиска заменены
> спецификацией
> `docs/specs/2026-11-07-quick-add-label-project-figma/spec.md`;
> логика выбора и `MAX_LABEL_COUNT` сохраняются.
```

- [ ] **Step 3: Run the full automated verification**

```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests pass, typecheck clean, build succeeds.

- [ ] **Step 4: Check the SSR response for protected content**

```bash
npm run build
PORT=3000 npm start
```

In a second terminal:

```bash
curl -s http://localhost:3000/
curl -i http://localhost:3000/does-not-exist
```

Expected: the main page HTML contains no protected task/label/project
data; `/does-not-exist` returns HTTP `404`. Stop the server after the
check.

- [ ] **Step 5: Do not commit; report working-tree changes**

Leave every change uncommitted. In the final report list each modified or
created file and the exact verification commands with their outcomes.

---

## Self-Review

### 1. Покрытие спецификации

- FR-1 (поиск) — Task 2 (helper + `SearchField`), Task 3, Task 4.
- FR-2 (иконки и бейджи) — Task 1, Task 3, Task 5.
- FR-3 («Проект») — Task 3.
- FR-4 («Метки») — Task 4.
- FR-5 (чип проекта) — Task 5.
- FR-6 (тёмная тема) — Tasks 1–5 через `app-*`; Task 6 manual check.
- FR-7 (доступность) — Tasks 2–4 (aria, focus, roles), Task 6 manual check.
- FR-8 (тесты и документация) — Tasks 1–6.

### 2. Проверка шагов

- Каждый тестовый шаг содержит конкретные assert-ы и точные значения из
  спецификации.
- Каждый шаг реализации называет файл, сигнатуру и точные классы/копирайт.
- Нет шагов «TBD», «обработать краевые случаи» или «написать тесты».
- Команды запускаются для конкретного файла и ожидают явный FAIL/PASS.

### 3. Согласованность типов

- `NO_PROJECT_ICON: string` используется в Task 3 и Task 5.
- `ProjectIconBadgeProps` (`icon`, `colorHex`, `className`) одинаков в
  Task 1, 3, 5.
- `SearchFieldProps` (`value`, `onChange`, `ariaLabel`, `placeholder`,
  `className`) одинаков в Task 2, 3, 4.
- `filterProjectList` и `filterLabelList` возвращают массивы исходных
  типов и не меняют сигнатуры существующих пропсов.

### 4. Review Focus

- Скрытые выбранные метки — `filterLabelList` + сохранение
  `visibleSelected` по полному `items` (Task 4).
- Скрытый выбранный проект — `selectedId` не сбрасывается фильтром
  (Task 3).
- «Без проекта» при поиске — отдельная строка вне фильтра (Task 3).
- Неизвестная иконка проекта — `getProjectIcon` остаётся `file.svg`
  (Task 1).
- Тёмная тема — только `app-*`, ручная проверка (Tasks 1–6).
- Длинные названия — `truncate` в тестах разметки (Tasks 3, 4).
- Высоты/отступы/разделители — `h-[50px]` / `h-[59px]`,
  `mt-[15px]`/`gap-[10px]`/`px-[15px]` у меток и количество `border-b`
  в тестах (Tasks 3, 4).

### 5. Пропорция

План описывает пять небольших компонентных изменений и один
документационный шаг; код в плане ограничен сигнатурами и ключевой
разметкой, тесты содержат точные assert-ы. Объём соответствует
спецификации.

## Execution Handoff

После утверждения спецификации и плана выбрать способ выполнения:

- **Subagent-driven** — каждая задача выполняется отдельным субагентом,
  затем проверяется ревьюером; подходит, если важна независимая
  проверка задач.
- **Native** — исполнитель проходит задачи в текущей сессии; быстрее и
  дешевле, одна финальная проверка.

Рекомендуется **Subagent-driven**: задачи 3–5 зависят от общих
интерфейсов `SearchField`/`ProjectIconBadge`, а визуальные дефекты
(тёмная тема, разделители) дешевле ловить до перехода к следующей
задаче.
