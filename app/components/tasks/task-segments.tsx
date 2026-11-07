import type { ReactElement } from "react";

import circleCheckIcon from "~/assets/icons/circle-check.svg";
import dashboardIcon from "~/assets/icons/dashboard.svg";
import searchIcon from "~/assets/icons/search.svg";

import { SegmentedControl } from "~/components/ui/segmented-control";

export type TaskSegmentId = "today" | "search" | "projects";

export const TASK_SEGMENTS = [
  { id: "today", label: "Сегодня", iconSrc: circleCheckIcon },
  { id: "search", label: "Поиск задач", iconSrc: searchIcon },
  { id: "projects", label: "Проекты", iconSrc: dashboardIcon, disabled: true },
] as const;

export interface TaskSegmentsProps {
  value: TaskSegmentId;
  onSelect: (id: TaskSegmentId) => void;
}

export function TaskSegments({
  value,
  onSelect,
}: TaskSegmentsProps): ReactElement {
  return (
    <SegmentedControl
      ariaLabel="Разделы задач"
      onChange={(id) => onSelect(id as TaskSegmentId)}
      options={TASK_SEGMENTS}
      value={value}
    />
  );
}
