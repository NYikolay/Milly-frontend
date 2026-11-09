import type { ReactElement } from "react";

import { TaskDetailCard } from "~/components/tasks/detail/task-detail-card";
import { cn } from "~/lib/cn";
import type { LabelResponse } from "~/lib/labels/types";
import type { ProjectResponse } from "~/lib/projects/types";
import { TASK_PAST_DUE_MESSAGE } from "~/lib/tasks/task-reactivation";
import { formatTaskCreatedAt } from "~/lib/tasks/task-detail";
import type { TaskResponse } from "~/lib/tasks/types";

export interface TaskDetailViewProps {
  task: TaskResponse;
  project?: ProjectResponse;
  labels: readonly LabelResponse[];
  timeZone: string;
  now: Date;
  isCompletionPending: boolean;
  completionError: string | null;
  isPastDueWarning: boolean;
  onToggleCompleted: () => void;
  onDelete: () => void;
  onDueClick?: () => void;
}

export function TaskDetailView({
  task,
  project,
  labels,
  timeZone,
  now,
  isCompletionPending,
  completionError,
  isPastDueWarning,
  onToggleCompleted,
  onDelete,
  onDueClick,
}: TaskDetailViewProps): ReactElement {
  const description = task.description?.trim() ?? "";

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="px-[15px] py-[15px]">
        <h1 className="break-words text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">
          {task.title}
        </h1>
      </div>
      {description ? (
        <div className="flex flex-col gap-[5px] px-[15px] pb-[15px]">
          <h2 className="text-[15px] font-semibold leading-[1.4] text-app-text">
            Описание
          </h2>
          <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.4] text-app-text-secondary">
            {description}
          </p>
        </div>
      ) : null}
      <TaskDetailCard
        isDueDateWarning={isPastDueWarning}
        labels={labels}
        now={now}
        onDueClick={onDueClick}
        project={project}
        task={task}
        timeZone={timeZone}
      />
      <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
        Создано {formatTaskCreatedAt(task.created_at, timeZone)}
      </p>
      {isPastDueWarning ? (
        <p
          className="px-[15px] text-[13px] leading-[1.4] text-app-destructive"
          role="alert"
        >
          {TASK_PAST_DUE_MESSAGE}
        </p>
      ) : null}
      {completionError ? (
        <p
          className="px-[15px] text-[13px] leading-[1.4] text-app-destructive"
          role="alert"
        >
          {completionError}
        </p>
      ) : null}
      <div className="flex flex-col gap-[10px] pt-[15px]">
        <button
          aria-busy={isCompletionPending || undefined}
          className={cn(
            "h-[50px] w-full rounded-[25px] bg-app-card text-[15px] font-semibold text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70",
            isCompletionPending && "opacity-50",
          )}
          disabled={isCompletionPending}
          onClick={onToggleCompleted}
          type="button"
        >
          {task.completed_at === null
            ? "Отметить выполненной"
            : "Сделать активной"}
        </button>
        <button
          className="h-[50px] w-full rounded-[25px] bg-app-card text-[15px] font-semibold text-app-destructive focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70 disabled:opacity-50"
          disabled={isCompletionPending}
          onClick={onDelete}
          type="button"
        >
          Удалить задачу
        </button>
      </div>
    </div>
  );
}
