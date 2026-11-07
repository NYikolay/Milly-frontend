import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/components/home/home-skeleton", () => ({
  HomeSkeleton: () => createElement("div", null, "HOME_SKELETON"),
}));

vi.mock("~/components/tasks/today/today-tasks-skeleton", () => ({
  TodayTasksSkeleton: () => createElement("div", null, "TASKS_SKELETON"),
}));

import { RouteSkeleton } from "./route-skeleton";

function renderAt(pathname: string): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [pathname] },
      createElement(RouteSkeleton),
    ),
  );
}

describe("RouteSkeleton", () => {
  it("renders the home skeleton on the dashboard", () => {
    expect(renderAt("/")).toContain("HOME_SKELETON");
  });

  it("renders the tasks skeleton on the tasks screen", () => {
    expect(renderAt("/tasks")).toContain("TASKS_SKELETON");
  });
});
