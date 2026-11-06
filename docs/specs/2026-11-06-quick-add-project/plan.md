# Выбор проекта в быстром создании задачи — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в inline-форму быстрого создания задачи чип и шторку выбора проекта, загрузку проектов из `GET /projects` и передачу `project_id` в API создания задачи/серии.

**Architecture:** Новый доменный модуль `app/lib/projects/` отвечает за типы, запрос списка и маппинг иконок. `projectId` становится полем `QuickTaskDraft`; шаг `"project"` добавляется в Zustand-стор и `QuickAddDetailSheet` как ещё один controlled-шаг. `QuickAddComposer` читает проекты через React Query, передаёт выбранный проект в чипы и обрабатывает `404` вместе с метками.

**Tech Stack:** React 19, TypeScript 5.9 strict, Vite 8, Tailwind CSS 4, React Query 5, Zustand 5, zod 4, Vitest.

**Spec:** `docs/specs/2026-11-06-quick-add-project/spec.md`

## Global Constraints

- Новые зависимости не добавлять.
- Только токены `app-*`; `dark:`-классы и хардкод цветов Telegram не добавлять.
- Все запросы — через `apiRequest` из `app/lib/api/client.ts`.
- `QuickTaskDraft` остаётся единственным источником значений формы; RHF синхронизируется через `values: draft`.
- Файлы — `kebab-case`, компоненты — `PascalCase`, алиас `~/`, типы — `import type`.
- TypeScript strict, без `any`.
- Тесты — Vitest, `app/**/*.test.ts`; компонентные тесты — `renderToStaticMarkup`.
- Не коммитить без отдельной просьбы.
- Проверки перед завершением: `npm test`, `npm run typecheck`, `npm run build`.

## Review Focus

- **Проект без иконки или с чужим именем иконки.** `icon = null`, `""` и неизвестное имя не должны ломать рендер и обязаны давать `no-project`.
- **Удалённый проект при отправке.** `404` не должен терять черновик; проект сбрасывается, метки и проекты перезапрашиваются.
- **Ошибка загрузки проектов.** «Без проекта» остаётся доступным и отправляемым, даже если список не загрузился.
- **Переполнение чипа.** Длинное имя проекта усекается и не растягивает строку.
- **Фокус после закрытия.** Фокус возвращается на чип проекта, как у остальных чипов.

---

### Task 1: Доменный модуль проектов

**Files:**
- Create: `app/lib/projects/types.ts`
- Create: `app/lib/projects/projects-api.ts`
- Create: `app/lib/projects/project-icons.ts`
- Test: `app/lib/projects/projects-api.test.ts`
- Test: `app/lib/projects/project-icons.test.ts`

**Interfaces:**
- Consumes: `apiRequest`, `ColorResponse`.
- Produces:
  - `ProjectResponse`, `ProjectProgress`.
  - `fetchProjects(signal?: AbortSignal): Promise<ProjectResponse[]>`.
  - `getProjectIcon(icon: string | null): string`.

- [ ] **Step 1: Write failing API test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "~/lib/api/client";
import { fetchProjects } from "./projects-api";

vi.mock("~/lib/api/client", () => ({ apiRequest: vi.fn() }));
const apiRequestMock = vi.mocked(apiRequest);

beforeEach(() => apiRequestMock.mockReset());

describe("fetchProjects", () => {
  it("returns items from GET /projects?limit=100", async () => {
    const project = { id: 10, name: "Личное", icon: "leaf" };
    apiRequestMock.mockResolvedValue({ items: [project], next_cursor: null });

    await expect(fetchProjects()).resolves.toEqual([project]);
    expect(apiRequestMock).toHaveBeenCalledWith("/projects?limit=100", {
      signal: undefined,
    });
  });
});
```

- [ ] **Step 2: Write failing icon test**

```ts
import { describe, expect, it } from "vitest";
import { getProjectIcon } from "./project-icons";

describe("getProjectIcon", () => {
  it("maps a known icon name to the projects-icons asset", () => {
    expect(getProjectIcon("leaf")).toContain("leaf.svg");
  });

  it("falls back to no-project for empty and unknown icons", () => {
    const fallback = getProjectIcon(null);
    expect(fallback).toContain("no-project.svg");
    expect(getProjectIcon("")).toBe(fallback);
    expect(getProjectIcon("missing-icon")).toBe(fallback);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run app/lib/projects`
Expected: FAIL — модуль/функции не найдены.

- [ ] **Step 4: Implement types and API**

`types.ts`:

```ts
import type { ColorResponse } from "~/lib/labels/types";

export interface ProjectProgress {
  total: number;
  completed: number;
  remaining: number;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: ColorResponse;
  progress: ProjectProgress;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
```

`projects-api.ts`:

```ts
import { apiRequest } from "~/lib/api/client";
import type { ProjectResponse } from "./types";

interface ProjectsListResponse {
  items: ProjectResponse[];
  next_cursor: string | null;
}

export async function fetchProjects(
  signal?: AbortSignal,
): Promise<ProjectResponse[]> {
  const response = await apiRequest<ProjectsListResponse>(
    "/projects?limit=100",
    { signal },
  );
  return response.items;
}
```

- [ ] **Step 5: Implement icon map**

`project-icons.ts` импортирует все файлы `app/assets/icons/projects-icons/*.svg` через `?no-inline` в `const PROJECT_ICONS: Readonly<Record<string, string>>` и возвращает:

```ts
export function getProjectIcon(icon: string | null): string {
  if (icon !== null && Object.hasOwn(PROJECT_ICONS, icon)) {
    return PROJECT_ICONS[icon];
  }
  return PROJECT_ICONS["no-project"];
}
```

`Object.hasOwn` использовать после проверки `tsconfig`; если целевой lib его не поддерживает, заменить на `Object.prototype.hasOwnProperty.call`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run app/lib/projects`
Expected: PASS.

---

### Task 2: `projectId` в черновике и payload

**Files:**
- Modify: `app/lib/tasks/quick-task-schema.ts`
- Modify: `app/lib/tasks/quick-task-payload.ts`
- Modify: `app/lib/tasks/quick-task-schema.test.ts`
- Modify: `app/lib/tasks/quick-task-payload.test.ts`

**Interfaces:**
- Produces: `QuickTaskDraft.projectId: number | null`; `project_id` в `TaskCreateInput`/`SeriesCreateInput`.

- [ ] **Step 1: Update failing tests**

В `quick-task-schema.test.ts` добавить `projectId: null` в ожидаемые defaults и тест:

```ts
expect(
  quickTaskSchema.safeParse({ ...base, projectId: null }).success,
).toBe(true);
expect(
  quickTaskSchema.safeParse({ ...base, projectId: 10 }).success,
).toBe(true);
expect(
  quickTaskSchema.safeParse({ ...base, projectId: 0 }).success,
).toBe(false);
```

В `quick-task-payload.test.ts` добавить `project_id: null` в существующие ожидания и тест:

```ts
expect(toTaskCreateInput(draft({ projectId: 10 }), moscow).project_id).toBe(10);
expect(
  toSeriesCreateInput(draft({ isRecurring: true, projectId: 10 }), moscow)
    .project_id,
).toBe(10);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/lib/tasks/quick-task-schema.test.ts app/lib/tasks/quick-task-payload.test.ts`
Expected: FAIL — в defaults/payload нет `projectId`/`project_id`.

- [ ] **Step 3: Implement**

В `QuickTaskDraft` и `createQuickTaskDefaults` добавить `projectId: null`. В `quickTaskSchema`:

```ts
projectId: z.number().int().positive().nullable(),
```

В `toTaskCreateInput` и `toSeriesCreateInput` добавить `project_id: draft.projectId`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/lib/tasks/quick-task-schema.test.ts app/lib/tasks/quick-task-payload.test.ts`
Expected: PASS.

---

### Task 3: Шаг `project` и очистка выбранного проекта в сторе

**Files:**
- Modify: `app/components/tasks/quick-add/quick-add-step.ts`
- Modify: `app/components/tasks/quick-add/quick-add-store.ts`
- Modify: `app/components/tasks/quick-add/quick-add-step.test.ts`
- Modify: `app/components/tasks/quick-add/quick-add-store.test.ts`

**Interfaces:**
- Produces: `QuickAddStep` включает `"project"`; `getQuickAddHeader("project").title === "Проект"`; `QuickAddStoreState.pruneProjectId(validIds: number[]): void`.

- [ ] **Step 1: Update failing step test**

```ts
expect(QUICK_ADD_DETAIL_STEPS).toEqual([
  "labels",
  "project",
  "priority",
  "due",
  "reminders",
]);
expect(getQuickAddHeader("project").title).toBe("Проект");
```

- [ ] **Step 2: Add failing store tests**

```ts
it("commits and discards the project step like other steps", () => {
  const store = createStore();
  store.getState().patchDraft({ projectId: 10 });
  store.getState().openStep("project");
  store.getState().patchStepDraft({ projectId: 11 });
  expect(store.getState().draft.projectId).toBe(10);

  store.getState().closeStep();
  expect(store.getState().draft.projectId).toBe(10);

  store.getState().openStep("project");
  store.getState().applyStep({ projectId: 12 });
  expect(store.getState().draft.projectId).toBe(12);
});

it("prunes a missing project from both drafts", () => {
  const store = createStore();
  store.getState().patchDraft({ projectId: 10 });
  store.getState().openStep("project");
  store.getState().patchStepDraft({ projectId: 11 });

  store.getState().pruneProjectId([11]);
  expect(store.getState().draft.projectId).toBeNull();
  expect(store.getState().stepDraft?.projectId).toBe(11);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-step.test.ts app/components/tasks/quick-add/quick-add-store.test.ts`
Expected: FAIL — шага/экшена нет.

- [ ] **Step 4: Implement step and store**

Добавить `"project"` в union и массив, заголовок `Проект`. В сторе добавить в интерфейс и реализацию:

```ts
pruneProjectId: (validIds) => {
  const valid = new Set(validIds);
  set((state) => ({
    draft:
      state.draft.projectId !== null && !valid.has(state.draft.projectId)
        ? { ...state.draft, projectId: null }
        : state.draft,
    stepDraft:
      state.stepDraft !== null &&
      state.stepDraft.projectId !== null &&
      !valid.has(state.stepDraft.projectId)
        ? { ...state.stepDraft, projectId: null }
        : state.stepDraft,
  }));
},
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-step.test.ts app/components/tasks/quick-add/quick-add-store.test.ts`
Expected: PASS.

---

### Task 4: Компонент `ProjectStep`

**Files:**
- Create: `app/components/tasks/quick-add/project-step.tsx`
- Test: `app/components/tasks/quick-add/project-step.test.ts`

**Interfaces:**
- Consumes: `ProjectResponse`, `getProjectIcon`, `AssetIcon`, `BottomSheetPrimaryAction`.
- Produces: `ProjectStep` и `getProjectStepMessage`, props:

```ts
interface ProjectStepProps {
  projects: ProjectResponse[];
  isLoading: boolean;
  isError: boolean;
  selectedId: number | null;
  onRetry: () => void;
  onChange: (id: number | null) => void;
  onApply: (id: number | null) => void;
}
```

- [ ] **Step 1: Write failing component tests**

```ts
const project = {
  id: 10,
  name: "Личное",
  description: null,
  icon: "leaf",
  color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
  progress: { total: 0, completed: 0, remaining: 0 },
  archived_at: null,
  created_at: "2026-11-06T09:00:00Z",
  updated_at: "2026-11-06T09:00:00Z",
};

function render(overrides = {}) {
  return renderToStaticMarkup(
    createElement(ProjectStep, {
      projects: [],
      isLoading: false,
      isError: false,
      selectedId: null,
      onRetry: () => {},
      onChange: () => {},
      onApply: () => {},
      ...overrides,
    }),
  );
}

it("always renders the no-project row and apply action", () => {
  const html = render();
  expect(html).toContain("Без проекта");
  expect(html).toContain("no-project.svg");
  expect(html).toContain("Применить");
  expect(html).not.toContain("Загружаем проекты…");
});

it("renders projects with icon color and selected check", () => {
  const html = render({ projects: [project], selectedId: 10 });
  expect(html).toContain("Личное");
  expect(html).toContain("leaf.svg");
  expect(html).toContain("#16A34A");
  expect(html).toContain('aria-checked="true"');
});

it("renders loading and error states", () => {
  expect(render({ isLoading: true })).toContain("Загружаем проекты…");
  const error = render({ isError: true });
  expect(error).toContain("Не удалось загрузить проекты");
  expect(error).toContain("Повторить");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/tasks/quick-add/project-step.test.ts`
Expected: FAIL — компонента нет.

- [ ] **Step 3: Implement `ProjectStep`**

Компонент рендерит `role="radiogroup" aria-label="Проект"`, строку «Без проекта» (id `null`) и строки проектов; у выбранной строки — `AssetIcon` с `check.svg` `size-6 text-app-accent`, у остальных — `<span className="size-6" aria-hidden="true" />`. Иконка проекта — `getProjectIcon`, `size-[18px]`, `style={{ color: project.color.hex }}`. Имя — `text-[15px] text-app-text`. Разделители — между строками, у последней нет. Состояния загрузки/ошибки — под «Без проекта». «Применить» — `BottomSheetPrimaryAction` с `className="mt-[15px]"`, вызывает `onApply(selectedId)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/tasks/quick-add/project-step.test.ts`
Expected: PASS.

---

### Task 5: Подключение шага к `QuickAddDetailSheet`

**Files:**
- Modify: `app/components/tasks/quick-add/quick-add-detail-sheet.tsx`
- Modify: `app/components/tasks/quick-add/quick-add-detail-sheet-mapping.test.ts`

**Interfaces:**
- Consumes: `ProjectStep`, `ProjectResponse`.
- Produces: новые пропсы `projects`, `isProjectsLoading`, `isProjectsError`, `onRetryProjects`.

- [ ] **Step 1: Update failing mapping test**

Добавить mock `./project-step`, поле `captured.project`, новые пропсы в `renderSheet` и тест:

```ts
it("maps project step props and callbacks to the draft patch", () => {
  const project = { id: 10, name: "Личное" } as ProjectResponse;
  const { onPatch, onApply } = renderSheet(
    "project",
    createValues({ projectId: 10 }),
    "1",
    [project],
  );
  const step = capturedStep(captured.project);

  expect(step.selectedId).toBe(10);
  expect(step.projects).toEqual([project]);

  step.onChange(11);
  expect(onPatch).toHaveBeenLastCalledWith({ projectId: 11 });

  step.onApply(null);
  expect(onApply).toHaveBeenLastCalledWith({ projectId: null });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-detail-sheet-mapping.test.ts`
Expected: FAIL — нет шага/пропсов.

- [ ] **Step 3: Implement mapping**

Добавить пропсы в `QuickAddDetailSheetProps` и `ProjectStep` в рендер по `step === "project"`; `onChange` → `onPatch({ projectId })`, `onApply` → `onApply({ projectId })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-detail-sheet-mapping.test.ts`
Expected: PASS.

---

### Task 6: Чип, композер, загрузка и ошибки

**Files:**
- Modify: `app/components/tasks/quick-add/quick-add-chips.tsx`
- Modify: `app/components/tasks/quick-add/quick-add-form.tsx`
- Modify: `app/components/tasks/quick-add/quick-add-composer.tsx`
- Modify: `app/components/tasks/quick-add/use-create-quick-task.ts`
- Modify: `app/lib/tasks/quick-task-errors.ts`
- Modify: `app/components/tasks/quick-add/quick-add-chips.test.ts`
- Modify: `app/lib/tasks/quick-task-errors.test.ts`

**Interfaces:**
- Consumes: `fetchProjects`, `getProjectIcon`, `ProjectResponse`, `pruneProjectId`.
- Produces: `QuickAddChipsProps.project?: ProjectResponse`; `QuickAddFormProps.project?: ProjectResponse`; React Query key `["projects"]`; `404` copy.

- [ ] **Step 1: Update failing tests**

`quick-add-chips.test.ts`:

```ts
it("renders the no-project chip after labels by default", () => {
  const html = render();
  expect(html).toContain("Без проекта");
  expect(html).toContain("no-project.svg");
  expect(html.indexOf("Выбрать метки")).toBeLessThan(
    html.indexOf("Выбрать проект"),
  );
});

it("renders the selected project name and icon color", () => {
  const html = render({ project: projectFixture });
  expect(html).toContain("Личное");
  expect(html).toContain("leaf.svg");
  expect(html).toContain("#16A34A");
  expect(html).not.toContain("Без проекта");
});
```

`quick-task-errors.test.ts` — заменить ожидание `404` на «Метки или проект больше недоступны. Обновите список.».

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-chips.test.ts app/lib/tasks/quick-task-errors.test.ts`
Expected: FAIL — чипа/текста нет.

- [ ] **Step 3: Implement chip and form**

В `QuickAddChips` добавить `project?: ProjectResponse` и чип после labels:

```tsx
<OptionChip
  ariaLabel={project ? `Проект: ${project.name}` : "Выбрать проект"}
  buttonRef={chipRefs?.project}
  icon={
    <span style={project ? { color: project.color.hex } : undefined}>
      <AssetIcon className="size-[18px]" src={getProjectIcon(project?.icon ?? null)} />
    </span>
  }
  label={project?.name ?? "Без проекта"}
  onClick={() => onOpenStep("project")}
/>
```

Прокинуть `project` через `QuickAddForm`.

- [ ] **Step 4: Implement composer data flow**

В `QuickAddComposerContent`:

```ts
const projectsQuery = useQuery({
  queryKey: ["projects"],
  queryFn: ({ signal }) => fetchProjects(signal),
});
const projects = projectsQuery.data ?? [];
const selectedProject =
  draft.projectId === null
    ? undefined
    : projects.find((project) => project.id === draft.projectId);
```

Добавить `projectChipRef`, `project` в `chipRefs`, передать `project` в `QuickAddForm` и пропсы проектов в `QuickAddDetailSheet`. При `404` перезапрашивать оба списка через `Promise.all` и вызывать `pruneLabelIds` и `pruneProjectId`.

- [ ] **Step 5: Invalidate projects after create**

В `use-create-quick-task.ts` добавить `void queryClient.invalidateQueries({ queryKey: ["projects"] });` после инвалидации задач и серий.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run app/components/tasks/quick-add/quick-add-chips.test.ts app/lib/tasks/quick-task-errors.test.ts`
Expected: PASS.

---

### Task 7: Документация и финальная проверка

**Files:**
- Modify: `AGENTS.md`
- Verify: `docs/specs/2026-11-06-quick-add-project/spec.md`

- [ ] **Step 1: Update `AGENTS.md`**

Добавить `projects/` в структуру `app/lib/`, упомянуть чип/шторку проекта и `project_id` в разделе быстрого создания, добавить проверку проекта в чек-лист.

- [ ] **Step 2: Run full verification**

```bash
npm test
npm run typecheck
npm run build
```

Expected: все команды завершаются успешно.

- [ ] **Step 3: Verify SSR**

```bash
PORT=3000 npm start
curl -s http://localhost:3000/ | head
curl -i http://localhost:3000/does-not-exist
```

Ожидается: SSR без защищённого контента; неизвестный маршрут отдаёт `404`.

- [ ] **Step 4: Manual checklist**

Проверить в браузере и Telegram: чип проекта после меток, шторку «Проект», выбор/отмену, fallback `no-project`, light/dark, ширины `320/412/448px`, safe-area, клавиатуру, создание задачи и серии с проектом и без.
