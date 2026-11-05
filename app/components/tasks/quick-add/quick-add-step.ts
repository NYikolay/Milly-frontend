export type QuickAddStep =
  | "form"
  | "labels"
  | "priority"
  | "due"
  | "reminders";

export interface QuickAddHeader {
  title: string;
  showBack: boolean;
}

const STEP_HEADERS: Record<QuickAddStep, QuickAddHeader> = {
  form: { title: "Добавление задачи", showBack: false },
  labels: { title: "Метки", showBack: true },
  priority: { title: "Приоритет задачи", showBack: true },
  due: { title: "Дата и время задачи", showBack: true },
  reminders: { title: "Автонапоминания", showBack: true },
};

export function getQuickAddHeader(step: QuickAddStep): QuickAddHeader {
  return STEP_HEADERS[step];
}
