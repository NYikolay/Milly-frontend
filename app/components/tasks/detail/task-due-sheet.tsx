import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { DueStep } from "~/components/tasks/quick-add/due-step";
import type { DueStepValue } from "~/components/tasks/quick-add/due-step";
import { BottomSheet } from "~/components/ui/bottom-sheet";
import {
  buildTaskDueUpdate,
  getTaskDueDraft,
  type TaskDueDraft,
} from "~/lib/tasks/task-due";
import type { TaskResponse, TaskUpdateInput } from "~/lib/tasks/types";

export interface TaskDueSheetProps {
  open: boolean;
  task: TaskResponse;
  timeZone: string;
  now: Date;
  isPending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: TaskUpdateInput) => void;
}

export function TaskDueSheet({
  open,
  task,
  timeZone,
  now,
  isPending,
  error,
  onOpenChange,
  onSave,
}: TaskDueSheetProps): ReactElement {
  const [draft, setDraft] = useState<TaskDueDraft>(() =>
    getTaskDueDraft(task, timeZone),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(
      getTaskDueDraft(
        { due_at: task.due_at, recurrence: task.recurrence },
        timeZone,
      ),
    );
  }, [open, task.due_at, task.recurrence, timeZone]);

  function handleApply(next: DueStepValue) {
    const input = buildTaskDueUpdate(task, next, timeZone);

    if (input === null) {
      onOpenChange(false);
      return;
    }

    onSave(input);
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Дата и время задачи"
      showCloseButton
      panelAnimateLayout
      swipeToClose
      bodyClassName="p-[15px]"
    >
      <DueStep
        value={draft}
        now={now}
        timeZone={timeZone}
        onChange={(patch) =>
          setDraft((current) => ({ ...current, ...patch }))
        }
        onApply={handleApply}
        isPending={isPending}
        error={error}
      />
    </BottomSheet>
  );
}
