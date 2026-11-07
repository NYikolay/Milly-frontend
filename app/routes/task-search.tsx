import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { SearchFilterBar } from "~/components/tasks/search/search-filter-bar";
import { SearchHeader } from "~/components/tasks/search/search-header";
import { SearchResults } from "~/components/tasks/search/search-results";
import { SearchTasksError } from "~/components/tasks/search/search-tasks-error";
import { SearchTasksSkeleton } from "~/components/tasks/search/search-tasks-skeleton";
import { TaskSegments } from "~/components/tasks/task-segments";
import { AddTaskButton } from "~/components/tasks/today/add-task-button";
import { SearchField } from "~/components/ui/search-field";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import {
  useSearchTasksData,
  useToggleSearchTaskCompletion,
} from "~/hooks/use-search-tasks";
import { useTaskSegmentNavigation } from "~/hooks/use-task-segment-navigation";
import { fetchProjects } from "~/lib/projects/projects-api";
import { formatZonedToday } from "~/lib/tasks/date-time";
import type { TaskResponse } from "~/lib/tasks/types";
import { useAuth } from "~/providers/auth-provider";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/task-search";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Поиск задач — Milly" },
    { name: "description", content: "Поиск задач в Milly" },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  const state = new URL(request.url).searchParams.get("state");

  return { activeFilterPreview: import.meta.env.DEV && state === "filter" };
}

export default function TaskSearch({ loaderData }: Route.ComponentProps) {
  const { user } = useAuth();
  const timeZone = user?.timezone ?? "UTC";
  const now = new Date();
  const today = formatZonedToday(now, timeZone);
  const [inputValue, setInputValue] = useState("");
  const query = inputValue.trim();
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const onSelectSegment = useTaskSegmentNavigation();

  const searchQuery = useSearchTasksData(timeZone, today, query);
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: ({ signal }) => fetchProjects(signal),
  });
  const toggleMutation = useToggleSearchTaskCompletion(timeZone, today, query);

  const pendingTaskId = toggleMutation.isPending
    ? (toggleMutation.variables?.taskId ?? null)
    : null;
  const completionError = toggleMutation.isError
    ? "Не удалось обновить задачу. Попробуйте ещё раз."
    : null;
  const activeFilterCount = loaderData.activeFilterPreview ? 1 : 0;
  const activeChip = loaderData.activeFilterPreview
    ? ("project" as const)
    : null;

  function handleToggleTask(task: TaskResponse, nextCompleted: boolean) {
    toggleMutation.mutate({ taskId: task.id, nextCompleted });
  }

  function handleAddTask() {
    haptics.selection();
    void navigate("/");
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="flex flex-1 flex-col gap-2 px-4"
        style={{
          paddingBottom:
            "calc(145px + max(0px, 30px - var(--app-inset-bottom)))",
        }}
      >
        <div className="pb-[15px] pt-[15px]">
          <TaskSegments value="search" onSelect={onSelectSegment} />
        </div>
        <SearchHeader />
        <SearchField
          ariaLabel="Поиск задач"
          value={inputValue}
          onChange={setInputValue}
          variant="stroke"
        />
        <SearchFilterBar
          activeFilterCount={activeFilterCount}
          activeChip={activeChip}
        />
        {searchQuery.isPending ? (
          <SearchTasksSkeleton />
        ) : searchQuery.data === undefined ? (
          <SearchTasksError onRetry={() => void searchQuery.refetch()} />
        ) : (
          <SearchResults
            date={today}
            tasks={searchQuery.data.items}
            projects={projectsQuery.data ?? []}
            timeZone={timeZone}
            pendingTaskId={pendingTaskId}
            completionError={completionError}
            onToggleTask={handleToggleTask}
          />
        )}
      </div>

      <AddTaskButton onClick={handleAddTask} />
      <BottomNavigationDock active="tasks" onSelect={onSelectTab} />
    </main>
  );
}
