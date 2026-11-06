import { useEffect, useMemo, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRevalidator } from "react-router";

import { SectionHeading } from "~/components/home/section-heading";
import { ApiError } from "~/lib/api/errors";
import { fetchLabels } from "~/lib/labels/labels-api";
import { describeQuickAddError } from "~/lib/tasks/quick-task-errors";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";
import { useAuth } from "~/providers/auth-provider";
import { useTelegram } from "~/providers/telegram-provider";

import { QuickAddDetailSheet } from "./quick-add-detail-sheet";
import { QuickAddForm } from "./quick-add-form";
import type { QuickAddStep } from "./quick-add-step";
import {
  QuickAddStoreProvider,
  useQuickAddStore,
} from "./quick-add-store-provider";
import { useCreateQuickTask } from "./use-create-quick-task";
import { useQuickTaskForm } from "./use-quick-task-form";

export interface QuickAddComposerProps {
  onVoice: () => void;
}

export function QuickAddComposer({
  onVoice,
}: QuickAddComposerProps): ReactElement {
  const { user } = useAuth();
  const timeZone = user?.timezone ?? "UTC";

  return (
    <QuickAddStoreProvider timeZone={timeZone}>
      <QuickAddComposerContent onVoice={onVoice} timeZone={timeZone} />
    </QuickAddStoreProvider>
  );
}

interface QuickAddComposerContentProps {
  onVoice: () => void;
  timeZone: string;
}

function QuickAddComposerContent({
  onVoice,
  timeZone,
}: QuickAddComposerContentProps): ReactElement {
  const { haptics } = useTelegram();
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();

  const draft = useQuickAddStore((state) => state.draft);
  const activeStep = useQuickAddStore((state) => state.activeStep);
  const now = useQuickAddStore((state) => state.now);
  const error = useQuickAddStore((state) => state.error);
  const patchDraft = useQuickAddStore((state) => state.patchDraft);
  const pruneLabelIds = useQuickAddStore((state) => state.pruneLabelIds);
  const resetDraft = useQuickAddStore((state) => state.resetDraft);
  const setError = useQuickAddStore((state) => state.setError);
  const openStep = useQuickAddStore((state) => state.openStep);
  const closeStep = useQuickAddStore((state) => state.closeStep);
  const stepDraft = useQuickAddStore((state) => state.stepDraft);
  const patchStepDraft = useQuickAddStore((state) => state.patchStepDraft);
  const applyStep = useQuickAddStore((state) => state.applyStep);
  const remindersAmountInput = useQuickAddStore(
    (state) => state.remindersAmountInput,
  );
  const setRemindersAmountInput = useQuickAddStore(
    (state) => state.setRemindersAmountInput,
  );

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

  const form = useQuickTaskForm({ draft });

  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: ({ signal }) => fetchLabels(signal),
    enabled: true,
  });

  const createMutation = useCreateQuickTask({
    onSuccess: (_data, variables) => {
      submittingRef.current = false;

      if (variables.signal.aborted) {
        return;
      }

      haptics.notification("success");
      resetDraft();
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

        pruneLabelIds((result.data ?? []).map((label) => label.id));
      }
    },
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (activeStep !== null) {
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
  }, [activeStep, chipRefs]);

  function blurActiveElement() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function handleOpenDetail(nextStep: QuickAddStep) {
    haptics.selection();
    blurActiveElement();
    pendingChipFocusRef.current = nextStep;
    openStep(nextStep);
  }

  function closeDetail() {
    haptics.selection();
    closeStep();
  }

  function handleApplyStep(patch: Partial<QuickTaskDraft>) {
    applyStep(patch);
    haptics.selection();
  }

  const handleSubmit = form.handleSubmit((validDraft) => {
    if (createMutation.isPending || submittingRef.current) {
      return;
    }

    setError(null);
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    submittingRef.current = true;

    createMutation.mutate({
      draft: validDraft,
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
        draft={draft}
        error={error}
        form={form}
        isPending={createMutation.isPending}
        labels={labels}
        now={now}
        onOpenStep={handleOpenDetail}
        onSubmit={handleSubmit}
        onTitleChange={(title) => patchDraft({ title })}
        onVoice={onVoice}
        timeZone={timeZone}
      />
      <QuickAddDetailSheet
        amountInput={remindersAmountInput}
        isLabelsError={labelsQuery.isError}
        isLabelsLoading={labelsQuery.isLoading}
        labels={labels}
        now={now}
        onAmountInputChange={setRemindersAmountInput}
        onApply={handleApplyStep}
        onClose={closeDetail}
        onPatch={patchStepDraft}
        onRetryLabels={() => {
          void labelsQuery.refetch();
        }}
        step={activeStep}
        timeZone={timeZone}
        values={stepDraft ?? draft}
      />
    </section>
  );
}
