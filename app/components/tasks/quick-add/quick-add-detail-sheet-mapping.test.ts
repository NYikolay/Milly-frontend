import { createElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQuickTaskDefaults } from "~/lib/tasks/quick-task-schema";
import type { QuickTaskDraft } from "~/lib/tasks/quick-task-schema";

import { QuickAddDetailSheet } from "./quick-add-detail-sheet";
import type { QuickAddStep } from "./quick-add-step";
import type { DueStepProps } from "./due-step";
import type { LabelsStepProps } from "./labels-step";
import type { PriorityStepProps } from "./priority-step";
import type { RemindersStepProps } from "./reminders-step";

type CapturedLabels = Pick<
  LabelsStepProps,
  "selectedIds" | "onChange" | "onApply"
>;
type CapturedPriority = Pick<
  PriorityStepProps,
  "value" | "onChange" | "onApply"
>;
type CapturedDue = Pick<DueStepProps, "value" | "onChange" | "onApply">;
type CapturedReminders = Pick<
  RemindersStepProps,
  "value" | "amountInput" | "onChange" | "onAmountInputChange" | "onApply"
>;

const captured = vi.hoisted(() => ({
  labels: null as CapturedLabels | null,
  priority: null as CapturedPriority | null,
  due: null as CapturedDue | null,
  reminders: null as CapturedReminders | null,
}));

vi.mock("~/components/ui/bottom-sheet", () => ({
  BottomSheet: (props: { children?: ReactNode }) => props.children ?? null,
  BottomSheetAction: () => null,
}));

vi.mock("~/providers/telegram-provider", () => ({
  useTelegram: () => ({
    haptics: {
      selection: () => {},
    },
  }),
}));

vi.mock("./labels-step", () => ({
  LabelsStep: (props: LabelsStepProps) => {
    captured.labels = props;
    return null;
  },
}));

vi.mock("./priority-step", () => ({
  PriorityStep: (props: PriorityStepProps) => {
    captured.priority = props;
    return null;
  },
}));

vi.mock("./due-step", () => ({
  DueStep: (props: DueStepProps) => {
    captured.due = props;
    return null;
  },
}));

vi.mock("./reminders-step", () => ({
  RemindersStep: (props: RemindersStepProps) => {
    captured.reminders = props;
    return null;
  },
}));

const now = new Date("2026-11-06T10:00:00Z");

function createValues(
  overrides: Partial<QuickTaskDraft> = {},
): QuickTaskDraft {
  return { ...createQuickTaskDefaults(now, "UTC"), ...overrides };
}

function renderSheet(
  step: QuickAddStep,
  draft: QuickTaskDraft,
  amountInput = "1",
) {
  const onPatch = vi.fn<(patch: Partial<QuickTaskDraft>) => void>();
  const onApply = vi.fn<(patch: Partial<QuickTaskDraft>) => void>();
  const onAmountInputChange = vi.fn<(value: string) => void>();

  renderToStaticMarkup(
    createElement(QuickAddDetailSheet, {
      step,
      values: draft,
      amountInput,
      labels: [],
      isLabelsLoading: false,
      isLabelsError: false,
      onRetryLabels: () => {},
      now,
      timeZone: "UTC",
      onClose: () => {},
      onPatch,
      onAmountInputChange,
      onApply,
    }),
  );

  return { onPatch, onApply, onAmountInputChange };
}

function capturedStep<T>(value: T | null): T {
  if (value === null) {
    throw new Error("step props were not captured");
  }

  return value;
}

beforeEach(() => {
  captured.labels = null;
  captured.priority = null;
  captured.due = null;
  captured.reminders = null;
});

describe("QuickAddDetailSheet step mapping", () => {
  it("maps labels step props and callbacks to the draft patch", () => {
    const { onPatch, onApply } = renderSheet(
      "labels",
      createValues({ labelIds: [1, 2] }),
    );
    const labels = capturedStep(captured.labels);

    expect(labels.selectedIds).toEqual([1, 2]);

    labels.onChange([3, 4]);
    expect(onPatch).toHaveBeenLastCalledWith({ labelIds: [3, 4] });

    labels.onApply([5]);
    expect(onApply).toHaveBeenLastCalledWith({ labelIds: [5] });
  });

  it("maps priority step props and callbacks to the draft patch", () => {
    const { onPatch, onApply } = renderSheet(
      "priority",
      createValues({ priority: "urgent_important" }),
    );
    const priority = capturedStep(captured.priority);

    expect(priority.value).toBe("urgent_important");

    priority.onChange("neither");
    expect(onPatch).toHaveBeenLastCalledWith({ priority: "neither" });

    priority.onApply("urgent_not_important");
    expect(onApply).toHaveBeenLastCalledWith({
      priority: "urgent_not_important",
    });
  });

  it("maps due step props and partial changes without undefined keys", () => {
    const { onPatch, onApply } = renderSheet(
      "due",
      createValues({
        dueDate: "2026-11-07",
        dueTime: "09:30",
        isRecurring: true,
      }),
    );
    const due = capturedStep(captured.due);

    expect(due.value).toEqual({
      date: "2026-11-07",
      time: "09:30",
      isRecurring: true,
    });

    due.onChange({ time: "10:00" });
    expect(onPatch).toHaveBeenLastCalledWith({ dueTime: "10:00" });
    expect(Object.keys(onPatch.mock.calls.at(-1)?.[0] ?? {})).toEqual([
      "dueTime",
    ]);

    due.onChange({ date: "2026-11-08" });
    expect(onPatch).toHaveBeenLastCalledWith({ dueDate: "2026-11-08" });
    expect(Object.keys(onPatch.mock.calls.at(-1)?.[0] ?? {})).toEqual([
      "dueDate",
    ]);

    due.onChange({ isRecurring: false });
    expect(onPatch).toHaveBeenLastCalledWith({ isRecurring: false });
    expect(Object.keys(onPatch.mock.calls.at(-1)?.[0] ?? {})).toEqual([
      "isRecurring",
    ]);

    due.onApply({
      date: "2026-11-09",
      time: "11:00",
      isRecurring: false,
    });
    expect(onApply).toHaveBeenLastCalledWith({
      dueDate: "2026-11-09",
      dueTime: "11:00",
      isRecurring: false,
    });
  });

  it("maps reminders step props and callbacks to the draft patch", () => {
    const { onPatch, onApply, onAmountInputChange } = renderSheet(
      "reminders",
      createValues({
        remindersEnabled: false,
        beforeDueEnabled: false,
        beforeDueAmount: 7,
        beforeDueUnit: "days",
        scheduledEnabled: true,
        scheduledIntervalDays: 3,
        scheduledTime: "18:45",
      }),
      "7",
    );
    const reminders = capturedStep(captured.reminders);

    expect(reminders.value).toEqual({
      remindersEnabled: false,
      beforeDueEnabled: false,
      beforeDueAmount: 7,
      beforeDueUnit: "days",
      scheduledEnabled: true,
      scheduledIntervalDays: 3,
      scheduledTime: "18:45",
    });
    expect(reminders.amountInput).toBe("7");

    reminders.onChange({ beforeDueUnit: "minutes" });
    expect(onPatch).toHaveBeenLastCalledWith({ beforeDueUnit: "minutes" });

    reminders.onAmountInputChange("12");
    expect(onAmountInputChange).toHaveBeenLastCalledWith("12");

    const applied = { ...reminders.value, beforeDueAmount: 12 };

    reminders.onApply(applied);
    expect(onApply).toHaveBeenLastCalledWith(applied);
  });
});
