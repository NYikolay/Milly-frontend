import type { ReactElement } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/cn";

interface TaskGroupSkeletonProps {
  titleWidth: string;
  rows: number;
}

function TaskGroupSkeleton({
  titleWidth,
  rows,
}: TaskGroupSkeletonProps): ReactElement {
  return (
    <section className="flex flex-col gap-2 pt-4">
      <Skeleton
        className={cn("mx-[15px] h-[18px] rounded-[6px]", titleWidth)}
      />
      <div className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]">
        {Array.from({ length: rows }, (_, index) => (
          <div
            className="flex min-h-[67px] items-center gap-[12px]"
            key={index}
          >
            <Skeleton className="size-[35px] shrink-0 rounded-full" />
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-[12px] self-stretch",
                index < rows - 1 && "border-b border-app-stroke",
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

export function TodayTasksSkeleton(): ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label="Загружаем задачи"
      className="flex flex-1 flex-col gap-2"
      role="status"
    >
      <div className="pb-[15px] pt-[15px]">
        <Skeleton className="h-[50px] rounded-[36px]" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-[5px] px-[15px]">
          <Skeleton className="h-[29px] w-2/3 rounded-[8px]" />
          <Skeleton className="h-[18px] w-1/3 rounded-[6px]" />
        </div>
        <div className="flex w-full flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]">
          <div className="flex items-start gap-[10px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <Skeleton className="h-[24px] w-1/2 rounded-[8px]" />
              <Skeleton className="h-[18px] w-2/3 rounded-[6px]" />
            </div>
            <Skeleton className="size-[38px] shrink-0 rounded-full" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
      </div>

      <TaskGroupSkeleton rows={3} titleWidth="w-[72px]" />
      <TaskGroupSkeleton rows={2} titleWidth="w-[86px]" />
    </div>
  );
}
