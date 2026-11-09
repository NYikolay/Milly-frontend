import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { replaceTaskInList } from "~/lib/tasks/completion-cache";
import {
  createTaskCompletionMutationOptions,
  type CreateTaskCompletionMutationOptionsParams,
  type TaskCompletionMutationContext,
  type TaskCompletionMutationOptions,
  type TaskCompletionVariables,
} from "~/lib/tasks/task-completion";
import { showTaskPastDueToast } from "~/lib/tasks/task-toasts";
import {
  applyTaskCompletion,
  todayProgressQueryKey,
  todayTasksQueryKey,
  type TodayTasksData,
} from "~/lib/tasks/today-tasks-cache";
import { fetchTasks, fetchTodayProgress } from "~/lib/tasks/tasks-api";
import { useTelegram } from "~/providers/telegram-provider";

async function fetchTodayTasks(
  date: string,
  signal: AbortSignal,
): Promise<TodayTasksData> {
  const [tasks, progress] = await Promise.all([
    fetchTasks({ date, status: "all", limit: 100 }, signal),
    fetchTodayProgress(signal),
  ]);

  return { tasks: tasks.items, progress };
}

export function useTodayTasksData(timeZone: string, date: string) {
  return useQuery({
    queryKey: todayTasksQueryKey(timeZone, date),
    queryFn: ({ signal }) => fetchTodayTasks(date, signal),
  });
}

export function useTodayProgress(timeZone: string, date: string) {
  return useQuery({
    queryKey: todayProgressQueryKey(timeZone, date),
    queryFn: ({ signal }) => fetchTodayProgress(signal),
  });
}

export type ToggleTaskCompletionVariables = TaskCompletionVariables;
export type ToggleTaskMutationContext =
  TaskCompletionMutationContext<TodayTasksData>;
export type ToggleTaskMutationOptions =
  TaskCompletionMutationOptions<TodayTasksData>;
export type CreateToggleTaskMutationOptionsParams = Pick<
  CreateTaskCompletionMutationOptionsParams<TodayTasksData>,
  "queryClient" | "haptics" | "queryKey"
>;

export function createToggleTaskMutationOptions({
  queryClient,
  haptics,
  queryKey,
}: CreateToggleTaskMutationOptionsParams): ToggleTaskMutationOptions {
  return createTaskCompletionMutationOptions<TodayTasksData>({
    queryClient,
    haptics,
    queryKey,
    onPastDueError: showTaskPastDueToast,
    applyOptimistic: applyTaskCompletion,
    applySuccess: (data, updatedTask) =>
      data
        ? { ...data, tasks: replaceTaskInList(data.tasks, updatedTask) }
        : data,
  });
}

export function useToggleTaskCompletion(timeZone: string, date: string) {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();
  const queryKey = todayTasksQueryKey(timeZone, date);

  return useMutation(
    createToggleTaskMutationOptions({ queryClient, haptics, queryKey }),
  );
}
