import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createQuickTaskDefaults } from "~/lib/tasks/quick-task-schema";

import { QuickAddDetailSheet } from "./quick-add-detail-sheet";

const sheet = vi.hoisted(() => ({
  onBack: undefined as (() => void) | undefined,
}));

vi.mock("~/components/ui/bottom-sheet", () => ({
  BottomSheet: (props: { onBack?: () => void }) => {
    sheet.onBack = props.onBack;
    return null;
  },
  BottomSheetAction: () => null,
}));

vi.mock("~/providers/telegram-provider", () => ({
  useTelegram: () => ({
    haptics: {
      selection: () => {},
    },
  }),
}));

describe("QuickAddDetailSheet", () => {
  it("does not render a back button in the sheet header", () => {
    const now = new Date("2026-11-06T10:00:00Z");

    renderToStaticMarkup(
      createElement(QuickAddDetailSheet, {
        step: "priority",
        values: createQuickTaskDefaults(now, "UTC"),
        amountInput: "1",
        labels: [],
        isLabelsLoading: false,
        isLabelsError: false,
        onRetryLabels: () => {},
        projects: [],
        isProjectsLoading: false,
        isProjectsError: false,
        onRetryProjects: () => {},
        now,
        timeZone: "UTC",
        onClose: () => {},
        onAmountInputChange: () => {},
        onPatch: () => {},
        onApply: () => {},
      }),
    );

    expect(sheet.onBack).toBeUndefined();
  });
});
