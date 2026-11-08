import type { ReactElement } from "react";

import adjustmentsHorizontalIcon from "~/assets/icons/adjustments-horizontal.svg?no-inline";
import calendarIcon from "~/assets/icons/calendar.svg?no-inline";
import chevronDownIcon from "~/assets/icons/chevron-down.svg?no-inline";
import { AssetIcon } from "~/components/ui/asset-icon";
import { OptionChip } from "~/components/ui/option-chip";

export interface SearchFilterBarProps {
  activeFilterCount: number;
  activeDate: boolean;
  activePriority: boolean;
  activeProject: boolean;
  activeRecurrence: boolean;
  onOpenAll: () => void;
  onOpenDate: () => void;
  onOpenPriority: () => void;
  onOpenProject: () => void;
  onOpenRecurrence: () => void;
}

export function SearchFilterBar({
  activeFilterCount,
  activeDate,
  activePriority,
  activeProject,
  activeRecurrence,
  onOpenAll,
  onOpenDate,
  onOpenPriority,
  onOpenProject,
  onOpenRecurrence,
}: SearchFilterBarProps): ReactElement {
  const allFiltersLabel =
    activeFilterCount > 0
      ? `Все фильтры, активно: ${activeFilterCount}`
      : "Все фильтры";

  return (
    <div className="flex shrink-0 gap-[5px] overflow-x-auto pt-[5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="relative">
        <OptionChip
          active={activeFilterCount > 0}
          ariaLabel={allFiltersLabel}
          icon={
            <AssetIcon className="size-6" src={adjustmentsHorizontalIcon} />
          }
          onClick={onOpenAll}
        />
        {activeFilterCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-px -top-px flex size-[14px] items-center justify-center rounded-full bg-app-accent text-[9px] font-semibold leading-none text-white"
          >
            {activeFilterCount}
          </span>
        ) : null}
      </div>
      <OptionChip
        active={activeDate}
        ariaLabel="Фильтр по дате"
        icon={<AssetIcon className="size-6" src={calendarIcon} />}
        onClick={onOpenDate}
      />
      <OptionChip
        active={activePriority}
        ariaLabel="Фильтр по приоритету"
        endIcon={<AssetIcon className="size-4" src={chevronDownIcon} />}
        label="По приоритету"
        onClick={onOpenPriority}
      />
      <OptionChip
        active={activeProject}
        ariaLabel="Фильтр по проекту"
        endIcon={<AssetIcon className="size-4" src={chevronDownIcon} />}
        label="Проект"
        onClick={onOpenProject}
      />
      <OptionChip
        active={activeRecurrence}
        ariaLabel="Фильтр по периодичности"
        endIcon={<AssetIcon className="size-4" src={chevronDownIcon} />}
        label="Периодичность"
        onClick={onOpenRecurrence}
      />
    </div>
  );
}
