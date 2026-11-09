import type { ReactElement } from "react";

import { Skeleton } from "~/components/ui/skeleton";

export function TaskRemindersSkeleton(): ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label="Загружаем напоминания"
      className="flex flex-1 flex-col gap-2"
      role="status"
    >
      <div className="flex flex-col gap-[5px] px-[15px] py-[15px]">
        <Skeleton className="h-[29px] w-[85%] rounded-[6px]" />
        <Skeleton className="h-[29px] w-[55%] rounded-[6px]" />
      </div>

      <div className="flex flex-col gap-[5px] px-[15px]">
        <Skeleton className="h-[13px] w-full rounded-[4px]" />
        <Skeleton className="h-[13px] w-2/3 rounded-[4px]" />
      </div>

      <Skeleton className="h-[58px] w-full rounded-[25px]" />

      <div className="px-[15px]">
        <Skeleton className="h-[13px] w-3/4 rounded-[4px]" />
      </div>
    </div>
  );
}
