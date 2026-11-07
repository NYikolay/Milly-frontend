import type { ReactElement } from "react";

import checkIcon from "~/assets/icons/check.svg";
import { AssetIcon } from "~/components/ui/asset-icon";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { cn } from "~/lib/cn";
import { PRIORITY_OPTIONS } from "~/lib/tasks/priority";
import type { Priority } from "~/lib/tasks/types";

export interface PriorityStepProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  onApply: (priority: Priority) => void;
}

export function PriorityStep({
  value,
  onChange,
  onApply,
}: PriorityStepProps): ReactElement {
  return (
    <div className="flex flex-1 flex-col">
      <div
        aria-label="Приоритет задачи"
        className="flex flex-col"
        role="radiogroup"
      >
        {PRIORITY_OPTIONS.map((option, index) => {
          const isSelected = option.value === value;
          const isLast = index === PRIORITY_OPTIONS.length - 1;

          return (
            <button
              aria-checked={isSelected}
              className="flex h-[50px] w-full items-center gap-[15px] text-left text-[15px] text-app-text transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
              key={option.value}
              onClick={() => onChange(option.value)}
              role="radio"
              type="button"
            >
              {isSelected ? (
                <AssetIcon className="size-6 text-app-accent" src={checkIcon} />
              ) : (
                <span aria-hidden="true" className="size-6 shrink-0" />
              )}
              <span
                className={cn(
                  "flex h-full min-w-0 flex-1 items-center",
                  !isLast && "border-b border-app-stroke",
                )}
              >
                <span className="truncate">{option.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto pt-[15px]">
        <BottomSheetPrimaryAction onClick={() => onApply(value)}>
          Применить
        </BottomSheetPrimaryAction>
      </div>
    </div>
  );
}
