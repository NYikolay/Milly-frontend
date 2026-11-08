import type { ReactElement } from "react";

import { TaskSegments } from "~/components/tasks/task-segments";
import type { TaskSegmentId } from "~/components/tasks/task-segments";
import type { ProjectResponse } from "~/lib/projects/types";
import { formatZonedTodayLabel } from "~/lib/tasks/date-time";
import {
  COMPLETED_PREVIEW_LIMIT,
  PLANNED_PREVIEW_LIMIT,
  getTodayTasksState,
  splitTodayTasks,
} from "~/lib/tasks/today-tasks";
import type { TaskResponse, TodayProgressResponse } from "~/lib/tasks/types";

import { TodayHeader } from "./today-header";
import { TodayProgressCard } from "./today-progress-card";
import { TodayTaskGroup } from "./today-task-group";

export interface TodayTasksViewProps {
  now: Date;
  timeZone: string;
  tasks: TaskResponse[];
  progress: TodayProgressResponse;
  projects: ProjectResponse[];
  expanded: { planned: boolean; completed: boolean };
  onToggleExpanded: (group: "planned" | "completed") => void;
  pendingTaskId: number | null;
  completionError: string | null;
  onToggleTask: (task: TaskResponse, nextCompleted: boolean) => void;
  onOpenTask: (task: TaskResponse) => void;
  onSelectSegment: (id: TaskSegmentId) => void;
}

export function TodayTasksView({
  now,
  timeZone,
  tasks,
  progress,
  projects,
  expanded,
  onToggleExpanded,
  pendingTaskId,
  completionError,
  onToggleTask,
  onOpenTask,
  onSelectSegment,
}: TodayTasksViewProps): ReactElement {
  const { planned, completed } = splitTodayTasks(tasks);
  const state = getTodayTasksState(progress.total, progress.completed);
  const title =
    state === "empty" ? "Задач на сегодня нету 😴" : "Задачи на сегодня";
  const dateLabel = formatZonedTodayLabel(now, timeZone);
  const projectsById = new Map(
    projects.map((project) => [project.id, project]),
  );
  const showProgress = state !== "empty";

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="pb-[15px] pt-[15px]">
        <TaskSegments onSelect={onSelectSegment} value="today" />
      </div>
      <div className="flex flex-col gap-2">
        <TodayHeader dateLabel={dateLabel} title={title} />
        {showProgress ? (
          <TodayProgressCard
            completed={progress.completed}
            total={progress.total}
          />
        ) : null}
      </div>
      {completionError ? (
        <p
          className="px-[15px] text-[13px] leading-[1.4] text-app-destructive"
          role="alert"
        >
          {completionError}
        </p>
      ) : null}
      {planned.length > 0 ? (
        <TodayTaskGroup
          expanded={expanded.planned}
          id="planned"
          onOpenTask={onOpenTask}
          onToggleExpanded={() => onToggleExpanded("planned")}
          onToggleTask={onToggleTask}
          pendingTaskId={pendingTaskId}
          previewLimit={PLANNED_PREVIEW_LIMIT}
          projectsById={projectsById}
          tasks={planned}
          timeZone={timeZone}
          title="В планах"
        />
      ) : null}
      {completed.length > 0 ? (
        <TodayTaskGroup
          expanded={expanded.completed}
          id="completed"
          onOpenTask={onOpenTask}
          onToggleExpanded={() => onToggleExpanded("completed")}
          onToggleTask={onToggleTask}
          pendingTaskId={pendingTaskId}
          previewLimit={COMPLETED_PREVIEW_LIMIT}
          projectsById={projectsById}
          tasks={completed}
          timeZone={timeZone}
          title="Выполнено"
        />
      ) : null}
    </div>
  );
}
