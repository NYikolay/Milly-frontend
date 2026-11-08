import { describe, expect, it } from "vitest";

import type { TaskResponse } from "./types";
import {
  buildSearchTaskListQuery,
  canonicalizeSearchFilters,
  countActiveFilterGroups,
  createDefaultSearchFilters,
  filterTasksForDisplay,
  formatProjectsFound,
  normalizeFilterDate,
  pruneMissingIds,
  resolveFilterDate,
  searchFiltersFingerprint,
  toggleOptionalValue,
  toggleSelection,
} from "./search-filters";

const TODAY = "2026-11-08";

function task(overrides: Partial<TaskResponse>): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-08T09:00:00Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-08T08:00:00Z",
    updated_at: "2026-11-08T08:00:00Z",
    ...overrides,
  };
}

describe("search filters model", () => {
  it("creates empty default filters", () => {
    expect(createDefaultSearchFilters()).toEqual({
      date: null,
      projectIds: [],
      priorities: [],
      status: "all",
      recurrence: "all",
      labelIds: [],
    });
  });

  it("resolves and normalizes the filter date", () => {
    expect(resolveFilterDate(createDefaultSearchFilters(), TODAY)).toBe(TODAY);
    expect(normalizeFilterDate(TODAY, TODAY)).toBeNull();
    expect(normalizeFilterDate("2026-11-09", TODAY)).toBe("2026-11-09");
  });

  it("builds the server query with resolved date and limit", () => {
    expect(
      buildSearchTaskListQuery(
        { ...createDefaultSearchFilters(), projectIds: [2], priorities: ["neither"], status: "open" },
        TODAY,
        "  ",
      ),
    ).toEqual({
      date: TODAY,
      project_ids: [2],
      priorities: ["neither"],
      status: "open",
      recurrence: "all",
      limit: 100,
      q: undefined,
    });
  });

  it("counts active groups including date and labels", () => {
    expect(
      countActiveFilterGroups({
        date: "2026-11-09",
        projectIds: [2],
        priorities: ["neither"],
        status: "open",
        recurrence: "regular",
        labelIds: [4],
      }),
    ).toBe(6);
  });

  it("builds a stable fingerprint independent of array order", () => {
    const left = canonicalizeSearchFilters({
      ...createDefaultSearchFilters(),
      projectIds: [3, 1, 3],
      priorities: ["neither", "urgent_important"],
      labelIds: [9, 2],
      status: "open",
    });
    const right = canonicalizeSearchFilters({
      ...createDefaultSearchFilters(),
      projectIds: [1, 3],
      priorities: ["urgent_important", "neither"],
      labelIds: [2, 9],
      status: "open",
    });

    expect(searchFiltersFingerprint(left)).toBe(searchFiltersFingerprint(right));
    expect(left.projectIds).toEqual([1, 3]);
    expect(left.labelIds).toEqual([2, 9]);
  });

  it("ignores client-only labels in the server fingerprint", () => {
    const base = createDefaultSearchFilters();

    expect(searchFiltersFingerprint({ ...base, labelIds: [1, 2] })).toBe(
      searchFiltersFingerprint(base),
    );
  });

  it("toggles values and optional single values", () => {
    expect(toggleSelection([1, 2], 2)).toEqual([1]);
    expect(toggleSelection([1, 2], 3)).toEqual([1, 2, 3]);
    expect(toggleOptionalValue("open", "open")).toBe("all");
    expect(toggleOptionalValue("all", "completed")).toBe("completed");
  });

  it("prunes missing and duplicate ids", () => {
    expect(pruneMissingIds([3, 1, 3, 5], [1, 3])).toEqual([3, 1]);
  });

  it("matches status and requires all labels (AND)", () => {
    const openTask = task({ completed_at: null, labels: [{ id: 1, name: "A" }, { id: 2, name: "B" }] });
    const doneTask = task({ id: 2, completed_at: "2026-11-08T10:00:00Z", labels: [{ id: 1, name: "A" }] });

    expect(filterTasksForDisplay([openTask, doneTask], { ...createDefaultSearchFilters(), status: "open" })).toEqual([openTask]);
    expect(filterTasksForDisplay([openTask, doneTask], { ...createDefaultSearchFilters(), status: "completed" })).toEqual([doneTask]);
    expect(filterTasksForDisplay([openTask, doneTask], { ...createDefaultSearchFilters(), labelIds: [1, 2] })).toEqual([openTask]);
    expect(filterTasksForDisplay([openTask, doneTask], { ...createDefaultSearchFilters(), labelIds: [1] })).toEqual([openTask, doneTask]);
  });

  it("pluralizes the projects count", () => {
    expect(formatProjectsFound(0)).toBe("Найдено 0 проектов");
    expect(formatProjectsFound(1)).toBe("Найдено 1 проект");
    expect(formatProjectsFound(2)).toBe("Найдено 2 проекта");
    expect(formatProjectsFound(4)).toBe("Найдено 4 проекта");
    expect(formatProjectsFound(5)).toBe("Найдено 5 проектов");
    expect(formatProjectsFound(11)).toBe("Найдено 11 проектов");
    expect(formatProjectsFound(21)).toBe("Найдено 21 проект");
    expect(formatProjectsFound(22)).toBe("Найдено 22 проекта");
  });
});
