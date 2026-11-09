import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { TaskDetailError } from "~/components/tasks/detail/task-detail-error";
import { TaskPrioritySkeleton } from "~/components/tasks/priority/task-priority-skeleton";
import { TaskPriorityView } from "~/components/tasks/priority/task-priority-view";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import { useTaskDetail } from "~/hooks/use-task-detail";
import { useTelegramBackButton } from "~/hooks/use-telegram-back-button";
import { useUpdateTaskPriority } from "~/hooks/use-update-task-priority";
import { ApiError } from "~/lib/api/errors";
import { shouldGoBack } from "~/lib/errors/navigation";
import { CONTENT_BOTTOM_PADDING } from "~/lib/layout";
import type { Priority } from "~/lib/tasks/types";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/task-priority";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Приоритет — Milly" },
    { name: "description", content: "Изменение приоритета задачи в Milly" },
  ];
}

export default function TaskPriority() {
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const mutation = useUpdateTaskPriority(taskId);
  useTelegramBackButton(handleBack);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate(isValidId ? `/tasks/${taskId}` : "/tasks");
  }

  function handleSelect(priority: Priority) {
    if (taskQuery.data && priority !== taskQuery.data.priority) {
      mutation.mutate(priority);
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
    content = <TaskPrioritySkeleton />;
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
      <TaskPriorityView
        priority={taskQuery.data.priority}
        onSelect={handleSelect}
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
