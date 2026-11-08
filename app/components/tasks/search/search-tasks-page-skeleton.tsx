import type { ReactElement } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/cn";

import { SearchTasksSkeleton } from "./search-tasks-skeleton";

const FILTER_CHIP_WIDTHS = ["w-[118px]", "w-[86px]", "w-[132px]"];

export function SearchTasksPageSkeleton(): ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div aria-hidden="true" className="flex flex-col gap-2">
        <div className="pb-[15px] pt-[15px]">
          <Skeleton className="h-[50px] rounded-[36px]" />
        </div>

        <div className="flex flex-col gap-[5px] px-[15px]">
          <Skeleton className="h-[29px] w-1/2 rounded-[8px]" />
          <Skeleton className="h-[18px] w-2/3 rounded-[6px]" />
        </div>

        <Skeleton className="h-[45px] w-full rounded-[25px]" />

        <div className="flex shrink-0 gap-[5px] overflow-x-auto pt-[5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Skeleton className="size-[45px] shrink-0 rounded-[50px]" />
          <Skeleton className="size-[45px] shrink-0 rounded-[50px]" />
          {FILTER_CHIP_WIDTHS.map((width) => (
            <Skeleton
              className={cn("h-[45px] shrink-0 rounded-[50px]", width)}
              key={width}
            />
          ))}
        </div>
      </div>

      <SearchTasksSkeleton />
    </div>
  );
}
