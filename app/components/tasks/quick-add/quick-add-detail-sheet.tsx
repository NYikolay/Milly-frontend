import type { ReactElement } from "react";

import { BottomSheet, BottomSheetAction } from "~/components/ui/bottom-sheet";
import type { LabelResponse } from "~/lib/labels/types";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";
import { useTelegram } from "~/providers/telegram-provider";

import { DueStep } from "./due-step";
import { LabelsStep } from "./labels-step";
import { PriorityStep } from "./priority-step";
import { getQuickAddHeader } from "./quick-add-step";
import type { QuickAddStep } from "./quick-add-step";
import { RemindersStep } from "./reminders-step";

export interface QuickAddDetailSheetProps {
  step: QuickAddStep | null;
  values: QuickTaskDraft;
  amountInput: string;
  labels: LabelResponse[];
  isLabelsLoading: boolean;
  isLabelsError: boolean;
  onRetryLabels: () => void;
  now: Date;
  timeZone: string;
  onClose: () => void;
  onPatch: (patch: Partial<QuickTaskDraft>) => void;
  onAmountInputChange: (value: string) => void;
  onApply: (patch: Partial<QuickTaskDraft>) => void;
}

export function QuickAddDetailSheet({
  step,
  values,
  amountInput,
  labels,
  isLabelsLoading,
  isLabelsError,
  onRetryLabels,
  now,
  timeZone,
  onClose,
  onPatch,
  onAmountInputChange,
  onApply,
}: QuickAddDetailSheetProps): ReactElement {
  const { haptics } = useTelegram();

  return (
    <BottomSheet
      bodyClassName="p-[15px]"
      footer={<BottomSheetAction onClick={onClose}>Закрыть</BottomSheetAction>}
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
          onChange={(ids) => onPatch({ labelIds: ids })}
          onApply={(ids) => onApply({ labelIds: ids })}
          onRetry={onRetryLabels}
          selectedIds={values.labelIds}
        />
      ) : null}
      {step === "priority" ? (
        <PriorityStep
          onChange={(priority) => onPatch({ priority })}
          onApply={(priority) => onApply({ priority })}
          value={values.priority}
        />
      ) : null}
      {step === "due" ? (
        <DueStep
          now={now}
          onChange={(patch) =>
            onPatch({
              ...(patch.date !== undefined ? { dueDate: patch.date } : {}),
              ...(patch.time !== undefined ? { dueTime: patch.time } : {}),
              ...(patch.isRecurring !== undefined
                ? { isRecurring: patch.isRecurring }
                : {}),
            })
          }
          onApply={(next) =>
            onApply({
              dueDate: next.date,
              dueTime: next.time,
              isRecurring: next.isRecurring,
            })
          }
          onToggleHaptic={() => haptics.selection()}
          timeZone={timeZone}
          value={{
            date: values.dueDate,
            time: values.dueTime,
            isRecurring: values.isRecurring,
          }}
        />
      ) : null}
      {step === "reminders" ? (
        <RemindersStep
          amountInput={amountInput}
          onChange={(patch) => onPatch(patch)}
          onAmountInputChange={onAmountInputChange}
          onApply={(next) => onApply(next)}
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
