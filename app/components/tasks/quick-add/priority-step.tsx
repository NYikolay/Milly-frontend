import { useState } from "react";
import type { ReactElement } from "react";

import checkIcon from "~/assets/icons/check.svg";
import { AssetIcon } from "~/components/ui/asset-icon";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { PRIORITY_OPTIONS } from "~/lib/tasks/priority";
import type { Priority } from "~/lib/tasks/types";

export interface PriorityStepProps {
  value: Priority;
  onApply: (priority: Priority) => void;
}

export function PriorityStep({
  value,
  onApply,
}: PriorityStepProps): ReactElement {
  const [selected, setSelected] = useState<Priority>(value);

  return (
    <div className="flex flex-col">
      <div
        aria-label="Приоритет задачи"
        className="flex flex-col"
        role="radiogroup"
      >
        {PRIORITY_OPTIONS.map((option) => {
          const isSelected = option.value === selected;

          return (
            <button
              aria-checked={isSelected}
              className="flex h-[50px] w-full items-center gap-[10px] border-b border-app-stroke text-left text-[15px] text-app-text transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
              key={option.value}
              onClick={() => setSelected(option.value)}
              role="radio"
              type="button"
            >
              {isSelected ? (
                <AssetIcon className="size-6 text-app-accent" src={checkIcon} />
              ) : (
                <span aria-hidden="true" className="size-6 shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
      <BottomSheetPrimaryAction
        className="mt-[15px]"
        onClick={() => onApply(selected)}
      >
        Применить
      </BottomSheetPrimaryAction>
    </div>
  );
}
