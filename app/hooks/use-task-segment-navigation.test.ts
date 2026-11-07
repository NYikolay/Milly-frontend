import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskSegmentId } from "~/components/tasks/task-segments";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  pathname: "/tasks",
  haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  },
}));

vi.mock("react-router", () => ({
  useLocation: () => ({ pathname: mocks.pathname }),
  useNavigate: () => mocks.navigate,
}));

vi.mock("~/providers/telegram-provider", () => ({
  useTelegram: () => ({ haptics: mocks.haptics }),
}));

import { useTaskSegmentNavigation } from "./use-task-segment-navigation";

function renderOnSelect(): (id: TaskSegmentId) => void {
  const captured: { onSelect?: (id: TaskSegmentId) => void } = {};

  function Probe(): null {
    captured.onSelect = useTaskSegmentNavigation();
    return null;
  }

  renderToStaticMarkup(createElement(Probe));

  if (!captured.onSelect) {
    throw new Error("useTaskSegmentNavigation was not rendered");
  }

  return captured.onSelect;
}

describe("useTaskSegmentNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/tasks";
  });

  it("navigates from today to search and fires selection", () => {
    const onSelect = renderOnSelect();

    onSelect("search");

    expect(mocks.haptics.selection).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith("/tasks/search");
  });

  it("navigates from search back to today", () => {
    mocks.pathname = "/tasks/search";
    const onSelect = renderOnSelect();

    onSelect("today");

    expect(mocks.haptics.selection).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith("/tasks");
  });

  it("fires selection without navigating when re-tapping the active segment", () => {
    mocks.pathname = "/tasks/search";
    const onSelect = renderOnSelect();

    onSelect("search");

    expect(mocks.haptics.selection).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("only fires selection for the disabled projects segment", () => {
    const onSelect = renderOnSelect();

    onSelect("projects");

    expect(mocks.haptics.selection).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
