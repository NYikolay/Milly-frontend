import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ApiError } from "~/lib/api/errors";
import {
  applyTaskDetailPriority,
  taskDetailQueryKey,
} from "~/lib/tasks/task-detail-cache";
import { showTaskPriorityUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { Priority, TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export interface UpdateTaskPriorityMutationContext {
  previous: TaskResponse | undefined;
}

export interface UpdateTaskPriorityMutationOptions {
  mutationFn: (priority: Priority) => Promise<TaskResponse>;
  onMutate: (priority: Priority) => Promise<UpdateTaskPriorityMutationContext>;
  onError: (
    error: Error,
    priority: Priority,
    context: UpdateTaskPriorityMutationContext | undefined,
  ) => void;
  onSuccess: (updated: TaskResponse) => void;
  onSettled: () => void;
}

export function createUpdateTaskPriorityMutationOptions({
  queryClient,
  haptics,
  taskId,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
}): UpdateTaskPriorityMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  return {
    mutationFn: (priority) => updateTask(taskId, { priority }),
    onMutate: async (priority) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskResponse>(queryKey);

      queryClient.setQueryData<TaskResponse>(queryKey, (data) =>
        applyTaskDetailPriority(data, priority),
      );

      return { previous };
    },
    onError: (error, _priority, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      haptics.notification("error");

      if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey });
      } else {
        showTaskPriorityUpdateErrorToast();
      }
    },
    onSuccess: (updated) => {
      if (updated.id === taskId) {
        queryClient.setQueryData(queryKey, updated);
      }
      haptics.notification("success");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task-series"] });
    },
  };
}

export function useUpdateTaskPriority(
  taskId: number,
): UseMutationResult<TaskResponse, Error, Priority> {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();

  return useMutation(
    createUpdateTaskPriorityMutationOptions({
      queryClient,
      haptics,
      taskId,
    }),
  );
}
