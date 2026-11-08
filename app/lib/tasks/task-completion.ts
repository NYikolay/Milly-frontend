import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { PROJECTS_QUERY_KEY } from "~/lib/projects/projects-query";

import { completeTask, uncompleteTask } from "./tasks-api";
import type { TaskResponse } from "./types";

export interface TaskCompletionVariables {
  taskId: number;
  nextCompleted: boolean;
}

export interface TaskCompletionHaptics {
  selection: () => void;
  notification: (type: "success" | "error") => void;
}

export interface TaskCompletionMutationContext<TData> {
  previous: TData | undefined;
}

export interface TaskCompletionMutationOptions<TData> {
  mutationFn: (variables: TaskCompletionVariables) => Promise<TaskResponse>;
  onMutate: (
    variables: TaskCompletionVariables,
  ) => Promise<TaskCompletionMutationContext<TData>>;
  onError: (
    error: Error,
    variables: TaskCompletionVariables,
    context: TaskCompletionMutationContext<TData> | undefined,
  ) => void;
  onSuccess: (updatedTask: TaskResponse) => void;
  onSettled: () => void;
}

export interface CreateTaskCompletionMutationOptionsParams<TData> {
  queryClient: QueryClient;
  haptics: TaskCompletionHaptics;
  queryKey: QueryKey;
  applyOptimistic: (
    data: TData | undefined,
    taskId: number,
    completedAt: string | null,
  ) => TData | undefined;
  applySuccess: (
    data: TData | undefined,
    updatedTask: TaskResponse,
  ) => TData | undefined;
}

export function createTaskCompletionMutationOptions<TData>({
  queryClient,
  haptics,
  queryKey,
  applyOptimistic,
  applySuccess,
}: CreateTaskCompletionMutationOptionsParams<TData>): TaskCompletionMutationOptions<TData> {
  return {
    mutationFn: ({ taskId, nextCompleted }) =>
      nextCompleted ? completeTask(taskId) : uncompleteTask(taskId),
    onMutate: async ({ taskId, nextCompleted }) => {
      haptics.selection();
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TData>(queryKey);

      queryClient.setQueryData<TData>(queryKey, (data) =>
        applyOptimistic(
          data,
          taskId,
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
      queryClient.setQueryData<TData>(queryKey, (data) =>
        applySuccess(data, updatedTask),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  };
}
