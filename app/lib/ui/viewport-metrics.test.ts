import { describe, expect, it } from "vitest";

import { computeViewportMetrics, resolveBaseHeight } from "./viewport-metrics";

describe("computeViewportMetrics", () => {
  it("returns zero insets when the keyboard is closed", () => {
    expect(
      computeViewportMetrics({
        baseHeight: 800,
        layoutHeight: 800,
        viewportHeight: 800,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 0, layoutInset: 0, viewportHeight: 800 });
  });

  it("detects a visual-viewport-only keyboard (interactive-widget=resizes-visual)", () => {
    expect(
      computeViewportMetrics({
        baseHeight: 800,
        layoutHeight: 800,
        viewportHeight: 500,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 300, layoutInset: 0, viewportHeight: 500 });
  });

  it("detects a keyboard that shrinks the layout viewport (Telegram iOS 11.11+)", () => {
    expect(
      computeViewportMetrics({
        baseHeight: 800,
        layoutHeight: 500,
        viewportHeight: 500,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 300, layoutInset: 300, viewportHeight: 500 });
  });

  it("accounts for a panned visual viewport", () => {
    expect(
      computeViewportMetrics({
        baseHeight: 800,
        layoutHeight: 800,
        viewportHeight: 500,
        offsetTop: 100,
      }),
    ).toEqual({ keyboardInset: 200, layoutInset: 0, viewportHeight: 500 });
  });

  it("clamps negative insets when the viewport grows beyond the base", () => {
    expect(
      computeViewportMetrics({
        baseHeight: 500,
        layoutHeight: 800,
        viewportHeight: 800,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 0, layoutInset: 0, viewportHeight: 800 });
  });
});

describe("resolveBaseHeight", () => {
  it("captures the current height on the first sample", () => {
    expect(
      resolveBaseHeight(null, {
        layoutHeight: 800,
        viewportHeight: 800,
        offsetTop: 0,
      }),
    ).toBe(800);
  });

  it("keeps the pre-keyboard height while the viewport is smaller", () => {
    expect(
      resolveBaseHeight(800, {
        layoutHeight: 500,
        viewportHeight: 500,
        offsetTop: 0,
      }),
    ).toBe(800);
  });

  it("grows when the viewport becomes larger than the base", () => {
    expect(
      resolveBaseHeight(500, {
        layoutHeight: 800,
        viewportHeight: 800,
        offsetTop: 0,
      }),
    ).toBe(800);
  });
});
