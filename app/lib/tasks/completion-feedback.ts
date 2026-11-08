export const TASK_COMPLETION_ERROR =
  "Не удалось обновить задачу. Попробуйте ещё раз.";

export interface CompletionMutationView {
  isPending: boolean;
  isError: boolean;
  variables?: { taskId: number };
}

export function getPendingTaskId(
  mutation: CompletionMutationView,
): number | null {
  return mutation.isPending
    ? (mutation.variables?.taskId ?? null)
    : null;
}

export function getCompletionError(
  mutation: Pick<CompletionMutationView, "isError">,
): string | null {
  return mutation.isError ? TASK_COMPLETION_ERROR : null;
}
