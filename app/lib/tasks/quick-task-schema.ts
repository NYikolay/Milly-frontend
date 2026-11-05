import type { FieldErrors, Resolver } from "react-hook-form";
import { z } from "zod";

import { getDefaultDue } from "./date-time";
import type { Priority } from "./types";

export type DueUnit = "minutes" | "hours" | "days";

export interface QuickTaskDraft {
  title: string;
  dueDate: string;
  dueTime: string;
  isRecurring: boolean;
  priority: Priority;
  labelIds: number[];
  remindersEnabled: boolean;
  beforeDueEnabled: boolean;
  beforeDueAmount: number;
  beforeDueUnit: DueUnit;
  scheduledEnabled: boolean;
  scheduledIntervalDays: number;
  scheduledTime: string;
}

const MIN_API_DATE = "2025-01-01";
const MAX_API_DATE = "2100-12-31";
const MAX_LABEL_COUNT = 100;

const API_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const dueDateSchema = z
  .string()
  .regex(API_DATE_PATTERN)
  .refine((date) => date >= MIN_API_DATE && date <= MAX_API_DATE);

const timeSchema = z.string().regex(TIME_PATTERN);

const prioritySchema = z.enum([
  "urgent_important",
  "important_not_urgent",
  "urgent_not_important",
  "neither",
]);

const scheduledIntervalSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(7),
]);

export const quickTaskSchema: z.ZodType<QuickTaskDraft> = z.object({
  title: z.string().trim().min(1).max(120),
  dueDate: dueDateSchema,
  dueTime: timeSchema,
  isRecurring: z.boolean(),
  priority: prioritySchema,
  labelIds: z
    .array(z.number().int().positive())
    .max(MAX_LABEL_COUNT)
    .refine((labelIds) => new Set(labelIds).size === labelIds.length),
  remindersEnabled: z.boolean(),
  beforeDueEnabled: z.boolean(),
  beforeDueAmount: z.number().int().min(1),
  beforeDueUnit: z.enum(["minutes", "hours", "days"]),
  scheduledEnabled: z.boolean(),
  scheduledIntervalDays: scheduledIntervalSchema,
  scheduledTime: timeSchema,
});

export const quickTaskResolver: Resolver<QuickTaskDraft> = async (values) => {
  const result = quickTaskSchema.safeParse(values);

  if (result.success) {
    return { values: result.data, errors: {} };
  }

  const errors: FieldErrors<QuickTaskDraft> = {};

  for (const issue of result.error.issues) {
    const key = issue.path.join(".") as keyof QuickTaskDraft;

    if (errors[key]) {
      continue;
    }

    errors[key] = { type: issue.code, message: issue.message };
  }

  return { values: {}, errors };
};

export function createQuickTaskDefaults(
  now: Date,
  timeZone: string,
): QuickTaskDraft {
  const due = getDefaultDue(now, timeZone);

  return {
    title: "",
    dueDate: due.date,
    dueTime: due.time,
    isRecurring: false,
    priority: "important_not_urgent",
    labelIds: [],
    remindersEnabled: true,
    beforeDueEnabled: true,
    beforeDueAmount: 1,
    beforeDueUnit: "hours",
    scheduledEnabled: false,
    scheduledIntervalDays: 1,
    scheduledTime: "14:00",
  };
}

export function isQuickTaskSubmittable(
  draft: Pick<QuickTaskDraft, "title">,
  isPending: boolean,
): boolean {
  return !isPending && draft.title.trim().length > 0;
}
