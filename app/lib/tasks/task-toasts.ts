import { toast } from "sonner";

import { TASK_PAST_DUE_MESSAGE } from "./task-reactivation";

export const TASK_CREATED_TOAST_MESSAGE = "Задача создана";
export const TASK_DELETED_TOAST_MESSAGE = "Задача удалена";
export const TASK_PRIORITY_UPDATE_ERROR =
  "Не удалось изменить приоритет. Попробуйте ещё раз.";
export const TASK_PROJECT_UPDATE_ERROR =
  "Не удалось изменить проект. Попробуйте ещё раз.";
export const TASK_LABELS_UPDATE_ERROR =
  "Не удалось изменить метки. Попробуйте ещё раз.";

export function showTaskCreatedToast(): void {
  toast.success(TASK_CREATED_TOAST_MESSAGE);
}

export function showTaskDeletedToast(): void {
  toast.success(TASK_DELETED_TOAST_MESSAGE);
}

export function showTaskPastDueToast(): void {
  toast.error(TASK_PAST_DUE_MESSAGE, { icon: null });
}

export function showTaskPriorityUpdateErrorToast(): void {
  toast.error(TASK_PRIORITY_UPDATE_ERROR, { icon: null });
}

export function showTaskProjectUpdateErrorToast(): void {
  toast.error(TASK_PROJECT_UPDATE_ERROR, { icon: null });
}

export function showTaskLabelsUpdateErrorToast(): void {
  toast.error(TASK_LABELS_UPDATE_ERROR, { icon: null });
}
