import type { FormEventHandler, ReactElement } from "react";
import type { UseFormReturn } from "react-hook-form";

import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { MicIcon } from "~/components/voice/mic-icon";
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
  onVoice: () => void;
  isPending: boolean;
  error: string | null;
  chipRefs?: QuickAddChipRefs;
}

export function QuickAddForm({
  form,
  labels,
  now,
  timeZone,
  onOpenStep,
  onSubmit,
  onVoice,
  isPending,
  error,
  chipRefs,
}: QuickAddFormProps): ReactElement {
  const values = form.watch();
  const title = values.title;
  const canSubmit = isQuickTaskSubmittable({ title }, isPending);

  return (
    <form className="flex flex-col gap-[10px]" onSubmit={onSubmit}>
      <div className="relative h-[104px] w-full rounded-[25px] border border-app-stroke bg-app-card focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-app-accent">
        <textarea
          {...form.register("title")}
          aria-label="Название задачи"
          className="h-full w-full resize-none rounded-[25px] bg-transparent pl-[15px] pt-[12px] pr-[60px] pb-[30px] text-[15px] leading-[1.3] text-app-text placeholder:text-app-text focus-visible:outline-none"
          maxLength={TITLE_MAX_LENGTH}
          placeholder="Запись к стоматологу завтра в 10 утра"
        />
        <span className="pointer-events-none absolute bottom-[12px] right-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
          {title.length}/{TITLE_MAX_LENGTH}
        </span>
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
        <div className="flex items-center gap-[10px]">
          <div className="min-w-0 flex-1">
            <BottomSheetPrimaryAction disabled={!canSubmit} type="submit">
              {isPending ? "Добавляем..." : "Добавить задачу"}
            </BottomSheetPrimaryAction>
          </div>
          <button
            aria-label="Записать голосом"
            className="flex size-[50px] shrink-0 items-center justify-center rounded-full border border-app-stroke bg-app-card text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
            onClick={onVoice}
            type="button"
          >
            <MicIcon className="size-[25px]" />
          </button>
        </div>
      </div>
    </form>
  );
}
