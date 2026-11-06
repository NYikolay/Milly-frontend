import type { ReactElement } from "react";

import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";

export interface SegmentedControlOption {
  id: string;
  label: string;
  iconSrc: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  ariaLabel: string;
  options: readonly SegmentedControlOption[];
  value: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function SegmentedControl({
  ariaLabel,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps): ReactElement {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "flex h-[50px] items-stretch rounded-[36px] bg-app-card p-[5px]",
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.id === value;

        return (
          <button
            key={option.id}
            aria-disabled={option.disabled || undefined}
            aria-selected={active}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-[2px] rounded-[25px] text-[13px] leading-[1.4] transition-colors",
              active ? "bg-app-track text-app-accent" : "text-app-text",
            )}
            onClick={() => {
              if (!option.disabled) {
                onChange?.(option.id);
              }
            }}
            role="tab"
            tabIndex={active && !option.disabled ? 0 : -1}
            type="button"
          >
            <AssetIcon
              className="size-5 max-[359px]:hidden"
              src={option.iconSrc}
            />
            <span className="min-w-0 truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
