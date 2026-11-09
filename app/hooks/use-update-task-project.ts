import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ApiError } from "~/lib/api/errors";
import { PROJECTS_QUERY_KEY } from "~/lib/projects/projects-query";
import {
  applyTaskDetailProject,
  taskDetailQueryKey,
} from "~/lib/tasks/task-detail-cache";
import { showTaskProjectUpdateErrorToast } from "~/lib/tasks/task-toasts";
import { updateTask } from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export interface UpdateTaskProjectMutationContext {
  previous: TaskResponse | undefined;
}

export interface UpdateTaskProjectMutationOptions {
  mutationFn: (projectId: number | null) => Promise<TaskResponse>;
  onMutate: (
    projectId: number | null,
  ) => Promise<UpdateTaskProjectMutationContext>;
  onError: (
    error: Error,
    projectId: number | null,
    context: UpdateTaskProjectMutationContext | undefined,
  ) => void;
  onSuccess: (updated: TaskResponse) => void;
  onSettled: () => void;
}

export function createUpdateTaskProjectMutationOptions({
  queryClient,
  haptics,
  taskId,
}: {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  taskId: number;
}): UpdateTaskProjectMutationOptions {
  const queryKey = taskDetailQueryKey(taskId);

  return {
    mutationFn: (projectId) => updateTask(taskId, { project_id: projectId }),
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskResponse>(queryKey);

      queryClient.setQueryData<TaskResponse>(queryKey, (data) =>
        applyTaskDetailProject(data, projectId),
      );

      return { previous };
    },
    onError: (error, _projectId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      haptics.notification("error");
      showTaskProjectUpdateErrorToast();

      if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey });
        void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
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
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  };
}

export function useUpdateTaskProject(
  taskId: number,
): UseMutationResult<TaskResponse, Error, number | null> {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();

  return useMutation(
    createUpdateTaskProjectMutationOptions({
      queryClient,
      haptics,
      taskId,
    }),
  );
}
