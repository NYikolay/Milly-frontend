import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ApiError } from "~/lib/api/errors";
import { PROJECTS_QUERY_KEY } from "~/lib/projects/projects-query";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse, TaskUpdateInput } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export interface UpdateTaskDueMutationOptions {
  mutationFn: (input: TaskUpdateInput) => Promise<TaskResponse>;
  onSuccess: (updated: TaskResponse) => void;
  onError: (error: Error) => void;
}

export function createUpdateTaskDueMutationOptions({
  queryClient,
  haptics,
  taskId,
  onUpdated,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
  onUpdated: (task: TaskResponse) => void;
}): UpdateTaskDueMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  return {
    mutationFn: (input) => updateTask(taskId, input),
    onSuccess: (updated) => {
      if (updated.id === taskId) {
        queryClient.setQueryData(taskDetailQueryKey(updated.id), updated);
      }
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task-series"] });
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      haptics.notification("success");
      onUpdated(updated);
    },
    onError: (error) => {
      haptics.notification("error");
      if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  };
}

export function useUpdateTaskDue(
  taskId: number,
  onUpdated: (task: TaskResponse) => void,
): UseMutationResult<TaskResponse, Error, TaskUpdateInput> {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();

  return useMutation(
    createUpdateTaskDueMutationOptions({
      queryClient,
      haptics,
      taskId,
      onUpdated,
    }),
  );
}
