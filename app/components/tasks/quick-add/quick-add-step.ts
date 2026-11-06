export type QuickAddStep = "labels" | "priority" | "due" | "reminders";

export const QUICK_ADD_DETAIL_STEPS: readonly QuickAddStep[] = [
  "labels",
  "priority",
  "due",
  "reminders",
];

export interface QuickAddHeader {
  title: string;
}

const STEP_HEADERS: Record<QuickAddStep, QuickAddHeader> = {
  labels: { title: "Метки" },
  priority: { title: "Приоритет задачи" },
  due: { title: "Дата и время задачи" },
  reminders: { title: "Автонапоминания" },
};

export function getQuickAddHeader(step: QuickAddStep): QuickAddHeader {
  return STEP_HEADERS[step];
}
