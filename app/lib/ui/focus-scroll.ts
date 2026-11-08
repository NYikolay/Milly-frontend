export const FOCUS_SCROLL_MARGIN_PX = 8;

export interface FocusScrollGeometry {
  elementTop: number;
  elementBottom: number;
  containerTop: number;
  containerBottom: number;
  visibleTop: number;
  visibleBottom: number;
  margin?: number;
}

export function computeFocusScrollDelta(input: FocusScrollGeometry): number {
  const margin = input.margin ?? FOCUS_SCROLL_MARGIN_PX;
  const visibleTop = Math.max(input.containerTop, input.visibleTop) + margin;
  const visibleBottom =
    Math.min(input.containerBottom, input.visibleBottom) - margin;
  const elementHeight = input.elementBottom - input.elementTop;

  if (elementHeight >= visibleBottom - visibleTop) {
    return input.elementTop - visibleTop;
  }

  if (input.elementTop < visibleTop) {
    return input.elementTop - visibleTop;
  }

  if (input.elementBottom > visibleBottom) {
    return input.elementBottom - visibleBottom;
  }

  return 0;
}
