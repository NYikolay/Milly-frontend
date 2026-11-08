import { describe, expect, it, vi } from "vitest";

import { fetchProjects } from "./projects-api";
import { PROJECTS_QUERY_KEY, projectsQueryOptions } from "./projects-query";

vi.mock("./projects-api", () => ({
  fetchProjects: vi.fn(),
}));

describe("projectsQueryOptions", () => {
  it("uses the shared projects key and fetcher", async () => {
    const projects = [{ id: 1 }];
    vi.mocked(fetchProjects).mockResolvedValue(projects as never);
    const signal = new AbortController().signal;
    const queryFn = projectsQueryOptions.queryFn;

    expect(PROJECTS_QUERY_KEY).toEqual(["projects"]);
    expect(projectsQueryOptions.queryKey).toEqual(PROJECTS_QUERY_KEY);

    if (!queryFn) throw new Error("queryFn is missing");

    await expect(queryFn({ signal } as never)).resolves.toBe(projects);
    expect(fetchProjects).toHaveBeenCalledWith(signal);
  });
});
