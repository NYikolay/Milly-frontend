import type { ReactElement } from "react";

import type { ProjectResponse } from "~/lib/projects/types";
import { getVisibleTasks } from "~/lib/tasks/today-tasks";
import type { TaskResponse } from "~/lib/tasks/types";

import { TodayTaskRow } from "./today-task-row";

export interface TodayTaskGroupProps {
  id: string;
  title: string;
  tasks: TaskResponse[];
  previewLimit: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  projectsById: ReadonlyMap<number, ProjectResponse>;
  timeZone: string;
  pendingTaskId: number | null;
  onToggleTask: (task: TaskResponse, nextCompleted: boolean) => void;
}

export function TodayTaskGroup({
  id,
  title,
  tasks,
  previewLimit,
  expanded,
  onToggleExpanded,
  projectsById,
  timeZone,
  pendingTaskId,
  onToggleTask,
}: TodayTaskGroupProps): ReactElement {
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2 pt-4">
      <div className="flex items-center gap-[5px] px-[15px]">
        <h2
          className="text-[15px] font-semibold leading-[18px] text-app-text-secondary"
          id={`${id}-title`}
        >
          {title}
        </h2>
        {tasks.length > previewLimit ? (
          <button
            aria-controls={`${id}-list`}
            aria-expanded={expanded}
            className="text-[13px] leading-[1.4] text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
            onClick={onToggleExpanded}
            type="button"
          >
            {expanded ? "Свернуть" : `Посмотреть все (${tasks.length})`}
          </button>
        ) : null}
      </div>
      <ul
        className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]"
        id={`${id}-list`}
      >
        {getVisibleTasks(tasks, previewLimit, expanded).map(
          (task, index, visible) => (
            <TodayTaskRow
              isLast={index === visible.length - 1}
              isPending={pendingTaskId === task.id}
              key={task.id}
              onToggle={onToggleTask}
              project={
                task.project_id === null
                  ? undefined
                  : projectsById.get(task.project_id)
              }
              task={task}
              timeZone={timeZone}
            />
          ),
        )}
      </ul>
    </section>
  );
}
