import { describe, expect, it } from "vitest";

import { isAbortError } from "./async";

describe("isAbortError", () => {
  it("recognizes DOMException AbortError", () => {
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
  });

  it("rejects other errors and non-objects", () => {
    expect(isAbortError(new Error("Aborted"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
  });
});
