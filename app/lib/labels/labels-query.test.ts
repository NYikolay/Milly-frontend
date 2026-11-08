import { describe, expect, it, vi } from "vitest";

import { fetchLabels } from "./labels-api";
import { LABELS_QUERY_KEY, labelsQueryOptions } from "./labels-query";

vi.mock("./labels-api", () => ({
  fetchLabels: vi.fn(),
}));

describe("labelsQueryOptions", () => {
  it("uses the shared labels key and fetcher", async () => {
    const labels = [{ id: 1 }];
    vi.mocked(fetchLabels).mockResolvedValue(labels as never);
    const signal = new AbortController().signal;
    const queryFn = labelsQueryOptions.queryFn;

    expect(LABELS_QUERY_KEY).toEqual(["labels"]);
    expect(labelsQueryOptions.queryKey).toEqual(LABELS_QUERY_KEY);

    if (!queryFn) throw new Error("queryFn is missing");

    await expect(queryFn({ signal } as never)).resolves.toBe(labels);
    expect(fetchLabels).toHaveBeenCalledWith(signal);
  });
});
