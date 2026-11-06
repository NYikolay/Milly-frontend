import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";

import {
  toSeriesCreateInput,
  toTaskCreateInput,
} from "~/lib/tasks/quick-task-payload";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";
import { createSeries, createTask } from "~/lib/tasks/tasks-api";
import type { SeriesResponse, TaskResponse } from "~/lib/tasks/types";

export interface CreateQuickTaskVariables {
  draft: QuickTaskDraft;
  timeZone: string;
  signal: AbortSignal;
}

export type CreateQuickTaskResult = TaskResponse | SeriesResponse;

export interface UseCreateQuickTaskOptions {
  onSuccess?: (
    data: CreateQuickTaskResult,
    variables: CreateQuickTaskVariables,
  ) => void;
  onError?: (error: unknown, variables: CreateQuickTaskVariables) => void;
}

export type CreateQuickTaskMutation = UseMutationResult<
  CreateQuickTaskResult,
  unknown,
  CreateQuickTaskVariables
>;

export function useCreateQuickTask({
  onSuccess,
  onError,
}: UseCreateQuickTaskOptions = {}): CreateQuickTaskMutation {
  const queryClient = useQueryClient();

  return useMutation<CreateQuickTaskResult, unknown, CreateQuickTaskVariables>({
    mutationFn: ({ draft, timeZone, signal }) =>
      draft.isRecurring
        ? createSeries(toSeriesCreateInput(draft, timeZone), signal)
        : createTask(toTaskCreateInput(draft, timeZone), signal),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task-series"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      onError?.(error, variables);
    },
  });
}
