import type { ReactElement } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/cn";

const SKELETON_ROWS = 3;

export function SearchTasksSkeleton(): ReactElement {
  return (
    <section
      aria-busy="true"
      aria-label="Загружаем задачи"
      className="flex flex-col gap-2 pt-4"
      role="status"
    >
      <Skeleton className="mx-[15px] h-[18px] w-1/2 rounded-[6px]" />
      <div className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div
            className="flex min-h-[67px] items-center gap-[12px]"
            key={index}
          >
            <Skeleton className="size-[35px] shrink-0 rounded-full" />
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-[12px] self-stretch",
                index < SKELETON_ROWS - 1 && "border-b border-app-stroke",
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                <Skeleton className="h-[15px] w-2/3 rounded-[5px]" />
                <div className="flex min-w-0 items-center gap-[5px]">
                  <Skeleton className="size-[15px] shrink-0 rounded-[4px]" />
                  <Skeleton className="h-[12px] w-1/3 rounded-[4px]" />
                  <Skeleton className="h-[12px] w-[36px] shrink-0 rounded-[4px]" />
                </div>
              </div>
              <Skeleton className="size-6 shrink-0 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
