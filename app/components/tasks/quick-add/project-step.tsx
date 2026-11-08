import { Fragment, useState } from "react";
import type { ReactElement } from "react";

import checkIcon from "~/assets/icons/check.svg";
import { AssetIcon } from "~/components/ui/asset-icon";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { SearchField } from "~/components/ui/search-field";
import { cn } from "~/lib/cn";
import {
  getProjectIcon,
  NO_PROJECT_ICON,
} from "~/lib/projects/project-icons";
import type { ProjectResponse } from "~/lib/projects/types";

import { ProjectIconBadge } from "./project-icon-badge";
import { matchesSearchQuery } from "./search-filter";

export type ProjectStepState = "loading" | "error";

const PROJECT_STEP_MESSAGES: Record<ProjectStepState, string> = {
  loading: "Загружаем проекты…",
  error: "Не удалось загрузить проекты",
};

const STATUS_CLASSES =
  "px-[15px] py-[10px] text-[15px] text-app-text-secondary";
const RETRY_BUTTON_CLASSES =
  "text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

export function getProjectStepMessage(state: ProjectStepState): string {
  return PROJECT_STEP_MESSAGES[state];
}

export function filterProjectList(
  projects: ProjectResponse[],
  query: string,
): ProjectResponse[] {
  return projects.filter((project) =>
    matchesSearchQuery(project.name, query),
  );
}

export interface ProjectStepProps {
  projects: ProjectResponse[];
  isLoading: boolean;
  isError: boolean;
  selectedId: number | null;
  onRetry: () => void;
  onChange: (id: number | null) => void;
  onApply: (id: number | null) => void;
}

interface ProjectStepRow {
  id: number | null;
  name: string;
  icon: string;
  colorHex: string | null;
}

export function ProjectStep({
  projects,
  isLoading,
  isError,
  selectedId,
  onRetry,
  onChange,
  onApply,
}: ProjectStepProps): ReactElement {
  const [query, setQuery] = useState("");
  const filteredProjects = filterProjectList(projects, query);
  const hasNoMatches =
    !isLoading &&
    !isError &&
    query.trim().length > 0 &&
    filteredProjects.length === 0;
  const rows: ProjectStepRow[] = [
    {
      id: null,
      name: "Без проекта",
      icon: NO_PROJECT_ICON,
      colorHex: null,
    },
    ...filteredProjects.map((project) => ({
      id: project.id,
      name: project.name,
      icon: getProjectIcon(project.icon),
      colorHex: project.color.hex,
    })),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <SearchField
        ariaLabel="Поиск проектов"
        onChange={setQuery}
        value={query}
      />
      <div
        aria-label="Проект"
        className="mt-[15px] flex flex-col"
        role="radiogroup"
      >
        {rows.map((row, index) => {
          const isSelected = row.id === selectedId;
          const isLast = index === rows.length - 1;

          return (
            <Fragment key={row.id ?? "no-project"}>
              <button
                aria-checked={isSelected}
                className="flex h-[50px] w-full items-center gap-[15px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
                onClick={() => onChange(row.id)}
                role="radio"
                type="button"
              >
                {isSelected ? (
                  <AssetIcon className="size-6 text-app-accent" src={checkIcon} />
                ) : (
                  <span aria-hidden="true" className="size-6 shrink-0" />
                )}
                <span
                  className={cn(
                    "flex h-full min-w-0 flex-1 items-center gap-[5px]",
                    !isLast && "border-b border-app-stroke",
                  )}
                >
                  <ProjectIconBadge
                    colorHex={row.colorHex}
                    icon={row.icon}
                  />
                  <span className="truncate text-[15px] leading-[1.3] text-app-text">
                    {row.name}
                  </span>
                </span>
              </button>
              {index === 0 && isLoading ? (
                <p className={STATUS_CLASSES}>
                  {getProjectStepMessage("loading")}
                </p>
              ) : null}
              {index === 0 && isError ? (
                <div
                  className={cn(
                    STATUS_CLASSES,
                    "flex flex-col items-start gap-[10px]",
                  )}
                >
                  <p>{getProjectStepMessage("error")}</p>
                  <button
                    className={RETRY_BUTTON_CLASSES}
                    onClick={onRetry}
                    type="button"
                  >
                    Повторить
                  </button>
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
      {hasNoMatches ? (
        <p className={STATUS_CLASSES}>Ничего не найдено</p>
      ) : null}
      <div className="mt-auto pt-[15px]">
        <BottomSheetPrimaryAction onClick={() => onApply(selectedId)}>
          Готово
        </BottomSheetPrimaryAction>
      </div>
    </div>
  );
}
