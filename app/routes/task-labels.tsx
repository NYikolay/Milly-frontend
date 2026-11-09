import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { TaskDetailError } from "~/components/tasks/detail/task-detail-error";
import { TaskLabelsSkeleton } from "~/components/tasks/labels/task-labels-skeleton";
import { TaskLabelsView } from "~/components/tasks/labels/task-labels-view";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import { useTaskDetail } from "~/hooks/use-task-detail";
import { useTelegramBackButton } from "~/hooks/use-telegram-back-button";
import { useUpdateTaskLabels } from "~/hooks/use-update-task-labels";
import { ApiError } from "~/lib/api/errors";
import { shouldGoBack } from "~/lib/errors/navigation";
import { labelsQueryOptions } from "~/lib/labels/labels-query";
import { CONTENT_BOTTOM_PADDING } from "~/lib/layout";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/task-labels";

const MAX_TASK_LABELS = 100;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Метки — Milly" },
    { name: "description", content: "Изменение меток задачи в Milly" },
  ];
}

export default function TaskLabels() {
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const labelsQuery = useQuery({
    ...labelsQueryOptions,
    enabled: isValidId,
  });
  const mutation = useUpdateTaskLabels(taskId);
  useTelegramBackButton(handleBack);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate(isValidId ? `/tasks/${taskId}` : "/tasks");
  }

  function handleToggle(labelId: number) {
    const task = taskQuery.data;

    if (!task) return;

    const selectedIds = new Set(task.labels.map((label) => label.id));
    const isSelected = selectedIds.has(labelId);

    if (!isSelected && selectedIds.size >= MAX_TASK_LABELS) {
      return;
    }

    if (isSelected) {
      selectedIds.delete(labelId);
    } else {
      selectedIds.add(labelId);
    }

    const nextLabels = (labelsQuery.data ?? [])
      .filter((label) => selectedIds.has(label.id))
      .map((label) => ({ id: label.id, name: label.name }));

    haptics.selection();
    mutation.mutate({
      labelIds: nextLabels.map((label) => label.id),
      labels: nextLabels,
    });
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
    content = <TaskLabelsSkeleton />;
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
      <TaskLabelsView
        isLabelsError={labelsQuery.isError}
        isLabelsLoading={labelsQuery.isPending || labelsQuery.isFetching}
        labels={labelsQuery.data ?? []}
        onRetryLabels={() => void labelsQuery.refetch()}
        onToggle={handleToggle}
        selectedIds={taskQuery.data.labels.map((label) => label.id)}
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
