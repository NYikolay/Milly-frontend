import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { replaceTaskInList } from "~/lib/tasks/completion-cache";
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
  createTaskCompletionMutationOptions,
  type CreateTaskCompletionMutationOptionsParams,
  type TaskCompletionMutationContext,
  type TaskCompletionMutationOptions,
  type TaskCompletionVariables,
} from "~/lib/tasks/task-completion";
import { showTaskPastDueToast } from "~/lib/tasks/task-toasts";
import { fetchTasks } from "~/lib/tasks/tasks-api";
import type { TaskListResponse } from "~/lib/tasks/types";
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

export type ToggleSearchTaskCompletionVariables = TaskCompletionVariables;
export type ToggleSearchTaskMutationContext =
  TaskCompletionMutationContext<TaskListResponse>;
export type ToggleSearchTaskMutationOptions =
  TaskCompletionMutationOptions<TaskListResponse>;
export type CreateToggleSearchTaskMutationOptionsParams = Pick<
  CreateTaskCompletionMutationOptionsParams<TaskListResponse>,
  "queryClient" | "haptics" | "queryKey"
>;

export function createToggleSearchTaskMutationOptions({
  queryClient,
  haptics,
  queryKey,
}: CreateToggleSearchTaskMutationOptionsParams): ToggleSearchTaskMutationOptions {
  return createTaskCompletionMutationOptions<TaskListResponse>({
    queryClient,
    haptics,
    queryKey,
    onPastDueError: showTaskPastDueToast,
    applyOptimistic: applySearchTaskCompletion,
    applySuccess: (data, updatedTask) =>
      data
        ? { ...data, items: replaceTaskInList(data.items, updatedTask) }
        : data,
  });
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
