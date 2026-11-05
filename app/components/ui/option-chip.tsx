import type { ReactElement, ReactNode, Ref } from "react";

import { cn } from "~/lib/cn";

export interface OptionChipProps {
  icon?: ReactNode;
  iconGap?: "tight" | "default";
  label?: string;
  endIcon?: ReactNode;
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}

export function OptionChip({
  icon,
  iconGap = "default",
  label,
  endIcon,
  active = false,
  onClick,
  ariaLabel,
  className,
  buttonRef,
}: OptionChipProps): ReactElement {
  return (
    <button
      ref={buttonRef}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-[45px] max-w-[200px] shrink-0 items-center whitespace-nowrap rounded-[50px] border bg-app-card px-[10px] text-[13px] transition-colors active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
        iconGap === "tight" ? "gap-[2px]" : "gap-[5px]",
        active
          ? "border-app-accent text-app-accent"
          : "border-app-stroke text-app-text",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label ? <span className="min-w-0 truncate">{label}</span> : null}
      {endIcon}
    </button>
  );
}
