import type { ReactElement } from "react";

import { TaskSegments } from "~/components/tasks/task-segments";
import type { TaskSegmentId } from "~/components/tasks/task-segments";

import { TodayHeader } from "./today-header";

export interface TodayTasksErrorProps {
  dateLabel: string;
  onRetry: () => void;
  onSelectSegment: (id: TaskSegmentId) => void;
}

export function TodayTasksError({
  dateLabel,
  onRetry,
  onSelectSegment,
}: TodayTasksErrorProps): ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="pb-[15px] pt-[15px]">
        <TaskSegments onSelect={onSelectSegment} value="today" />
      </div>
      <div className="flex flex-col gap-2">
        <TodayHeader dateLabel={dateLabel} title="Задачи на сегодня" />
        <div
          className="flex flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]"
          role="alert"
        >
          <p className="text-[17px] font-semibold leading-[1.4] text-app-text">
            Не удалось загрузить задачи
          </p>
          <button
            className="self-start text-[15px] font-semibold text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
            onClick={onRetry}
            type="button"
          >
            Повторить
          </button>
        </div>
      </div>
    </div>
  );
}
