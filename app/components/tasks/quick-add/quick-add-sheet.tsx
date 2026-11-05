import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import type { Transition, Variants } from "motion/react";
import { useRevalidator } from "react-router";

import { BottomSheet, BottomSheetAction } from "~/components/ui/bottom-sheet";
import { useKeyboardViewport } from "~/hooks/use-keyboard-viewport";
import { ApiError } from "~/lib/api/errors";
import { fetchLabels } from "~/lib/labels/labels-api";
import { pruneMissingLabelIds } from "~/lib/labels/labels-selection";
import { describeQuickAddError } from "~/lib/tasks/quick-task-errors";
import type { Priority } from "~/lib/tasks/types";
import { useAuth } from "~/providers/auth-provider";
import { useTelegram } from "~/providers/telegram-provider";

import { DueStep } from "./due-step";
import type { DueStepValue } from "./due-step";
import { LabelsStep } from "./labels-step";
import { PriorityStep } from "./priority-step";
import { QuickAddForm } from "./quick-add-form";
import type { QuickAddChipStep } from "./quick-add-chips";
import { getQuickAddHeader } from "./quick-add-step";
import type { QuickAddStep } from "./quick-add-step";
import { RemindersStep } from "./reminders-step";
import type { ReminderDraft } from "./reminders-step";
import { useCreateQuickTask } from "./use-create-quick-task";
import { useQuickTaskForm } from "./use-quick-task-form";

export interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LAYOUT_TRANSITION: Transition = {
  layout: { type: "spring", stiffness: 400, damping: 36, mass: 0.9 },
};

const STEP_VARIANTS: Variants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
    scale: 0.98,
  }),
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 420, damping: 38, mass: 0.8 },
      opacity: { duration: 0.18, ease: "easeOut" },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
    transition: {
      x: { type: "spring", stiffness: 420, damping: 38, mass: 0.8 },
      opacity: { duration: 0.18, ease: "easeOut" },
    },
  }),
};

export function QuickAddSheet({
  open,
  onOpenChange,
}: QuickAddSheetProps): ReactElement {
  const { user } = useAuth();
  const { haptics } = useTelegram();
  const keyboard = useKeyboardViewport(open);
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const timeZone = user?.timezone ?? "UTC";
  const descriptionId = useId();

  const [step, setStep] = useState<QuickAddStep>("form");
  const [direction, setDirection] = useState(1);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(false);
  const pendingChipFocusRef = useRef<QuickAddChipStep | null>(null);
  const submittingRef = useRef(false);

  const labelsChipRef = useRef<HTMLButtonElement>(null);
  const priorityChipRef = useRef<HTMLButtonElement>(null);
  const dueChipRef = useRef<HTMLButtonElement>(null);
  const remindersChipRef = useRef<HTMLButtonElement>(null);

  const chipRefs = useMemo<
    Record<QuickAddChipStep, RefObject<HTMLButtonElement | null>>
  >(
    () => ({
      labels: labelsChipRef,
      priority: priorityChipRef,
      due: dueChipRef,
      reminders: remindersChipRef,
    }),
    [],
  );

  const form = useQuickTaskForm({ now, timeZone });

  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: ({ signal }) => fetchLabels(signal),
    enabled: open,
  });

  const { resetToDefaults } = form;

  const createMutation = useCreateQuickTask({
    onSuccess: (_data, variables) => {
      submittingRef.current = false;

      if (variables.signal.aborted) {
        return;
      }

      haptics.notification("success");
      onOpenChange(false);
      resetToDefaults();
      void revalidator.revalidate();
    },
    onError: async (mutationError, variables) => {
      submittingRef.current = false;

      if (variables.signal.aborted) {
        return;
      }

      haptics.notification("error");
      setError(describeQuickAddError(mutationError));

      if (mutationError instanceof ApiError && mutationError.status === 404) {
        void queryClient.invalidateQueries({ queryKey: ["labels"] });
        const result = await labelsQuery.refetch();

        if (!result.isSuccess) {
          return;
        }

        form.setValue(
          "labelIds",
          pruneMissingLabelIds(form.getValues("labelIds"), result.data ?? []),
          { shouldDirty: true, shouldValidate: true },
        );
      }
    },
  });

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      resetToDefaults();
      setStep("form");
      setDirection(1);
      setError(null);
      setNow(new Date());
      pendingChipFocusRef.current = null;
      submittingRef.current = false;
    }

    if (!open) {
      abortRef.current?.abort();
    }

    wasOpenRef.current = open;
  }, [open, resetToDefaults]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (step !== "form") {
      return;
    }

    const target = pendingChipFocusRef.current;

    if (target === null) {
      return;
    }

    pendingChipFocusRef.current = null;
    chipRefs[target].current?.focus();
  }, [step, chipRefs]);

  const handleToggleHaptic = useCallback(() => {
    haptics.selection();
  }, [haptics]);

  const handleClose = useCallback(() => {
    haptics.selection();
    abortRef.current?.abort();
    onOpenChange(false);
  }, [haptics, onOpenChange]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    handleClose();
  }

  function blurActiveElement() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function handleOpenStep(nextStep: QuickAddChipStep) {
    blurActiveElement();
    pendingChipFocusRef.current = null;
    setDirection(1);
    setStep(nextStep);
  }

  function returnToForm(stepToFocus: QuickAddChipStep) {
    haptics.selection();
    blurActiveElement();
    pendingChipFocusRef.current = stepToFocus;
    setDirection(-1);
    setStep("form");
  }

  function handleBack() {
    blurActiveElement();
    pendingChipFocusRef.current = null;
    setDirection(-1);
    setStep("form");
  }

  function handleLabelsApply(labelIds: number[]) {
    form.setValue("labelIds", labelIds, { shouldDirty: true });
    returnToForm("labels");
  }

  function handlePriorityApply(priority: Priority) {
    form.setValue("priority", priority, { shouldDirty: true });
    returnToForm("priority");
  }

  function handleDueApply(value: DueStepValue) {
    form.setValue("dueDate", value.date, { shouldDirty: true });
    form.setValue("dueTime", value.time, { shouldDirty: true });
    form.setValue("isRecurring", value.isRecurring, { shouldDirty: true });
    returnToForm("due");
  }

  function handleRemindersApply(value: ReminderDraft) {
    form.setValue("remindersEnabled", value.remindersEnabled, {
      shouldDirty: true,
    });
    form.setValue("beforeDueEnabled", value.beforeDueEnabled, {
      shouldDirty: true,
    });
    form.setValue("beforeDueAmount", value.beforeDueAmount, {
      shouldDirty: true,
    });
    form.setValue("beforeDueUnit", value.beforeDueUnit, { shouldDirty: true });
    form.setValue("scheduledEnabled", value.scheduledEnabled, {
      shouldDirty: true,
    });
    form.setValue("scheduledIntervalDays", value.scheduledIntervalDays, {
      shouldDirty: true,
    });
    form.setValue("scheduledTime", value.scheduledTime, {
      shouldDirty: true,
    });
    returnToForm("reminders");
  }

  const handleSubmit = form.handleSubmit(() => {
    if (createMutation.isPending || submittingRef.current) {
      return;
    }

    setError(null);
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    submittingRef.current = true;

    createMutation.mutate({
      draft: form.getValues(),
      timeZone,
      signal: controller.signal,
    });
  });

  const header = getQuickAddHeader(step);
  const values = form.getValues();
  const labels = labelsQuery.data ?? [];

  let content: ReactElement;

  switch (step) {
    case "labels":
      content = (
        <LabelsStep
          isError={labelsQuery.isError}
          isLoading={labelsQuery.isLoading}
          labels={labels}
          onApply={handleLabelsApply}
          onRetry={() => {
            void labelsQuery.refetch();
          }}
          selectedIds={values.labelIds}
        />
      );
      break;
    case "priority":
      content = (
        <PriorityStep onApply={handlePriorityApply} value={values.priority} />
      );
      break;
    case "due":
      content = (
        <DueStep
          date={values.dueDate}
          isRecurring={values.isRecurring}
          now={now}
          onApply={handleDueApply}
          onToggleHaptic={handleToggleHaptic}
          time={values.dueTime}
          timeZone={timeZone}
        />
      );
      break;
    case "reminders":
      content = (
        <RemindersStep
          onApply={handleRemindersApply}
          onToggleHaptic={handleToggleHaptic}
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
      );
      break;
    default:
      content = (
        <QuickAddForm
          chipRefs={chipRefs}
          descriptionId={descriptionId}
          error={error}
          form={form}
          isPending={createMutation.isPending}
          labels={labels}
          now={now}
          onOpenStep={handleOpenStep}
          onSubmit={handleSubmit}
          timeZone={timeZone}
        />
      );
      break;
  }

  return (
    <BottomSheet
      bodyClassName="p-[15px]"
      closeOnOverlayClick={false}
      describedBy={step === "form" ? descriptionId : undefined}
      footer={
        <BottomSheetAction onClick={handleClose}>Закрыть</BottomSheetAction>
      }
      onBack={header.showBack ? handleBack : undefined}
      onOpenChange={handleOpenChange}
      open={open}
      panelAnimateLayout
      title={header.title}
    >
      <motion.div
        className="relative w-full overflow-hidden"
        layout={keyboard.keyboardInset === 0}
        transition={LAYOUT_TRANSITION}
      >
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <motion.div
            animate="animate"
            custom={direction}
            exit="exit"
            initial="initial"
            key={step}
            variants={STEP_VARIANTS}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </BottomSheet>
  );
}
