import { describe, expect, it } from "vitest";

import { computeViewportMetrics } from "./viewport-metrics";

describe("computeViewportMetrics", () => {
  it("returns zero inset when the keyboard is closed", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 800,
        viewportHeight: 800,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 0, viewportHeight: 800 });
  });

  it("computes the iOS keyboard inset", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 800,
        viewportHeight: 500,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 300, viewportHeight: 500 });
  });

  it("accounts for a panned visual viewport", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 800,
        viewportHeight: 500,
        offsetTop: 100,
      }),
    ).toEqual({ keyboardInset: 200, viewportHeight: 500 });
  });

  it("clamps a negative inset", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 500,
        viewportHeight: 800,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 0, viewportHeight: 800 });
  });

  it("keeps zero inset when Android resizes the layout viewport", () => {
    expect(
      computeViewportMetrics({
        layoutHeight: 500,
        viewportHeight: 500,
        offsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 0, viewportHeight: 500 });
  });
});
