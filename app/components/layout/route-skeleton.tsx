import type { ReactElement } from "react";
import { useLocation } from "react-router";

import { HomeSkeleton } from "~/components/home/home-skeleton";
import { TaskDetailSkeleton } from "~/components/tasks/detail/task-detail-skeleton";
import { TaskPrioritySkeleton } from "~/components/tasks/priority/task-priority-skeleton";
import { TaskProjectSkeleton } from "~/components/tasks/project/task-project-skeleton";
import { TaskRemindersSkeleton } from "~/components/tasks/reminders/task-reminders-skeleton";
import { SearchTasksPageSkeleton } from "~/components/tasks/search/search-tasks-page-skeleton";
import { TodayTasksSkeleton } from "~/components/tasks/today/today-tasks-skeleton";
import { CONTENT_BOTTOM_PADDING } from "~/lib/layout";

export function RouteSkeleton(): ReactElement {
  const { pathname } = useLocation();
  const isSearch = pathname.startsWith("/tasks/search");
  const isTaskReminders = /^\/tasks\/[^/]+\/reminders\/?$/.test(pathname);
  const isTaskPriority = /^\/tasks\/[^/]+\/priority\/?$/.test(pathname);
  const isTaskProject = /^\/tasks\/[^/]+\/project\/?$/.test(pathname);
  const isTaskDetail = pathname.startsWith("/tasks/") && !isSearch;

  if (pathname.startsWith("/tasks")) {
    return (
      <main className="flex flex-1 flex-col">
        <div
          className="flex flex-1 flex-col gap-2 px-4"
          style={{ paddingBottom: CONTENT_BOTTOM_PADDING }}
        >
          {isSearch ? (
            <SearchTasksPageSkeleton />
          ) : isTaskProject ? (
            <TaskProjectSkeleton />
          ) : isTaskPriority ? (
            <TaskPrioritySkeleton />
          ) : isTaskReminders ? (
            <TaskRemindersSkeleton />
          ) : isTaskDetail ? (
            <TaskDetailSkeleton />
          ) : (
            <TodayTasksSkeleton />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <HomeSkeleton />
    </main>
  );
}
