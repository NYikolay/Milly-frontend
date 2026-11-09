import { useState } from "react";
import type { ReactElement } from "react";

import { DueStep } from "~/components/tasks/quick-add/due-step";
import type { DueStepValue } from "~/components/tasks/quick-add/due-step";
import { BottomSheet } from "~/components/ui/bottom-sheet";
import { buildTaskDueUpdate, getTaskDueDraft } from "~/lib/tasks/task-due";
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
  onToggleHaptic?: () => void;
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
  onToggleHaptic,
}: TaskDueSheetProps): ReactElement {
  const draftSignature = `${open}|${task.due_at}|${task.recurrence}|${timeZone}`;
  const [draftState, setDraftState] = useState(() => ({
    signature: draftSignature,
    draft: getTaskDueDraft(task, timeZone),
  }));

  if (draftState.signature !== draftSignature) {
    setDraftState({
      signature: draftSignature,
      draft: getTaskDueDraft(task, timeZone),
    });
  }

  const draft = draftState.draft;

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
          setDraftState((current) => ({
            ...current,
            draft: { ...current.draft, ...patch },
          }))
        }
        onApply={handleApply}
        onToggleHaptic={onToggleHaptic}
        isPending={isPending}
        error={error}
      />
    </BottomSheet>
  );
}
