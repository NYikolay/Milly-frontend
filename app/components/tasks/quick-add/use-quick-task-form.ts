import { useCallback } from "react";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import {
  createQuickTaskDefaults,
  quickTaskResolver,
} from "~/lib/tasks/quick-task-schema";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";

export interface UseQuickTaskFormOptions {
  now: Date;
  timeZone: string;
}

export interface QuickTaskFormApi extends UseFormReturn<QuickTaskDraft> {
  resetToDefaults: () => void;
}

export function useQuickTaskForm({
  now,
  timeZone,
}: UseQuickTaskFormOptions): QuickTaskFormApi {
  const form = useForm<QuickTaskDraft>({
    defaultValues: createQuickTaskDefaults(now, timeZone),
    resolver: quickTaskResolver,
    mode: "onChange",
  });

  const { reset } = form;

  const resetToDefaults = useCallback(() => {
    reset(createQuickTaskDefaults(new Date(), timeZone));
  }, [reset, timeZone]);

  return { ...form, resetToDefaults };
}
