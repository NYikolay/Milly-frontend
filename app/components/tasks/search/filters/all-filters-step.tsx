import type { ReactElement } from "react";

import chevronRightIcon from "~/assets/icons/chevron-right.svg?no-inline";
import flagIcon from "~/assets/icons/flag.svg?no-inline";
import folderIcon from "~/assets/icons/folder.svg?no-inline";
import repeatIcon from "~/assets/icons/repeat.svg?no-inline";
import squareCheckIcon from "~/assets/icons/square-check.svg?no-inline";
import tagIcon from "~/assets/icons/tag-raw.svg?no-inline";
import { AssetIcon } from "~/components/ui/asset-icon";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { cn } from "~/lib/cn";
import type {
  FiltersStep,
  SearchTaskFilters,
} from "~/lib/tasks/search-filters";
import {
  isLabelsFilterActive,
  isPriorityFilterActive,
  isProjectFilterActive,
  isRecurrenceFilterActive,
  isStatusFilterActive,
} from "~/lib/tasks/search-filters";

export interface AllFiltersStepProps {
  filters: SearchTaskFilters;
  onOpenStep: (step: FiltersStep) => void;
  onApply: () => void;
}

const ROWS = [
  { step: "project", label: "Проект", icon: folderIcon, active: isProjectFilterActive },
  { step: "labels", label: "Метки", icon: tagIcon, active: isLabelsFilterActive },
  { step: "priority", label: "Приоритет", icon: flagIcon, active: isPriorityFilterActive },
  { step: "status", label: "Статус", icon: squareCheckIcon, active: isStatusFilterActive },
  { step: "recurrence", label: "Регулярность", icon: repeatIcon, active: isRecurrenceFilterActive },
] as const;

export function AllFiltersStep({
  filters,
  onOpenStep,
  onApply,
}: AllFiltersStepProps): ReactElement {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col">
        {ROWS.map((row, index) => {
          const active = row.active(filters);

          return (
            <button
              key={row.step}
              aria-haspopup="dialog"
              aria-label={active ? `${row.label}, активно` : row.label}
              className={cn(
                "flex h-[50px] w-full items-center gap-[5px] border-b border-app-stroke text-left text-[15px] leading-[1.3] transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
                active ? "text-app-accent" : "text-app-text",
                index === ROWS.length - 1 && "border-b-0",
              )}
              onClick={() => onOpenStep(row.step)}
              type="button"
            >
              <AssetIcon className="size-[18px]" src={row.icon} />
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              <AssetIcon
                className="size-6 text-app-text-secondary"
                src={chevronRightIcon}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-auto pt-[15px]">
        <BottomSheetPrimaryAction onClick={onApply}>
          Применить
        </BottomSheetPrimaryAction>
      </div>
    </div>
  );
}
