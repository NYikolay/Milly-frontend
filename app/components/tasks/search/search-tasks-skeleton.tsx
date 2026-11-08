import type { ReactElement } from "react";

import { TaskRowsSkeleton } from "~/components/tasks/task-rows-skeleton";
import { Skeleton } from "~/components/ui/skeleton";

export function SearchTasksSkeleton(): ReactElement {
  return (
    <section
      aria-busy="true"
      aria-label="Загружаем задачи"
      className="flex flex-col gap-2 pt-4"
      role="status"
    >
      <Skeleton className="mx-[15px] h-[18px] w-1/2 rounded-[6px]" />
      <TaskRowsSkeleton rows={3} />
    </section>
  );
}
