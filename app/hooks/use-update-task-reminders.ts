import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ApiError } from "~/lib/api/errors";
import { taskDetailQueryKey } from "~/lib/tasks/task-detail-cache";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse, TaskUpdateInput } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export interface UpdateTaskRemindersMutationOptions {
  scope: { id: string };
  mutationFn: (input: TaskUpdateInput) => Promise<TaskResponse>;
  onSuccess: (updated: TaskResponse) => void;
  onError: (error: Error) => void;
}

export function createUpdateTaskRemindersMutationOptions({
  queryClient,
  haptics,
  taskId,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
}): UpdateTaskRemindersMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  return {
    scope: { id: "task-reminders" },
    mutationFn: (input) => updateTask(taskId, input),
    onSuccess: (updated) => {
      if (updated.id === taskId) {
        queryClient.setQueryData(queryKey, updated);
      }
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task-series"] });
    },
    onError: (error) => {
      haptics.notification("error");
      if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  };
}

export function useUpdateTaskReminders(
  taskId: number,
): UseMutationResult<TaskResponse, Error, TaskUpdateInput> {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();

  return useMutation(
    createUpdateTaskRemindersMutationOptions({
      queryClient,
      haptics,
      taskId,
    }),
  );
}
