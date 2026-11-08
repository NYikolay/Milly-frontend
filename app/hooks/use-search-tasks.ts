import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { PROJECTS_QUERY_KEY } from "~/lib/projects/projects-query";
import {
  buildSearchTaskListQuery,
  resolveFilterDate,
  type SearchTaskFilters,
} from "~/lib/tasks/search-filters";
import {
  applySearchTaskCompletion,
  searchTasksQueryKey,
} from "~/lib/tasks/search-tasks-cache";
import {
  completeTask,
  fetchTasks,
  uncompleteTask,
} from "~/lib/tasks/tasks-api";
import type { TaskListResponse, TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
import { useTelegram } from "~/providers/telegram-provider";

export function useSearchTasksData(
  timeZone: string,
  today: string,
  query: string,
  filters: SearchTaskFilters,
) {
  const taskQuery = buildSearchTaskListQuery(filters, today, query);

  return useQuery({
    queryKey: searchTasksQueryKey(
      timeZone,
      taskQuery.date ?? today,
      query,
      filters,
    ),
    queryFn: ({ signal }) => fetchTasks(taskQuery, signal),
    placeholderData: keepPreviousData,
  });
}

export interface ToggleSearchTaskCompletionVariables {
  taskId: number;
  nextCompleted: boolean;
}

export interface ToggleSearchTaskMutationContext {
  previous: TaskListResponse | undefined;
}

export interface ToggleSearchTaskMutationOptions {
  mutationFn: (
    variables: ToggleSearchTaskCompletionVariables,
  ) => Promise<TaskResponse>;
  onMutate: (
    variables: ToggleSearchTaskCompletionVariables,
  ) => Promise<ToggleSearchTaskMutationContext>;
  onError: (
    error: Error,
    variables: ToggleSearchTaskCompletionVariables,
    context: ToggleSearchTaskMutationContext | undefined,
  ) => void;
  onSuccess: (updatedTask: TaskResponse) => void;
  onSettled: () => void;
}

export interface CreateToggleSearchTaskMutationOptionsParams {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  queryKey: QueryKey;
}

export function createToggleSearchTaskMutationOptions({
  queryClient,
  haptics,
  queryKey,
}: CreateToggleSearchTaskMutationOptionsParams): ToggleSearchTaskMutationOptions {
  return {
    mutationFn: ({ taskId, nextCompleted }) =>
      nextCompleted ? completeTask(taskId) : uncompleteTask(taskId),
    onMutate: async ({ taskId, nextCompleted }) => {
      haptics.selection();
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskListResponse>(queryKey);

      queryClient.setQueryData<TaskListResponse>(queryKey, (data) =>
        applySearchTaskCompletion(
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
      queryClient.setQueryData<TaskListResponse>(queryKey, (data) =>
        data
          ? {
              ...data,
              items: data.items.map((task) =>
                task.id === updatedTask.id ? updatedTask : task,
              ),
            }
          : data,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  };
}

export function useToggleSearchTaskCompletion(
  timeZone: string,
  today: string,
  query: string,
  filters: SearchTaskFilters,
) {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();
  const queryKey = searchTasksQueryKey(
    timeZone,
    resolveFilterDate(filters, today),
    query,
    filters,
  );

  return useMutation(
    createToggleSearchTaskMutationOptions({ queryClient, haptics, queryKey }),
  );
}
