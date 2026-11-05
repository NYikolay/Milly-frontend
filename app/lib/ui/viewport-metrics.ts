export interface ViewportMetrics {
  keyboardInset: number;
  viewportHeight: number;
}

export function computeViewportMetrics(input: {
  layoutHeight: number;
  viewportHeight: number;
  offsetTop: number;
}): ViewportMetrics {
  const keyboardInset = Math.max(
    0,
    Math.round(input.layoutHeight - input.viewportHeight - input.offsetTop),
  );

  return {
    keyboardInset,
    viewportHeight: input.viewportHeight,
  };
}
