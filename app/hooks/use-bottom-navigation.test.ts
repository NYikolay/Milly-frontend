import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TabId } from "~/components/home/bottom-navigation";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  pathname: "/",
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

import { useBottomNavigation } from "./use-bottom-navigation";

function renderOnSelect(): (id: TabId) => void {
  const captured: { onSelect?: (id: TabId) => void } = {};

  function Probe(): null {
    captured.onSelect = useBottomNavigation();
    return null;
  }

  renderToStaticMarkup(createElement(Probe));

  if (!captured.onSelect) {
    throw new Error("useBottomNavigation was not rendered");
  }

  return captured.onSelect;
}

describe("useBottomNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/";
  });

  it("navigates to the tasks tab and fires selection", () => {
    const onSelect = renderOnSelect();

    onSelect("tasks");

    expect(mocks.haptics.selection).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith("/tasks");
  });

  it("does not push history when re-tapping the active tasks tab", () => {
    mocks.pathname = "/tasks";
    const onSelect = renderOnSelect();

    onSelect("tasks");

    expect(mocks.haptics.selection).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("does not push history when re-tapping the active home tab", () => {
    mocks.pathname = "/";
    const onSelect = renderOnSelect();

    onSelect("home");

    expect(mocks.haptics.selection).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("only fires selection for tabs without routes", () => {
    mocks.pathname = "/tasks";
    const onSelect = renderOnSelect();

    onSelect("finance");

    expect(mocks.haptics.selection).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
