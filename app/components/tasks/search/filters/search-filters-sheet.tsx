import type { ReactElement } from "react";

import {
  BottomSheet,
  BottomSheetAction,
} from "~/components/ui/bottom-sheet";
import type { LabelResponse } from "~/lib/labels/types";
import { PRIORITY_OPTIONS } from "~/lib/tasks/priority";
import type { ProjectResponse } from "~/lib/projects/types";
import type {
  FiltersStep,
  SearchTaskFilters,
} from "~/lib/tasks/search-filters";
import {
  normalizeFilterDate,
  RECURRENCE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from "~/lib/tasks/search-filters";
import type { SearchFiltersState } from "~/lib/tasks/search-filters-reducer";

import { AllFiltersStep } from "./all-filters-step";
import { DateFilterStep } from "./date-filter-step";
import { LabelsFilterStep } from "./labels-filter-step";
import { MultiSelectFilterStep } from "./multi-select-filter-step";
import { ProjectFilterStep } from "./project-filter-step";
import { SingleSelectFilterStep } from "./single-select-filter-step";

export const FILTER_STEP_TITLES: Record<FiltersStep, string> = {
  all: "Фильтры",
  project: "Фильтр по проекту",
  labels: "Метки",
  priority: "Фильтр по приоритету",
  status: "Фильтр по статусу",
  recurrence: "Фильтр по регулярности",
  date: "Фильтр по дате",
};

export interface SearchFiltersSheetProps {
  state: SearchFiltersState;
  today: string;
  labels: LabelResponse[];
  isLabelsLoading: boolean;
  isLabelsError: boolean;
  onRetryLabels: () => void;
  projects: ProjectResponse[];
  isProjectsLoading: boolean;
  isProjectsError: boolean;
  onRetryProjects: () => void;
  onOpenStep: (step: FiltersStep) => void;
  onBack: () => void;
  onClose: () => void;
  onApplyStep: (patch: Partial<SearchTaskFilters>) => void;
  onApplyAll: () => void;
  onReset: () => void;
}

export function SearchFiltersSheet({
  state,
  today,
  labels,
  isLabelsLoading,
  isLabelsError,
  onRetryLabels,
  projects,
  isProjectsLoading,
  isProjectsError,
  onRetryProjects,
  onOpenStep,
  onBack,
  onClose,
  onApplyStep,
  onApplyAll,
  onReset,
}: SearchFiltersSheetProps): ReactElement | null {
  if (state.step === null) {
    return null;
  }

  let content: ReactElement;

  switch (state.step) {
    case "all":
      content = (
        <AllFiltersStep
          filters={state.draft}
          onApply={onApplyAll}
          onOpenStep={onOpenStep}
        />
      );
      break;
    case "project":
      content = (
        <ProjectFilterStep
          initialSelectedIds={state.draft.projectIds}
          isError={isProjectsError}
          isLoading={isProjectsLoading}
          onApply={(ids) => onApplyStep({ projectIds: ids })}
          onRetry={onRetryProjects}
          projects={projects}
        />
      );
      break;
    case "labels":
      content = (
        <LabelsFilterStep
          initialSelectedIds={state.draft.labelIds}
          isError={isLabelsError}
          isLoading={isLabelsLoading}
          labels={labels}
          onApply={(ids) => onApplyStep({ labelIds: ids })}
          onRetry={onRetryLabels}
        />
      );
      break;
    case "priority":
      content = (
        <MultiSelectFilterStep
          ariaLabel="Приоритет задачи"
          initialSelected={state.draft.priorities}
          onApply={(priorities) => onApplyStep({ priorities })}
          options={PRIORITY_OPTIONS}
        />
      );
      break;
    case "status":
      content = (
        <SingleSelectFilterStep
          ariaLabel="Статус задачи"
          initialValue={state.draft.status === "all" ? null : state.draft.status}
          onApply={(status) => onApplyStep({ status: status ?? "all" })}
          options={STATUS_FILTER_OPTIONS}
        />
      );
      break;
    case "recurrence":
      content = (
        <SingleSelectFilterStep
          ariaLabel="Регулярность задачи"
          initialValue={
            state.draft.recurrence === "all" ? null : state.draft.recurrence
          }
          onApply={(recurrence) =>
            onApplyStep({ recurrence: recurrence ?? "all" })
          }
          options={RECURRENCE_FILTER_OPTIONS}
        />
      );
      break;
    case "date":
      content = (
        <DateFilterStep
          initialDate={state.draft.date ?? today}
          onApply={(date) =>
            onApplyStep({ date: normalizeFilterDate(date, today) })
          }
          today={today}
        />
      );
      break;
  }

  return (
    <BottomSheet
      bodyClassName="p-[15px]"
      expanded
      footer={
        state.step === "all" ? (
          <BottomSheetAction onClick={onReset} tone="destructive">
            Сбросить фильтры
          </BottomSheetAction>
        ) : undefined
      }
      onBack={state.step !== "all" ? onBack : undefined}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={state.step !== null}
      panelAnimateLayout
      showCloseButton
      swipeToClose
      title={state.step ? FILTER_STEP_TITLES[state.step] : ""}
    >
      {content}
    </BottomSheet>
  );
}
