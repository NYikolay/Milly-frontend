import { useState } from "react";
import type { ReactElement } from "react";

import tagIcon from "~/assets/icons/tag.svg";
import { AssetIcon } from "~/components/ui/asset-icon";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { cn } from "~/lib/cn";
import type { LabelResponse } from "~/lib/labels/types";

const MAX_LABEL_COUNT = 100;
const STATUS_CLASSES =
  "flex min-h-[120px] flex-col items-center justify-center gap-[10px] px-[15px] text-center text-[15px] text-app-text-secondary";
const RETRY_BUTTON_CLASSES =
  "text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent";

export type LabelsStepState = "loading" | "error" | "empty";

const LABELS_STEP_MESSAGES: Record<LabelsStepState, string> = {
  loading: "Загружаем метки…",
  error: "Не удалось загрузить метки",
  empty: "На текущий момент у вас не создано ни 1 метки",
};

export function getLabelsStepMessage(state: LabelsStepState): string {
  return LABELS_STEP_MESSAGES[state];
}

export interface LabelsStepProps {
  labels: LabelResponse[];
  isLoading: boolean;
  isError: boolean;
  selectedIds: number[];
  onRetry: () => void;
  onApply: (ids: number[]) => void;
}

function uniqueLabelIds(ids: number[]): number[] {
  return Array.from(new Set(ids)).slice(0, MAX_LABEL_COUNT);
}

function uniqueLabels(labels: LabelResponse[]): LabelResponse[] {
  const seen = new Set<number>();

  return labels.filter((label) => {
    if (seen.has(label.id)) {
      return false;
    }

    seen.add(label.id);

    return true;
  });
}

export function LabelsStep({
  labels,
  isLoading,
  isError,
  selectedIds,
  onRetry,
  onApply,
}: LabelsStepProps): ReactElement {
  const [selected, setSelected] = useState<number[]>(() =>
    uniqueLabelIds(selectedIds),
  );

  const items = uniqueLabels(labels);
  const visibleIds = new Set(items.map((label) => label.id));
  const isReady = !isLoading && !isError;
  const visibleSelected = isReady
    ? selected.filter((id) => visibleIds.has(id))
    : selected;

  function toggleLabel(id: number) {
    setSelected((current) => {
      const base = isReady
        ? current.filter((selectedId) => visibleIds.has(selectedId))
        : current;

      if (base.includes(id)) {
        return base.filter((selectedId) => selectedId !== id);
      }

      if (base.length >= MAX_LABEL_COUNT) {
        return base;
      }

      return [...base, id];
    });
  }

  let content: ReactElement;

  if (isLoading) {
    content = (
      <p className={STATUS_CLASSES}>{getLabelsStepMessage("loading")}</p>
    );
  } else if (isError) {
    content = (
      <div className={STATUS_CLASSES}>
        <p>{getLabelsStepMessage("error")}</p>
        <button
          className={RETRY_BUTTON_CLASSES}
          onClick={onRetry}
          type="button"
        >
          Повторить
        </button>
      </div>
    );
  } else if (items.length === 0) {
    content = <p className={STATUS_CLASSES}>{getLabelsStepMessage("empty")}</p>;
  } else {
    content = (
      <ul className="flex flex-col">
        {items.map((label) => {
          const isSelected = visibleSelected.includes(label.id);

          return (
            <li className="border-b border-app-stroke" key={label.id}>
              <button
                aria-checked={isSelected}
                className="flex h-[47px] w-full items-center gap-[10px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
                onClick={() => toggleLabel(label.id)}
                role="checkbox"
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    isSelected ? "border-app-accent" : "border-app-stroke",
                  )}
                >
                  {isSelected ? (
                    <span className="size-2.5 rounded-full bg-app-accent" />
                  ) : null}
                </span>
                <span
                  className="shrink-0"
                  style={{ color: label.color.hex }}
                >
                  <AssetIcon className="size-6" src={tagIcon} />
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-[15px]"
                  style={{ color: label.color.hex }}
                >
                  {label.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex flex-col">
      {content}
      <BottomSheetPrimaryAction
        className="mt-[15px]"
        onClick={() => onApply(uniqueLabelIds(visibleSelected))}
      >
        Применить
      </BottomSheetPrimaryAction>
    </div>
  );
}
