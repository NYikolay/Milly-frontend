import { useState } from "react";
import type { ReactElement } from "react";

import tagPlusIcon from "~/assets/icons/tag-plus.svg?no-inline";
import tagIcon from "~/assets/icons/tag-raw.svg?no-inline";
import { AssetIcon } from "~/components/ui/asset-icon";
import { SearchField } from "~/components/ui/search-field";
import { cn } from "~/lib/cn";
import type { LabelResponse } from "~/lib/labels/types";
import { matchesSearchQuery } from "~/lib/text-search";

const SUBTITLE = "Выберите или создайте метки для текущей задачи.";
const EMPTY_SUBTITLE =
  "На данный момент у вас отсутствуют какие-либо метки, но вы можете создать первую прямо сейчас.";
const EXPLANATION =
  "Это позволит вам группировать и фильтровать свои задачи";
const STATUS_TEXT_CLASSES =
  "text-[15px] leading-[1.3] text-app-text-secondary";
const STATUS_BLOCK_CLASSES = cn("px-[15px] py-[10px]", STATUS_TEXT_CLASSES);
const RETRY_BUTTON_CLASSES =
  "text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

function LabelsLoadingStatus(): ReactElement {
  return (
    <p
      aria-live="polite"
      className={STATUS_BLOCK_CLASSES}
      role="status"
    >
      Загружаем метки…
    </p>
  );
}

function LabelsErrorStatus({
  onRetry,
}: {
  onRetry: () => void;
}): ReactElement {
  return (
    <div className="flex flex-col items-start gap-[10px] px-[15px] py-[10px]">
      <p className={STATUS_TEXT_CLASSES} role="alert">
        Не удалось загрузить метки
      </p>
      <button
        className={RETRY_BUTTON_CLASSES}
        onClick={onRetry}
        type="button"
      >
        Повторить
      </button>
    </div>
  );
}

export interface TaskLabelsViewProps {
  selectedIds: readonly number[];
  labels: readonly LabelResponse[];
  isLabelsLoading: boolean;
  isLabelsError: boolean;
  onRetryLabels: () => void;
  onToggle: (labelId: number) => void;
}

export function filterLabels(
  labels: readonly LabelResponse[],
  query: string,
): LabelResponse[] {
  return labels.filter((label) => matchesSearchQuery(label.name, query));
}

function uniqueLabels(labels: readonly LabelResponse[]): LabelResponse[] {
  const seen = new Set<number>();

  return labels.filter((label) => {
    if (seen.has(label.id)) {
      return false;
    }

    seen.add(label.id);

    return true;
  });
}

export function TaskLabelsView({
  selectedIds,
  labels,
  isLabelsLoading,
  isLabelsError,
  onRetryLabels,
  onToggle,
}: TaskLabelsViewProps): ReactElement {
  const items = uniqueLabels(labels);
  const [query, setQuery] = useState("");
  const isReady = !isLabelsLoading && !isLabelsError;
  const isErrorVisible = isLabelsError && !isLabelsLoading;
  const filteredItems = filterLabels(items, query);
  const hasNoMatches =
    query.trim().length > 0 && items.length > 0 && filteredItems.length === 0;
  const subtitle = isReady && items.length === 0 ? EMPTY_SUBTITLE : SUBTITLE;

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="px-[15px] py-[15px]">
        <h1 className="break-words text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">
          Выбор меток задачи
        </h1>
      </div>

      <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
        {subtitle}
      </p>

      <button
        className="flex h-[50px] w-full items-center justify-center gap-[5px] rounded-[25px] bg-app-card text-[15px] leading-[1.3] text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
        type="button"
      >
        <AssetIcon className="size-[18px] shrink-0" src={tagPlusIcon} />
        Создать метку
      </button>

      {items.length > 0 ? (
        <SearchField ariaLabel="Поиск меток" onChange={setQuery} value={query} />
      ) : null}

      {isLabelsLoading && items.length === 0 ? (
        <LabelsLoadingStatus />
      ) : null}

      {isErrorVisible && items.length === 0 ? (
        <LabelsErrorStatus onRetry={onRetryLabels} />
      ) : null}

      {items.length > 0 ? (
        <div
          aria-label="Метки"
          className="flex flex-col gap-[10px] rounded-[25px] bg-app-card px-[15px] py-[15px]"
          role="group"
        >
          {hasNoMatches ? (
            <p className={STATUS_TEXT_CLASSES}>Ничего не найдено</p>
          ) : (
            filteredItems.map((label, index) => {
              const isSelected = selectedIds.includes(label.id);
              const isLast = index === filteredItems.length - 1;

              return (
                <button
                  aria-checked={isSelected}
                  className="flex h-[47px] w-full items-center gap-[15px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
                  key={label.id}
                  onClick={() => onToggle(label.id)}
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
                      !isLast && "border-b border-app-stroke",
                    )}
                  >
                    <span
                      className="shrink-0"
                      style={{ color: label.color.hex }}
                    >
                      <AssetIcon className="size-[18px]" src={tagIcon} />
                    </span>
                    <span
                      className="truncate text-[15px] leading-[1.3]"
                      style={{ color: label.color.hex }}
                    >
                      {label.name}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}

      {isLabelsLoading && items.length > 0 ? (
        <LabelsLoadingStatus />
      ) : null}

      {isErrorVisible && items.length > 0 ? (
        <LabelsErrorStatus onRetry={onRetryLabels} />
      ) : null}

      <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
        {EXPLANATION}
      </p>
    </div>
  );
}
