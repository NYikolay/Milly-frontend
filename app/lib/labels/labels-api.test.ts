import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "~/lib/api/client";
import { fetchLabels } from "./labels-api";

vi.mock("~/lib/api/client", () => ({ apiRequest: vi.fn() }));

const apiRequestMock = vi.mocked(apiRequest);

beforeEach(() => apiRequestMock.mockReset());

describe("fetchLabels", () => {
  it("returns label items from GET /labels", async () => {
    const label = {
      id: 3,
      name: "Личное",
      color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
      created_at: "2026-11-05T09:00:00Z",
      updated_at: "2026-11-05T09:00:00Z",
    };
    apiRequestMock.mockResolvedValue({ items: [label] });

    await expect(fetchLabels()).resolves.toEqual([label]);
    expect(apiRequestMock).toHaveBeenCalledWith("/labels", {
      signal: undefined,
    });
  });
});
