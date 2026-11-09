import { useEffect, useMemo, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRevalidator } from "react-router";

import { SectionHeading } from "~/components/home/section-heading";
import { labelsQueryOptions } from "~/lib/labels/labels-query";
import { projectsQueryOptions } from "~/lib/projects/projects-query";
import {
  describeQuickAddError,
  QUICK_ADD_SELECTION_UNAVAILABLE_COPY,
} from "~/lib/tasks/quick-task-errors";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";
import { showTaskCreatedToast } from "~/lib/tasks/task-toasts";
import { useAuth } from "~/providers/auth-provider";
import { useTelegram } from "~/providers/telegram-provider";

import { QuickAddDetailSheet } from "./quick-add-detail-sheet";
import { QuickAddForm } from "./quick-add-form";
import { reconcileQuickAddSelection } from "./quick-add-reconcile";
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
  const revalidator = useRevalidator();

  const draft = useQuickAddStore((state) => state.draft);
  const activeStep = useQuickAddStore((state) => state.activeStep);
  const now = useQuickAddStore((state) => state.now);
  const error = useQuickAddStore((state) => state.error);
  const patchDraft = useQuickAddStore((state) => state.patchDraft);
  const pruneLabelIds = useQuickAddStore((state) => state.pruneLabelIds);
  const pruneProjectId = useQuickAddStore((state) => state.pruneProjectId);
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
  const projectChipRef = useRef<HTMLButtonElement>(null);
  const priorityChipRef = useRef<HTMLButtonElement>(null);
  const dueChipRef = useRef<HTMLButtonElement>(null);
  const remindersChipRef = useRef<HTMLButtonElement>(null);

  const chipRefs = useMemo<
    Record<QuickAddStep, RefObject<HTMLButtonElement | null>>
  >(
    () => ({
      labels: labelsChipRef,
      project: projectChipRef,
      priority: priorityChipRef,
      due: dueChipRef,
      reminders: remindersChipRef,
    }),
    [],
  );

  const form = useQuickTaskForm({ draft });

  const labelsQuery = useQuery(labelsQueryOptions);
  const projectsQuery = useQuery(projectsQueryOptions);

  useEffect(() => {
    if (!projectsQuery.isSuccess) {
      return;
    }

    pruneProjectId((projectsQuery.data ?? []).map((project) => project.id));
  }, [projectsQuery.data, projectsQuery.isSuccess, pruneProjectId]);

  const createMutation = useCreateQuickTask({
    onSuccess: (_data, variables) => {
      submittingRef.current = false;

      if (variables.signal.aborted) {
        return;
      }

      haptics.notification("success");
      showTaskCreatedToast();
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

      const showSelectionUnavailable = await reconcileQuickAddSelection({
        error: mutationError,
        selectedProjectId: variables.draft.projectId,
        refetchLabels: () => labelsQuery.refetch(),
        refetchProjects: () => projectsQuery.refetch(),
        pruneLabelIds,
        pruneProjectId,
      });

      if (showSelectionUnavailable) {
        setError(QUICK_ADD_SELECTION_UNAVAILABLE_COPY);
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
  const projects = projectsQuery.data ?? [];
  const selectedProject =
    draft.projectId === null
      ? undefined
      : projects.find((project) => project.id === draft.projectId);

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
        project={selectedProject}
        onSubmit={handleSubmit}
        onTitleChange={(title) => patchDraft({ title })}
        onVoice={onVoice}
        timeZone={timeZone}
      />
      <QuickAddDetailSheet
        amountInput={remindersAmountInput}
        isLabelsError={labelsQuery.isError}
        isLabelsLoading={labelsQuery.isLoading}
        isProjectsError={projectsQuery.isError}
        isProjectsLoading={projectsQuery.isLoading}
        labels={labels}
        now={now}
        onAmountInputChange={setRemindersAmountInput}
        onApply={handleApplyStep}
        onClose={closeDetail}
        onPatch={patchStepDraft}
        onRetryLabels={() => {
          void labelsQuery.refetch();
        }}
        onRetryProjects={() => {
          void projectsQuery.refetch();
        }}
        projects={projects}
        step={activeStep}
        timeZone={timeZone}
        values={stepDraft ?? draft}
      />
    </section>
  );
}
