import type { ReactElement } from "react";

import checkIcon from "~/assets/icons/check.svg?no-inline";
import { ProjectIconBadge } from "~/components/tasks/quick-add/project-icon-badge";
import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";
import {
  getProjectIcon,
  NO_PROJECT_ICON,
} from "~/lib/projects/project-icons";
import type { ProjectResponse } from "~/lib/projects/types";

export interface TaskProjectViewProps {
  selectedProjectId: number | null;
  projects: readonly ProjectResponse[];
  isProjectsLoading: boolean;
  isProjectsError: boolean;
  onRetryProjects: () => void;
  onSelect: (projectId: number | null) => void;
}

interface ProjectRow {
  id: number | null;
  name: string;
  icon: string;
  colorHex: string | null;
}

const STATUS_TEXT_CLASSES =
  "text-[15px] leading-[1.3] text-app-text-secondary";
const STATUS_BLOCK_CLASSES = cn("py-[10px]", STATUS_TEXT_CLASSES);
const RETRY_BUTTON_CLASSES =
  "text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

export function TaskProjectView({
  selectedProjectId,
  projects,
  isProjectsLoading,
  isProjectsError,
  onRetryProjects,
  onSelect,
}: TaskProjectViewProps): ReactElement {
  const rows: ProjectRow[] = [
    {
      id: null,
      name: "Без проекта",
      icon: NO_PROJECT_ICON,
      colorHex: null,
    },
    ...projects.map((project) => ({
      id: project.id,
      name: project.name,
      icon: getProjectIcon(project.icon),
      colorHex: project.color.hex,
    })),
  ];

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="px-[15px] py-[15px]">
        <h1 className="break-words text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">
          Выбор проекта
        </h1>
      </div>

      <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
        Выберите к какому проекту привязать задачу
      </p>

      <div
        aria-label="Проект"
        className="flex flex-col rounded-[25px] bg-app-card px-[15px] py-[15px]"
        role="radiogroup"
      >
        {rows.map((row, index) => {
          const isSelected = row.id === selectedProjectId;
          const isLast = index === rows.length - 1;

          return (
            <button
              aria-checked={isSelected}
              className="flex h-[47px] w-full items-center gap-[11px] text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
              key={row.id ?? "no-project"}
              onClick={() => onSelect(row.id)}
              role="radio"
              type="button"
            >
              {isSelected ? (
                <AssetIcon
                  className="size-6 shrink-0 text-app-accent"
                  src={checkIcon}
                />
              ) : (
                <span aria-hidden="true" className="size-6 shrink-0" />
              )}
              <span
                className={cn(
                  "flex h-full min-w-0 flex-1 items-center gap-[5px]",
                  !isLast && "border-b border-app-stroke",
                )}
              >
                <ProjectIconBadge colorHex={row.colorHex} icon={row.icon} />
                <span className="truncate text-[15px] leading-[1.3] text-app-text">
                  {row.name}
                </span>
              </span>
            </button>
          );
        })}

        {isProjectsLoading ? (
          <p className={STATUS_BLOCK_CLASSES}>Загружаем проекты…</p>
        ) : null}

        {isProjectsError ? (
          <div className="flex flex-col items-start gap-[10px] py-[10px]">
            <p className={STATUS_TEXT_CLASSES}>Не удалось загрузить проекты</p>
            <button
              className={RETRY_BUTTON_CLASSES}
              onClick={onRetryProjects}
              type="button"
            >
              Повторить
            </button>
          </div>
        ) : null}
      </div>

      <p className="px-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
        Это позволит вам группировать и фильтровать свои задачи
      </p>
    </div>
  );
}
