import type { ReactElement, Ref } from "react";

import calendarIcon from "~/assets/icons/calendar.svg?no-inline";
import repeatIcon from "~/assets/icons/repeat.svg?no-inline";
import tagPlusIcon from "~/assets/icons/tag-plus.svg";
import tagIcon from "~/assets/icons/tag.svg?no-inline";
import { AssetIcon } from "~/components/ui/asset-icon";
import { OptionChip } from "~/components/ui/option-chip";
import type { LabelResponse } from "~/lib/labels/types";
import { getProjectIcon, NO_PROJECT_ICON } from "~/lib/projects/project-icons";
import type { ProjectResponse } from "~/lib/projects/types";
import { formatDueChip } from "~/lib/tasks/date-time";
import { priorityShortLabel } from "~/lib/tasks/priority";
import type { Priority } from "~/lib/tasks/types";

import { ProjectIconBadge } from "./project-icon-badge";
import type { QuickAddStep } from "./quick-add-step";

export type QuickAddChipStep = QuickAddStep;

export type QuickAddChipRefs = Partial<
  Record<QuickAddChipStep, Ref<HTMLButtonElement>>
>;

export interface QuickAddChipsProps {
  labels: LabelResponse[];
  project?: ProjectResponse;
  now: Date;
  timeZone: string;
  selectedLabelIds: number[];
  priority: Priority;
  dueDate: string;
  dueTime: string;
  isRecurring: boolean;
  remindersEnabled: boolean;
  beforeDueEnabled: boolean;
  scheduledEnabled: boolean;
  onOpenStep: (step: QuickAddChipStep) => void;
  chipRefs?: QuickAddChipRefs;
}

export function QuickAddChips({
  labels,
  project,
  now,
  timeZone,
  selectedLabelIds,
  priority,
  dueDate,
  dueTime,
  isRecurring,
  remindersEnabled,
  beforeDueEnabled,
  scheduledEnabled,
  onOpenStep,
  chipRefs,
}: QuickAddChipsProps): ReactElement {
  const selectedLabels = selectedLabelIds
    .map((id) => labels.find((label) => label.id === id))
    .filter((label): label is LabelResponse => label !== undefined);
  const firstSelectedLabel = selectedLabels[0];
  const labelsText = firstSelectedLabel
    ? selectedLabels.length > 1
      ? `${firstSelectedLabel.name}... + ${selectedLabels.length - 1}`
      : firstSelectedLabel.name
    : "Без метки";
  const labelsIcon = firstSelectedLabel ? (
    <span
      className="inline-flex"
      style={{ color: firstSelectedLabel.color.hex }}
    >
      <AssetIcon className="size-[18px]" src={tagIcon} />
    </span>
  ) : (
    <AssetIcon className="size-[18px]" src={tagPlusIcon} />
  );

  return (
    <div className="flex gap-[5px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <OptionChip
        active
        ariaLabel="Дата и время задачи"
        buttonRef={chipRefs?.due}
        endIcon={
          isRecurring ? (
            <AssetIcon className="size-[18px]" src={repeatIcon} />
          ) : null
        }
        icon={<AssetIcon className="size-[18px]" src={calendarIcon} />}
        iconGap="tight"
        label={formatDueChip(dueDate, dueTime, timeZone, now)}
        onClick={() => onOpenStep("due")}
      />
      <OptionChip
        ariaLabel="Приоритет задачи"
        buttonRef={chipRefs?.priority}
        className="w-[45px] justify-center text-center"
        label={priorityShortLabel(priority)}
        onClick={() => onOpenStep("priority")}
      />
      <OptionChip
        ariaLabel="Выбрать метки"
        buttonRef={chipRefs?.labels}
        icon={labelsIcon}
        label={labelsText}
        onClick={() => onOpenStep("labels")}
      />
      <OptionChip
        ariaLabel={project ? `Проект: ${project.name}` : "Выбрать проект"}
        buttonRef={chipRefs?.project}
        icon={
          <ProjectIconBadge
            colorHex={project ? project.color.hex : null}
            icon={project ? getProjectIcon(project.icon) : NO_PROJECT_ICON}
          />
        }
        label={project?.name ?? "Без проекта"}
        onClick={() => onOpenStep("project")}
      />
      <OptionChip
        active={remindersEnabled && (beforeDueEnabled || scheduledEnabled)}
        ariaLabel="Автонапоминания"
        buttonRef={chipRefs?.reminders}
        label="Напоминание"
        onClick={() => onOpenStep("reminders")}
      />
    </div>
  );
}
