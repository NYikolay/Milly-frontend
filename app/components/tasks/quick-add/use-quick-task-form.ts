import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { quickTaskResolver } from "~/lib/tasks/quick-task-schema";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";

export interface UseQuickTaskFormOptions {
  draft: QuickTaskDraft;
}

export type QuickTaskFormApi = UseFormReturn<QuickTaskDraft>;

export function useQuickTaskForm({
  draft,
}: UseQuickTaskFormOptions): QuickTaskFormApi {
  return useForm<QuickTaskDraft>({
    defaultValues: draft,
    values: draft,
    resolver: quickTaskResolver,
    mode: "onChange",
  });
}
