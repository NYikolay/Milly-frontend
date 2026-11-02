import { beforeEach, describe, expect, it } from "vitest";

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./token-store";

describe("token store", () => {
  beforeEach(() => {
    clearAccessToken();
  });

  it("returns null before setAccessToken", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("returns the token set by setAccessToken", () => {
    setAccessToken("a");

    expect(getAccessToken()).toBe("a");
  });

  it("returns null after clearAccessToken", () => {
    setAccessToken("a");
    clearAccessToken();

    expect(getAccessToken()).toBeNull();
  });
});
