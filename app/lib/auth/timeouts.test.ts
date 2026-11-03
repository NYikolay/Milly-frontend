import { describe, expect, it } from "vitest";

import { remainingBudgetMs } from "./timeouts";

describe("remainingBudgetMs", () => {
  it("returns the remaining time before the deadline", () => {
    expect(remainingBudgetMs(5000, 2000)).toBe(3000);
  });

  it("returns zero at the deadline", () => {
    expect(remainingBudgetMs(5000, 5000)).toBe(0);
  });

  it("returns zero after the deadline", () => {
    expect(remainingBudgetMs(5000, 6000)).toBe(0);
  });
});
