import { useState } from "react";
import type { ReactElement } from "react";

import { ProjectIconBadge } from "~/components/tasks/quick-add/project-icon-badge";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { SearchField } from "~/components/ui/search-field";
import { cn } from "~/lib/cn";
import { getProjectIcon } from "~/lib/projects/project-icons";
import type { ProjectResponse } from "~/lib/projects/types";
import {
  formatProjectsFound,
  pruneMissingIds,
  toggleSelection,
} from "~/lib/tasks/search-filters";
import { matchesSearchQuery } from "~/lib/text-search";

import { FilterOptionRow } from "./filter-option-row";

const STATUS_CLASSES =
  "px-[15px] py-[10px] text-[15px] text-app-text-secondary";
const RETRY_BUTTON_CLASSES =
  "text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";
const RESET_BUTTON_CLASSES =
  "text-[13px] leading-[1.4] text-app-destructive transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

export function filterProjectList(
  projects: ProjectResponse[],
  query: string,
): ProjectResponse[] {
  return projects.filter((project) =>
    matchesSearchQuery(project.name, query),
  );
}

export interface ProjectFilterStepProps {
  projects: ProjectResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  initialSelectedIds: number[];
  onApply: (ids: number[]) => void;
}

export function ProjectFilterStep({
  projects,
  isLoading,
  isError,
  onRetry,
  initialSelectedIds,
  onApply,
}: ProjectFilterStepProps): ReactElement {
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [query, setQuery] = useState("");
  const filteredProjects = filterProjectList(projects, query);
  const isReady = !isLoading && !isError;
  const hasNoMatches =
    isReady && query.trim().length > 0 && filteredProjects.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <SearchField
        ariaLabel="Поиск проектов"
        onChange={setQuery}
        value={query}
      />
      <div className="mt-[15px]">
        {isReady ? (
          <div className="flex items-center justify-between gap-[10px] pb-[10px]">
            <span className="text-[13px] leading-[1.4] text-app-text-secondary">
              {formatProjectsFound(filteredProjects.length)}
            </span>
            {selectedIds.length > 0 ? (
              <button
                className={RESET_BUTTON_CLASSES}
                onClick={() => setSelectedIds([])}
                type="button"
              >
                Сбросить
              </button>
            ) : null}
          </div>
        ) : null}
        <div aria-label="Проекты" className="flex flex-col" role="group">
          {isLoading ? (
            <p className={STATUS_CLASSES}>Загружаем проекты…</p>
          ) : null}
          {isError ? (
            <div
              className={cn(
                STATUS_CLASSES,
                "flex flex-col items-start gap-[10px]",
              )}
            >
              <p>Не удалось загрузить проекты</p>
              <button
                className={RETRY_BUTTON_CLASSES}
                onClick={onRetry}
                type="button"
              >
                Повторить
              </button>
            </div>
          ) : null}
          {filteredProjects.map((project, index) => (
            <FilterOptionRow
              key={project.id}
              heightClassName="h-[50px]"
              label={project.name}
              leading={
                <ProjectIconBadge
                  colorHex={project.color.hex}
                  icon={getProjectIcon(project.icon)}
                />
              }
              onClick={() =>
                setSelectedIds((current) =>
                  toggleSelection(current, project.id),
                )
              }
              role="checkbox"
              selected={selectedIds.includes(project.id)}
              showSeparator={index < filteredProjects.length - 1}
            />
          ))}
        </div>
        {hasNoMatches ? (
          <p className={STATUS_CLASSES}>Ничего не найдено</p>
        ) : null}
      </div>
      <div className="mt-auto pt-[15px]">
        <BottomSheetPrimaryAction
          onClick={() =>
            onApply(
              isReady
                ? pruneMissingIds(
                    selectedIds,
                    projects.map((project) => project.id),
                  )
                : selectedIds,
            )
          }
        >
          Применить
        </BottomSheetPrimaryAction>
      </div>
    </div>
  );
}
