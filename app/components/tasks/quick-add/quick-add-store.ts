import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";

import { pruneMissingLabelIds } from "~/lib/labels/labels-selection";
import { formatZonedToday } from "~/lib/tasks/date-time";
import {
  createQuickTaskDefaults,
  type QuickTaskDraft,
} from "~/lib/tasks/quick-task-schema";

import type { QuickAddStep } from "./quick-add-step";

export interface QuickAddStoreOptions {
  now: Date;
  timeZone: string;
  clock?: () => Date;
}

export interface QuickAddStoreState {
  draft: QuickTaskDraft;
  activeStep: QuickAddStep | null;
  stepDraft: QuickTaskDraft | null;
  remindersAmountInput: string;
  now: Date;
  error: string | null;
  patchDraft: (patch: Partial<QuickTaskDraft>) => void;
  patchStepDraft: (patch: Partial<QuickTaskDraft>) => void;
  pruneLabelIds: (validIds: number[]) => void;
  openStep: (step: QuickAddStep) => void;
  closeStep: () => void;
  applyStep: (patch?: Partial<QuickTaskDraft>) => void;
  resetDraft: () => void;
  setError: (error: string | null) => void;
  setRemindersAmountInput: (value: string) => void;
}

export function createQuickAddStore(
  options: QuickAddStoreOptions,
): StoreApi<QuickAddStoreState> {
  const clock = options.clock ?? (() => new Date());
  const { timeZone } = options;

  return createStore<QuickAddStoreState>((set) => ({
    draft: createQuickTaskDefaults(options.now, timeZone),
    activeStep: null,
    stepDraft: null,
    remindersAmountInput: "",
    now: options.now,
    error: null,
    patchDraft: (patch) => {
      set((state) => ({ draft: { ...state.draft, ...patch } }));
    },
    patchStepDraft: (patch) => {
      set((state) => {
        if (state.stepDraft === null) {
          return state;
        }

        return { stepDraft: { ...state.stepDraft, ...patch } };
      });
    },
    pruneLabelIds: (validIds) => {
      const labels = validIds.map((id) => ({ id }));

      set((state) => ({
        draft: {
          ...state.draft,
          labelIds: pruneMissingLabelIds(state.draft.labelIds, labels),
        },
        stepDraft:
          state.stepDraft === null
            ? null
            : {
                ...state.stepDraft,
                labelIds: pruneMissingLabelIds(
                  state.stepDraft.labelIds,
                  labels,
                ),
              },
      }));
    },
    openStep: (step) => {
      set((state) => {
        const stepDraft = {
          ...state.draft,
          labelIds: [...state.draft.labelIds],
        };

        if (step === "due") {
          const now = clock();
          const today = formatZonedToday(now, timeZone);

          return {
            activeStep: step,
            now,
            remindersAmountInput: "",
            stepDraft: {
              ...stepDraft,
              dueDate: stepDraft.dueDate < today ? today : stepDraft.dueDate,
            },
          };
        }

        return {
          activeStep: step,
          remindersAmountInput:
            step === "reminders"
              ? String(state.draft.beforeDueAmount)
              : "",
          stepDraft,
        };
      });
    },
    closeStep: () => {
      set({
        activeStep: null,
        stepDraft: null,
        remindersAmountInput: "",
      });
    },
    applyStep: (patch) => {
      set((state) => {
        if (state.stepDraft === null) {
          return state;
        }

        const draft = { ...state.stepDraft, ...patch };

        return {
          draft: { ...draft, labelIds: [...draft.labelIds] },
          activeStep: null,
          stepDraft: null,
          remindersAmountInput: "",
        };
      });
    },
    resetDraft: () => {
      const now = clock();

      set({
        draft: createQuickTaskDefaults(now, timeZone),
        now,
        activeStep: null,
        stepDraft: null,
        remindersAmountInput: "",
        error: null,
      });
    },
    setError: (error) => {
      set({ error });
    },
    setRemindersAmountInput: (value) => {
      set({ remindersAmountInput: value });
    },
  }));
}
