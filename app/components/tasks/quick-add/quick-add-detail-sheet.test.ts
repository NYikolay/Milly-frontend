import { createElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createQuickTaskDefaults } from "~/lib/tasks/quick-task-schema";

import { QuickAddDetailSheet } from "./quick-add-detail-sheet";
import { QUICK_ADD_DETAIL_STEPS } from "./quick-add-step";
import type { QuickAddStep } from "./quick-add-step";

const sheet = vi.hoisted(() => ({
  onBack: undefined as (() => void) | undefined,
  expanded: false,
  swipeToClose: false,
  showCloseButton: false,
  footer: null as ReactNode,
}));

vi.mock("~/components/ui/bottom-sheet", () => ({
  BottomSheet: (props: {
    onBack?: () => void;
    expanded?: boolean;
    swipeToClose?: boolean;
    showCloseButton?: boolean;
    footer?: ReactNode;
  }) => {
    sheet.onBack = props.onBack;
    sheet.expanded = props.expanded === true;
    sheet.swipeToClose = props.swipeToClose === true;
    sheet.showCloseButton = props.showCloseButton === true;
    sheet.footer = props.footer ?? null;
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

const now = new Date("2026-11-06T10:00:00Z");

function render(step: QuickAddStep | null) {
  renderToStaticMarkup(
    createElement(QuickAddDetailSheet, {
      step,
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
}

describe("QuickAddDetailSheet", () => {
  it("does not render a back button in the sheet header", () => {
    render("priority");

    expect(sheet.onBack).toBeUndefined();
  });

  it.each(QUICK_ADD_DETAIL_STEPS)(
    "opens the %s step as an expanded swipeable sheet with a close button and no footer",
    (step) => {
      render(step);

      expect(sheet.expanded).toBe(true);
      expect(sheet.swipeToClose).toBe(true);
      expect(sheet.showCloseButton).toBe(true);
      expect(sheet.footer).toBeNull();
    },
  );
});
