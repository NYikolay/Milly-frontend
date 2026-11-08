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
  completeTask,
  deleteTask,
  fetchTask,
  uncompleteTask,
} from "~/lib/tasks/tasks-api";
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

export interface ToggleTaskDetailVariables {
  taskId: number;
  nextCompleted: boolean;
}

export interface ToggleTaskDetailContext {
  previous: TaskResponse | undefined;
}

export interface ToggleTaskDetailMutationOptions {
  mutationFn: (variables: ToggleTaskDetailVariables) => Promise<TaskResponse>;
  onMutate: (
    variables: ToggleTaskDetailVariables,
  ) => Promise<ToggleTaskDetailContext>;
  onError: (
    error: Error,
    variables: ToggleTaskDetailVariables,
    context: ToggleTaskDetailContext | undefined,
  ) => void;
  onSuccess: (updatedTask: TaskResponse) => void;
  onSettled: () => void;
}

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

  return {
    mutationFn: ({ nextCompleted }) =>
      nextCompleted ? completeTask(taskId) : uncompleteTask(taskId),
    onMutate: async ({ nextCompleted }) => {
      haptics.selection();
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskResponse>(queryKey);

      queryClient.setQueryData<TaskResponse>(queryKey, (current) =>
        applyTaskDetailCompletion(
          current,
          nextCompleted ? new Date().toISOString() : null,
        ),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      haptics.notification("error");
    },
    onSuccess: (updatedTask) => {
      haptics.notification("success");
      queryClient.setQueryData<TaskResponse>(queryKey, updatedTask);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  };
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
