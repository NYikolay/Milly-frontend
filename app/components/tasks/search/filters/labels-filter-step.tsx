import { useState } from "react";
import type { ReactElement } from "react";

import tagIcon from "~/assets/icons/tag-raw.svg?no-inline";
import { AssetIcon } from "~/components/ui/asset-icon";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { SearchField } from "~/components/ui/search-field";
import { cn } from "~/lib/cn";
import type { LabelResponse } from "~/lib/labels/types";
import {
  pruneMissingIds,
  toggleSelection,
} from "~/lib/tasks/search-filters";
import { matchesSearchQuery } from "~/lib/text-search";

import { FilterOptionRow } from "./filter-option-row";

const STATUS_CLASSES =
  "px-[15px] py-[10px] text-[15px] text-app-text-secondary";
const RETRY_BUTTON_CLASSES =
  "text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

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

export interface LabelsFilterStepProps {
  labels: LabelResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  initialSelectedIds: number[];
  onApply: (ids: number[]) => void;
}

export function LabelsFilterStep({
  labels,
  isLoading,
  isError,
  onRetry,
  initialSelectedIds,
  onApply,
}: LabelsFilterStepProps): ReactElement {
  const items = uniqueLabels(labels);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [query, setQuery] = useState("");
  const isReady = !isLoading && !isError;
  const filteredItems = items.filter((label) =>
    matchesSearchQuery(label.name, query),
  );
  const hasNoMatches =
    isReady && query.trim().length > 0 && filteredItems.length === 0;

  let content: ReactElement;

  if (isLoading) {
    content = <p className={STATUS_CLASSES}>Загружаем метки…</p>;
  } else if (isError) {
    content = (
      <div
        className={cn(
          STATUS_CLASSES,
          "flex flex-col items-start gap-[10px]",
        )}
      >
        <p>Не удалось загрузить метки</p>
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
    content = (
      <p className={STATUS_CLASSES}>
        На текущий момент у вас не создано ни 1 метки
      </p>
    );
  } else if (hasNoMatches) {
    content = <p className={STATUS_CLASSES}>Ничего не найдено</p>;
  } else {
    content = (
      <div aria-label="Метки" className="flex flex-col" role="group">
        {filteredItems.map((label, index) => (
          <FilterOptionRow
            key={label.id}
            heightClassName="h-[50px]"
            label={label.name}
            labelStyle={{ color: label.color.hex }}
            leading={
              <span style={{ color: label.color.hex }}>
                <AssetIcon className="size-[18px]" src={tagIcon} />
              </span>
            }
            onClick={() =>
              setSelectedIds((current) => toggleSelection(current, label.id))
            }
            role="checkbox"
            selected={selectedIds.includes(label.id)}
            showSeparator={index < filteredItems.length - 1}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <SearchField ariaLabel="Поиск меток" onChange={setQuery} value={query} />
      <div className="mt-[15px]">{content}</div>
      <div className="mt-auto pt-[15px]">
        <BottomSheetPrimaryAction
          onClick={() =>
            onApply(
              isReady
                ? pruneMissingIds(
                    selectedIds,
                    items.map((label) => label.id),
                  )
                : selectedIds,
            )
          }
        >
          Готово
        </BottomSheetPrimaryAction>
      </div>
    </div>
  );
}
