import type { ReactElement } from "react";

import { Skeleton } from "~/components/ui/skeleton";

export function TaskLabelsSkeleton(): ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label="Загружаем метки"
      className="flex flex-1 flex-col gap-2"
      role="status"
    >
      <div className="px-[15px] py-[15px]">
        <Skeleton className="h-[29px] w-[60%] rounded-[6px]" />
      </div>

      <div className="px-[15px]">
        <Skeleton className="h-[13px] w-[90%] rounded-[4px]" />
      </div>

      <Skeleton className="h-[50px] w-full rounded-[25px]" />
      <Skeleton className="h-[45px] w-full rounded-[25px]" />
      <Skeleton className="h-[134px] w-full rounded-[25px]" />

      <div className="flex flex-col gap-[5px] px-[15px]">
        <Skeleton className="h-[13px] w-full rounded-[4px]" />
        <Skeleton className="h-[13px] w-2/3 rounded-[4px]" />
      </div>
    </div>
  );
}
