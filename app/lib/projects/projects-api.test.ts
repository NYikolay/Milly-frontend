import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "~/lib/api/client";
import { fetchProjects } from "./projects-api";

vi.mock("~/lib/api/client", () => ({ apiRequest: vi.fn() }));

const apiRequestMock = vi.mocked(apiRequest);

beforeEach(() => apiRequestMock.mockReset());

describe("fetchProjects", () => {
  it("returns items from GET /projects?limit=100", async () => {
    const project = { id: 10, name: "Личное", icon: "leaf" };
    apiRequestMock.mockResolvedValue({ items: [project], next_cursor: null });

    await expect(fetchProjects()).resolves.toEqual([project]);
    expect(apiRequestMock).toHaveBeenCalledWith("/projects?limit=100", {
      signal: undefined,
    });
  });
});
