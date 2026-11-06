import type { ReactElement } from "react";

import { SegmentedControl } from "~/components/ui/segmented-control";

import { TodayHeader } from "./today-header";
import { TODAY_SEGMENTS } from "./today-tasks-view";

export interface TodayTasksErrorProps {
  dateLabel: string;
  onRetry: () => void;
}

export function TodayTasksError({
  dateLabel,
  onRetry,
}: TodayTasksErrorProps): ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="pb-[15px] pt-[15px]">
        <SegmentedControl
          ariaLabel="Разделы задач"
          options={TODAY_SEGMENTS}
          value="today"
        />
      </div>
      <div className="flex flex-col gap-2">
        <TodayHeader dateLabel={dateLabel} title="Задачи на сегодня" />
        <div className="flex flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]">
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
