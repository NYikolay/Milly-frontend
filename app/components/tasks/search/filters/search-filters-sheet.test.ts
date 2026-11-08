import { createElement } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createSearchFiltersState } from "~/lib/tasks/search-filters-reducer";

import { SearchFiltersSheet } from "./search-filters-sheet";

type SheetMockProps = {
  title: string;
  open: boolean;
  onBack?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  expanded?: boolean;
  showCloseButton?: boolean;
  swipeToClose?: boolean;
  panelAnimateLayout?: boolean;
  bodyClassName?: string;
};

type ActionMockProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
};

vi.mock("~/components/ui/bottom-sheet", () => ({
  BottomSheet: ({
    title,
    onBack,
    footer,
    children,
    open,
    expanded,
    showCloseButton,
    swipeToClose,
    panelAnimateLayout,
    bodyClassName,
  }: SheetMockProps) =>
    createElement(
      "section",
      {
        "data-title": title,
        "data-open": String(open),
        "data-back": String(Boolean(onBack)),
        "data-expanded": String(Boolean(expanded)),
        "data-show-close-button": String(Boolean(showCloseButton)),
        "data-swipe-to-close": String(Boolean(swipeToClose)),
        "data-panel-animate-layout": String(Boolean(panelAnimateLayout)),
        "data-body-class-name": bodyClassName ?? "",
      },
      footer,
      children,
    ),
  BottomSheetAction: ({ children, ...props }: ActionMockProps) => createElement("button", props, children),
  BottomSheetPrimaryAction: ({ children, ...props }: ActionMockProps) => createElement("button", props, children),
}));

const BASE_PROPS = {
  state: createSearchFiltersState(),
  today: "2026-11-08",
  labels: [],
  isLabelsLoading: false,
  isLabelsError: false,
  onRetryLabels: vi.fn(),
  projects: [],
  isProjectsLoading: false,
  isProjectsError: false,
  onRetryProjects: vi.fn(),
  onOpenStep: vi.fn(),
  onBack: vi.fn(),
  onClose: vi.fn(),
  onApplyStep: vi.fn(),
  onApplyAll: vi.fn(),
  onReset: vi.fn(),
};

describe("SearchFiltersSheet", () => {
  it("shows the reset footer only on the all-filters step", () => {
    const all = renderToStaticMarkup(
      createElement(SearchFiltersSheet, {
        ...BASE_PROPS,
        state: { ...BASE_PROPS.state, step: "all" },
      }),
    );
    const date = renderToStaticMarkup(
      createElement(SearchFiltersSheet, {
        ...BASE_PROPS,
        state: { ...BASE_PROPS.state, step: "date" },
      }),
    );

    expect(all).toContain("Сбросить фильтры");
    expect(all).toContain("Фильтры");
    expect(all).toContain('data-back="false"');
    expect(all).toContain('data-expanded="true"');
    expect(all).toContain('data-show-close-button="true"');
    expect(all).toContain('data-swipe-to-close="true"');
    expect(all).toContain('data-panel-animate-layout="true"');
    expect(all).toContain('data-body-class-name="p-[15px]"');
    expect(date).not.toContain("Сбросить фильтры");
    expect(date).toContain("Фильтр по дате");
    expect(date).toContain('data-back="true"');
  });

  it("uses the figma titles for every step", () => {
    const titles = {
      all: "Фильтры",
      project: "Фильтр по проекту",
      labels: "Метки",
      priority: "Фильтр по приоритету",
      status: "Фильтр по статусу",
      recurrence: "Фильтр по регулярности",
      date: "Фильтр по дате",
    } as const;

    for (const [step, title] of Object.entries(titles)) {
      const html = renderToStaticMarkup(
        createElement(SearchFiltersSheet, {
          ...BASE_PROPS,
          state: { ...BASE_PROPS.state, step: step as keyof typeof titles },
        }),
      );
      expect(html).toContain(`data-title="${title}"`);
    }
  });
});
