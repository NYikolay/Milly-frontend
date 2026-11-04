import { describe, expect, it } from "vitest";

import {
  AUTH_BOOTSTRAP_BUDGET_MS,
  AUTH_TELEGRAM_INIT_TIMEOUT_MS,
  remainingBudgetMs,
} from "./timeouts";

describe("auth timeout constants", () => {
  it("allows a 10 second bootstrap budget", () => {
    expect(AUTH_BOOTSTRAP_BUDGET_MS).toBe(10000);
  });

  it("waits 4 seconds for Telegram inside the budget", () => {
    expect(AUTH_TELEGRAM_INIT_TIMEOUT_MS).toBe(4000);
  });
});

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
