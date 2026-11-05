import type { FormEventHandler, ReactElement } from "react";
import type { UseFormReturn } from "react-hook-form";

import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import type { LabelResponse } from "~/lib/labels/types";
import { isQuickTaskSubmittable } from "~/lib/tasks/quick-task-schema";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";

import { QuickAddChips } from "./quick-add-chips";
import type { QuickAddChipRefs, QuickAddChipStep } from "./quick-add-chips";

const TITLE_MAX_LENGTH = 120;

export interface QuickAddFormProps {
  form: UseFormReturn<QuickTaskDraft>;
  labels: LabelResponse[];
  now: Date;
  timeZone: string;
  onOpenStep: (step: QuickAddChipStep) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isPending: boolean;
  error: string | null;
  descriptionId?: string;
  chipRefs?: QuickAddChipRefs;
}

export function QuickAddForm({
  form,
  labels,
  now,
  timeZone,
  onOpenStep,
  onSubmit,
  isPending,
  error,
  descriptionId,
  chipRefs,
}: QuickAddFormProps): ReactElement {
  const values = form.watch();
  const title = values.title;
  const canSubmit = isQuickTaskSubmittable({ title }, isPending);

  return (
    <form className="flex flex-col gap-[20px]" onSubmit={onSubmit}>
      <p
        className="text-[15px] leading-[1.3] text-app-text-secondary"
        id={descriptionId}
      >
        Введите быструю задачу, например: Запись к стоматологу в четверг на 10
        утра
      </p>
      <div className="flex flex-col gap-[5px]">
        <div className="flex items-center justify-between gap-[10px] px-[15px] text-[15px]">
          <span className="text-app-text">Название</span>
          <span className="text-app-text-secondary">
            {title.length}/{TITLE_MAX_LENGTH}
          </span>
        </div>
        <textarea
          {...form.register("title")}
          aria-label="Название задачи"
          className="h-[104px] w-full resize-none rounded-[25px] border border-app-stroke bg-app-card px-[15px] py-[12px] text-[15px] text-app-text placeholder:text-app-text-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
          maxLength={TITLE_MAX_LENGTH}
          placeholder="Запись к стоматологу завтра в 10 утра"
        />
      </div>
      <QuickAddChips
        beforeDueEnabled={values.beforeDueEnabled}
        chipRefs={chipRefs}
        dueDate={values.dueDate}
        dueTime={values.dueTime}
        isRecurring={values.isRecurring}
        labels={labels}
        now={now}
        onOpenStep={onOpenStep}
        priority={values.priority}
        remindersEnabled={values.remindersEnabled}
        scheduledEnabled={values.scheduledEnabled}
        selectedLabelIds={values.labelIds}
        timeZone={timeZone}
      />
      <div className="flex flex-col gap-[10px]">
        {error ? (
          <p
            className="text-[13px] leading-[1.4] text-app-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <BottomSheetPrimaryAction disabled={!canSubmit} type="submit">
          {isPending ? "Добавляем..." : "Добавить задачу"}
        </BottomSheetPrimaryAction>
      </div>
    </form>
  );
}
