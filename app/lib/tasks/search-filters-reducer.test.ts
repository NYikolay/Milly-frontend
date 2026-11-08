import { describe, expect, it } from "vitest";

import { createDefaultSearchFilters } from "./search-filters";
import {
  createSearchFiltersState,
  searchFiltersReducer,
} from "./search-filters-reducer";

describe("searchFiltersReducer", () => {
  it("opens with a draft copied from applied filters", () => {
    const initial = createSearchFiltersState();
    const applied = { ...initial.applied, projectIds: [1] };
    const state = searchFiltersReducer(
      { ...initial, applied },
      { type: "open", step: "project" },
    );

    expect(state.step).toBe("project");
    expect(state.draft).toEqual(applied);
  });

  it("keeps the draft when moving from all filters to a sub-step", () => {
    const initial = createSearchFiltersState();
    const opened = searchFiltersReducer(initial, { type: "open", step: "all" });
    const patched = searchFiltersReducer(opened, {
      type: "applyStep",
      patch: { projectIds: [2] },
    });
    const reopened = searchFiltersReducer(patched, { type: "open", step: "priority" });

    expect(reopened.draft.projectIds).toEqual([2]);
    expect(reopened.step).toBe("priority");
  });

  it("returns to all filters on back and discards nothing else", () => {
    const state = searchFiltersReducer(
      createSearchFiltersState(),
      { type: "open", step: "status" },
    );
    const back = searchFiltersReducer(state, { type: "back" });

    expect(back.step).toBe("all");
  });

  it("applies a step patch to the draft and returns to all filters", () => {
    const openedAll = searchFiltersReducer(createSearchFiltersState(), {
      type: "open",
      step: "all",
    });
    const state = searchFiltersReducer(openedAll, {
      type: "open",
      step: "labels",
    });
    const applied = searchFiltersReducer(state, {
      type: "applyStep",
      patch: { labelIds: [3, 1, 3] },
    });

    expect(applied.step).toBe("all");
    expect(applied.draft.labelIds).toEqual([1, 3]);
    expect(applied.applied.labelIds).toEqual([]);
  });

  it("applies a directly opened step and closes the filters", () => {
    const state = searchFiltersReducer(createSearchFiltersState(), {
      type: "open",
      step: "labels",
    });
    const applied = searchFiltersReducer(state, {
      type: "applyStep",
      patch: { labelIds: [3, 1, 3] },
    });

    expect(applied.step).toBeNull();
    expect(applied.draft.labelIds).toEqual([1, 3]);
    expect(applied.applied.labelIds).toEqual([1, 3]);
  });

  it("applies the draft to the list and closes", () => {
    const state = searchFiltersReducer(
      { ...createSearchFiltersState(), step: "all", draft: { ...createSearchFiltersState().draft, labelIds: [1] } },
      { type: "applyAll" },
    );

    expect(state.step).toBeNull();
    expect(state.applied.labelIds).toEqual([1]);
  });

  it("closes and discards the draft", () => {
    const state = searchFiltersReducer(
      { ...createSearchFiltersState(), step: "date", draft: { ...createSearchFiltersState().draft, date: "2026-11-09" } },
      { type: "close" },
    );

    expect(state.step).toBeNull();
    expect(state.draft).toEqual(createDefaultSearchFilters());
  });

  it("resets applied and draft immediately and closes", () => {
    const initial = createSearchFiltersState();
    const state = searchFiltersReducer(
      { ...initial, step: "all", draft: { ...initial.draft, status: "open" }, applied: { ...initial.applied, status: "open" } },
      { type: "reset" },
    );

    expect(state).toEqual({
      step: null,
      draft: createDefaultSearchFilters(),
      applied: createDefaultSearchFilters(),
      openedDirectly: false,
    });
  });

  it("patches both applied and draft for pruning", () => {
    const initial = createSearchFiltersState();
    const state = searchFiltersReducer(
      { ...initial, step: "all", draft: { ...initial.draft, projectIds: [1] }, applied: { ...initial.applied, projectIds: [1] } },
      { type: "patchAll", patch: { projectIds: [] } },
    );

    expect(state.draft.projectIds).toEqual([]);
    expect(state.applied.projectIds).toEqual([]);
  });
});
