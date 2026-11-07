import type { ReactElement } from "react";

import adjustmentsHorizontalIcon from "~/assets/icons/adjustments-horizontal.svg?no-inline";
import calendarIcon from "~/assets/icons/calendar.svg?no-inline";
import chevronDownIcon from "~/assets/icons/chevron-down.svg?no-inline";
import { AssetIcon } from "~/components/ui/asset-icon";
import { OptionChip } from "~/components/ui/option-chip";

export interface SearchFilterBarProps {
  activeFilterCount: number;
  activeChip: "priority" | "project" | "recurrence" | null;
}

const noop = () => {};

export function SearchFilterBar({
  activeFilterCount,
  activeChip,
}: SearchFilterBarProps): ReactElement {
  const allFiltersLabel =
    activeFilterCount > 0
      ? `Все фильтры, активно: ${activeFilterCount}`
      : "Все фильтры";

  return (
    <div className="-mx-4 flex shrink-0 gap-[5px] overflow-x-auto pl-4 pt-[5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="relative">
        <OptionChip
          active={activeFilterCount > 0}
          ariaLabel={allFiltersLabel}
          disabled
          icon={
            <AssetIcon className="size-6" src={adjustmentsHorizontalIcon} />
          }
          onClick={noop}
        />
        {activeFilterCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-[4px] top-[5px] flex size-[10px] items-center justify-center rounded-full bg-app-accent text-[6px] font-semibold leading-none text-white"
          >
            {activeFilterCount}
          </span>
        ) : null}
      </div>
      <OptionChip
        ariaLabel="Фильтр по дате"
        disabled
        icon={<AssetIcon className="size-6" src={calendarIcon} />}
        onClick={noop}
      />
      <OptionChip
        active={activeChip === "priority"}
        ariaLabel="Фильтр по приоритету"
        disabled
        endIcon={<AssetIcon className="size-4" src={chevronDownIcon} />}
        label="По приоритету"
        onClick={noop}
      />
      <OptionChip
        active={activeChip === "project"}
        ariaLabel="Фильтр по проекту"
        disabled
        endIcon={<AssetIcon className="size-4" src={chevronDownIcon} />}
        label="Проект"
        onClick={noop}
      />
      <OptionChip
        active={activeChip === "recurrence"}
        ariaLabel="Фильтр по периодичности"
        disabled
        endIcon={<AssetIcon className="size-4" src={chevronDownIcon} />}
        label="Периодичность"
        onClick={noop}
      />
    </div>
  );
}
