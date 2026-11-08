import type { FiltersStep, SearchTaskFilters } from "./search-filters";
import {
  canonicalizeSearchFilters,
  createDefaultSearchFilters,
} from "./search-filters";

export interface SearchFiltersState {
  step: FiltersStep | null;
  draft: SearchTaskFilters;
  applied: SearchTaskFilters;
  openedDirectly: boolean;
}

export type SearchFiltersAction =
  | { type: "open"; step: FiltersStep }
  | { type: "back" }
  | { type: "close" }
  | { type: "applyStep"; patch: Partial<SearchTaskFilters> }
  | { type: "applyAll" }
  | { type: "reset" }
  | { type: "patchAll"; patch: Partial<SearchTaskFilters> };

export function createSearchFiltersState(): SearchFiltersState {
  return {
    step: null,
    draft: createDefaultSearchFilters(),
    applied: createDefaultSearchFilters(),
    openedDirectly: false,
  };
}

export function searchFiltersReducer(
  state: SearchFiltersState,
  action: SearchFiltersAction,
): SearchFiltersState {
  switch (action.type) {
    case "open":
      return {
        step: action.step,
        draft: state.step === null ? state.applied : state.draft,
        applied: state.applied,
        openedDirectly: state.step === null,
      };
    case "back":
      return { ...state, step: "all", openedDirectly: false };
    case "close":
      return {
        ...state,
        step: null,
        draft: state.applied,
        openedDirectly: false,
      };
    case "applyStep": {
      const draft = canonicalizeSearchFilters({
        ...state.draft,
        ...action.patch,
      });

      if (state.openedDirectly) {
        return {
          ...state,
          step: null,
          draft,
          applied: draft,
          openedDirectly: false,
        };
      }

      return { ...state, step: "all", draft };
    }
    case "applyAll": {
      const applied = canonicalizeSearchFilters(state.draft);

      return {
        ...state,
        step: null,
        draft: applied,
        applied,
        openedDirectly: false,
      };
    }
    case "reset":
      return createSearchFiltersState();
    case "patchAll": {
      const draft = canonicalizeSearchFilters({
        ...state.draft,
        ...action.patch,
      });
      const applied = canonicalizeSearchFilters({
        ...state.applied,
        ...action.patch,
      });

      return { ...state, draft, applied };
    }
  }
}
