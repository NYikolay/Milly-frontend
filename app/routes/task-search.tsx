import { useEffect, useReducer, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { SearchFiltersSheet } from "~/components/tasks/search/filters/search-filters-sheet";
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
import { labelsQueryOptions } from "~/lib/labels/labels-query";
import { CONTENT_BOTTOM_PADDING_WITH_FAB } from "~/lib/layout";
import { projectsQueryOptions } from "~/lib/projects/projects-query";
import {
  getCompletionError,
  getPendingTaskId,
} from "~/lib/tasks/completion-feedback";
import { formatZonedToday } from "~/lib/tasks/date-time";
import type { FiltersStep } from "~/lib/tasks/search-filters";
import {
  countActiveFilterGroups,
  filterTasksForDisplay,
  pruneMissingIds,
  resolveFilterDate,
} from "~/lib/tasks/search-filters";
import {
  createSearchFiltersState,
  searchFiltersReducer,
} from "~/lib/tasks/search-filters-reducer";
import { shouldBlockTaskReactivation } from "~/lib/tasks/task-reactivation";
import { showTaskPastDueToast } from "~/lib/tasks/task-toasts";
import type { TaskListResponse, TaskResponse } from "~/lib/tasks/types";
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

export function resolveSearchResults(
  current: TaskListResponse | undefined,
  previous: TaskListResponse | undefined,
): TaskListResponse | undefined {
  return current ?? previous;
}

export default function TaskSearch({ loaderData }: Route.ComponentProps) {
  const { user } = useAuth();
  const timeZone = user?.timezone ?? "UTC";
  const now = new Date();
  const today = formatZonedToday(now, timeZone);
  const [inputValue, setInputValue] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const query = inputValue.trim();
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const onSelectSegment = useTaskSegmentNavigation();
  const [filtersState, dispatchFilters] = useReducer(
    searchFiltersReducer,
    undefined,
    createSearchFiltersState,
  );
  const appliedFilters = filtersState.applied;
  const filteredDate = resolveFilterDate(appliedFilters, today);

  const searchQuery = useSearchTasksData(
    timeZone,
    today,
    query,
    appliedFilters,
  );
  const lastResultsRef = useRef<TaskListResponse | undefined>(undefined);

  useEffect(() => {
    if (searchQuery.data !== undefined) {
      lastResultsRef.current = searchQuery.data;
    }
  }, [searchQuery.data]);

  const results = resolveSearchResults(
    searchQuery.data,
    lastResultsRef.current,
  );
  const projectsQuery = useQuery(projectsQueryOptions);
  const labelsQuery = useQuery(labelsQueryOptions);
  const toggleMutation = useToggleSearchTaskCompletion(
    timeZone,
    today,
    query,
    appliedFilters,
  );

  useEffect(() => {
    const projects = projectsQuery.data;

    if (!projects) return;

    const projectIds = pruneMissingIds(
      appliedFilters.projectIds,
      projects.map((project) => project.id),
    );

    if (projectIds.join(",") !== appliedFilters.projectIds.join(",")) {
      dispatchFilters({ type: "patchAll", patch: { projectIds } });
    }
  }, [projectsQuery.data, appliedFilters.projectIds]);

  useEffect(() => {
    const labels = labelsQuery.data;

    if (!labels) return;

    const labelIds = pruneMissingIds(
      appliedFilters.labelIds,
      labels.map((label) => label.id),
    );

    if (labelIds.join(",") !== appliedFilters.labelIds.join(",")) {
      dispatchFilters({ type: "patchAll", patch: { labelIds } });
    }
  }, [labelsQuery.data, appliedFilters.labelIds]);

  const displayedTasks = filterTasksForDisplay(
    results?.items ?? [],
    appliedFilters,
  );
  const pendingTaskId = getPendingTaskId(toggleMutation);
  const completionError = getCompletionError(toggleMutation);
  const previewActive = loaderData.activeFilterPreview;
  const activeFilterCount = previewActive
    ? 1
    : countActiveFilterGroups(appliedFilters);
  const activeProject = previewActive || appliedFilters.projectIds.length > 0;
  const activeDate = appliedFilters.date !== null;
  const activePriority = appliedFilters.priorities.length > 0;
  const activeRecurrence = appliedFilters.recurrence !== "all";

  function handleToggleTask(task: TaskResponse, nextCompleted: boolean) {
    if (shouldBlockTaskReactivation(task, nextCompleted, new Date())) {
      toggleMutation.reset();
      showTaskPastDueToast();
      return;
    }

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

  function openFilters(step: FiltersStep) {
    haptics.selection();
    dispatchFilters({ type: "open", step });
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="flex flex-1 flex-col gap-2 px-4"
        style={{
          paddingBottom: CONTENT_BOTTOM_PADDING_WITH_FAB,
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
          onBlur={() => setIsSearchFocused(false)}
          onFocus={() => setIsSearchFocused(true)}
          variant="stroke"
        />
        <SearchFilterBar
          activeFilterCount={activeFilterCount}
          activeDate={activeDate}
          activePriority={activePriority}
          activeProject={activeProject}
          activeRecurrence={activeRecurrence}
          onOpenAll={() => openFilters("all")}
          onOpenDate={() => openFilters("date")}
          onOpenPriority={() => openFilters("priority")}
          onOpenProject={() => openFilters("project")}
          onOpenRecurrence={() => openFilters("recurrence")}
        />
        {results === undefined && searchQuery.isPending ? (
          <SearchTasksSkeleton />
        ) : results === undefined ? (
          <SearchTasksError onRetry={() => void searchQuery.refetch()} />
        ) : (
          <SearchResults
            date={filteredDate}
            tasks={displayedTasks}
            projects={projectsQuery.data ?? []}
            timeZone={timeZone}
            now={now}
            pendingTaskId={pendingTaskId}
            completionError={completionError}
            onToggleTask={handleToggleTask}
            onOpenTask={handleOpenTask}
          />
        )}
      </div>

      <SearchFiltersSheet
        state={filtersState}
        today={today}
        labels={labelsQuery.data ?? []}
        isLabelsLoading={labelsQuery.isPending}
        isLabelsError={labelsQuery.isError}
        onRetryLabels={() => void labelsQuery.refetch()}
        projects={projectsQuery.data ?? []}
        isProjectsLoading={projectsQuery.isPending}
        isProjectsError={projectsQuery.isError}
        onRetryProjects={() => void projectsQuery.refetch()}
        onOpenStep={(step) => openFilters(step)}
        onBack={() => dispatchFilters({ type: "back" })}
        onClose={() => dispatchFilters({ type: "close" })}
        onApplyStep={(patch) => dispatchFilters({ type: "applyStep", patch })}
        onApplyAll={() => dispatchFilters({ type: "applyAll" })}
        onReset={() => dispatchFilters({ type: "reset" })}
      />

      <AddTaskButton hidden={isSearchFocused} onClick={handleAddTask} />
      <BottomNavigationDock
        active="tasks"
        hidden={isSearchFocused}
        onSelect={onSelectTab}
      />
    </main>
  );
}
