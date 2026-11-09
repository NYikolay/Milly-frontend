import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { TaskDetailError } from "~/components/tasks/detail/task-detail-error";
import { TaskRemindersSkeleton } from "~/components/tasks/reminders/task-reminders-skeleton";
import { TaskRemindersView } from "~/components/tasks/reminders/task-reminders-view";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import { useTaskDetail } from "~/hooks/use-task-detail";
import { useTelegramBackButton } from "~/hooks/use-telegram-back-button";
import { useUpdateTaskReminders } from "~/hooks/use-update-task-reminders";
import { ApiError } from "~/lib/api/errors";
import { shouldGoBack } from "~/lib/errors/navigation";
import { CONTENT_BOTTOM_PADDING } from "~/lib/layout";
import { TASK_REMINDERS_SAVE_ERROR } from "~/lib/tasks/reminders";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/task-reminders";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Напоминания — Milly" },
    { name: "description", content: "Автоматические напоминания задачи в Milly" },
  ];
}

export default function TaskReminders() {
  const { haptics } = useTelegram();
  const navigate = useNavigate();
  const onSelectTab = useBottomNavigation();
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const isValidId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const taskId = isValidId ? parsedId : 0;

  const taskQuery = useTaskDetail(taskId, isValidId);
  const mutation = useUpdateTaskReminders(taskId);
  useTelegramBackButton(handleBack);

  function handleBack() {
    haptics.selection();
    if (shouldGoBack(window.history.state)) {
      void navigate(-1);
      return;
    }
    void navigate(isValidId ? `/tasks/${taskId}` : "/tasks");
  }

  function handleRetry() {
    const input = mutation.variables;

    if (!input) return;

    mutation.reset();
    mutation.mutate(input);
  }

  const error = mutation.isError ? TASK_REMINDERS_SAVE_ERROR : null;

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
    content = <TaskRemindersSkeleton />;
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
      <TaskRemindersView
        error={error}
        onRetry={handleRetry}
        onSave={(input) => mutation.mutate(input)}
        onToggleHaptic={() => haptics.selection()}
        task={taskQuery.data}
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
