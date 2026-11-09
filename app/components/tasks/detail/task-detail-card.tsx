import type { ReactElement, ReactNode } from "react";

import bellIcon from "~/assets/icons/bell.svg?no-inline";
import calendarIcon from "~/assets/icons/calendar.svg?no-inline";
import chevronRightIcon from "~/assets/icons/chevron-right.svg?no-inline";
import flagIcon from "~/assets/icons/flag.svg?no-inline";
import folderIcon from "~/assets/icons/folder.svg?no-inline";
import tagRawIcon from "~/assets/icons/tag.svg?no-inline";
import tagIcon from "~/assets/icons/tag-raw.svg?no-inline";

import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";
import type { LabelResponse } from "~/lib/labels/types";
import type { ProjectResponse } from "~/lib/projects/types";
import {
  findTaskLabelColor,
  formatTaskDueValue,
  formatTaskLabelsSummary,
  formatTaskPriority,
  formatTaskReminderSummary,
} from "~/lib/tasks/task-detail";
import { isTaskOverdue } from "~/lib/tasks/task-overdue";
import type { TaskResponse } from "~/lib/tasks/types";

export interface TaskDetailCardProps {
  task: TaskResponse;
  project?: ProjectResponse;
  labels: readonly LabelResponse[];
  timeZone: string;
  now: Date;
  isDueDateWarning?: boolean;
}

interface DetailRowProps {
  iconSrc: string;
  label: string;
  value: ReactNode;
  valueClassName?: string;
  isLast: boolean;
}

function DetailRow({
  iconSrc,
  label,
  value,
  valueClassName,
  isLast,
}: DetailRowProps): ReactElement {
  return (
    <div
      className={cn(
        "flex h-[47px] items-center gap-[11px]",
        !isLast && "border-b border-app-stroke",
      )}
    >
      <span className="flex shrink-0 items-center gap-[5px]">
        <AssetIcon
          className="size-[18px] shrink-0 text-app-text"
          src={iconSrc}
        />
        <span className="text-[15px] leading-[1.3] text-app-text">
          {label}
        </span>
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-1 items-center justify-end gap-[5px] text-right text-[13px] leading-[1.4]",
          valueClassName,
        )}
      >
        {typeof value === "string" ? (
          <span className="min-w-0 truncate">{value}</span>
        ) : (
          value
        )}
      </span>
      <AssetIcon
        className="size-6 shrink-0 text-app-text-secondary"
        src={chevronRightIcon}
      />
    </div>
  );
}

export function TaskDetailCard({
  task,
  project,
  labels,
  timeZone,
  now,
  isDueDateWarning = false,
}: TaskDetailCardProps): ReactElement {
  const overdue = isTaskOverdue(task, now);
  const labelsSummary = formatTaskLabelsSummary(task.labels);
  const labelColor =
    findTaskLabelColor(task.labels, labels) ?? "var(--app-success)";
  const labelsValue =
    task.labels.length > 0 ? (
      <>
        <span className="shrink-0" style={{ color: labelColor }}>
          <AssetIcon className="size-[18px]" src={tagRawIcon} />
        </span>
        <span className="min-w-0 truncate text-app-text">{labelsSummary}</span>
      </>
    ) : (
      <span className="text-app-text-secondary">{labelsSummary}</span>
    );

  return (
    <div className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]">
      <DetailRow
        iconSrc={calendarIcon}
        isLast={false}
        label="Срок"
        value={formatTaskDueValue(task, timeZone, now)}
        valueClassName={
          isDueDateWarning || overdue
            ? "text-app-destructive"
            : "text-app-accent"
        }
      />
      <DetailRow
        iconSrc={bellIcon}
        isLast={false}
        label="Напоминание"
        value={formatTaskReminderSummary(task)}
        valueClassName="text-app-text-secondary"
      />
      <DetailRow
        iconSrc={flagIcon}
        isLast={false}
        label="Приоритет"
        value={formatTaskPriority(task.priority)}
        valueClassName="text-app-text-secondary"
      />
      <DetailRow
        iconSrc={tagIcon}
        isLast={false}
        label="Теги"
        value={labelsValue}
      />
      <DetailRow
        iconSrc={folderIcon}
        isLast
        label="Проект"
        value={project?.name ?? "Без проекта"}
        valueClassName="text-app-text-secondary"
      />
    </div>
  );
}
