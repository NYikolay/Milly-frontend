import type { CSSProperties, ReactElement, ReactNode } from "react";

import { cn } from "~/lib/cn";

export interface FilterOptionRowProps {
  selected: boolean;
  role: "checkbox" | "radio";
  label: string;
  onClick: () => void;
  leading?: ReactNode;
  heightClassName?: string;
  showSeparator?: boolean;
  labelStyle?: CSSProperties;
}

export function FilterOptionRow({
  selected,
  role,
  label,
  onClick,
  leading,
  heightClassName,
  showSeparator,
  labelStyle,
}: FilterOptionRowProps): ReactElement {
  return (
    <button
      aria-checked={selected}
      className={cn(
        "flex w-full items-center gap-[15px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
        heightClassName ?? "h-[50px]",
      )}
      onClick={onClick}
      role={role}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-app-accent" : "border-app-text-secondary/55",
        )}
      >
        {selected ? (
          <span className="size-[15px] rounded-full bg-app-accent" />
        ) : null}
      </span>
      <span
        className={cn(
          "flex h-full min-w-0 flex-1 items-center gap-[5px]",
          showSeparator && "border-b border-app-stroke",
        )}
      >
        {leading}
        <span
          className="min-w-0 flex-1 truncate text-[15px] leading-[1.3]"
          style={labelStyle}
        >
          {label}
        </span>
      </span>
    </button>
  );
}
