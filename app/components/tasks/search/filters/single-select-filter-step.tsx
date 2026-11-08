import { useState } from "react";
import type { ReactElement } from "react";

import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import type { FilterChoiceOption } from "~/lib/tasks/search-filters";

import { FilterOptionRow } from "./filter-option-row";

export interface SingleSelectFilterStepProps<T extends string> {
  ariaLabel: string;
  options: readonly FilterChoiceOption<T>[];
  initialValue: T | null;
  onApply: (value: T | null) => void;
}

export function SingleSelectFilterStep<T extends string>({
  ariaLabel,
  options,
  initialValue,
  onApply,
}: SingleSelectFilterStepProps<T>): ReactElement {
  const [value, setValue] = useState<T | null>(initialValue);

  return (
    <div className="flex flex-1 flex-col">
      <div aria-label={ariaLabel} className="flex flex-col" role="radiogroup">
        {options.map((option, index) => (
          <FilterOptionRow
            key={option.value}
            label={option.label}
            onClick={() =>
              setValue((current) =>
                current === option.value ? null : option.value,
              )
            }
            role="radio"
            selected={value === option.value}
            showSeparator={index < options.length - 1}
          />
        ))}
      </div>
      <div className="mt-auto pt-[15px]">
        <BottomSheetPrimaryAction onClick={() => onApply(value)}>
          Применить
        </BottomSheetPrimaryAction>
      </div>
    </div>
  );
}
