import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { DeleteTaskModal } from "~/components/tasks/detail/delete-task-modal";
import { TaskDetailError } from "~/components/tasks/detail/task-detail-error";
import { TaskDetailSkeleton } from "~/components/tasks/detail/task-detail-skeleton";
import { TaskDetailView } from "~/components/tasks/detail/task-detail-view";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import {
  useDeleteTask,
  useTaskDetail,
  useToggleTaskDetailCompletion,
} from "~/hooks/use-task-detail";
import { useTelegramBackButton } from "~/hooks/use-telegram-back-button";
import { ApiError } from "~/lib/api/errors";
import { shouldGoBack } from "~/lib/errors/navigation";
import { fetchLabels } from "~/lib/labels/labels-api";
import { fetchProjects } from "~/lib/projects/projects-api";
import { useAuth } from "~/providers/auth-provider";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/task-detail";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Задача — Milly" },
    { name: "description", content: "Детали задачи в Milly" },
  ];
}

export default function TaskDetail() {
  const { user } = useAuth();
  const timeZone = user?.timezone ?? "UTC";
  const now = new Date();
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const task = taskQuery.data;
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: ({ signal }) => fetchProjects(signal),
    enabled: task !== undefined && task.project_id !== null,
  });
  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: ({ signal }) => fetchLabels(signal),
    enabled: task !== undefined && task.labels.length > 0,
  });
  const toggleMutation = useToggleTaskDetailCompletion(taskId);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const isMountedRef = useRef(true);
  const deleteMutation = useDeleteTask(taskId, handleDeleted);
  useTelegramBackButton(handleBack);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate("/tasks");
  }

  function handleDeleted() {
    if (!isMountedRef.current) return;

    setIsDeleteOpen(false);
    handleBack();
  }

  function handleToggleCompleted() {
    if (!task) return;
    toggleMutation.mutate({
      taskId: task.id,
      nextCompleted: task.completed_at === null,
    });
  }

  function handleDeleteOpenChange(open: boolean) {
    deleteMutation.reset();
    setIsDeleteOpen(open);
    if (open) haptics.selection();
  }

  const project =
    task?.project_id != null
      ? projectsQuery.data?.find((item) => item.id === task.project_id)
      : undefined;
  const showSeriesWarning =
    task !== undefined &&
    task.series_id !== null &&
    task.completed_at === null &&
    new Date(task.due_at) > now;
  const completionError = toggleMutation.isError
    ? "Не удалось обновить задачу. Попробуйте ещё раз."
    : null;
  const deleteError =
    deleteMutation.isError &&
    !(
      deleteMutation.error instanceof ApiError &&
      deleteMutation.error.status === 404
    )
      ? "Не удалось удалить задачу. Попробуйте ещё раз."
      : null;

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
    content = <TaskDetailSkeleton />;
  } else if (!task) {
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
      <TaskDetailView
        completionError={completionError}
        isCompletionPending={toggleMutation.isPending}
        labels={labelsQuery.data ?? []}
        now={now}
        onDelete={() => handleDeleteOpenChange(true)}
        onToggleCompleted={handleToggleCompleted}
        project={project}
        task={task}
        timeZone={timeZone}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="flex flex-1 flex-col gap-2 px-4"
        style={{
          paddingBottom:
            "calc(89px + max(0px, 30px - var(--app-inset-bottom)))",
        }}
      >
        {content}
      </div>
      <BottomNavigationDock active="tasks" onSelect={onSelectTab} />
      {task ? (
        <DeleteTaskModal
          error={deleteError}
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onOpenChange={handleDeleteOpenChange}
          open={isDeleteOpen}
          showSeriesWarning={showSeriesWarning}
        />
      ) : null}
    </main>
  );
}
