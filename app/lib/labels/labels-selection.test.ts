import { describe, expect, it } from "vitest";

import { pruneMissingLabelIds } from "./labels-selection";

const labels = [{ id: 3 }, { id: 5 }];

describe("pruneMissingLabelIds", () => {
  it("keeps first-seen order and drops duplicate ids", () => {
    expect(pruneMissingLabelIds([5, 3, 5, 3], labels)).toEqual([5, 3]);
  });

  it("drops ids that are missing from the label list", () => {
    expect(pruneMissingLabelIds([3, 3, 99], [{ id: 3 }])).toEqual([3]);
  });

  it("returns an empty list when no labels are visible", () => {
    expect(pruneMissingLabelIds([3, 5], [])).toEqual([]);
  });
});
