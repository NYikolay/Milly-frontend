import type { ReactElement } from "react";

import { BottomSheet, BottomSheetAction } from "~/components/ui/bottom-sheet";
import type { LabelResponse } from "~/lib/labels/types";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";
import type { Priority } from "~/lib/tasks/types";
import { useTelegram } from "~/providers/telegram-provider";

import { DueStep } from "./due-step";
import type { DueStepValue } from "./due-step";
import { LabelsStep } from "./labels-step";
import { PriorityStep } from "./priority-step";
import { getQuickAddHeader } from "./quick-add-step";
import type { QuickAddStep } from "./quick-add-step";
import { RemindersStep } from "./reminders-step";
import type { ReminderDraft } from "./reminders-step";

export interface QuickAddDetailSheetProps {
  step: QuickAddStep | null;
  values: QuickTaskDraft;
  labels: LabelResponse[];
  isLabelsLoading: boolean;
  isLabelsError: boolean;
  onRetryLabels: () => void;
  now: Date;
  timeZone: string;
  onClose: () => void;
  onApplyLabels: (ids: number[]) => void;
  onApplyPriority: (priority: Priority) => void;
  onApplyDue: (value: DueStepValue) => void;
  onApplyReminders: (value: ReminderDraft) => void;
}

export function QuickAddDetailSheet({
  step,
  values,
  labels,
  isLabelsLoading,
  isLabelsError,
  onRetryLabels,
  now,
  timeZone,
  onClose,
  onApplyLabels,
  onApplyPriority,
  onApplyDue,
  onApplyReminders,
}: QuickAddDetailSheetProps): ReactElement {
  const { haptics } = useTelegram();

  return (
    <BottomSheet
      bodyClassName="p-[15px]"
      footer={<BottomSheetAction onClick={onClose}>Закрыть</BottomSheetAction>}
      onBack={onClose}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={step !== null}
      panelAnimateLayout
      title={step ? getQuickAddHeader(step).title : ""}
    >
      {step === "labels" ? (
        <LabelsStep
          isError={isLabelsError}
          isLoading={isLabelsLoading}
          labels={labels}
          onApply={onApplyLabels}
          onRetry={onRetryLabels}
          selectedIds={values.labelIds}
        />
      ) : null}
      {step === "priority" ? (
        <PriorityStep onApply={onApplyPriority} value={values.priority} />
      ) : null}
      {step === "due" ? (
        <DueStep
          date={values.dueDate}
          isRecurring={values.isRecurring}
          now={now}
          onApply={onApplyDue}
          onToggleHaptic={() => haptics.selection()}
          time={values.dueTime}
          timeZone={timeZone}
        />
      ) : null}
      {step === "reminders" ? (
        <RemindersStep
          onApply={onApplyReminders}
          onToggleHaptic={() => haptics.selection()}
          value={{
            remindersEnabled: values.remindersEnabled,
            beforeDueEnabled: values.beforeDueEnabled,
            beforeDueAmount: values.beforeDueAmount,
            beforeDueUnit: values.beforeDueUnit,
            scheduledEnabled: values.scheduledEnabled,
            scheduledIntervalDays: values.scheduledIntervalDays,
            scheduledTime: values.scheduledTime,
          }}
        />
      ) : null}
    </BottomSheet>
  );
}
