import { useEffect, useState } from "react";

import { computeViewportMetrics } from "~/lib/ui/viewport-metrics";

const CLOSED: KeyboardViewport = {
  keyboardInset: 0,
  viewportHeight: null,
};

export interface KeyboardViewport {
  keyboardInset: number;
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

    const update = () => {
      frame = 0;

      const layoutHeight = window.innerHeight;
      const viewportHeight = visualViewport?.height ?? layoutHeight;
      const offsetTop = visualViewport?.offsetTop ?? 0;
      const next = computeViewportMetrics({
        layoutHeight,
        viewportHeight,
        offsetTop,
      });

      setMetrics((current) =>
        current.keyboardInset === next.keyboardInset &&
        current.viewportHeight === next.viewportHeight
          ? current
          : next,
      );
    };

    const schedule = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    visualViewport?.addEventListener("resize", schedule);
    visualViewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    update();

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      visualViewport?.removeEventListener("resize", schedule);
      visualViewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [enabled]);

  return metrics;
}
