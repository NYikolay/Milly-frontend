import type { Priority } from "./types";

export type PriorityShortLabel = "P1" | "P2" | "P3" | "P4";

export interface PriorityOption {
  value: Priority;
  label: string;
  shortLabel: PriorityShortLabel;
}

export const PRIORITY_OPTIONS: readonly PriorityOption[] = [
  { value: "urgent_important", label: "Срочные и важные", shortLabel: "P1" },
  {
    value: "important_not_urgent",
    label: "Важные, но не срочные",
    shortLabel: "P2",
  },
  {
    value: "urgent_not_important",
    label: "Срочные, но не важные",
    shortLabel: "P3",
  },
  { value: "neither", label: "Не срочные и не важные", shortLabel: "P4" },
];

const PRIORITY_SHORT_LABELS: Record<Priority, PriorityShortLabel> = {
  urgent_important: "P1",
  important_not_urgent: "P2",
  urgent_not_important: "P3",
  neither: "P4",
};

export function priorityShortLabel(priority: Priority): PriorityShortLabel {
  return PRIORITY_SHORT_LABELS[priority];
}
