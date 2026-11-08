export interface ViewportSample {
  layoutHeight: number;
  viewportHeight: number;
  offsetTop: number;
}

export interface ViewportMetrics {
  keyboardInset: number;
  layoutInset: number;
  viewportHeight: number;
}

export function computeViewportMetrics(
  input: ViewportSample & { baseHeight: number },
): ViewportMetrics {
  const keyboardInset = Math.max(
    0,
    Math.round(input.baseHeight - input.viewportHeight - input.offsetTop),
  );
  const layoutInset = Math.max(
    0,
    Math.round(input.baseHeight - input.layoutHeight),
  );

  return {
    keyboardInset,
    layoutInset,
    viewportHeight: input.viewportHeight,
  };
}

export function resolveBaseHeight(
  previous: number | null,
  input: ViewportSample,
): number {
  const visibleHeight = Math.max(
    input.layoutHeight,
    input.viewportHeight + input.offsetTop,
  );

  if (previous === null) {
    return visibleHeight;
  }

  return Math.max(previous, visibleHeight);
}
