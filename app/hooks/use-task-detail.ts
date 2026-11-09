import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { ApiError } from "~/lib/api/errors";
import { PROJECTS_QUERY_KEY } from "~/lib/projects/projects-query";
import {
  applyTaskDetailCompletion,
  taskDetailQueryKey,
} from "~/lib/tasks/task-detail-cache";
import {
  createTaskCompletionMutationOptions,
  type TaskCompletionMutationContext,
  type TaskCompletionMutationOptions,
  type TaskCompletionVariables,
} from "~/lib/tasks/task-completion";
import { deleteTask, fetchTask } from "~/lib/tasks/tasks-api";
import { showTaskDeletedToast } from "~/lib/tasks/task-toasts";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export function useTaskDetail(taskId: number, enabled: boolean) {
  return useQuery({
    queryKey: taskDetailQueryKey(taskId),
    queryFn: ({ signal }) => fetchTask(taskId, signal),
    enabled,
  });
}

export type ToggleTaskDetailVariables = TaskCompletionVariables;
export type ToggleTaskDetailContext =
  TaskCompletionMutationContext<TaskResponse>;
export type ToggleTaskDetailMutationOptions =
  TaskCompletionMutationOptions<TaskResponse>;

export function createToggleTaskDetailMutationOptions({
  queryClient,
  haptics,
  taskId,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
}): ToggleTaskDetailMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  return createTaskCompletionMutationOptions<TaskResponse>({
    queryClient,
    haptics,
    queryKey,
    applyOptimistic: (data, _taskId, completedAt) =>
      applyTaskDetailCompletion(data, completedAt),
    applySuccess: (_data, updatedTask) => updatedTask,
  });
}

export function useToggleTaskDetailCompletion(taskId: number) {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();

  return useMutation(
    createToggleTaskDetailMutationOptions({ queryClient, haptics, taskId }),
  );
}

export interface DeleteTaskMutationOptions {
  mutationFn: () => Promise<void>;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export function createDeleteTaskMutationOptions({
  queryClient,
  haptics,
  taskId,
  onDeleted,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
  onDeleted: () => void;
}): DeleteTaskMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  function finishDeletion() {
    queryClient.removeQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    haptics.notification("success");
    showTaskDeletedToast();
    onDeleted();
  }

  return {
    mutationFn: () => deleteTask(taskId),
    onSuccess: finishDeletion,
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        finishDeletion();
        return;
      }
      haptics.notification("error");
    },
  };
}

export function useDeleteTask(taskId: number, onDeleted: () => void) {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();

  return useMutation(
    createDeleteTaskMutationOptions({
      queryClient,
      haptics,
      taskId,
      onDeleted,
    }),
  );
}
