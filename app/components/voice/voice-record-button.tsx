import { useRef } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

import { cn } from "~/lib/cn";
import type { VoiceRecorderStatus } from "~/lib/voice/types";

import { MicIcon } from "./mic-icon";

const CANCEL_DRAG_THRESHOLD = 64;
const MAX_VISUAL_OFFSET = 8;
const RING_DELAYS = ["0ms", "700ms", "1400ms"] as const;

type PressSource = "pointer" | "keyboard";

export interface VoiceRecordButtonProps {
  status: VoiceRecorderStatus;
  cancelArmed: boolean;
  disabled?: boolean;
  describedBy?: string;
  onCancelArmedChange: (armed: boolean) => void;
  onPressStart: () => void;
  onPressEnd: (cancelled: boolean) => void;
}

function getAriaLabel(
  status: VoiceRecorderStatus,
  cancelArmed: boolean,
): string {
  switch (status) {
    case "idle":
      return "Начать запись";
    case "error":
      return "Повторить попытку записи";
    case "recording":
      return cancelArmed
        ? "Отпустите, чтобы отменить запись"
        : "Идёт запись. Отпустите, чтобы отправить";
    case "preparing":
      return "Проверка доступа к микрофону";
    case "sending":
      return "Отправка голосового сообщения";
  }
}

function getOuterBackground(
  status: VoiceRecorderStatus,
  cancelArmed: boolean,
): string {
  if (status === "error" || (status === "recording" && cancelArmed)) {
    return "bg-app-destructive/10";
  }

  if (status === "sending") {
    return "bg-app-success/15";
  }

  return "bg-app-accent-soft";
}

function getButtonBackground(
  status: VoiceRecorderStatus,
  cancelArmed: boolean,
): string {
  if (status === "sending") {
    return "bg-app-success";
  }

  if (status === "error" || (status === "recording" && cancelArmed)) {
    return "bg-app-destructive";
  }

  return "bg-app-accent";
}

export function VoiceRecordButton({
  status,
  cancelArmed,
  disabled = false,
  describedBy,
  onCancelArmedChange,
  onPressStart,
  onPressEnd,
}: VoiceRecordButtonProps): ReactElement {
  const rawY = useMotionValue(0);
  const smoothY = useSpring(rawY, { stiffness: 500, damping: 40, mass: 0.6 });
  const translateY = useTransform(() =>
    Math.min(smoothY.get() * 0.15, MAX_VISUAL_OFFSET),
  );
  const dragScale = useTransform(smoothY, [0, CANCEL_DRAG_THRESHOLD], [1, 0.97]);
  const pressScale = useMotionValue(1);
  const scale = useTransform<number, number>(
    [dragScale, pressScale],
    ([drag, press]) => drag * press,
  );
  const shouldReduceMotion = useReducedMotion();

  const activeRef = useRef(false);
  const pressSourceRef = useRef<PressSource | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const armedRef = useRef(false);

  const isDisabled = disabled || status === "preparing" || status === "sending";
  const canStart =
    status === "idle" || status === "recording" || status === "error";

  const resetPressVisual = (): void => {
    rawY.set(0);

    if (shouldReduceMotion) {
      pressScale.set(1);
      return;
    }

    animate(pressScale, 1, { duration: 0.16 });
  };

  const beginPress = (): void => {
    activeRef.current = true;
    armedRef.current = false;

    if (!shouldReduceMotion) {
      animate(pressScale, 0.97, { duration: 0.12 });
    }

    onPressStart();
  };

  const finishPress = (cancelled: boolean): void => {
    activeRef.current = false;
    pressSourceRef.current = null;
    pointerIdRef.current = null;
    armedRef.current = false;
    onPressEnd(cancelled);
    resetPressVisual();
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void => {
    if (
      event.button !== 0 ||
      isDisabled ||
      activeRef.current ||
      !canStart
    ) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startYRef.current = event.clientY;
    pressSourceRef.current = "pointer";

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}

    beginPress();
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void => {
    if (
      !activeRef.current ||
      pressSourceRef.current !== "pointer" ||
      pointerIdRef.current !== event.pointerId ||
      status !== "recording"
    ) {
      return;
    }

    const dy = Math.max(0, event.clientY - startYRef.current);
    rawY.set(dy);

    const armed = dy >= CANCEL_DRAG_THRESHOLD;

    if (armed !== armedRef.current) {
      armedRef.current = armed;
      onCancelArmedChange(armed);
    }
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void => {
    if (
      !activeRef.current ||
      pressSourceRef.current !== "pointer" ||
      pointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const dy = Math.max(0, event.clientY - startYRef.current);
    const armed = dy >= CANCEL_DRAG_THRESHOLD;

    activeRef.current = false;
    pressSourceRef.current = null;
    pointerIdRef.current = null;
    armedRef.current = false;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}

    onPressEnd(armed);
    resetPressVisual();
  };

  const handlePointerCancel = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void => {
    if (
      !activeRef.current ||
      pressSourceRef.current !== "pointer" ||
      pointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    finishPress(true);
  };

  const handleLostPointerCapture = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void => {
    if (
      !activeRef.current ||
      pressSourceRef.current !== "pointer" ||
      pointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    finishPress(true);
  };

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (
      event.repeat ||
      isDisabled ||
      activeRef.current ||
      !canStart
    ) {
      return;
    }

    pressSourceRef.current = "keyboard";
    beginPress();
  };

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    if (!activeRef.current || pressSourceRef.current !== "keyboard") {
      return;
    }

    finishPress(false);
  };

  const handleBlur = (): void => {
    if (!activeRef.current) {
      return;
    }

    finishPress(true);
  };

  const ariaLabel = getAriaLabel(status, cancelArmed);
  const outerBackground = getOuterBackground(status, cancelArmed);
  const buttonBackground = getButtonBackground(status, cancelArmed);

  return (
    <div
      className={cn(
        "relative flex size-[156px] select-none items-center justify-center rounded-full transition-colors duration-200",
        outerBackground,
      )}
      style={{ touchAction: "none" }}
    >
      {status === "recording" &&
        RING_DELAYS.map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className={cn(
              "voice-pulse-ring absolute inset-[20px] rounded-full border-2 transition-colors duration-200",
              cancelArmed
                ? "border-app-destructive/40"
                : "border-app-accent/40",
            )}
            style={{ animationDelay: delay }}
          />
        ))}
      <motion.button
        type="button"
        aria-label={ariaLabel}
        aria-disabled={isDisabled}
        aria-describedby={describedBy}
        className={cn(
          "relative z-10 flex size-[116px] touch-none select-none items-center justify-center rounded-full shadow-[0_8px_20px_rgba(0,122,255,0.15)] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-app-accent",
          buttonBackground,
        )}
        style={{
          y: shouldReduceMotion ? 0 : translateY,
          scale: shouldReduceMotion ? 1 : scale,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
      >
        <MicIcon className="size-11 text-white" />
      </motion.button>
    </div>
  );
}
