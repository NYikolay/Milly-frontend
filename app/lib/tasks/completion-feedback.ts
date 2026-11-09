import { isPastDueUncompleteError } from "./task-reactivation";

export const TASK_COMPLETION_ERROR =
  "Не удалось обновить задачу. Попробуйте ещё раз.";

export interface CompletionMutationView {
  isPending: boolean;
  isError: boolean;
  variables?: { taskId: number };
  error?: unknown;
}

export function getPendingTaskId(
  mutation: CompletionMutationView,
): number | null {
  return mutation.isPending
    ? (mutation.variables?.taskId ?? null)
    : null;
}

export function getCompletionError(
  mutation: Pick<CompletionMutationView, "isError" | "error">,
): string | null {
  if (!mutation.isError || isPastDueUncompleteError(mutation.error)) {
    return null;
  }

  return TASK_COMPLETION_ERROR;
}
