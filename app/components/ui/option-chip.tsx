import type { ReactElement, ReactNode } from "react";

import { cn } from "~/lib/cn";

export interface OptionChipProps {
  icon: ReactNode;
  label?: string;
  endIcon?: ReactNode;
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}

export function OptionChip({
  icon,
  label,
  endIcon,
  active = false,
  onClick,
  ariaLabel,
  className,
}: OptionChipProps): ReactElement {
  return (
    <button
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-[45px] shrink-0 items-center gap-[10px] whitespace-nowrap rounded-[50px] border border-app-stroke bg-app-card px-[10px] text-[13px] text-app-text transition-colors active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent",
        active && "border-app-accent text-app-accent",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label ? (
        <span className="max-w-[200px] truncate">{label}</span>
      ) : null}
      {endIcon}
    </button>
  );
}
