import type { ReactElement } from "react";
import { motion } from "motion/react";

import { cn } from "~/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
}: SwitchProps): ReactElement {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-[180ms] active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-app-accent" : "bg-app-track",
        className,
      )}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <motion.span
        animate={{ x: checked ? 23 : 3 }}
        aria-hidden="true"
        className="size-[22px] rounded-full bg-white shadow-sm"
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}
