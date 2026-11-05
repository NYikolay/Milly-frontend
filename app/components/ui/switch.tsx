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
        "relative inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-full active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "relative block h-7 w-12 rounded-full transition-colors duration-[180ms]",
          checked ? "bg-app-accent" : "bg-app-track",
        )}
      >
        <motion.span
          animate={{ x: checked ? 23 : 3 }}
          aria-hidden="true"
          className="absolute left-0 top-[3px] size-[22px] rounded-full bg-white shadow-sm"
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  );
}
