import type { ChangeEvent, ReactElement } from "react";

import searchIcon from "~/assets/icons/search.svg?no-inline";
import { cn } from "~/lib/cn";

import { AssetIcon } from "./asset-icon";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  variant?: "track" | "stroke";
  className?: string;
}

export function SearchField({
  value,
  onChange,
  ariaLabel,
  placeholder = "Поиск",
  variant = "track",
  className,
}: SearchFieldProps): ReactElement {
  const surfaceClassName =
    variant === "stroke" ? "bg-app-stroke" : "bg-app-track";

  return (
    <div
      className={cn(
        "flex h-[45px] w-full items-center gap-[10px] rounded-[25px] px-[15px] focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-app-accent",
        surfaceClassName,
        className,
      )}
    >
      <AssetIcon
        className="size-5 shrink-0 text-app-text-secondary"
        src={searchIcon}
      />
      <input
        aria-label={ariaLabel}
        className="min-w-0 flex-1 appearance-none bg-transparent text-[15px] leading-[1.3] text-app-text outline-none placeholder:text-app-text-secondary [&::-webkit-search-cancel-button]:appearance-none"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </div>
  );
}
