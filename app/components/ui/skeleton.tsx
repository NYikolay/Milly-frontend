import type { ReactElement } from "react";

import { cn } from "~/lib/cn";

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn("skeleton-shimmer block", className)}
    />
  );
}
