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

vi.mock("~/components/tasks/search/search-tasks-page-skeleton", () => ({
  SearchTasksPageSkeleton: () =>
    createElement("div", null, "SEARCH_SKELETON"),
}));

vi.mock("~/components/tasks/detail/task-detail-skeleton", () => ({
  TaskDetailSkeleton: () => createElement("div", null, "DETAIL_SKELETON"),
}));

vi.mock("~/components/tasks/reminders/task-reminders-skeleton", () => ({
  TaskRemindersSkeleton: () =>
    createElement("div", null, "REMINDERS_SKELETON"),
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
    const html = renderAt("/tasks");

    expect(html).toContain("TASKS_SKELETON");
    expect(html).not.toContain("SEARCH_SKELETON");
  });

  it("renders the search page skeleton on the search screen", () => {
    const html = renderAt("/tasks/search");

    expect(html).toContain("SEARCH_SKELETON");
    expect(html).not.toContain("TASKS_SKELETON");
  });

  it("renders the task detail skeleton on a detail path", () => {
    const html = renderAt("/tasks/42");
    expect(html).toContain("DETAIL_SKELETON");
    expect(html).not.toContain("TASKS_SKELETON");
    expect(html).not.toContain("SEARCH_SKELETON");
  });

  it("renders the reminders skeleton on a reminders path", () => {
    const html = renderAt("/tasks/42/reminders");

    expect(html).toContain("REMINDERS_SKELETON");
    expect(html).not.toContain("DETAIL_SKELETON");
  });

  it("renders the reminders skeleton with a trailing slash", () => {
    const html = renderAt("/tasks/42/reminders/");

    expect(html).toContain("REMINDERS_SKELETON");
    expect(html).not.toContain("DETAIL_SKELETON");
  });
});
