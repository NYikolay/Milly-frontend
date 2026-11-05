import type { ChangeEvent, ReactElement } from "react";

import { cn } from "~/lib/cn";

export interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function TimeInput({
  value,
  onChange,
  ariaLabel = "Время",
  className,
}: TimeInputProps): ReactElement {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <input
      aria-label={ariaLabel}
      className={cn(
        "h-11 w-[114px] rounded-xl border-0 bg-app-track p-0 text-center text-[17px] font-semibold text-app-accent outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
        className,
      )}
      onChange={handleChange}
      step={60}
      type="time"
      value={value}
    />
  );
}
