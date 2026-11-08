import { useState } from "react";
import type { ReactElement } from "react";

import tagIcon from "~/assets/icons/tag-raw.svg?no-inline";
import { AssetIcon } from "~/components/ui/asset-icon";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { SearchField } from "~/components/ui/search-field";
import { cn } from "~/lib/cn";
import type { LabelResponse } from "~/lib/labels/types";

import { matchesSearchQuery } from "./search-filter";

const MAX_LABEL_COUNT = 100;
const STATUS_CLASSES =
  "flex min-h-[120px] flex-col items-center justify-center gap-[10px] px-[15px] text-center text-[15px] text-app-text-secondary";
const RETRY_BUTTON_CLASSES =
  "text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

export type LabelsStepState = "loading" | "error" | "empty";

const LABELS_STEP_MESSAGES: Record<LabelsStepState, string> = {
  loading: "Загружаем метки…",
  error: "Не удалось загрузить метки",
  empty: "На текущий момент у вас не создано ни 1 метки",
};

export function getLabelsStepMessage(state: LabelsStepState): string {
  return LABELS_STEP_MESSAGES[state];
}

export function filterLabelList(
  labels: LabelResponse[],
  query: string,
): LabelResponse[] {
  return labels.filter((label) => matchesSearchQuery(label.name, query));
}

export interface LabelsStepProps {
  labels: LabelResponse[];
  isLoading: boolean;
  isError: boolean;
  selectedIds: number[];
  onRetry: () => void;
  onChange: (ids: number[]) => void;
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
  onChange,
  onApply,
}: LabelsStepProps): ReactElement {
  const items = uniqueLabels(labels);
  const [query, setQuery] = useState("");
  const visibleIds = new Set(items.map((label) => label.id));
  const isReady = !isLoading && !isError;
  const filteredItems = filterLabelList(items, query);
  const hasSearchQuery = query.trim().length > 0;
  const hasNoMatches =
    isReady && hasSearchQuery && items.length > 0 && filteredItems.length === 0;
  const visibleSelected = isReady
    ? selectedIds.filter((id) => visibleIds.has(id))
    : selectedIds;

  function toggleLabel(id: number) {
    if (visibleSelected.includes(id)) {
      onChange(visibleSelected.filter((selectedId) => selectedId !== id));
      return;
    }

    if (visibleSelected.length >= MAX_LABEL_COUNT) {
      return;
    }

    onChange([...visibleSelected, id]);
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
  } else if (hasNoMatches) {
    content = <p className={STATUS_CLASSES}>Ничего не найдено</p>;
  } else {
    content = (
      <ul className="flex flex-col px-[15px]">
        {filteredItems.map((label, index) => {
          const isSelected = visibleSelected.includes(label.id);

          return (
            <li key={label.id}>
              <button
                aria-checked={isSelected}
                className="flex h-[50px] w-full items-center gap-[15px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
                onClick={() => toggleLabel(label.id)}
                role="checkbox"
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    isSelected
                      ? "border-app-accent"
                      : "border-app-text-secondary/55",
                  )}
                >
                  {isSelected ? (
                    <span className="size-[15px] rounded-full bg-app-accent" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "flex h-full min-w-0 flex-1 items-center gap-[5px]",
                    index < filteredItems.length - 1 &&
                      "border-b border-app-stroke",
                  )}
                >
                  <span className="shrink-0" style={{ color: label.color.hex }}>
                    <AssetIcon className="size-[18px]" src={tagIcon} />
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-[15px] leading-[1.3]"
                    style={{ color: label.color.hex }}
                  >
                    {label.name}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <SearchField ariaLabel="Поиск меток" onChange={setQuery} value={query} />
      <div className="mt-[15px]">{content}</div>
      <div className="mt-auto pt-[15px]">
        <BottomSheetPrimaryAction
          onClick={() => onApply(uniqueLabelIds(visibleSelected))}
        >
          Готово
        </BottomSheetPrimaryAction>
      </div>
    </div>
  );
}
