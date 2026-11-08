import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { AddTaskButton } from "~/components/tasks/today/add-task-button";
import { TodayTasksError } from "~/components/tasks/today/today-tasks-error";
import { TodayTasksSkeleton } from "~/components/tasks/today/today-tasks-skeleton";
import { TodayTasksView } from "~/components/tasks/today/today-tasks-view";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import { useTaskSegmentNavigation } from "~/hooks/use-task-segment-navigation";
import {
  useTodayTasksData,
  useToggleTaskCompletion,
} from "~/hooks/use-today-tasks";
import {
  getCompletionError,
  getPendingTaskId,
} from "~/lib/tasks/completion-feedback";
import { formatZonedToday, formatZonedTodayLabel } from "~/lib/tasks/date-time";
import { CONTENT_BOTTOM_PADDING_WITH_FAB } from "~/lib/layout";
import { projectsQueryOptions } from "~/lib/projects/projects-query";
import type { TaskResponse } from "~/lib/tasks/types";
import { useAuth } from "~/providers/auth-provider";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/tasks";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Задачи — Milly" },
    { name: "description", content: "Задачи на сегодня в Milly" },
  ];
}

export default function Tasks() {
  const { user } = useAuth();
  const timeZone = user?.timezone ?? "UTC";
  const now = new Date();
  const today = formatZonedToday(now, timeZone);
  const dateLabel = formatZonedTodayLabel(now, timeZone);
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const onSelectSegment = useTaskSegmentNavigation();

  const [expanded, setExpanded] = useState({
    planned: false,
    completed: false,
  });

  const overviewQuery = useTodayTasksData(timeZone, today);
  const projectsQuery = useQuery(projectsQueryOptions);
  const toggleMutation = useToggleTaskCompletion(timeZone, today);

  const pendingTaskId = getPendingTaskId(toggleMutation);
  const completionError = getCompletionError(toggleMutation);
  const overview = overviewQuery.data;

  function handleToggleTask(
    task: TaskResponse,
    nextCompleted: boolean,
  ) {
    toggleMutation.mutate({ taskId: task.id, nextCompleted });
  }

  function handleAddTask() {
    haptics.selection();
    void navigate("/");
  }

  function handleOpenTask(task: TaskResponse) {
    haptics.selection();
    void navigate(`/tasks/${task.id}`);
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="flex flex-1 flex-col gap-2 px-4"
        style={{
          paddingBottom: CONTENT_BOTTOM_PADDING_WITH_FAB,
        }}
      >
        {overviewQuery.isPending ? (
          <TodayTasksSkeleton />
        ) : overview === undefined ? (
          <TodayTasksError
            dateLabel={dateLabel}
            onRetry={() => void overviewQuery.refetch()}
            onSelectSegment={onSelectSegment}
          />
        ) : (
          <TodayTasksView
            completionError={completionError}
            expanded={expanded}
            now={now}
            onToggleExpanded={(group) => {
              haptics.selection();
              setExpanded((current) => ({
                ...current,
                [group]: !current[group],
              }));
            }}
            onToggleTask={handleToggleTask}
            onOpenTask={handleOpenTask}
            onSelectSegment={onSelectSegment}
            pendingTaskId={pendingTaskId}
            progress={overview.progress}
            projects={projectsQuery.data ?? []}
            tasks={overview.tasks}
            timeZone={timeZone}
          />
        )}
      </div>

      <AddTaskButton onClick={handleAddTask} />
      <BottomNavigationDock active="tasks" onSelect={onSelectTab} />
    </main>
  );
}
