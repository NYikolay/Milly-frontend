import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ApiError } from "~/lib/api/errors";
import { LABELS_QUERY_KEY } from "~/lib/labels/labels-query";
import {
  applyTaskDetailLabels,
  taskDetailQueryKey,
} from "~/lib/tasks/task-detail-cache";
import { showTaskLabelsUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { LabelRef, TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export interface TaskLabelsUpdateInput {
  labelIds: number[];
  labels: LabelRef[];
}

export interface UpdateTaskLabelsMutationContext {
  previous: TaskResponse | undefined;
}

export interface UpdateTaskLabelsMutationOptions {
  scope: { id: string };
  mutationFn: (input: TaskLabelsUpdateInput) => Promise<TaskResponse>;
  onMutate: (
    input: TaskLabelsUpdateInput,
  ) => Promise<UpdateTaskLabelsMutationContext>;
  onError: (
    error: Error,
    input: TaskLabelsUpdateInput,
    context: UpdateTaskLabelsMutationContext | undefined,
  ) => void;
  onSuccess: (updated: TaskResponse) => void;
  onSettled: () => void;
}

export function createUpdateTaskLabelsMutationOptions({
  queryClient,
  haptics,
  taskId,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
}): UpdateTaskLabelsMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  return {
    scope: { id: "task-labels" },
    mutationFn: ({ labelIds }) => updateTask(taskId, { label_ids: labelIds }),
    onMutate: async ({ labels }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskResponse>(queryKey);

      queryClient.setQueryData<TaskResponse>(queryKey, (data) =>
        applyTaskDetailLabels(data, labels),
      );

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      haptics.notification("error");
      showTaskLabelsUpdateErrorToast();

      if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey });
        void queryClient.invalidateQueries({ queryKey: LABELS_QUERY_KEY });
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

export function useUpdateTaskLabels(
  taskId: number,
): UseMutationResult<TaskResponse, Error, TaskLabelsUpdateInput> {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();

  return useMutation(
    createUpdateTaskLabelsMutationOptions({
      queryClient,
      haptics,
      taskId,
    }),
  );
}
