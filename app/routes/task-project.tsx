import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { TaskDetailError } from "~/components/tasks/detail/task-detail-error";
import { TaskProjectSkeleton } from "~/components/tasks/project/task-project-skeleton";
import { TaskProjectView } from "~/components/tasks/project/task-project-view";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import { useTaskDetail } from "~/hooks/use-task-detail";
import { useTelegramBackButton } from "~/hooks/use-telegram-back-button";
import { useUpdateTaskProject } from "~/hooks/use-update-task-project";
import { ApiError } from "~/lib/api/errors";
import { shouldGoBack } from "~/lib/errors/navigation";
import { CONTENT_BOTTOM_PADDING } from "~/lib/layout";
import { projectsQueryOptions } from "~/lib/projects/projects-query";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/task-project";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Проект — Milly" },
    { name: "description", content: "Изменение проекта задачи в Milly" },
  ];
}

export default function TaskProject() {
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const projectsQuery = useQuery({
    ...projectsQueryOptions,
    enabled: isValidId,
  });
  const mutation = useUpdateTaskProject(taskId);
  useTelegramBackButton(handleBack);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate(isValidId ? `/tasks/${taskId}` : "/tasks");
  }

  function handleSelect(projectId: number | null) {
    if (taskQuery.data && projectId !== taskQuery.data.project_id) {
      mutation.mutate(projectId);
    }
    handleBack();
  }

  let content: ReactNode;

  if (!isValidId) {
    content = (
      <TaskDetailError
        kind="not-found"
        onBack={handleBack}
        onRetry={handleBack}
      />
    );
  } else if (taskQuery.isPending) {
    content = <TaskProjectSkeleton />;
  } else if (!taskQuery.data) {
    const isNotFound =
      taskQuery.error instanceof ApiError && taskQuery.error.status === 404;
    content = (
      <TaskDetailError
        kind={isNotFound ? "not-found" : "load-error"}
        onBack={handleBack}
        onRetry={() => void taskQuery.refetch()}
      />
    );
  } else {
    content = (
      <TaskProjectView
        isProjectsError={projectsQuery.isError}
        isProjectsLoading={projectsQuery.isPending}
        onRetryProjects={() => void projectsQuery.refetch()}
        onSelect={handleSelect}
        projects={projectsQuery.data ?? []}
        selectedProjectId={taskQuery.data.project_id}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="flex flex-1 flex-col gap-2 px-4"
        style={{
          paddingBottom: CONTENT_BOTTOM_PADDING,
        }}
      >
        {content}
      </div>
      <BottomNavigationDock active="tasks" onSelect={onSelectTab} />
    </main>
  );
}
