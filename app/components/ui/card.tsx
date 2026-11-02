import type { HTMLAttributes } from "react";

import { cn } from "~/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-tg-separator/60 bg-tg-section-bg p-4",
        className,
      )}
      {...props}
    />
  );
}
