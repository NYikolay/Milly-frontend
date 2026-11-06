import type { ReactElement } from "react";

import circleCheckIcon from "~/assets/icons/circle-check.svg";
import dashboardIcon from "~/assets/icons/dashboard.svg";
import searchIcon from "~/assets/icons/search.svg";

import { SegmentedControl } from "~/components/ui/segmented-control";
import type { ProjectResponse } from "~/lib/projects/types";
import { formatZonedTodayLabel } from "~/lib/tasks/date-time";
import {
  COMPLETED_PREVIEW_LIMIT,
  PLANNED_PREVIEW_LIMIT,
  getTodayTasksState,
  shouldShowSearchCard,
  splitTodayTasks,
} from "~/lib/tasks/today-tasks";
import type { TaskResponse, TodayProgressResponse } from "~/lib/tasks/types";

import { CreateTaskSection } from "./create-task-section";
import { TodayHeader } from "./today-header";
import { TodayProgressCard } from "./today-progress-card";
import { TodayTaskGroup } from "./today-task-group";

export const TODAY_SEGMENTS = [
  { id: "today", label: "Сегодня", iconSrc: circleCheckIcon },
  { id: "search", label: "Поиск задач", iconSrc: searchIcon, disabled: true },
  { id: "projects", label: "Проекты", iconSrc: dashboardIcon, disabled: true },
] as const;

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
  onVoice: () => void;
  onInteractive: () => void;
  onSearch: () => void;
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
  onVoice,
  onInteractive,
  onSearch,
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
  const showSearchCard = shouldShowSearchCard(planned.length);

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
      <CreateTaskSection
        onInteractive={onInteractive}
        onSearch={onSearch}
        onVoice={onVoice}
        showSearchCard={showSearchCard}
      />
    </div>
  );
}
