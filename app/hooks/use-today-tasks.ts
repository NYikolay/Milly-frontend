import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  applyTaskCompletion,
  todayTasksQueryKey,
  type TodayTasksData,
} from "~/lib/tasks/today-tasks-cache";
import {
  completeTask,
  fetchTasks,
  fetchTodayProgress,
  uncompleteTask,
} from "~/lib/tasks/tasks-api";
import type { TaskResponse } from "~/lib/tasks/types";
import type { TelegramHaptics } from "~/providers/telegram-provider";
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

export interface ToggleTaskCompletionVariables {
  taskId: number;
  nextCompleted: boolean;
}

export interface ToggleTaskMutationContext {
  previous: TodayTasksData | undefined;
}

export interface ToggleTaskMutationOptions {
  mutationFn: (
    variables: ToggleTaskCompletionVariables,
  ) => Promise<TaskResponse>;
  onMutate: (
    variables: ToggleTaskCompletionVariables,
  ) => Promise<ToggleTaskMutationContext>;
  onError: (
    error: Error,
    variables: ToggleTaskCompletionVariables,
    context: ToggleTaskMutationContext | undefined,
  ) => void;
  onSuccess: (updatedTask: TaskResponse) => void;
  onSettled: () => void;
}

export interface CreateToggleTaskMutationOptionsParams {
  queryClient: QueryClient;
  haptics: TelegramHaptics;
  queryKey: QueryKey;
}

export function createToggleTaskMutationOptions({
  queryClient,
  haptics,
  queryKey,
}: CreateToggleTaskMutationOptionsParams): ToggleTaskMutationOptions {
  return {
    mutationFn: ({ taskId, nextCompleted }) =>
      nextCompleted ? completeTask(taskId) : uncompleteTask(taskId),
    onMutate: async ({ taskId, nextCompleted }) => {
      haptics.selection();
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TodayTasksData>(queryKey);

      queryClient.setQueryData<TodayTasksData>(queryKey, (data) =>
        applyTaskCompletion(
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
      queryClient.setQueryData<TodayTasksData>(queryKey, (data) =>
        data
          ? {
              ...data,
              tasks: data.tasks.map((task) =>
                task.id === updatedTask.id ? updatedTask : task,
              ),
            }
          : data,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  };
}

export function useToggleTaskCompletion(timeZone: string, date: string) {
  const queryClient = useQueryClient();
  const { haptics } = useTelegram();
  const queryKey = todayTasksQueryKey(timeZone, date);

  return useMutation(
    createToggleTaskMutationOptions({ queryClient, haptics, queryKey }),
  );
}
