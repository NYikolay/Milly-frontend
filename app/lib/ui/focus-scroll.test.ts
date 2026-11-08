import { describe, expect, it } from "vitest";

import { computeFocusScrollDelta } from "./focus-scroll";

const BASE = {
  containerTop: 70,
  containerBottom: 800,
  visibleTop: 0,
  visibleBottom: 800,
  margin: 8,
};

describe("computeFocusScrollDelta", () => {
  it("returns zero when the element is fully visible", () => {
    expect(
      computeFocusScrollDelta({
        ...BASE,
        elementTop: 100,
        elementBottom: 148,
      }),
    ).toBe(0);
  });

  it("scrolls the element above the keyboard overlay", () => {
    expect(
      computeFocusScrollDelta({
        ...BASE,
        visibleBottom: 500,
        elementTop: 470,
        elementBottom: 518,
      }),
    ).toBe(26);
  });

  it("scrolls back when the element is hidden above the body", () => {
    expect(
      computeFocusScrollDelta({
        ...BASE,
        elementTop: 50,
        elementBottom: 98,
      }),
    ).toBe(-28);
  });

  it("aligns a tall element to the top instead of pushing it under the keyboard", () => {
    expect(
      computeFocusScrollDelta({
        ...BASE,
        visibleBottom: 500,
        elementTop: 120,
        elementBottom: 720,
      }),
    ).toBe(42);
  });

  it("uses the panned visual viewport bounds", () => {
    expect(
      computeFocusScrollDelta({
        ...BASE,
        visibleTop: 100,
        visibleBottom: 600,
        elementTop: 120,
        elementBottom: 168,
      }),
    ).toBe(0);
  });

  it("does not scroll when the visible area is empty", () => {
    expect(
      computeFocusScrollDelta({
        ...BASE,
        visibleTop: 0,
        visibleBottom: 70,
        elementTop: 200,
        elementBottom: 248,
      }),
    ).toBe(122);
  });
});
