import type { ReactElement } from "react";

import checkIcon from "~/assets/icons/check.svg";
import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";
import { PRIORITY_OPTIONS } from "~/lib/tasks/priority";
import type { Priority } from "~/lib/tasks/types";

export interface TaskPriorityViewProps {
  priority: Priority;
  onSelect: (priority: Priority) => void;
}

export function TaskPriorityView({
  priority,
  onSelect,
}: TaskPriorityViewProps): ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="px-[15px] py-[15px]">
        <h1 className="break-words text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">
          Приоритет задачи
        </h1>
      </div>

      <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
        Выберите приоритет задачи по Матрице Эйзенхауэра
      </p>

      <div
        aria-label="Приоритет задачи"
        className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]"
        role="radiogroup"
      >
        {PRIORITY_OPTIONS.map((option, index) => {
          const isSelected = option.value === priority;
          const isLast = index === PRIORITY_OPTIONS.length - 1;

          return (
            <button
              aria-checked={isSelected}
              className="flex h-[47px] w-full items-center gap-[11px] text-left text-[15px] leading-[1.3] text-app-text transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
              key={option.value}
              onClick={() => onSelect(option.value)}
              role="radio"
              type="button"
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                {isSelected ? (
                  <AssetIcon
                    className="size-6 text-app-accent"
                    src={checkIcon}
                  />
                ) : null}
              </span>
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

      <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
        Матрица Эйзенхауэра - это простой и полезный метод тайм-менеджмента. Он
        помогает расставить приоритеты и разделить дела по двум главным
        признакам: важность и срочность.
      </p>
    </div>
  );
}
