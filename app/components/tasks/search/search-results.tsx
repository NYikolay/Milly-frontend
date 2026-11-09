import type { ReactElement } from "react";

import { TodayTaskRow } from "~/components/tasks/today/today-task-row";
import type { ProjectResponse } from "~/lib/projects/types";
import { formatNumericDate } from "~/lib/tasks/date-time";
import type { TaskResponse } from "~/lib/tasks/types";

import { SearchEmptyCard } from "./search-empty-card";

export interface SearchResultsProps {
  date: string;
  tasks: TaskResponse[];
  projects: ProjectResponse[];
  timeZone: string;
  now: Date;
  pendingTaskId: number | null;
  completionError: string | null;
  onToggleTask: (task: TaskResponse, nextCompleted: boolean) => void;
  onOpenTask: (task: TaskResponse) => void;
}

export function SearchResults({
  date,
  tasks,
  projects,
  timeZone,
  now,
  pendingTaskId,
  completionError,
  onToggleTask,
  onOpenTask,
}: SearchResultsProps): ReactElement {
  const projectsById = new Map(
    projects.map((project) => [project.id, project]),
  );

  return (
    <section
      aria-labelledby="search-results-title"
      className="flex flex-1 flex-col gap-2 pt-4"
    >
      {completionError ? (
        <p
          className="px-[15px] text-[13px] leading-[1.4] text-app-destructive"
          role="alert"
        >
          {completionError}
        </p>
      ) : null}
      <h2
        className="px-[15px] text-[15px] font-semibold leading-[18px] text-app-text-secondary"
        id="search-results-title"
      >
        Задачи на {formatNumericDate(date)} ({tasks.length})
      </h2>
      {tasks.length === 0 ? (
        <SearchEmptyCard />
      ) : (
        <ul className="rounded-[25px] bg-app-card px-[15px] py-[15px]">
          {tasks.map((task, index) => (
            <TodayTaskRow
              isLast={index === tasks.length - 1}
              isPending={pendingTaskId === task.id}
              key={task.id}
              now={now}
              onOpen={onOpenTask}
              onToggle={onToggleTask}
              project={
                task.project_id === null
                  ? undefined
                  : projectsById.get(task.project_id)
              }
              task={task}
              timeZone={timeZone}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
