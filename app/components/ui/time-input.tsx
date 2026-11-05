import type { ChangeEvent, ReactElement } from "react";

import { cn } from "~/lib/cn";

const SIZE_CLASSES = {
  default: "h-11 rounded-xl text-[17px]",
  compact: "h-12 rounded-[28px] text-[15px]",
} as const;

export interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  size?: keyof typeof SIZE_CLASSES;
}

export function TimeInput({
  value,
  onChange,
  ariaLabel = "Время",
  className,
  size = "default",
}: TimeInputProps): ReactElement {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <input
      aria-label={ariaLabel}
      className={cn(
        "w-[114px] border-0 bg-app-track p-0 text-center font-semibold text-app-accent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
        SIZE_CLASSES[size],
        className,
      )}
      onChange={handleChange}
      step={60}
      type="time"
      value={value}
    />
  );
}
