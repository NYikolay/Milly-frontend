import type { ReactElement } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/cn";

const ROW_COUNT = 5;

interface DetailRowSkeletonProps {
  isLast: boolean;
}

function DetailRowSkeleton({
  isLast,
}: DetailRowSkeletonProps): ReactElement {
  return (
    <div
      className={cn(
        "flex h-[47px] items-center gap-[11px]",
        !isLast && "border-b border-app-stroke",
      )}
    >
      <Skeleton className="size-[18px] shrink-0 rounded-[4px]" />
      <Skeleton className="h-[15px] w-[72px] shrink-0 rounded-[5px]" />
      <div className="flex min-w-0 flex-1 justify-end">
        <Skeleton className="h-[13px] w-[88px] rounded-[4px]" />
      </div>
      <Skeleton className="size-6 shrink-0 rounded-full" />
    </div>
  );
}

export function TaskDetailSkeleton(): ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label="Загружаем задачу"
      className="flex flex-1 flex-col gap-2"
      role="status"
    >
      <div className="flex flex-col gap-[5px] px-[15px] py-[15px]">
        <Skeleton className="h-[29px] w-[85%] rounded-[6px]" />
        <Skeleton className="h-[29px] w-[55%] rounded-[6px]" />
      </div>

      <div className="flex flex-col gap-[5px] px-[15px] pb-[15px]">
        <Skeleton className="h-[18px] w-[74px] rounded-[5px]" />
        <Skeleton className="h-[13px] w-full rounded-[4px]" />
        <Skeleton className="h-[13px] w-2/3 rounded-[4px]" />
      </div>

      <div className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <DetailRowSkeleton isLast={index === ROW_COUNT - 1} key={index} />
        ))}
      </div>

      <div className="px-[15px]">
        <Skeleton className="h-[13px] w-[160px] rounded-[4px]" />
      </div>

      <div className="flex flex-col gap-[10px] pt-[15px]">
        <Skeleton className="h-[50px] w-full rounded-[25px]" />
        <Skeleton className="h-[50px] w-full rounded-[25px]" />
      </div>
    </div>
  );
}
