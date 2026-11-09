import { toast } from "sonner";

import { TASK_PAST_DUE_MESSAGE } from "./task-reactivation";

export const TASK_CREATED_TOAST_MESSAGE = "Задача создана";
export const TASK_DELETED_TOAST_MESSAGE = "Задача удалена";

export function showTaskCreatedToast(): void {
  toast.success(TASK_CREATED_TOAST_MESSAGE);
}

export function showTaskDeletedToast(): void {
  toast.success(TASK_DELETED_TOAST_MESSAGE);
}

export function showTaskPastDueToast(): void {
  toast.error(TASK_PAST_DUE_MESSAGE, { icon: null });
}
