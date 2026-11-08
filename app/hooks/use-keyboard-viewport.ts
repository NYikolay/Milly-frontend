import { useEffect, useState } from "react";

import {
  computeViewportMetrics,
  resolveBaseHeight,
} from "~/lib/ui/viewport-metrics";

const CLOSED: KeyboardViewport = {
  baseHeight: null,
  keyboardInset: 0,
  layoutInset: 0,
  viewportHeight: null,
};

export interface KeyboardViewport {
  baseHeight: number | null;
  keyboardInset: number;
  layoutInset: number;
  viewportHeight: number | null;
}

export function useKeyboardViewport(enabled: boolean): KeyboardViewport {
  const [metrics, setMetrics] = useState<KeyboardViewport>(CLOSED);

  useEffect(() => {
    if (!enabled) {
      setMetrics(CLOSED);
      return;
    }

    const visualViewport = window.visualViewport;
    let frame = 0;
    let baseHeight: number | null = null;

    const update = () => {
      frame = 0;

      const layoutHeight = window.innerHeight;
      const viewportHeight = visualViewport?.height ?? layoutHeight;
      const offsetTop = visualViewport?.offsetTop ?? 0;

      const nextBaseHeight = resolveBaseHeight(baseHeight, {
        layoutHeight,
        viewportHeight,
        offsetTop,
      });
      baseHeight = nextBaseHeight;

      const next = computeViewportMetrics({
        baseHeight: nextBaseHeight,
        layoutHeight,
        viewportHeight,
        offsetTop,
      });

      setMetrics((current) =>
        current.baseHeight === nextBaseHeight &&
        current.keyboardInset === next.keyboardInset &&
        current.layoutInset === next.layoutInset &&
        current.viewportHeight === next.viewportHeight
          ? current
          : {
              baseHeight: nextBaseHeight,
              keyboardInset: next.keyboardInset,
              layoutInset: next.layoutInset,
              viewportHeight: next.viewportHeight,
            },
      );
    };

    const schedule = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    const handleOrientationChange = () => {
      baseHeight = null;
      schedule();
    };

    visualViewport?.addEventListener("resize", schedule);
    visualViewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", handleOrientationChange);
    update();

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      visualViewport?.removeEventListener("resize", schedule);
      visualViewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [enabled]);

  return metrics;
}
