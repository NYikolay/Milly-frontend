import type { ReactElement } from "react";

import checkIcon from "~/assets/icons/check.svg?no-inline";
import chevronRightIcon from "~/assets/icons/chevron-right.svg?no-inline";
import flagIcon from "~/assets/icons/flag.svg?no-inline";

import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";
import { getProjectIcon } from "~/lib/projects/project-icons";
import type { ProjectResponse } from "~/lib/projects/types";
import { formatZonedTime } from "~/lib/tasks/date-time";
import type { TaskResponse } from "~/lib/tasks/types";

export interface TodayTaskRowProps {
  task: TaskResponse;
  project?: ProjectResponse;
  timeZone: string;
  isPending: boolean;
  isLast: boolean;
  onToggle: (task: TaskResponse, nextCompleted: boolean) => void;
}

export function TodayTaskRow({
  task,
  project,
  timeZone,
  isPending,
  isLast,
  onToggle,
}: TodayTaskRowProps): ReactElement {
  const completed = task.completed_at !== null;
  const showFlag = !completed && task.priority !== "neither";
  const showAccentTime = showFlag;

  return (
    <li className="flex min-h-[67px] items-center gap-[12px]">
      <button
        aria-busy={isPending || undefined}
        aria-checked={completed}
        aria-label={`${task.title}: ${
          completed ? "отметить невыполненной" : "отметить выполненной"
        }`}
        className={cn(
          "flex size-[35px] shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70",
          isPending && "opacity-50",
        )}
        disabled={isPending}
        onClick={() => onToggle(task, !completed)}
        role="checkbox"
        type="button"
      >
        <span
          className={cn(
            "flex size-[28px] items-center justify-center rounded-full",
            completed
              ? "bg-app-accent"
              : "border-[1.3px] border-app-text-secondary/[0.55]",
          )}
        >
          {completed ? (
            <AssetIcon className="size-[15px] text-white" src={checkIcon} />
          ) : null}
        </span>
      </button>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-[12px] self-stretch border-app-stroke",
          isLast ? "border-b-0" : "border-b",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <span
            className={cn(
              "truncate text-[15px] leading-[1.3]",
              completed ? "text-app-text-secondary" : "text-app-text",
            )}
          >
            {task.title}
          </span>
          <div className="flex min-w-0 items-center gap-[5px] text-[12px] leading-[1.4] text-app-text-secondary">
            <span
              className="shrink-0"
              style={project ? { color: project.color.hex } : undefined}
            >
              <AssetIcon
                className="size-[15px]"
                src={getProjectIcon(project?.icon ?? null)}
              />
            </span>
            <span className="truncate">{project?.name ?? "Без проекта"}</span>
            <span
              className={cn(
                "shrink-0",
                showAccentTime ? "text-app-accent" : "text-app-text-secondary",
              )}
            >
              · {formatZonedTime(task.due_at, timeZone)}
            </span>
            {task.series_id !== null ? (
              <span className="shrink-0">· Регулярные</span>
            ) : null}
          </div>
        </div>
        {showFlag ? (
          <span className="flex size-[18px] shrink-0 items-center justify-center text-app-accent">
            <AssetIcon className="size-[18px]" src={flagIcon} />
          </span>
        ) : null}
        <span className="flex size-6 shrink-0 items-center justify-center text-app-text-secondary">
          <AssetIcon className="size-6" src={chevronRightIcon} />
        </span>
      </div>
    </li>
  );
}
