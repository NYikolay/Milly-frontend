import { useState } from "react";
import type { ReactElement } from "react";

import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import type { FilterChoiceOption } from "~/lib/tasks/search-filters";
import { toggleSelection } from "~/lib/tasks/search-filters";

import { FilterOptionRow } from "./filter-option-row";

export interface MultiSelectFilterStepProps<T extends string> {
  ariaLabel: string;
  options: readonly FilterChoiceOption<T>[];
  initialSelected: T[];
  onApply: (selected: T[]) => void;
}

export function MultiSelectFilterStep<T extends string>({
  ariaLabel,
  options,
  initialSelected,
  onApply,
}: MultiSelectFilterStepProps<T>): ReactElement {
  const [selected, setSelected] = useState<T[]>(initialSelected);

  return (
    <div className="flex flex-1 flex-col">
      <div aria-label={ariaLabel} className="flex flex-col" role="group">
        {options.map((option, index) => (
          <FilterOptionRow
            key={option.value}
            label={option.label}
            onClick={() =>
              setSelected((current) => toggleSelection(current, option.value))
            }
            role="checkbox"
            selected={selected.includes(option.value)}
            showSeparator={index < options.length - 1}
          />
        ))}
      </div>
      <div className="mt-auto pt-[15px]">
        <BottomSheetPrimaryAction onClick={() => onApply(selected)}>
          Применить
        </BottomSheetPrimaryAction>
      </div>
    </div>
  );
}
