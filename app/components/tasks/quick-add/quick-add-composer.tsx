import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRevalidator } from "react-router";

import { SectionHeading } from "~/components/home/section-heading";
import { ApiError } from "~/lib/api/errors";
import { fetchLabels } from "~/lib/labels/labels-api";
import { pruneMissingLabelIds } from "~/lib/labels/labels-selection";
import { describeQuickAddError } from "~/lib/tasks/quick-task-errors";
import type { Priority } from "~/lib/tasks/types";
import { useAuth } from "~/providers/auth-provider";
import { useTelegram } from "~/providers/telegram-provider";

import type { DueStepValue } from "./due-step";
import { QuickAddDetailSheet } from "./quick-add-detail-sheet";
import { QuickAddForm } from "./quick-add-form";
import type { QuickAddStep } from "./quick-add-step";
import type { ReminderDraft } from "./reminders-step";
import { useCreateQuickTask } from "./use-create-quick-task";
import { useQuickTaskForm } from "./use-quick-task-form";

export interface QuickAddComposerProps {
  onVoice: () => void;
}

export function QuickAddComposer({
  onVoice,
}: QuickAddComposerProps): ReactElement {
  const { user } = useAuth();
  const { haptics } = useTelegram();
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const timeZone = user?.timezone ?? "UTC";

  const [activeDetail, setActiveDetail] = useState<QuickAddStep | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);
  const pendingChipFocusRef = useRef<QuickAddStep | null>(null);

  const labelsChipRef = useRef<HTMLButtonElement>(null);
  const priorityChipRef = useRef<HTMLButtonElement>(null);
  const dueChipRef = useRef<HTMLButtonElement>(null);
  const remindersChipRef = useRef<HTMLButtonElement>(null);

  const chipRefs = useMemo<
    Record<QuickAddStep, RefObject<HTMLButtonElement | null>>
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
  const values = form.watch();

  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: ({ signal }) => fetchLabels(signal),
    enabled: true,
  });

  const { resetToDefaults } = form;

  const createMutation = useCreateQuickTask({
    onSuccess: (_data, variables) => {
      submittingRef.current = false;

      if (variables.signal.aborted) {
        return;
      }

      haptics.notification("success");
      resetToDefaults();
      setError(null);
      setNow(new Date());
      setActiveDetail(null);
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
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (activeDetail !== null) {
      return;
    }

    const target = pendingChipFocusRef.current;

    if (target === null) {
      return;
    }

    pendingChipFocusRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      chipRefs[target].current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeDetail, chipRefs]);

  function blurActiveElement() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function handleOpenDetail(nextStep: QuickAddStep) {
    haptics.selection();
    blurActiveElement();
    pendingChipFocusRef.current = nextStep;

    if (nextStep === "due") {
      setNow(new Date());
    }

    setActiveDetail(nextStep);
  }

  function closeDetail() {
    haptics.selection();
    setActiveDetail(null);
  }

  function handleLabelsApply(labelIds: number[]) {
    form.setValue("labelIds", labelIds, { shouldDirty: true });
    haptics.selection();
    setActiveDetail(null);
  }

  function handlePriorityApply(priority: Priority) {
    form.setValue("priority", priority, { shouldDirty: true });
    haptics.selection();
    setActiveDetail(null);
  }

  function handleDueApply(value: DueStepValue) {
    form.setValue("dueDate", value.date, { shouldDirty: true });
    form.setValue("dueTime", value.time, { shouldDirty: true });
    form.setValue("isRecurring", value.isRecurring, { shouldDirty: true });
    haptics.selection();
    setActiveDetail(null);
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
    haptics.selection();
    setActiveDetail(null);
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

  const labels = labelsQuery.data ?? [];

  return (
    <section
      aria-labelledby="quick-add-title"
      className="flex flex-col gap-[10px] pt-[15px]"
    >
      <SectionHeading id="quick-add-title">
        Быстрое создание задачи
      </SectionHeading>
      <QuickAddForm
        chipRefs={chipRefs}
        error={error}
        form={form}
        isPending={createMutation.isPending}
        labels={labels}
        now={now}
        onOpenStep={handleOpenDetail}
        onSubmit={handleSubmit}
        onVoice={onVoice}
        timeZone={timeZone}
      />
      <QuickAddDetailSheet
        isLabelsError={labelsQuery.isError}
        isLabelsLoading={labelsQuery.isLoading}
        labels={labels}
        now={now}
        onApplyDue={handleDueApply}
        onApplyLabels={handleLabelsApply}
        onApplyPriority={handlePriorityApply}
        onApplyReminders={handleRemindersApply}
        onClose={closeDetail}
        onRetryLabels={() => {
          void labelsQuery.refetch();
        }}
        step={activeDetail}
        timeZone={timeZone}
        values={values}
      />
    </section>
  );
}
