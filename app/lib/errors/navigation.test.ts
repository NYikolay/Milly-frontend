import { describe, expect, it } from "vitest";

import { shouldGoBack } from "./navigation";

describe("shouldGoBack", () => {
  it("returns true for a positive integer index", () => {
    expect(shouldGoBack({ idx: 1 })).toBe(true);
  });

  it("returns false for a zero index", () => {
    expect(shouldGoBack({ idx: 0 })).toBe(false);
  });

  it("returns false for a negative index", () => {
    expect(shouldGoBack({ idx: -1 })).toBe(false);
  });

  it("returns false for a non-integer index", () => {
    expect(shouldGoBack({ idx: 1.5 })).toBe(false);
  });

  it("returns false for a string index", () => {
    expect(shouldGoBack({ idx: "1" })).toBe(false);
  });

  it.each([null, undefined, {}, "1"])(
    "returns false for %j without a usable index",
    (historyState) => {
      expect(shouldGoBack(historyState)).toBe(false);
    },
  );
});
